/*
 *   Copyright (c) 2024-2026. caoccao.com Sam Cao
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import type { ExportData } from "./export";

function escapeCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

export function renderMarkdown({ file, appName, appVersion, streams }: ExportData): string {
  const lines: string[] = [];
  lines.push(`# ${file}`);
  lines.push("");
  lines.push(`Application: ${appName} v${appVersion}`);
  lines.push("");

  for (const stream of streams) {
    lines.push(`## ${stream.stream} (${stream.num + 1})`);
    lines.push("");

    let maxKeyLen = "Property".length;
    let maxValueLen = "Value".length;
    const rows: Array<[string, string]> = [];
    for (const [key, value] of stream.entries) {
      const escapedKey = escapeCell(key);
      const escapedValue = escapeCell(value);
      if (escapedKey.length > maxKeyLen) maxKeyLen = escapedKey.length;
      if (escapedValue.length > maxValueLen) maxValueLen = escapedValue.length;
      rows.push([escapedKey, escapedValue]);
    }

    lines.push(`| ${"Property".padEnd(maxKeyLen, " ")} | ${"Value".padEnd(maxValueLen, " ")} |`);
    lines.push(`| ${"-".repeat(maxKeyLen)} | ${"-".repeat(maxValueLen)} |`);
    for (const [key, value] of rows) {
      lines.push(`| ${key.padEnd(maxKeyLen, " ")} | ${value.padEnd(maxValueLen, " ")} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
