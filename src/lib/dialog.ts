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
import { mediaFiles } from "./store";

export async function openDirectoryDialog() {
  const selectedDirectory = await open({
    directory: true,
  });
  // TODO
  return selectedDirectory;
}

export async function openFileDialog() {
  const selectedFiles = await open({
    multiple: true,
    filters: [
      {
        name: "Video",
        extensions: ["mkv", "mp4", "avi", "mov", "wmv", "flv", "webm"],
      },
      {
        name: "Image",
        extensions: ["jpg", "jpeg", "png", "bmp", "gif"],
      },
      {
        name: "Audio",
        extensions: [
          "mp3",
          "aac",
          "flac",
          "wav",
          "ogg",
          "m4a",
          "mka",
          "webm",
          "ape",
        ],
      },
    ],
  });
  if (selectedFiles === null) {
    mediaFiles.set([]);
  } else if (selectedFiles instanceof String) {
    mediaFiles.set([selectedFiles as string]);
  } else {
    mediaFiles.set(selectedFiles as string[]);
  }
}
