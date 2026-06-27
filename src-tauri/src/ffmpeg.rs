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

use anyhow::Result;
use std::path::{Path, PathBuf};

use crate::config;
use crate::protocol::FfmpegStatus;

const TOOL_STEM: &str = "ffmpeg";

fn binary_path(dir: &Path) -> Option<PathBuf> {
  // macOS/Linux carry the bare `ffmpeg` name; Windows uses the `.exe` suffix.
  // Unlike the GUI tools there is no running-process or app-bundle detection,
  // because FFmpeg is a command-line binary rather than a launchable app.
  let direct = dir.join(TOOL_STEM);
  if direct.exists() && direct.is_file() {
    return Some(direct);
  }
  #[cfg(target_os = "windows")]
  {
    let exe = dir.join(format!("{}.exe", TOOL_STEM));
    if exe.exists() && exe.is_file() {
      return Some(exe);
    }
  }
  None
}

fn has_executable(path: &Path) -> bool {
  binary_path(path).is_some()
}

fn resolve(path: &str) -> (PathBuf, bool) {
  let trimmed = path.trim();
  let configured = PathBuf::from(trimmed);
  if has_executable(&configured) {
    return (configured, true);
  }
  (configured, false)
}

fn persist_path(path: &Path) -> Result<()> {
  let new_path = path.to_string_lossy().to_string();
  let mut cfg = config::get_config();
  if cfg.ffmpeg.path == new_path {
    return Ok(());
  }
  cfg.ffmpeg.path = new_path;
  config::set_config(cfg)?;
  Ok(())
}

pub async fn is_ffmpeg_found(path: String) -> Result<FfmpegStatus> {
  let trimmed = path.trim();
  if trimmed.is_empty() {
    return Ok(FfmpegStatus {
      found: false,
      path: String::new(),
    });
  }
  let (resolved, found) = resolve(trimmed);
  if found {
    persist_path(&resolved)?;
  }
  Ok(FfmpegStatus {
    found,
    path: resolved.to_string_lossy().to_string(),
  })
}
