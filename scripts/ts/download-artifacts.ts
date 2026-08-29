/*
* Copyright (c) 2024-2026. caoccao.com Sam Cao
* All rights reserved.

* Licensed under the Apache License, Version 2.0 (the "License")
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at

* http://www.apache.org/licenses/LICENSE-2.0

* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import * as path from "https://deno.land/std/path/mod.ts";

// The repository this script belongs to. The commit is resolved from it, while
// the artifacts are downloaded to the output folder.
const rootDirPath = path.join(
  path.dirname(path.fromFileUrl(import.meta.url)),
  "../../",
);
// deno task resets the cwd to the config file folder, INIT_CWD keeps the original one.
const currentDirPath = Deno.env.get("INIT_CWD") ?? Deno.cwd();

const HELP = `Download the artifacts of the latest GitHub Actions runs of the current commit,
extract them to the output folder without creating any child folder, then delete
the downloaded zip files. It exits with an error if any of those runs is
unfinished or unsuccessful.

Usage:
  deno run --allow-run --allow-read --allow-write --allow-env download-artifacts.ts [options]
  deno task download-artifacts [options]

Options:
  -o, --output <folder>  The folder the artifacts are extracted to.
                         It is created if it does not exist. (default: the current folder)
  -d, --dry-run          Print the artifacts to be downloaded without downloading them.
  -h, --help             Show this help and exit.

Requirements:
  git                    The commit is the HEAD of the BetterMediaInfo repository.
  gh                     The GitHub CLI, authenticated via 'gh auth login'.

Examples:
  deno task download-artifacts
  deno task download-artifacts -o /tmp
  deno task download-artifacts --output=../../../artifacts
  deno task download-artifacts --dry-run`;

function exitWithHelp(message: string): never {
  console.error(`%c${message}\n`, "color: red");
  console.info(HELP);
  Deno.exit(1);
}

// The output folder comes from -o or --output, defaulting to the current folder.
function parseOptions(): { dryRun: boolean; outputDirPath: string } {
  const args = Deno.args;
  if (args.some((arg) => arg === "-h" || arg === "--help")) {
    console.info(HELP);
    Deno.exit(0);
  }
  let dryRun = false;
  let outputDir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-d" || arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    let value: string | undefined;
    if (arg === "-o" || arg === "--output") {
      value = args[++i];
    } else if (arg.startsWith("--output=")) {
      value = arg.substring("--output=".length);
    } else {
      exitWithHelp(`The argument ${arg} is unknown.`);
    }
    if (value === undefined || value.length === 0) {
      exitWithHelp(`The option ${arg} requires an output folder.`);
    }
    if (outputDir !== undefined) {
      exitWithHelp("Only one output folder is accepted.");
    }
    outputDir = value;
  }
  return {
    dryRun: dryRun,
    outputDirPath: path.resolve(currentDirPath, outputDir ?? "."),
  };
}

const { dryRun, outputDirPath } = parseOptions();

interface WorkflowRun {
  databaseId: number;
  createdAt: string;
  workflowName: string;
  status: string;
  conclusion: string;
  url: string;
}

interface Artifact {
  id: number;
  name: string;
  expired: boolean;
  size_in_bytes: number;
}

function run(command: string, args: Array<string>, cwd: string): Uint8Array {
  const { code, stdout, stderr } = new Deno.Command(command, {
    args: args,
    cwd: cwd,
    stdout: "piped",
    stderr: "piped",
  }).outputSync();
  if (code !== 0) {
    const message = new TextDecoder().decode(stderr).trim();
    throw new Error(`${command} ${args.join(" ")} failed (${code}): ${message}`);
  }
  return stdout;
}

function runText(
  command: string,
  args: Array<string>,
  cwd: string = rootDirPath,
): string {
  return new TextDecoder().decode(run(command, args, cwd)).trim();
}

function readableSize(sizeInBytes: number): string {
  return `${(sizeInBytes / 1024 / 1024).toFixed(1)}MB`;
}

/** Returns the latest run per workflow for the given commit. */
function getLatestRuns(commit: string): Array<WorkflowRun> {
  const runs: Array<WorkflowRun> = JSON.parse(runText("gh", [
    "run",
    "list",
    "--commit",
    commit,
    "--limit",
    "100",
    "--json",
    "databaseId,createdAt,workflowName,status,conclusion,url",
  ]));
  const latestRunMap = new Map<string, WorkflowRun>();
  runs.forEach((workflowRun) => {
    const latestRun = latestRunMap.get(workflowRun.workflowName);
    if (
      latestRun === undefined ||
      workflowRun.createdAt > latestRun.createdAt ||
      (workflowRun.createdAt === latestRun.createdAt &&
        workflowRun.databaseId > latestRun.databaseId)
    ) {
      latestRunMap.set(workflowRun.workflowName, workflowRun);
    }
  });
  return [...latestRunMap.values()].sort((run1, run2) =>
    run1.workflowName.localeCompare(run2.workflowName)
  );
}

/** Exits if any workflow of the commit is unfinished or unsuccessful. */
function assertRunsAreSuccessful(workflowRuns: Array<WorkflowRun>) {
  const unfinishedRuns = workflowRuns.filter(
    (workflowRun) => workflowRun.status !== "completed",
  );
  const failedRuns = workflowRuns.filter(
    (workflowRun) =>
      workflowRun.status === "completed" && workflowRun.conclusion !== "success",
  );
  if (unfinishedRuns.length === 0 && failedRuns.length === 0) {
    return;
  }
  console.error(
    "%cThe artifacts are not downloaded because of the following workflow(s).",
    "color: red",
  );
  unfinishedRuns.forEach((workflowRun) => {
    console.error(
      `%c  ${workflowRun.workflowName} is not finished (${workflowRun.status}). ${workflowRun.url}`,
      "color: red",
    );
  });
  failedRuns.forEach((workflowRun) => {
    console.error(
      `%c  ${workflowRun.workflowName} is not successful (${workflowRun.conclusion}). ${workflowRun.url}`,
      "color: red",
    );
  });
  Deno.exit(1);
}

function getArtifacts(repository: string, runId: number): Array<Artifact> {
  const { artifacts }: { artifacts: Array<Artifact> } = JSON.parse(runText(
    "gh",
    ["api", `repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`],
  ));
  return artifacts;
}

function downloadArtifact(
  repository: string,
  artifact: Artifact,
): string {
  const zipFilePath = path.join(outputDirPath, `${artifact.name}.zip`);
  const zip = run(
    "gh",
    ["api", `repos/${repository}/actions/artifacts/${artifact.id}/zip`],
    rootDirPath,
  );
  Deno.writeFileSync(zipFilePath, zip);
  return zipFilePath;
}

/** Reads the zip central directory and returns the file entries. */
function readZipEntries(
  zip: Uint8Array,
): Array<{ name: string; method: number; offset: number; size: number }> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // The end of central directory record sits within the last 64KB + 22 bytes.
  let eocdOffset = -1;
  const minOffset = Math.max(0, zip.length - 65557);
  for (let i = zip.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("The end of central directory record is not found.");
  }
  let entryCount = view.getUint16(eocdOffset + 10, true);
  let centralDirOffset = view.getUint32(eocdOffset + 16, true);
  if (entryCount === 0xffff || centralDirOffset === 0xffffffff) {
    // Zip64: the locator precedes the end of central directory record.
    const locatorOffset = eocdOffset - 20;
    if (
      locatorOffset < 0 || view.getUint32(locatorOffset, true) !== 0x07064b50
    ) {
      throw new Error("The zip64 end of central directory locator is not found.");
    }
    const zip64EocdOffset = Number(
      view.getBigUint64(locatorOffset + 8, true),
    );
    entryCount = Number(view.getBigUint64(zip64EocdOffset + 32, true));
    centralDirOffset = Number(view.getBigUint64(zip64EocdOffset + 48, true));
  }
  const entries = [];
  let offset = centralDirOffset;
  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error(`The central directory entry ${i} is corrupted.`);
    }
    const method = view.getUint16(offset + 10, true);
    let compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    let localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(
      zip.subarray(offset + 46, offset + 46 + nameLength),
    );
    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) {
      // Zip64: the oversized fields are stored in the 0x0001 extra field,
      // in the order of uncompressed size, compressed size, local offset.
      const extraStart = offset + 46 + nameLength;
      let extraOffset = extraStart;
      while (extraOffset < extraStart + extraLength) {
        const headerId = view.getUint16(extraOffset, true);
        const dataSize = view.getUint16(extraOffset + 2, true);
        if (headerId === 0x0001) {
          let fieldOffset = extraOffset + 4;
          if (view.getUint32(offset + 24, true) === 0xffffffff) {
            fieldOffset += 8;
          }
          if (compressedSize === 0xffffffff) {
            compressedSize = Number(view.getBigUint64(fieldOffset, true));
            fieldOffset += 8;
          }
          if (localOffset === 0xffffffff) {
            localOffset = Number(view.getBigUint64(fieldOffset, true));
          }
          break;
        }
        extraOffset += 4 + dataSize;
      }
    }
    // The local header repeats the name and extra fields with its own lengths.
    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error(`The local header of ${name} is corrupted.`);
    }
    const dataOffset = localOffset + 30 +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true);
    if (!name.endsWith("/")) {
      entries.push({
        name: name,
        method: method,
        offset: dataOffset,
        size: compressedSize,
      });
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Extracts every file to the output folder, flattening the paths. */
async function unzip(zipFilePath: string): Promise<Array<string>> {
  const zip = Deno.readFileSync(zipFilePath);
  const filePaths: Array<string> = [];
  for (const entry of readZipEntries(zip)) {
    const data = zip.subarray(entry.offset, entry.offset + entry.size);
    let content: Uint8Array;
    switch (entry.method) {
      case 0:
        content = data;
        break;
      case 8:
        content = new Uint8Array(
          await new Response(
            new Blob([data]).stream().pipeThrough(
              new DecompressionStream("deflate-raw"),
            ),
          ).arrayBuffer(),
        );
        break;
      default:
        throw new Error(
          `The compression method ${entry.method} of ${entry.name} is not supported.`,
        );
    }
    const filePath = path.join(outputDirPath, path.basename(entry.name));
    Deno.writeFileSync(filePath, content);
    filePaths.push(filePath);
  }
  return filePaths;
}

async function main() {
  const repository = runText("gh", [
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]);
  const commit = runText("git", ["rev-parse", "HEAD"]);
  console.info(`Repository: ${repository}`);
  console.info(`Commit: ${commit}`);
  console.info(`Output: ${outputDirPath}`);
  const workflowRuns = getLatestRuns(commit);
  if (workflowRuns.length === 0) {
    console.error(`%cThere is no run for commit ${commit}.`, "color: red");
    Deno.exit(1);
  }
  assertRunsAreSuccessful(workflowRuns);
  if (!dryRun) {
    Deno.mkdirSync(outputDirPath, { recursive: true });
  }
  let artifactCount = 0;
  let artifactSize = 0;
  let fileCount = 0;
  for (const workflowRun of workflowRuns) {
    console.info(
      `\n${workflowRun.workflowName} (run ${workflowRun.databaseId}, ${workflowRun.createdAt})`,
    );
    const artifacts = getArtifacts(repository, workflowRun.databaseId);
    if (artifacts.length === 0) {
      console.warn("%c  There is no artifact.", "color: yellow");
      continue;
    }
    for (const artifact of artifacts) {
      if (artifact.expired) {
        console.warn(`%c  Skipped expired ${artifact.name}.`, "color: yellow");
        continue;
      }
      artifactCount++;
      artifactSize += artifact.size_in_bytes;
      const description =
        `${artifact.name} (${readableSize(artifact.size_in_bytes)})`;
      if (dryRun) {
        console.info(`  ${description}`);
        continue;
      }
      console.info(`  Downloading ${description}.`);
      const zipFilePath = downloadArtifact(repository, artifact);
      try {
        for (const filePath of await unzip(zipFilePath)) {
          console.info(`    ${path.basename(filePath)}`);
          fileCount++;
        }
      } finally {
        Deno.removeSync(zipFilePath);
      }
    }
  }
  if (dryRun) {
    console.info(
      `\n${artifactCount} artifact(s) (${readableSize(artifactSize)}) to be downloaded to ${outputDirPath}.`,
    );
  } else {
    console.info(`\nExtracted ${fileCount} file(s) to ${outputDirPath}.`);
  }
}

await main();
