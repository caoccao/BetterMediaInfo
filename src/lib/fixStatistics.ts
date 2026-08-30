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
import { emitTo } from '@tauri-apps/api/event';
import { useAppStore } from './store';
import * as Protocol from './protocol';
import i18n from '../i18n';

export const MKV_STATISTICS_FIXED_EVENT = 'mkv-statistics-fixed';
export const MKV_STATISTICS_ADD_FILE_EVENT = 'mkv-statistics-add-file';
export const MKV_STATISTICS_READY_EVENT = 'mkv-statistics-ready';

const FIX_STATISTICS_WINDOW_LABEL = 'fix-statistics';
let openFixStatisticsWindowInstance: WebviewWindow | null = null;
let fixStatisticsWindowReady = false;
const queuedFiles = new Set<string>();

export function openFixStatisticsWindow(file: string) {
  if (openFixStatisticsWindowInstance) {
    if (fixStatisticsWindowReady) {
      void emitTo(FIX_STATISTICS_WINDOW_LABEL, MKV_STATISTICS_ADD_FILE_EVENT, { file });
    } else {
      queuedFiles.add(file);
    }
    openFixStatisticsWindowInstance.unminimize().then(() => openFixStatisticsWindowInstance?.setFocus());
    return;
  }

  const config = useAppStore.getState().config;
  const displayMode = config?.displayMode ?? Protocol.DisplayMode.Auto;
  const theme = config?.theme ?? Protocol.Theme.Ocean;
  const language = config?.language ?? Protocol.Language.EnUS;
  const params = new URLSearchParams({
    fixStatistics: file,
    displayMode,
    theme,
    language,
  });
  const webview = new WebviewWindow(FIX_STATISTICS_WINDOW_LABEL, {
    url: `/?${params.toString()}`,
    title: i18n.t('fixStatistics.title'),
    width: 800,
    height: 420,
    minWidth: 600,
    minHeight: 300,
    closable: false,
  });
  openFixStatisticsWindowInstance = webview;
  fixStatisticsWindowReady = false;
  webview.once(MKV_STATISTICS_READY_EVENT, () => {
    fixStatisticsWindowReady = true;
    for (const queuedFile of queuedFiles) {
      void emitTo(FIX_STATISTICS_WINDOW_LABEL, MKV_STATISTICS_ADD_FILE_EVENT, { file: queuedFile });
    }
    queuedFiles.clear();
  });
  webview.once('tauri://destroyed', () => {
    openFixStatisticsWindowInstance = null;
    fixStatisticsWindowReady = false;
    queuedFiles.clear();
  });
  webview.once<string>('tauri://error', (event) => {
    openFixStatisticsWindowInstance = null;
    fixStatisticsWindowReady = false;
    queuedFiles.clear();
    useAppStore.getState().setDialogNotification({
      title: i18n.t('fixStatistics.error.windowOpenFailed', { detail: String(event.payload) }),
      type: Protocol.DialogNotificationType.Error,
    });
  });
}
