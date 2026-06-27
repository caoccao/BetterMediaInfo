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
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdout, Command, Stdio};
use std::time::SystemTime;

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

/// Resolve the configured FFmpeg binary (the directory in config + `ffmpeg[.exe]`).
fn ffmpeg_binary() -> Result<PathBuf> {
  let cfg = config::get_config();
  let (resolved, found) = resolve(&cfg.ffmpeg.path);
  if !found {
    return Err(anyhow::anyhow!("FFMPEG_NOT_AVAILABLE:{}", resolved.display()));
  }
  binary_path(&resolved).ok_or_else(|| anyhow::anyhow!("FFMPEG_NOT_AVAILABLE:{}", resolved.display()))
}

/// Spawn ffmpeg with the given arguments, piping stdout/stderr. Mirrors the
/// process-spawning convention used for mkvextract (hidden window on Windows).
pub fn spawn_ffmpeg(args: &[String]) -> Result<Child> {
  let exe = ffmpeg_binary()?;
  let mut cmd = Command::new(&exe);
  cmd
    .args(args)
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
  }
  cmd
    .spawn()
    .map_err(|e| anyhow::anyhow!("FFMPEG_NOT_AVAILABLE:{}: {}", exe.display(), e))
}

/// Grab a single frame at `position_seconds` as PNG bytes, downscaled to at
/// most `max_width` px wide so the IPC payload stays small. Used by the seek
/// slider in the preview window. `-ss` before `-i` is fast keyframe seeking.
pub fn capture_frame(file: String, position_seconds: f64, max_width: u32) -> Result<Vec<u8>> {
  let path = Path::new(&file);
  if !path.exists() || !path.is_file() {
    return Err(anyhow::anyhow!("File not found: {}", file));
  }
  let pos = if position_seconds.is_finite() && position_seconds > 0.0 {
    position_seconds
  } else {
    0.0
  };
  let width = max_width.max(16);
  let args = vec![
    "-hide_banner".to_string(),
    "-loglevel".to_string(),
    "error".to_string(),
    "-ss".to_string(),
    format!("{:.3}", pos),
    "-i".to_string(),
    file.clone(),
    "-frames:v".to_string(),
    "1".to_string(),
    "-vf".to_string(),
    format!("scale='min({},iw)':-1", width),
    "-f".to_string(),
    "image2pipe".to_string(),
    "-vcodec".to_string(),
    "png".to_string(),
    "pipe:1".to_string(),
  ];
  let mut child = spawn_ffmpeg(&args)?;
  let mut stdout = child
    .stdout
    .take()
    .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
  let mut buf = Vec::new();
  stdout.read_to_end(&mut buf)?;
  let status = child.wait()?;
  if !status.success() {
    let mut err = String::new();
    if let Some(mut stderr) = child.stderr.take() {
      let _ = stderr.read_to_string(&mut err);
    }
    return Err(anyhow::anyhow!("FFMPEG_FRAME_FAILED:{}", err.trim()));
  }
  if buf.is_empty() {
    return Err(anyhow::anyhow!("FFMPEG_FRAME_FAILED:no frame produced"));
  }
  Ok(buf)
}

/// Read ffmpeg's `-progress pipe:1` stream, invoking `on_time` with the output
/// position (in seconds) every time a progress block reports `out_time_us`.
pub fn read_capture_progress<F: FnMut(f64)>(stdout: ChildStdout, mut on_time: F) {
  let reader = BufReader::new(stdout);
  for line in reader.lines() {
    let Ok(line) = line else {
      break;
    };
    let line = line.trim();
    if let Some(rest) = line.strip_prefix("out_time_us=") {
      if let Ok(us) = rest.trim().parse::<i64>() {
        if us >= 0 {
          on_time(us as f64 / 1_000_000.0);
        }
      }
    }
  }
}

/// Find the most recently modified image file in `dir` produced at or after
/// `since`. Used to show the frame currently being captured in the preview.
pub fn newest_image_in_dir(dir: &Path, since: SystemTime) -> Option<PathBuf> {
  let mut best: Option<(SystemTime, PathBuf)> = None;
  for entry in std::fs::read_dir(dir).ok()?.flatten() {
    let path = entry.path();
    if !path.is_file() {
      continue;
    }
    let is_image = path
      .extension()
      .and_then(|e| e.to_str())
      .map(|e| matches!(e.to_ascii_lowercase().as_str(), "png" | "jpg" | "jpeg"))
      .unwrap_or(false);
    if !is_image {
      continue;
    }
    let Ok(modified) = entry.metadata().and_then(|m| m.modified()) else {
      continue;
    };
    if modified < since {
      continue;
    }
    if best.as_ref().map_or(true, |(t, _)| modified >= *t) {
      best = Some((modified, path));
    }
  }
  best.map(|(_, p)| p)
}
