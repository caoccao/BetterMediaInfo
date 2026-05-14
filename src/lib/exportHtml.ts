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

import * as Protocol from "./protocol";
import type { ExportData } from "./export";

const STREAM_KIND_COLORS: Record<Protocol.StreamKind, string> = {
  [Protocol.StreamKind.General]: "#84cc16",
  [Protocol.StreamKind.Video]: "#f97316",
  [Protocol.StreamKind.Audio]: "#f59e0b",
  [Protocol.StreamKind.Text]: "#10b981",
  [Protocol.StreamKind.Other]: "#a3a3a3",
  [Protocol.StreamKind.Image]: "#0ea5e9",
  [Protocol.StreamKind.Menu]: "#6366f1",
  [Protocol.StreamKind.Max]: "#84cc16",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLE = `
  :root {
    color-scheme: light dark;
  }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1f2937;
    background: #ffffff;
  }
  h1 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    word-break: break-all;
  }
  h2 {
    margin: 24px 0 8px 0;
    padding: 4px 8px;
    font-size: 1.125rem;
    border-left: 4px solid currentColor;
  }
  .app {
    margin: 0 0 24px 0;
    color: #6b7280;
    font-size: 0.875rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 0.8125rem;
  }
  th, td {
    border: 1px solid #d1d5db;
    padding: 4px 8px;
    text-align: left;
    vertical-align: top;
  }
  th {
    font-weight: 600;
    white-space: nowrap;
  }
  td.property {
    white-space: nowrap;
  }
  td.value {
    white-space: pre-wrap;
    word-break: break-all;
  }
  @media (prefers-color-scheme: dark) {
    body {
      color: #e5e7eb;
      background: #111827;
    }
    .app {
      color: #9ca3af;
    }
    th, td {
      border-color: #374151;
    }
  }
`;

export function renderHtml({ file, appName, appVersion, streams }: ExportData): string {
  const lines: string[] = [];
  lines.push("<!DOCTYPE html>");
  lines.push('<html lang="en">');
  lines.push("<head>");
  lines.push('<meta charset="UTF-8">');
  lines.push(`<title>${escapeHtml(file)}</title>`);
  lines.push(`<style>${STYLE}</style>`);
  lines.push("</head>");
  lines.push("<body>");
  lines.push(`<h1>${escapeHtml(file)}</h1>`);
  lines.push(`<p class="app">Application: ${escapeHtml(appName)} v${escapeHtml(appVersion)}</p>`);

  for (const stream of streams) {
    const color = STREAM_KIND_COLORS[stream.stream] ?? "#6b7280";
    const headerBg = `${color}20`;
    lines.push(
      `<h2 style="color: ${color}; background: ${headerBg};">${escapeHtml(stream.stream)} (${stream.num + 1})</h2>`,
    );
    lines.push("<table>");
    lines.push(
      `<thead><tr><th style="background: ${headerBg};">Property</th><th style="background: ${headerBg};">Value</th></tr></thead>`,
    );
    lines.push("<tbody>");
    for (const [key, value] of stream.entries) {
      lines.push(
        `<tr><td class="property">${escapeHtml(key)}</td><td class="value">${escapeHtml(value)}</td></tr>`,
      );
    }
    lines.push("</tbody>");
    lines.push("</table>");
  }

  lines.push("</body>");
  lines.push("</html>");

  return lines.join("\n");
}
