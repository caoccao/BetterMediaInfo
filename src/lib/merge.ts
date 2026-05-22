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
 * Editable fields for a single video track. `isEnabled` controls whether
 * the track is muxed into the merge output.
 */
export class MergeVideoData {
  num: number;
  isEnabled: boolean;
  title: string;
  isDefault: boolean;
  isForced: boolean;

  constructor(num: number, isEnabled = true, title = '', isDefault = false, isForced = false) {
    this.num = num;
    this.isEnabled = isEnabled;
    this.title = title;
    this.isDefault = isDefault;
    this.isForced = isForced;
  }

  clone(): MergeVideoData {
    return new MergeVideoData(this.num, this.isEnabled, this.title, this.isDefault, this.isForced);
  }
}

/**
 * Editable fields for a single audio track. `isEnabled` controls whether
 * the track is muxed into the merge output.
 */
export class MergeAudioData {
  num: number;
  isEnabled: boolean;
  title: string;
  isDefault: boolean;
  isForced: boolean;

  constructor(num: number, isEnabled = true, title = '', isDefault = false, isForced = false) {
    this.num = num;
    this.isEnabled = isEnabled;
    this.title = title;
    this.isDefault = isDefault;
    this.isForced = isForced;
  }

  clone(): MergeAudioData {
    return new MergeAudioData(this.num, this.isEnabled, this.title, this.isDefault, this.isForced);
  }
}

/**
 * Editable fields for a single subtitle / text track. `isEnabled` controls
 * whether the track is muxed into the merge output.
 */
export class MergeTextData {
  num: number;
  isEnabled: boolean;
  title: string;
  isDefault: boolean;
  isForced: boolean;

  constructor(num: number, isEnabled = true, title = '', isDefault = false, isForced = false) {
    this.num = num;
    this.isEnabled = isEnabled;
    this.title = title;
    this.isDefault = isDefault;
    this.isForced = isForced;
  }

  clone(): MergeTextData {
    return new MergeTextData(this.num, this.isEnabled, this.title, this.isDefault, this.isForced);
  }
}

/**
 * Editable fields for a single menu (chapter) track. `isEnabled` controls
 * whether the chapters are muxed into the merge output.
 */
export class MergeMenuData {
  num: number;
  isEnabled: boolean;

  constructor(num: number, isEnabled = true) {
    this.num = num;
    this.isEnabled = isEnabled;
  }

  clone(): MergeMenuData {
    return new MergeMenuData(this.num, this.isEnabled);
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

  withReorderedVideos(activeNum: number, overNum: number): MergeData {
    const next = this.clone();
    next.videos = moveByNum(next.videos, activeNum, overNum);
    return next;
  }

  withReorderedAudios(activeNum: number, overNum: number): MergeData {
    const next = this.clone();
    next.audios = moveByNum(next.audios, activeNum, overNum);
    return next;
  }

  withReorderedTexts(activeNum: number, overNum: number): MergeData {
    const next = this.clone();
    next.texts = moveByNum(next.texts, activeNum, overNum);
    return next;
  }

  withReorderedMenus(activeNum: number, overNum: number): MergeData {
    const next = this.clone();
    next.menus = moveByNum(next.menus, activeNum, overNum);
    return next;
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

  withVideoEnabled(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findVideo(num);
    if (track) { track.isEnabled = value; }
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

  withAudioEnabled(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findAudio(num);
    if (track) { track.isEnabled = value; }
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

  withTextEnabled(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findText(num);
    if (track) { track.isEnabled = value; }
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

  withMenuEnabled(num: number, value: boolean): MergeData {
    const next = this.clone();
    const track = next.findMenu(num);
    if (track) { track.isEnabled = value; }
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
          data.videos.push(new MergeVideoData(map.num, true, titleValue, isDefault, isForced));
          break;
        case Protocol.StreamKind.Audio:
          data.audios.push(new MergeAudioData(map.num, true, titleValue, isDefault, isForced));
          break;
        case Protocol.StreamKind.Text:
          data.texts.push(new MergeTextData(map.num, true, titleValue, isDefault, isForced));
          break;
        case Protocol.StreamKind.Menu:
          data.menus.push(new MergeMenuData(map.num, true));
          break;
      }
    }
    return data;
  }
}

function parseYesNo(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'yes';
}

function moveByNum<T extends { num: number }>(items: T[], activeNum: number, overNum: number): T[] {
  if (activeNum === overNum) { return items; }
  const fromIndex = items.findIndex((t) => t.num === activeNum);
  const toIndex = items.findIndex((t) => t.num === overNum);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) { return items; }
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
