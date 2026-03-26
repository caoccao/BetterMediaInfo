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

export interface About {
  appVersion: string;
  mediaInfoVersion: string;
}

export enum FormatPrecision {
  Zero = "Zero",
  One = "One",
  Two = "Two",
}

export enum FormatUnit {
  K = "K",
  KM = "KM",
  KMG = "KMG",
  KMGT = "KMGT",
  KMi = "KMi",
  KMiGi = "KMiGi",
  KMiGiTi = "KMiGiTi",
}

export interface ConfigBitRate {
  precision: FormatPrecision;
  unit: FormatUnit;
}

export interface ConfigSize {
  precision: FormatPrecision;
  unit: FormatUnit;
}

export enum Language {
  De = "de",
  EnUS = "en-US",
  Es = "es",
  Fr = "fr",
  Ja = "ja",
  ZhCN = "zh-CN",
  ZhHK = "zh-HK",
  ZhTW = "zh-TW",
}

export interface ConfigStreamFormat {
  bitRate: ConfigBitRate;
  size: ConfigSize;
}

export interface Config {
  appendOnFileDrop: boolean;
  displayMode: DisplayMode;
  theme: Theme;
  directoryMode: ConfigDirectoryMode;
  fileExtensions: ConfigFileExtensions;
  language: Language;
  video: ConfigStreamFormat;
  audio: ConfigStreamFormat;
  subtitle: ConfigStreamFormat;
}

export enum DisplayMode {
  Auto = "Auto",
  Light = "Light",
  Dark = "Dark",
}

export enum Theme {
  Ocean = "Ocean",
  Aqua = "Aqua",
  Sky = "Sky",
  Arctic = "Arctic",
  Glacier = "Glacier",
  Mist = "Mist",
  Slate = "Slate",
  Charcoal = "Charcoal",
  Midnight = "Midnight",
  Indigo = "Indigo",
  Violet = "Violet",
  Lavender = "Lavender",
  Rose = "Rose",
  Blush = "Blush",
  Coral = "Coral",
  Sunset = "Sunset",
  Amber = "Amber",
  Sand = "Sand",
  Forest = "Forest",
  Emerald = "Emerald",
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
  Info,
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

export function getLanguages(): Language[] {
  return [
    Language.De,
    Language.EnUS,
    Language.Es,
    Language.Fr,
    Language.Ja,
    Language.ZhCN,
    Language.ZhHK,
    Language.ZhTW,
  ];
}

export function getLanguageLabel(language: Language): string {
  switch (language) {
    case Language.De: return "Deutsch";
    case Language.EnUS: return "English (US)";
    case Language.Es: return "Español";
    case Language.Fr: return "Français";
    case Language.Ja: return "日本語";
    case Language.ZhCN: return "简体中文";
    case Language.ZhHK: return "繁體中文 (香港)";
    case Language.ZhTW: return "繁體中文 (臺灣)";
  }
}

export function getFormatPrecisions(): FormatPrecision[] {
  return [FormatPrecision.Zero, FormatPrecision.One, FormatPrecision.Two];
}

export function getFormatUnits(): FormatUnit[] {
  return [
    FormatUnit.K,
    FormatUnit.KM,
    FormatUnit.KMG,
    FormatUnit.KMGT,
    FormatUnit.KMi,
    FormatUnit.KMiGi,
    FormatUnit.KMiGiTi,
  ];
}

export function getFormatPrecisionLabel(precision: FormatPrecision): string {
  switch (precision) {
    case FormatPrecision.Zero: return "#";
    case FormatPrecision.One: return "#.#";
    case FormatPrecision.Two: return "#.##";
  }
}

export function getFormatUnitLabel(unit: FormatUnit): string {
  switch (unit) {
    case FormatUnit.K: return "k";
    case FormatUnit.KM: return "k/M";
    case FormatUnit.KMG: return "k/M/G";
    case FormatUnit.KMGT: return "k/M/G/T";
    case FormatUnit.KMi: return "k/Mi";
    case FormatUnit.KMiGi: return "k/Mi/Gi";
    case FormatUnit.KMiGiTi: return "k/Mi/Gi/Ti";
  }
}

export function getConfigDirectoryModes(): ConfigDirectoryMode[] {
  return [
    ConfigDirectoryMode.All,
    ConfigDirectoryMode.Audio,
    ConfigDirectoryMode.Image,
    ConfigDirectoryMode.Video,
  ];
}

export function getDisplayModes(): DisplayMode[] {
  return [
    DisplayMode.Auto,
    DisplayMode.Light,
    DisplayMode.Dark,
  ];
}

export function getThemes(): Theme[] {
  return [
    Theme.Ocean,
    Theme.Aqua,
    Theme.Sky,
    Theme.Arctic,
    Theme.Glacier,
    Theme.Mist,
    Theme.Slate,
    Theme.Charcoal,
    Theme.Midnight,
    Theme.Indigo,
    Theme.Violet,
    Theme.Lavender,
    Theme.Rose,
    Theme.Blush,
    Theme.Coral,
    Theme.Sunset,
    Theme.Amber,
    Theme.Sand,
    Theme.Forest,
    Theme.Emerald,
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
