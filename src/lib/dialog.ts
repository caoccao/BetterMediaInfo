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

import { open, save } from "@tauri-apps/plugin-dialog";
import type { DialogFilter } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "./store";
import { scanFiles } from "./fs";

let filters: Array<DialogFilter> = [];

// Initialize filters from config
const initFilters = () => {
  const config = useAppStore.getState().config;
  if (config !== null) {
    filters = [
      {
        name: "Video",
        extensions: config.fileExtensions.video,
      },
      {
        name: "Image",
        extensions: config.fileExtensions.image,
      },
      {
        name: "Audio",
        extensions: config.fileExtensions.audio,
      },
    ];
  }
};

// Subscribe to config changes
useAppStore.subscribe((state) => {
  if (state.config !== null) {
    initFilters();
  }
});

export async function openDirectoryDialog(append: boolean) {
  const directory = await open({ directory: true });
  if (directory) {
    await scanFiles([directory as string], append);
  }
}

export async function openFileDialog(append: boolean) {
  initFilters();
  const files = await open({
    multiple: true,
    filters: filters,
  });
  if (files) {
    await scanFiles(files as string[], append);
  }
}

export async function openSaveJsonCodeFileDialog() {
  return await save({
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
}
