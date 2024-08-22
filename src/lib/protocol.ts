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

export interface About {
  appVersion: string;
  mediaInfoVersion: string;
}

export interface Config {
  appendOnFileDrop: boolean;
  directoryMode: ConfigDirectoryMode;
  fileExtensions: ConfigFileExtensions;
  streams: ConfigStreams;
}

export enum ConfigDirectoryMode {
  All = "All",
  Audio = "Audio",
  Image = "Image",
  Video = "Video",
}

export interface ConfigFileExtensions {
  audio: string[];
  image: string[];
  video: string[];
}

export interface ConfigStreams {
  general: string[];
}

export enum ControlStatus {
  Hidden,
  Selected,
  Visible,
}

export interface DialogJsonCode {
  title: string;
  jsonCode: Array<StreamPropertyMap> | null;
}

export interface DialogNotification {
  title: string;
  type: DialogNotificationType;
}

export enum DialogNotificationType {
  Notification,
  Error,
}

export interface Info {
  file: String;
  stream: StreamKind;
  property: String;
  value: String;
}

export interface Parameter {
  id: number;
  stream: StreamKind;
  property: string;
}

export interface PropertyValue {
  property: string;
  value: string;
}

export interface StreamCount {
  stream: StreamKind;
  count: number;
}

export enum StreamKind {
  General = "General",
  Video = "Video",
  Audio = "Audio",
  Text = "Text",
  Other = "Other",
  Image = "Image",
  Menu = "Menu",
  Max = "Max",
}

export interface StreamProperty {
  stream: StreamKind;
  property: String;
}

export interface StreamPropertyMap {
  stream: StreamKind;
  num: number;
  propertyMap: Record<string, string>;
}

export interface StreamPropertyValue {
  stream: StreamKind;
  num: number;
  property: string;
  value: string;
}

export enum TabType {
  About,
  Config,
  Details,
  List,
}

export interface TabControl {
  type: TabType;
  index: number;
  value: string | null;
}

export function getConfigDirectoryModes(): ConfigDirectoryMode[] {
  return [
    ConfigDirectoryMode.All,
    ConfigDirectoryMode.Audio,
    ConfigDirectoryMode.Image,
    ConfigDirectoryMode.Video,
  ];
}

const streamKindToColorMap = new Map<StreamKind, string>();
streamKindToColorMap.set(StreamKind.General, "lime");
streamKindToColorMap.set(StreamKind.Video, "orange");
streamKindToColorMap.set(StreamKind.Audio, "amber");
streamKindToColorMap.set(StreamKind.Text, "emerald");
streamKindToColorMap.set(StreamKind.Other, "neutral");
streamKindToColorMap.set(StreamKind.Image, "sky");
streamKindToColorMap.set(StreamKind.Menu, "indigo");
streamKindToColorMap.set(StreamKind.Max, "lime");

export const STREAM_KIND_TO_COLOR_MAP = Object.freeze(streamKindToColorMap);

const streamKindToIndexMap = new Map<StreamKind, number>();
streamKindToIndexMap.set(StreamKind.General, 0);
streamKindToIndexMap.set(StreamKind.Video, 1);
streamKindToIndexMap.set(StreamKind.Audio, 2);
streamKindToIndexMap.set(StreamKind.Text, 3);
streamKindToIndexMap.set(StreamKind.Other, 4);
streamKindToIndexMap.set(StreamKind.Image, 5);
streamKindToIndexMap.set(StreamKind.Menu, 6);
streamKindToIndexMap.set(StreamKind.Max, 7);

export const STREAM_KIND_TO_INDEX_MAP = Object.freeze(streamKindToIndexMap);

export const STREAM_KINDS = Object.freeze([
  StreamKind.General,
  StreamKind.Video,
  StreamKind.Audio,
  StreamKind.Text,
  StreamKind.Other,
  StreamKind.Image,
  StreamKind.Menu,
  StreamKind.Max,
]);
