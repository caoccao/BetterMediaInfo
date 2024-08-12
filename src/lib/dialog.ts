/*
 *   Copyright (c) 2024. caoccao.com Sam Cao
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

import { open } from "@tauri-apps/api/dialog";
import type { DialogFilter } from "@tauri-apps/api/dialog";
import { config } from "./store";
import { scanFiles } from "./fs";

const filters: Array<DialogFilter> = [];

config.subscribe((value) => {
  if (value !== null) {
    filters.length = 0;
    filters.push({
      name: "Video",
      extensions: value.fileExtensions.video,
    });
    filters.push({
      name: "Image",
      extensions: value.fileExtensions.image,
    });
    filters.push({
      name: "Audio",
      extensions: value.fileExtensions.audio,
    });
  }
});

export async function openDirectoryDialog(append: boolean) {
  await scanFiles(
    [
      (await open({
        directory: true,
      })) as string,
    ],
    append
  );
}

export async function openFileDialog(append: boolean) {
  const files = await open({
    multiple: true,
    filters: filters,
  });
  if (files) {
    await scanFiles(files as string[], append);
  }
}
