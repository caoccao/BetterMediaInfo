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
#[cfg(target_os = "macos")]
use std::cmp::Ordering;
#[cfg(target_os = "macos")]
use std::fs;
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};

use crate::config;
use crate::protocol::{MkvTrack, MkvmergeStatus};

struct MkvToolNixResolution {
  path: PathBuf,
  auto_detected: bool,
}

pub(crate) fn parse_mkvextract_progress(line: &str) -> Option<u32> {
  let trimmed = line.trim();
  if trimmed.starts_with("Progress:") {
    trimmed
      .trim_start_matches("Progress:")
      .trim()
      .trim_end_matches('%')
      .parse::<u32>()
      .ok()
  } else {
    None
  }
}

pub(crate) fn read_mkvextract_output<F>(reader: impl Read, mut on_line: F)
where
  F: FnMut(&str),
{
  let mut buf_reader = BufReader::new(reader);
  let mut current_line = Vec::new();
  let mut byte = [0u8; 1];
  loop {
    match buf_reader.read(&mut byte) {
      Ok(0) => break,
      Ok(_) => {
        if byte[0] == b'\r' || byte[0] == b'\n' {
          if !current_line.is_empty() {
            let line = String::from_utf8_lossy(&current_line);
            on_line(&line);
            current_line.clear();
          }
        } else {
          current_line.push(byte[0]);
        }
      }
      Err(_) => break,
    }
  }
  if !current_line.is_empty() {
    let line = String::from_utf8_lossy(&current_line);
    on_line(&line);
  }
}

#[cfg(target_os = "macos")]
fn compare_version_parts(left: &[u32], right: &[u32]) -> Ordering {
  let len = left.len().max(right.len());
  for i in 0..len {
    let l = left.get(i).copied().unwrap_or(0);
    let r = right.get(i).copied().unwrap_or(0);
    match l.cmp(&r) {
      Ordering::Equal => continue,
      non_eq => return non_eq,
    }
  }
  Ordering::Equal
}

#[cfg(target_os = "macos")]
fn parse_version_parts(version: &str) -> Vec<u32> {
  version
    .split('.')
    .filter_map(|part| {
      let digits: String = part.chars().take_while(|c| c.is_ascii_digit()).collect();
      if digits.is_empty() {
        None
      } else {
        digits.parse::<u32>().ok()
      }
    })
    .collect()
}

fn get_tool_path(path: &Path, tool: &str) -> PathBuf {
  #[cfg(target_os = "windows")]
  {
    let exe_path = path.join(format!("{}.exe", tool));
    if exe_path.exists() && exe_path.is_file() {
      return exe_path;
    }
  }
  path.join(tool)
}

fn has_tool(path: &Path, tool: &str) -> bool {
  let tool_path = path.join(tool);
  if tool_path.exists() && tool_path.is_file() {
    return true;
  }
  #[cfg(target_os = "windows")]
  {
    let tool_exe_path = path.join(format!("{}.exe", tool));
    if tool_exe_path.exists() && tool_exe_path.is_file() {
      return true;
    }
  }
  false
}

#[cfg(target_os = "macos")]
fn is_default_macos_mkvtoolnix_path(path: &str) -> bool {
  path.trim().trim_end_matches('/') == "/Applications/MKVToolNix.app/Contents/MacOS"
}

#[cfg(target_os = "macos")]
fn find_latest_versioned_macos_mkvtoolnix_path(tool: &str) -> Option<PathBuf> {
  let entries = fs::read_dir("/Applications").ok()?;
  let mut latest: Option<(Vec<u32>, PathBuf)> = None;
  for entry in entries.flatten() {
    let file_name = entry.file_name();
    let app_name = match file_name.to_str() {
      Some(value) => value,
      None => continue,
    };
    if !app_name.starts_with("MKVToolNix-") || !app_name.ends_with(".app") {
      continue;
    }
    let version = &app_name["MKVToolNix-".len()..app_name.len() - ".app".len()];
    let version_parts = parse_version_parts(version);
    if version_parts.is_empty() {
      continue;
    }
    let mkvtoolnix_path = entry.path().join("Contents").join("MacOS");
    if !has_tool(&mkvtoolnix_path, tool) {
      continue;
    }
    match &latest {
      None => latest = Some((version_parts, mkvtoolnix_path)),
      Some((latest_version, _)) => {
        if compare_version_parts(&version_parts, latest_version) == Ordering::Greater {
          latest = Some((version_parts, mkvtoolnix_path));
        }
      }
    }
  }
  latest.map(|(_, path)| path)
}

fn resolve_mkvtoolnix(path: &str, tool: &str) -> MkvToolNixResolution {
  let trimmed_path = path.trim();
  let configured_path = PathBuf::from(trimmed_path);
  if has_tool(&configured_path, tool) {
    return MkvToolNixResolution {
      path: configured_path,
      auto_detected: false,
    };
  }
  #[cfg(target_os = "macos")]
  {
    if is_default_macos_mkvtoolnix_path(trimmed_path) {
      if let Some(latest_path) = find_latest_versioned_macos_mkvtoolnix_path(tool) {
        return MkvToolNixResolution {
          path: latest_path,
          auto_detected: true,
        };
      }
    }
  }
  MkvToolNixResolution {
    path: configured_path,
    auto_detected: false,
  }
}

fn persist_mkvtoolnix_path_if_auto_detected(resolution: &MkvToolNixResolution) -> Result<()> {
  if !resolution.auto_detected {
    return Ok(());
  }
  let path = resolution.path.to_string_lossy().to_string();
  let mut cfg = config::get_config();
  if cfg.mkv.mkv_toolnix_path == path {
    return Ok(());
  }
  cfg.mkv.mkv_toolnix_path = path;
  config::set_config(cfg)?;
  Ok(())
}

pub async fn get_mkv_tracks(file: String) -> Result<Vec<MkvTrack>> {
  let path = Path::new(file.as_str());
  validate_path_as_file(path)?;
  let cfg = config::get_config();
  let resolution = resolve_mkvtoolnix(&cfg.mkv.mkv_toolnix_path, "mkvmerge");
  persist_mkvtoolnix_path_if_auto_detected(&resolution)?;
  let mkvmerge_path = get_tool_path(&resolution.path, "mkvmerge");
  let mut cmd = std::process::Command::new(&mkvmerge_path);
  cmd.arg("-J").arg(&file);
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
  }
  let output = cmd
    .output()
    .map_err(|e| anyhow::anyhow!("MKVMERGE_NOT_AVAILABLE:{}: {}", mkvmerge_path.display(), e))?;
  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr);
    return Err(anyhow::anyhow!("MKVMERGE_FAILED:{}", stderr));
  }
  let json: serde_json::Value = serde_json::from_slice(&output.stdout)
    .map_err(|e| anyhow::anyhow!("MKVMERGE_PARSE_ERROR:{}", e))?;
  let tracks = json["tracks"]
    .as_array()
    .map(|arr| {
      arr.iter().map(|t| {
        let props = &t["properties"];
        MkvTrack {
          id: t["id"].as_i64().unwrap_or(0),
          number: props["number"].as_i64().unwrap_or(0),
          track_type: t["type"].as_str().unwrap_or("").to_owned(),
          codec: t["codec"].as_str().unwrap_or("").to_owned(),
          codec_id: props["codec_id"].as_str().unwrap_or("").to_owned(),
          track_name: props["track_name"].as_str().unwrap_or("").to_owned(),
          language: props["language"].as_str().unwrap_or("und").to_owned(),
        }
      }).collect()
    })
    .unwrap_or_default();
  Ok(tracks)
}

pub async fn is_mkvmerge_found(path: String) -> Result<MkvmergeStatus> {
  let trimmed_path = path.trim();
  if trimmed_path.is_empty() {
    return Ok(MkvmergeStatus {
      found: false,
      mkv_toolnix_path: String::new(),
    });
  }
  let resolution = resolve_mkvtoolnix(trimmed_path, "mkvmerge");
  let found = has_tool(&resolution.path, "mkvmerge");
  if found {
    persist_mkvtoolnix_path_if_auto_detected(&resolution)?;
  }
  Ok(MkvmergeStatus {
    found,
    mkv_toolnix_path: resolution.path.to_string_lossy().to_string(),
  })
}

pub fn spawn_mkvextract(file: &str, args: &[String]) -> Result<std::process::Child> {
  let path = Path::new(file);
  validate_path_as_file(path)?;
  let cfg = config::get_config();
  let resolution = resolve_mkvtoolnix(&cfg.mkv.mkv_toolnix_path, "mkvextract");
  persist_mkvtoolnix_path_if_auto_detected(&resolution)?;
  let mkvextract_path = get_tool_path(&resolution.path, "mkvextract");
  let mut cmd = std::process::Command::new(&mkvextract_path);
  cmd.arg(file).arg("tracks").args(args)
    .stdout(std::process::Stdio::piped())
    .stderr(std::process::Stdio::piped());
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
  }
  cmd.spawn()
    .map_err(|e| anyhow::anyhow!("MKVEXTRACT_NOT_AVAILABLE:{}: {}", mkvextract_path.display(), e))
}

fn validate_path_as_file(path: &Path) -> Result<()> {
  if !path.exists() {
    Err(anyhow::anyhow!("Path {} does not exist.", path.display()))
  } else if !path.is_file() {
    Err(anyhow::anyhow!("Path {} is not a file.", path.display()))
  } else {
    Ok(())
  }
}
