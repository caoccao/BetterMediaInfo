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

import { dialog, mediaFiles } from "./store";
import * as Protocol from "../lib/protocol";
import { getFiles } from "../lib/service";

export async function scanFiles(files: string[], append: boolean) {
  if (files.length > 0) {
    try {
      const newFiles = await getFiles(files);
      if (append) {
        mediaFiles.update((existingFiles) => {
          return [...new Set([...existingFiles, ...newFiles]).keys()];
        });
      } else {
        mediaFiles.set(newFiles);
      }
    } catch (error) {
      dialog.set({ title: error as string, type: Protocol.DialogType.Error });
    }
  }
}
