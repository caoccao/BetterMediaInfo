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

import * as fs from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

const rootDirPath = path.join(
  path.dirname(path.fromFileUrl(import.meta.url)),
  "../../../"
);

function patchFile(filePath: string, replacements: Array<[string | RegExp, string]>) {
  const fullPath = path.join(rootDirPath, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`%c${fullPath} is not found.`, "color: red");
    return;
  }
  let content = Deno.readTextFileSync(fullPath);
  let changed = false;
  for (const [pattern, replacement] of replacements) {
    const newContent = typeof pattern === "string"
      ? content.replaceAll(pattern, replacement)
      : content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  if (changed) {
    Deno.writeTextFileSync(fullPath, content);
    console.info(`Patched ${fullPath}`);
  } else {
    console.warn(`%cNo changes needed for ${fullPath}`, "color: yellow");
  }
}

function patchAllVcxproj(dirPath: string, replacements: Array<[string | RegExp, string]>) {
  const fullDirPath = path.join(rootDirPath, dirPath);
  for (const entry of fs.walkSync(fullDirPath, { exts: [".vcxproj", ".sln"] })) {
    if (entry.isFile) {
      const relativePath = path.relative(rootDirPath, entry.path);
      patchFile(relativePath, replacements);
    }
  }
}

// Create symlink: zlibstatic.vcxproj -> zlibstat.vcxproj
const symlinkTarget = path.join(rootDirPath, "zlib/contrib/vstudio/vc17/zlibstat.vcxproj");
if (!fs.existsSync(symlinkTarget)) {
  Deno.symlinkSync("zlibstatic.vcxproj", symlinkTarget, { type: "file" });
  console.info(`Created symlink ${symlinkTarget}`);
}

// Patch ReleaseWithoutAsm -> Release in all sln and vcxproj files
patchAllVcxproj("MediaInfoLib/Project/MSVC2022", [
  ["ReleaseWithoutAsm", "Release"],
]);

// Patch _CRT_SECURE_NO_WARNINGS into all vcxproj PreprocessorDefinitions
patchAllVcxproj("MediaInfoLib/Project/MSVC2022", [
  ["%(PreprocessorDefinitions)", "_CRT_SECURE_NO_WARNINGS;%(PreprocessorDefinitions)"],
]);

// Patch zlib dependency into MediaInfoDll.vcxproj
patchFile("MediaInfoLib/Project/MSVC2022/Dll/MediaInfoDll.vcxproj", [
  [
    "%(AdditionalDependencies)</AdditionalDependencies>",
    "..\\..\\..\\..\\zlib\\contrib\\vstudio\\vc17\\Release\\zs.lib;%(AdditionalDependencies)</AdditionalDependencies>",
  ],
]);
