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

import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useAppStore } from './store';
import * as Protocol from './protocol';

const openExtractWindows = new Map<string, WebviewWindow>();

function fileToLabel(file: string): string {
  let hash = 0;
  for (let i = 0; i < file.length; i++) {
    hash = ((hash << 5) - hash + file.charCodeAt(i)) | 0;
  }
  return `extract-${(hash >>> 0).toString(36)}`;
}

export function openExtractWindow(file: string) {
  const existing = openExtractWindows.get(file);
  if (existing) {
    existing.unminimize().then(() => existing.setFocus());
    return;
  }
  const label = fileToLabel(file);
  const config = useAppStore.getState().config;
  const displayMode = config?.displayMode ?? Protocol.DisplayMode.Auto;
  const theme = config?.theme ?? Protocol.Theme.Ocean;
  const language = config?.language ?? Protocol.Language.EnUS;
  const mkvToolNixPath = config?.mkv?.mkvToolNixPath ?? '';
  const params = new URLSearchParams({
    extract: file,
    displayMode,
    theme,
    language,
    mkvToolNixPath,
  });
  const webview = new WebviewWindow(label, {
    url: `/?${params.toString()}`,
    title: `Extract - ${file}`,
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
  });
  openExtractWindows.set(file, webview);
  webview.once('tauri://destroyed', () => {
    openExtractWindows.delete(file);
  });
}
