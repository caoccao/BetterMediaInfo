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
pub struct MkvToolNixStatus {
  pub found: bool,
  #[serde(rename = "mkvToolNixPath")]
  pub mkv_toolnix_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BatchMkvExtractStatus {
  pub found: bool,
  pub path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BDMasterStatus {
  pub found: bool,
  pub path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MpcHcStatus {
  pub found: bool,
  pub path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FfmpegStatus {
  pub found: bool,
  pub path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BDStatus {
  #[serde(rename = "isBluRay")]
  pub is_blu_ray: bool,
  #[serde(rename = "isFolder")]
  pub is_folder: bool,
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

pub struct MkvmergeState {
  pub children: Arc<Mutex<HashMap<String, std::process::Child>>>,
}

#[derive(Serialize, Clone)]
pub struct MkvmergeProgressEvent {
  pub percent: u32,
  pub done: bool,
  pub cancelled: bool,
  pub error: Option<String>,
}

pub struct FfmpegCaptureState {
  pub children: Arc<Mutex<HashMap<String, std::process::Child>>>,
  /// Per-window cancellation flags. The capture pass is cancelled by killing the
  /// ffmpeg child, but the trim pass has no child process, so it is cancelled by
  /// flipping this flag, which the trim workers poll.
  pub cancels: Arc<Mutex<HashMap<String, Arc<std::sync::atomic::AtomicBool>>>>,
}

#[derive(Serialize, Clone)]
pub struct FfmpegCaptureProgressEvent {
  pub percent: u32,
  pub done: bool,
  pub cancelled: bool,
  pub error: Option<String>,
  /// Which pass the progress refers to: `"capture"` (ffmpeg screenshotting) or
  /// `"trim"` (the post-process border-trim pass). The frontend uses this to flip
  /// the label under the progress bar between the two passes.
  pub phase: String,
  /// For the trim pass, the number of images processed so far and the total to
  /// process. Both are 0 during the capture pass (which is time-based instead).
  pub current: u32,
  pub total: u32,
}

#[derive(Serialize, Clone)]
pub struct FfmpegCaptureFrameEvent {
  pub bytes: Vec<u8>,
}

/// Border-trim request supplied by the FFmpeg Tools window. When `enabled`, each
/// captured image is cropped to its content area: edges whose pixels are within
/// `tolerance` (percent) of `color` are removed, mirroring ImageMagick `-trim`.
#[derive(Debug, Clone, Deserialize)]
pub struct TrimOptions {
  pub enabled: bool,
  /// Trim color as a `#RRGGBB` hex string (defaults to black on the frontend).
  pub color: String,
  /// Fuzz tolerance as a percentage (0–100); 0 trims only exact matches.
  pub tolerance: f64,
  /// Number of worker threads to use for the trim pass. The frontend defaults
  /// this to the CPU core count; `0` (or a missing field) falls back to the core
  /// count on the backend.
  #[serde(default)]
  pub threads: usize,
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
