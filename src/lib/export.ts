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

import type * as Protocol from "./protocol";

export interface ExportStream {
  stream: Protocol.StreamKind;
  num: number;
  entries: Array<[string, string]>;
}

export interface ExportData {
  file: string;
  appName: string;
  appVersion: string;
  streams: ExportStream[];
}

export type ExportFormat = "text" | "markdown" | "html" | "png";

export const EXPORT_FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  text: "txt",
  markdown: "md",
  html: "html",
  png: "png",
};
