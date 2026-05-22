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

const openMergeWindows = new Map<string, WebviewWindow>();

function fileToLabel(file: string): string {
  let hash = 0;
  for (let i = 0; i < file.length; i++) {
    hash = ((hash << 5) - hash + file.charCodeAt(i)) | 0;
  }
  return `merge-${(hash >>> 0).toString(36)}`;
}

export function openMergeWindow(file: string) {
  const existing = openMergeWindows.get(file);
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
    merge: file,
    displayMode,
    theme,
    language,
    mkvToolNixPath,
  });
  const webview = new WebviewWindow(label, {
    url: `/?${params.toString()}`,
    title: `Merge - ${file}`,
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 500,
  });
  openMergeWindows.set(file, webview);
  webview.once('tauri://destroyed', () => {
    openMergeWindows.delete(file);
  });
}

/**
 * Editable fields for the General stream. Exactly one General per file.
 */
export class MergeGeneralData {
  title: string;

  constructor(title = '') {
    this.title = title;
  }

  clone(): MergeGeneralData {
    return new MergeGeneralData(this.title);
  }
}

/**
 * Editable fields for a single video track.
 */
export class MergeVideoData {
  num: number;
  title: string;
  isDefault: boolean;
  isForced: boolean;

  constructor(num: number, title = '', isDefault = false, isForced = false) {
    this.num = num;
    this.title = title;
    this.isDefault = isDefault;
    this.isForced = isForced;
  }

  clone(): MergeVideoData {
    return new MergeVideoData(this.num, this.title, this.isDefault, this.isForced);
  }
}

/**
 * Editable fields for a single audio track.
 */
export class MergeAudioData {
  num: number;
  title: string;
  isDefault: boolean;
  isForced: boolean;

  constructor(num: number, title = '', isDefault = false, isForced = false) {
    this.num = num;
    this.title = title;
    this.isDefault = isDefault;
    this.isForced = isForced;
  }

  clone(): MergeAudioData {
    return new MergeAudioData(this.num, this.title, this.isDefault, this.isForced);
  }
}

/**
 * Editable fields for a single subtitle / text track.
 */
export class MergeTextData {
  num: number;
  title: string;
  isDefault: boolean;
  isForced: boolean;

  constructor(num: number, title = '', isDefault = false, isForced = false) {
    this.num = num;
    this.title = title;
    this.isDefault = isDefault;
    this.isForced = isForced;
  }

  clone(): MergeTextData {
    return new MergeTextData(this.num, this.title, this.isDefault, this.isForced);
  }
}

/**
 * Editable fields for a single menu (chapter) track. Menus currently expose
 * no editable cells in the merge window, but the entry exists so the
 * hierarchy reflects every stream type and so we can add menu-level
 * options later without changing callers.
 */
export class MergeMenuData {
  num: number;

  constructor(num: number) {
    this.num = num;
  }

  clone(): MergeMenuData {
    return new MergeMenuData(this.num);
  }
}

/**
 * Holds every user-editable field in the merge window, organized to mirror
 * the stream hierarchy. Stream property maps from media info are read-only,
 * so this class is the single source of truth that will eventually be
 * turned into the mkvmerge command-line arguments.
 *
 * Treated as immutable from outside: each `with*` mutator returns a new
 * instance so React state updates trigger re-renders.
 */
export class MergeData {
  destinationFile: string;
  general: MergeGeneralData;
  videos: MergeVideoData[];
  audios: MergeAudioData[];
  texts: MergeTextData[];
  menus: MergeMenuData[];

  constructor(
    destinationFile = '',
    general: MergeGeneralData = new MergeGeneralData(),
    videos: MergeVideoData[] = [],
    audios: MergeAudioData[] = [],
    texts: MergeTextData[] = [],
    menus: MergeMenuData[] = [],
  ) {
    this.destinationFile = destinationFile;
    this.general = general;
    this.videos = videos;
    this.audios = audios;
    this.texts = texts;
    this.menus = menus;
  }

  clone(): MergeData {
    return new MergeData(
      this.destinationFile,
      this.general.clone(),
      this.videos.map((t) => t.clone()),
      this.audios.map((t) => t.clone()),
      this.texts.map((t) => t.clone()),
      this.menus.map((t) => t.clone()),
    );
  }

  findVideo(num: number): MergeVideoData | null {
    return this.videos.find((t) => t.num === num) ?? null;
  }

  findAudio(num: number): MergeAudioData | null {
    return this.audios.find((t) => t.num === num) ?? null;
  }

  findText(num: number): MergeTextData | null {
    return this.texts.find((t) => t.num === num) ?? null;
  }

  findMenu(num: number): MergeMenuData | null {
    return this.menus.find((t) => t.num === num) ?? null;
  }

  withDestinationFile(value: string): MergeData {
    const next = this.clone();
    next.destinationFile = value;
    return next;
  }

  withGeneralTitle(value: string): MergeData {
    const next = this.clone();
    next.general.title = value;
    return next;
  }

  withVideoTitle(num: number, value: string): MergeData {
    const next = this.clone();
    const track = next.findVideo(num);
    if (track) { track.title = value; }
    return next;
  }

  withVideoDefault(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findVideo(num);
    if (track) { track.isDefault = value; }
    return next;
  }

  withVideoForced(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findVideo(num);
    if (track) { track.isForced = value; }
    return next;
  }

  withAudioTitle(num: number, value: string): MergeData {
    const next = this.clone();
    const track = next.findAudio(num);
    if (track) { track.title = value; }
    return next;
  }

  withAudioDefault(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findAudio(num);
    if (track) { track.isDefault = value; }
    return next;
  }

  withAudioForced(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findAudio(num);
    if (track) { track.isForced = value; }
    return next;
  }

  withTextTitle(num: number, value: string): MergeData {
    const next = this.clone();
    const track = next.findText(num);
    if (track) { track.title = value; }
    return next;
  }

  withTextDefault(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findText(num);
    if (track) { track.isDefault = value; }
    return next;
  }

  withTextForced(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findText(num);
    if (track) { track.isForced = value; }
    return next;
  }

  /**
   * Build a MergeData from media info property maps. The destination file
   * is left empty — callers fill it in separately via withDestinationFile.
   */
  static fromPropertyMaps(maps: Array<Protocol.StreamPropertyMap>): MergeData {
    const data = new MergeData();
    for (const map of maps) {
      const titleValue = map.propertyMap['Title'] ?? '';
      const isDefault = parseYesNo(map.propertyMap['Default']);
      const isForced = parseYesNo(map.propertyMap['Forced']);
      switch (map.stream) {
        case Protocol.StreamKind.General:
          if (map.num === 0) { data.general.title = titleValue; }
          break;
        case Protocol.StreamKind.Video:
          data.videos.push(new MergeVideoData(map.num, titleValue, isDefault, isForced));
          break;
        case Protocol.StreamKind.Audio:
          data.audios.push(new MergeAudioData(map.num, titleValue, isDefault, isForced));
          break;
        case Protocol.StreamKind.Text:
          data.texts.push(new MergeTextData(map.num, titleValue, isDefault, isForced));
          break;
        case Protocol.StreamKind.Menu:
          data.menus.push(new MergeMenuData(map.num));
          break;
      }
    }
    return data;
  }
}

function parseYesNo(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'yes';
}
