/*
 *   Copyright (c) 2024-2025. caoccao.com Sam Cao
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

import { invoke } from "@tauri-apps/api/core";
import * as Protocol from "./protocol";

export async function getAbout(): Promise<Protocol.About> {
  return await invoke<Protocol.About>("get_about");
}

export async function getConfig(): Promise<Protocol.Config> {
  return await invoke<Protocol.Config>("get_config");
}

export async function getFiles(files: string[]): Promise<string[]> {
  return await invoke<string[]>("get_files", { files });
}

export async function getParameters(): Promise<Array<Protocol.Parameter>> {
  return await invoke<Array<Protocol.Parameter>>("get_parameters");
}

export async function getPropertiesMap(
  file: string,
  properties: Array<Protocol.StreamProperty> | null
): Promise<Array<Protocol.StreamPropertyMap>> {
  return await invoke<Array<Protocol.StreamPropertyMap>>("get_properties", {
    file,
    properties,
  });
}

export async function getStreamCountMap(
  file: string
): Promise<Map<Protocol.StreamKind, Protocol.StreamCount>> {
  const streamCountMap = new Map<Protocol.StreamKind, Protocol.StreamCount>();
  const streamCounts = await invoke<Protocol.StreamCount[]>(
    "get_stream_count",
    { file }
  );
  streamCounts.forEach((streamCount) => {
    streamCountMap.set(streamCount.stream, streamCount);
  });
  return streamCountMap;
}

export async function setConfig(
  config: Protocol.Config
): Promise<Protocol.Config> {
  return await invoke<Protocol.Config>("set_config", { config });
}

export async function writeTextFile(file: string, text: string): Promise<void> {
  return await invoke<void>("write_text_file", { file, text });
}
