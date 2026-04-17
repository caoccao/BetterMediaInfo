/*
* Copyright (c) 2024-2026. caoccao.com Sam Cao
* All rights reserved.

* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at

* http://www.apache.org/licenses/LICENSE-2.0

* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::media_info;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct About {
  #[serde(rename = "appVersion")]
  pub app_version: String,
  #[serde(rename = "mediaInfoVersion")]
  pub media_info_version: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Parameter {
  pub id: i32,
  pub stream: media_info::MediaInfoStreamKind,
  pub property: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StreamCount {
  pub stream: media_info::MediaInfoStreamKind,
  pub count: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StreamProperty {
  pub stream: media_info::MediaInfoStreamKind,
  pub property: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StreamPropertyMap {
  pub stream: media_info::MediaInfoStreamKind,
  pub num: i32,
  #[serde(rename = "propertyMap")]
  pub property_map: HashMap<String, String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StreamPropertyValue {
  pub stream: media_info::MediaInfoStreamKind,
  pub num: i32,
  pub property: String,
  pub value: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MkvTrack {
  pub id: i64,
  pub number: i64,
  #[serde(rename = "type")]
  pub track_type: String,
  pub codec: String,
  #[serde(rename = "codecId")]
  pub codec_id: String,
  #[serde(rename = "trackName")]
  pub track_name: String,
  pub language: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MkvmergeStatus {
  pub found: bool,
  #[serde(rename = "mkvToolNixPath")]
  pub mkv_toolnix_path: String,
}

pub struct MkvextractState {
  pub children: Arc<Mutex<HashMap<String, std::process::Child>>>,
}

#[derive(Serialize, Clone)]
pub struct MkvextractProgressEvent {
  pub percent: u32,
  pub done: bool,
  pub cancelled: bool,
  pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateCheckResult {
  #[serde(rename = "hasUpdate")]
  pub has_update: bool,
  #[serde(rename = "latestVersion")]
  pub latest_version: Option<String>,
}

pub struct UpdateCheckState {
  pub result: Arc<Mutex<Option<UpdateCheckResult>>>,
}
