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

export enum ControlStatus {
  Hidden,
  Selected,
  Visible,
}

export interface Config {
  settings: ConfigSettings;
  streams: ConfigStreams;
}

export interface ConfigSettings {
  audio_file_extensions: Array<String>;
  image_file_extensions: Array<String>;
  video_file_extensions: Array<String>;
}

export interface ConfigStreams {
  general: Array<string>;
}

export interface Parameter {
  id: number;
  stream: string;
  property: string;
}

export enum TabType {
  About,
  List,
  Settings,
}

export interface TabControl {
  type: TabType;
  index: number;
}
