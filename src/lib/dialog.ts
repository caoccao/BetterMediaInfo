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

import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import type { DialogFilter } from "@tauri-apps/api/dialog";
import { config, dialog, mediaFiles } from "./store";
import * as Protocol from "../lib/protocol";

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

function setMediaFiles(files: string[] | string | null) {
  if (files === null) {
    mediaFiles.set([]);
  } else if (files instanceof String) {
    mediaFiles.set([files as string]);
  } else {
    mediaFiles.set([]);
  }
}

export async function openDirectoryDialog() {
  const directory = await open({
    directory: true,
  });
  invoke<string[]>("get_files_from_directory", { path: directory })
    .then(setMediaFiles)
    .catch((error) => {
      dialog.update((_value) => {
        return { title: error, type: Protocol.DialogType.Error };
      });
    });
}

export async function openFileDialog() {
  setMediaFiles(
    await open({
      multiple: true,
      filters: filters,
    })
  );
}
