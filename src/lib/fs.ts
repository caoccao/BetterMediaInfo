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
import { dialog, mediaFiles } from "./store";
import * as Protocol from "../lib/protocol";

export async function scanFiles(files: string[]) {
  if (files.length > 0) {
    invoke<string[]>("get_files", {
      files: files,
    })
      .then((value) => {
        mediaFiles.set(value);
      })
      .catch((error) => {
        dialog.set({ title: error, type: Protocol.DialogType.Error });
      });
  }
}
