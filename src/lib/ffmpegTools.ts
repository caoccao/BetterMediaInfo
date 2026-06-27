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

const openFfmpegToolsWindows = new Map<string, WebviewWindow>();
// Files whose window is being created (the SHA-256 label is async), so a fast
// double-click can't spawn two windows for the same file.
const pendingFiles = new Set<string>();

// Derive a collision-free window label from the full file path. A SHA-256 hash
// is used because a weak rolling hash could map two different files to the same
// label, which would corrupt window routing.
async function fileToLabel(file: string): Promise<string> {
  const data = new TextEncoder().encode(file);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `ffmpeg-tools-${hex}`;
}

export async function openFfmpegToolsWindow(file: string) {
  const existing = openFfmpegToolsWindows.get(file);
  if (existing) {
    existing.unminimize().then(() => existing.setFocus());
    return;
  }
  if (pendingFiles.has(file)) return;
  pendingFiles.add(file);
  try {
    const label = await fileToLabel(file);
    const config = useAppStore.getState().config;
    const displayMode = config?.displayMode ?? Protocol.DisplayMode.Auto;
    const theme = config?.theme ?? Protocol.Theme.Ocean;
    const language = config?.language ?? Protocol.Language.EnUS;
    const ffmpegPath = config?.ffmpeg?.path ?? '';
    const params = new URLSearchParams({
      ffmpegTools: file,
      displayMode,
      theme,
      language,
      ffmpegPath,
    });
    const webview = new WebviewWindow(label, {
      url: `/?${params.toString()}`,
      title: `FFmpeg Tools - ${file}`,
      width: 1200,
      height: 760,
      minWidth: 600,
      minHeight: 400,
      // Created hidden; the window resizes itself to fit the video and then
      // reveals itself, so it never flashes at the wrong size.
      visible: false,
    });
    openFfmpegToolsWindows.set(file, webview);
    webview.once('tauri://destroyed', () => {
      openFfmpegToolsWindows.delete(file);
    });
  } finally {
    pendingFiles.delete(file);
  }
}
