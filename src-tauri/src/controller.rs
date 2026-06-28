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
use once_cell::sync::Lazy;
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Child;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, EventTarget, Window};

use crate::batchmkvextract;
use crate::bd;
use crate::bdmaster;
use crate::config;
use crate::constants::APP_NAME;
use crate::context_menu;
use crate::ffmpeg;
use crate::media_info::*;
use crate::mkvtoolnix;
use crate::mpchc;
use crate::protocol::*;
use crate::streams::*;
#[cfg(target_os = "windows")]
use crate::taskbar;

/// Shared map of running child processes keyed by the owning window label.
pub type ChildMap = Arc<Mutex<HashMap<String, Child>>>;
pub type CancelMap = Arc<Mutex<HashMap<String, Arc<std::sync::atomic::AtomicBool>>>>;

static ALL_STREAMS: Lazy<Vec<Stream>> = Lazy::new(|| {
  let media_info = MediaInfo::new();
  let info_parameters = media_info
    .getOption(MediaInfoGetOption::InfoParameters)
    .expect("Failed to get info parameters.");
  Stream::parse(info_parameters)
});

static ALL_PROPERTIES_MAP: Lazy<HashMap<MediaInfoStreamKind, Vec<String>>> = Lazy::new(|| {
  let mut all_properties_map = HashMap::new();
  for stream_kind in MediaInfoStreamKind::values() {
    all_properties_map.insert(*stream_kind, Vec::new());
  }
  ALL_STREAMS.iter().for_each(|stream| {
    let parameters = all_properties_map
      .get_mut(&stream.stream_kind)
      .expect("Failed to get properties.");
    parameters.push(stream.parameter.clone());
  });
  all_properties_map
});

pub async fn are_extensions_context_menu_registered(extensions: Vec<String>) -> Result<bool> {
  Ok(context_menu::are_extensions_context_menu_registered(extensions))
}

/// Kill and reap the child process owned by `window`, if any. Shared by the
/// mkvextract, mkvmerge, and ffmpeg-capture cancel commands.
pub async fn cancel_child(window: &Window, children: &ChildMap) {
  let label = window.label().to_owned();
  let child = children.lock().unwrap().remove(&label);
  if let Some(mut child) = child {
    let _ = child.kill();
    let _ = child.wait();
  }
}

/// Cancel a running FFmpeg capture/trim for `window`. The capture pass is stopped
/// by killing the ffmpeg child; the trim pass has no child process, so it is
/// stopped by flipping its cancel flag (polled by the trim workers). Only one of
/// the two is ever actually running when the user cancels.
pub async fn cancel_ffmpeg_capture(window: &Window, children: &ChildMap, cancels: &CancelMap) {
  if let Some(flag) = cancels.lock().unwrap().get(window.label()) {
    flag.store(true, std::sync::atomic::Ordering::SeqCst);
  }
  cancel_child(window, children).await;
}

pub async fn capture_ffmpeg_frame(file: String, position_seconds: f64, max_width: u32) -> Result<Vec<u8>> {
  tokio::task::spawn_blocking(move || ffmpeg::capture_frame(file, position_seconds, max_width)).await?
}

pub fn check_for_updates() -> Result<UpdateCheckResult> {
  let app_version = get_app_version();
  log::info!("Checking for updates. Current version: {}", app_version);
  let resp = ureq::get("https://api.github.com/repos/caoccao/BetterMediaInfo/releases")
    .set("User-Agent", APP_NAME)
    .call()
    .map_err(|e| anyhow::anyhow!("Failed to fetch releases: {}", e))?;
  let json: serde_json::Value = resp
    .into_json()
    .map_err(|e| anyhow::anyhow!("Failed to parse releases: {}", e))?;
  if let Some(first) = json.as_array().and_then(|arr| arr.first()) {
    let tag = first["tag_name"].as_str().unwrap_or("");
    log::info!("Latest release tag: {}", tag);
    if is_newer_version(tag, app_version) {
      let version = tag.trim_start_matches('v').to_owned();
      return Ok(UpdateCheckResult {
        has_update: true,
        latest_version: Some(version),
      });
    }
  }
  Ok(UpdateCheckResult {
    has_update: false,
    latest_version: None,
  })
}

pub async fn get_about() -> Result<About> {
  let media_info = MediaInfo::new();
  let media_info_version = media_info.getOption(MediaInfoGetOption::InfoVersion)?;
  let app_version = env!("CARGO_PKG_VERSION").to_owned();
  Ok(About {
    app_version,
    media_info_version,
  })
}

pub fn get_app_version() -> &'static str {
  env!("CARGO_PKG_VERSION")
}

pub async fn get_batchmkvextract_status(path: String, check_running: bool) -> Result<BatchMkvExtractStatus> {
  batchmkvextract::get_batchmkvextract_status(path, check_running).await
}

pub async fn get_bd_status(path: String) -> Result<BDStatus> {
  bd::get_bd_status(path).await
}

pub async fn get_bdmaster_status(path: String, check_running: bool) -> Result<BDMasterStatus> {
  bdmaster::get_bdmaster_status(path, check_running).await
}

pub async fn get_config() -> Result<config::Config> {
  Ok(config::get_config())
}

pub async fn get_ffmpeg_status(path: String) -> Result<FfmpegStatus> {
  ffmpeg::get_ffmpeg_status(path).await
}

pub async fn get_files(files: Vec<String>) -> Result<Vec<String>> {
  Ok(if files.is_empty() {
    Vec::new()
  } else {
    let mut paths: Vec<PathBuf> = Vec::new();
    for file in files {
      let path = Path::new(file.as_str());
      if !path.exists() {
        return Err(anyhow::anyhow!("Path {} does not exist.", path.display()));
      }
      if path.is_dir() {
        for result in path.read_dir().map_err(anyhow::Error::msg)? {
          let dir_entry = result.map_err(anyhow::Error::msg)?;
          let path = dir_entry.path();
          if path.is_file() {
            paths.push(path);
          }
        }
      } else if path.is_file() {
        paths.push(path.to_path_buf());
      }
    }
    let file_extensions = config::get_active_file_extensions();
    if file_extensions.is_empty() {
      paths
        .into_iter()
        .map(|path| path.to_str().unwrap_or_default().to_owned())
        .collect()
    } else {
      let file_extensions: HashSet<String> = file_extensions.into_iter().collect();
      paths
        .into_iter()
        .filter(|path| {
          path
            .extension()
            .map(|ext| file_extensions.contains(ext.to_str().unwrap_or_default()))
            .unwrap_or(false)
        })
        .map(|path| path.to_str().unwrap_or_default().to_owned())
        .collect()
    }
  })
}

pub async fn get_launch_args() -> Result<Vec<String>> {
  Ok(std::env::args().skip(1).collect())
}

pub async fn get_mkv_tracks(file: String) -> Result<Vec<MkvTrack>> {
  mkvtoolnix::get_mkv_tracks(file).await
}

pub async fn get_mkvtoolnix_status(path: String, check_running: bool) -> Result<MkvToolNixStatus> {
  mkvtoolnix::get_mkvtoolnix_status(path, check_running).await
}

pub async fn get_mpchc_status(path: String, check_running: bool) -> Result<MpcHcStatus> {
  mpchc::get_mpchc_status(path, check_running).await
}

pub async fn get_parameters() -> Result<Vec<Parameter>> {
  let mut id = 0;
  Ok(
    ALL_STREAMS
      .iter()
      .map(|stream| {
        let parameter = Parameter {
          id,
          stream: stream.stream_kind,
          property: stream.parameter.clone(),
        };
        id += 1;
        parameter
      })
      .collect::<Vec<Parameter>>(),
  )
}

pub async fn get_properties(file: String, properties: Option<Vec<StreamProperty>>) -> Result<Vec<StreamPropertyMap>> {
  let path = Path::new(file.as_str());
  validate_path_as_file(path)?;
  let media_info_file = MediaInfoFile::new(path);
  let mut stream_property_maps: Vec<StreamPropertyMap> = Vec::new();
  let properties_map = match properties {
    Some(properties) => {
      let mut properties_map: HashMap<MediaInfoStreamKind, Vec<String>> = HashMap::new();
      properties.into_iter().for_each(|property| {
        if !properties_map.contains_key(&property.stream) {
          properties_map.insert(property.stream.clone(), Vec::new());
        }
        let properties = properties_map.get_mut(&property.stream).unwrap();
        properties.push(property.property);
      });
      properties_map
    }
    None => ALL_PROPERTIES_MAP.clone(),
  };
  for stream_kind in properties_map.keys() {
    let stream_count = media_info_file.media_info.getCountByStreamKind(*stream_kind) as i32;
    if stream_count > 0 {
      for parameters in properties_map.get(&stream_kind).iter() {
        for num in 0..stream_count {
          let mut property_map: HashMap<String, String> = HashMap::new();
          for parameter in parameters.iter() {
            let stream = Stream::new(stream_kind.clone(), parameter.to_owned());
            let value = stream.get(&media_info_file.media_info, num as usize)?;
            if !value.is_empty() {
              property_map.insert(parameter.to_owned(), value);
            }
          }
          stream_property_maps.push(StreamPropertyMap {
            stream: stream_kind.clone(),
            num,
            property_map,
          })
        }
      }
    }
  }
  stream_property_maps.sort_by(|a, b| {
    let ordering = a.stream.cmp(&b.stream);
    if ordering == Ordering::Equal {
      a.num.cmp(&b.num)
    } else {
      ordering
    }
  });
  Ok(stream_property_maps)
}

pub async fn get_stream_count(file: String) -> Result<Vec<StreamCount>> {
  let path = Path::new(file.as_str());
  validate_path_as_file(path)?;
  let media_info_file = MediaInfoFile::new(path);
  let mut stream_counts = Vec::new();
  for stream_kind in MediaInfoStreamKind::values() {
    let stream_count = media_info_file.media_info.getCountByStreamKind(*stream_kind) as i32;
    stream_counts.push(StreamCount {
      stream: *stream_kind,
      count: stream_count,
    });
  }
  Ok(stream_counts)
}

pub async fn get_update_result(result: &Arc<Mutex<Option<UpdateCheckResult>>>) -> Option<UpdateCheckResult> {
  result.lock().unwrap().clone()
}

pub async fn is_folder_context_menu_registered() -> Result<bool> {
  Ok(context_menu::is_folder_context_menu_registered())
}

pub fn is_newer_version(latest: &str, current: &str) -> bool {
  let latest = latest.trim_start_matches('v');
  let current = current.trim_start_matches('v');
  let latest_parts: Vec<u32> = latest.split('.').filter_map(|s| s.parse().ok()).collect();
  let current_parts: Vec<u32> = current.split('.').filter_map(|s| s.parse().ok()).collect();
  let len = latest_parts.len().max(current_parts.len());
  for i in 0..len {
    let l = latest_parts.get(i).copied().unwrap_or(0);
    let c = current_parts.get(i).copied().unwrap_or(0);
    if l > c {
      return true;
    }
    if l < c {
      return false;
    }
  }
  false
}

pub async fn open_batchmkvextract(file: String) -> Result<()> {
  batchmkvextract::spawn_batchmkvextract(&file)
}

pub async fn open_bdmaster(file: String) -> Result<()> {
  bdmaster::spawn_bdmaster(&file)
}

pub async fn open_mkvtoolnix_gui(file: String) -> Result<()> {
  mkvtoolnix::spawn_mkvtoolnix_gui(&file)
}

pub async fn open_mpchc(file: String) -> Result<()> {
  mpchc::spawn_mpchc(&file)
}

pub async fn register_extensions_context_menu(extensions: Vec<String>) -> Result<()> {
  context_menu::register_extensions_context_menu(extensions)
}

pub async fn register_folder_context_menu() -> Result<()> {
  context_menu::register_folder_context_menu()
}

pub async fn run_ffmpeg_capture(
  window: Window,
  args: Vec<String>,
  output_pattern: String,
  duration_seconds: f64,
  trim: Option<TrimOptions>,
  preview_width: u32,
  children: ChildMap,
  cancels: CancelMap,
) -> Result<()> {
  // Frames pushed to the preview panel are downscaled to the panel's actual
  // width (the same width the seek preview uses), so high-resolution captures
  // don't flood the IPC channel with multi-megabyte payloads. Clamped defensively.
  let preview_width = preview_width.clamp(160, 7680);
  // Global options first, the frontend-built capture args in the middle, and
  // `-progress` last so ffmpeg streams machine-readable progress to stdout.
  let mut full_args: Vec<String> = vec![
    "-hide_banner".to_string(),
    "-loglevel".to_string(),
    "error".to_string(),
    "-y".to_string(),
  ];
  full_args.extend(args);
  full_args.push("-progress".to_string());
  full_args.push("pipe:1".to_string());
  full_args.push("-nostats".to_string());

  let mut child = ffmpeg::spawn_ffmpeg(&full_args)?;
  let stdout = child
    .stdout
    .take()
    .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
  let stderr = child.stderr.take();
  let label = window.label().to_owned();
  children.lock().unwrap().insert(label.clone(), child);
  // Register a fresh cancellation flag for the trim pass (the capture pass is
  // cancelled by killing the child above). Replaces any stale flag from a prior run.
  let cancel_flag = Arc::new(std::sync::atomic::AtomicBool::new(false));
  cancels.lock().unwrap().insert(label.clone(), cancel_flag.clone());
  let cancels_arc = cancels.clone();
  let children_arc = children.clone();
  let window_clone = window.clone();
  // The capture output filename pattern we handed ffmpeg (e.g.
  // `/dir/name_shot_%04d.png`). The produced frames are discovered by matching
  // this pattern by name — deterministic, unlike scanning by modification time.
  let pattern = std::path::PathBuf::from(&output_pattern);
  #[cfg(target_os = "windows")]
  let hwnd_raw: Option<isize> = window.hwnd().ok().map(|h| h.0 as isize);

  tokio::task::spawn_blocking(move || {
    let target = EventTarget::webview_window(&label);
    // Drain stderr on a side thread so a chatty ffmpeg can't deadlock on a full pipe.
    let stderr_handle = stderr.map(|mut s| {
      std::thread::spawn(move || {
        let mut buf = String::new();
        let _ = std::io::Read::read_to_string(&mut s, &mut buf);
        buf
      })
    });
    #[cfg(target_os = "windows")]
    if let Some(hwnd) = hwnd_raw {
      taskbar::set_progress(hwnd, 0);
    }
    let mut last_frame_emit = std::time::Instant::now() - std::time::Duration::from_secs(1);
    let mut last_emitted: Option<std::path::PathBuf> = None;
    ffmpeg::read_capture_progress(stdout, |out_time| {
      let percent = if duration_seconds > 0.0 {
        ((out_time / duration_seconds) * 100.0).clamp(0.0, 100.0) as u32
      } else {
        0
      };
      #[cfg(target_os = "windows")]
      if let Some(hwnd) = hwnd_raw {
        taskbar::set_progress(hwnd, percent);
      }
      let _ = window_clone.emit_to(
        target.clone(),
        "ffmpeg-capture-progress",
        FfmpegCaptureProgressEvent {
          percent,
          done: false,
          cancelled: false,
          error: None,
          phase: "capture".to_string(),
          current: 0,
          total: 0,
        },
      );
      // Throttle the live-frame preview so we don't re-read large images every tick.
      if last_frame_emit.elapsed() >= std::time::Duration::from_millis(400) {
        if let Some(path) = ffmpeg::newest_image_for_pattern(&pattern) {
          if last_emitted.as_deref() != Some(path.as_path()) {
            if let Ok(bytes) = std::fs::read(&path) {
              if !bytes.is_empty() {
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                let bytes = ffmpeg::downscale_for_preview(&bytes, ext, preview_width);
                let _ = window_clone.emit_to(target.clone(), "ffmpeg-capture-frame", FfmpegCaptureFrameEvent { bytes });
                last_emitted = Some(path);
              }
            }
          }
        }
        last_frame_emit = std::time::Instant::now();
      }
    });

    let child = children_arc.lock().unwrap().remove(&label);
    let (mut cancelled, mut error) = match child {
      Some(mut c) => match c.wait() {
        Ok(status) if status.success() => (false, None),
        Ok(status) => (
          false,
          Some(format!("ffmpeg exited with code {}", status.code().unwrap_or(-1))),
        ),
        Err(e) => (false, Some(e.to_string())),
      },
      None => (true, None),
    };
    let stderr_text = stderr_handle.and_then(|h| h.join().ok());
    if error.is_some() {
      if let Some(text) = stderr_text {
        let text = text.trim();
        if !text.is_empty() {
          error = Some(text.to_string());
        }
      }
    }
    #[cfg(target_os = "windows")]
    if let Some(hwnd) = hwnd_raw {
      if error.is_some() {
        taskbar::set_error(hwnd);
      } else {
        taskbar::clear_progress(hwnd);
      }
    }
    // Second pass: trim borders from every image this run produced. This is its
    // own pass with its own progress, distinct from the ffmpeg capture above, so
    // the UI drives the progress bar from the per-image counts reported here and
    // flips its label to the trim phase. Runs across `threads` workers and
    // contains per-frame panics so one bad frame can't abort the capture.
    let mut trimmed_pass = false;
    if !cancelled && error.is_none() {
      if let Some(options) = trim.as_ref().filter(|t| t.enabled) {
        if let Some(rgb) = ffmpeg::parse_hex_color(&options.color) {
          let images = ffmpeg::images_for_pattern(&pattern);
          let total = images.len();
          if total > 0 {
            trimmed_pass = true;
            // Announce the start of the trim pass so the UI resets the bar (it was
            // left at 100% by the capture pass) and switches its label.
            let _ = window_clone.emit_to(
              target.clone(),
              "ffmpeg-capture-progress",
              FfmpegCaptureProgressEvent {
                percent: 0,
                done: false,
                cancelled: false,
                error: None,
                phase: "trim".to_string(),
                current: 0,
                total: total as u32,
              },
            );
            #[cfg(target_os = "windows")]
            if let Some(hwnd) = hwnd_raw {
              taskbar::set_progress(hwnd, 0);
            }
            // 0 / missing => fall back to the core count, matching the frontend default.
            let threads = if options.threads == 0 {
              std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4)
            } else {
              options.threads
            };
            let mut last_trim_emit = std::time::Instant::now() - std::time::Duration::from_secs(1);
            let stats = ffmpeg::trim_images(images, rgb, options.tolerance, threads, cancel_flag.clone(), |completed, total, path, result| {
              let percent = ((completed as f64 / total as f64) * 100.0).clamp(0.0, 100.0) as u32;
              #[cfg(target_os = "windows")]
              if let Some(hwnd) = hwnd_raw {
                taskbar::set_progress(hwnd, percent);
              }
              let _ = window_clone.emit_to(
                target.clone(),
                "ffmpeg-capture-progress",
                FfmpegCaptureProgressEvent {
                  percent,
                  done: false,
                  cancelled: false,
                  error: None,
                  phase: "trim".to_string(),
                  current: completed as u32,
                  total: total as u32,
                },
              );
              // Show the frame just trimmed in the preview (skip removed blanks).
              // Throttled so a fast multi-threaded pass doesn't flood the channel.
              if matches!(result, Some(ffmpeg::TrimResult::Trimmed) | Some(ffmpeg::TrimResult::Unchanged))
                && last_trim_emit.elapsed() >= std::time::Duration::from_millis(200)
              {
                if let Ok(bytes) = std::fs::read(path) {
                  if !bytes.is_empty() {
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                    let bytes = ffmpeg::downscale_for_preview(&bytes, ext, preview_width);
                    let _ = window_clone.emit_to(target.clone(), "ffmpeg-capture-frame", FfmpegCaptureFrameEvent { bytes });
                  }
                }
                last_trim_emit = std::time::Instant::now();
              }
            });
            log::debug!(
              "trim pass: {} trimmed, {} unchanged, {} removed, {} failed",
              stats.trimmed,
              stats.unchanged,
              stats.removed,
              stats.failed
            );
            // If cancel was requested during the trim pass, report the run as
            // cancelled so the UI suppresses the "complete" notification.
            if cancel_flag.load(std::sync::atomic::Ordering::SeqCst) {
              cancelled = true;
            }
          }
        }
      }
    }
    // This run's cancel flag is no longer needed; drop it from the shared map.
    cancels_arc.lock().unwrap().remove(&label);
    // Emit the last produced frame so the preview lands on the final capture.
    if !cancelled {
      if let Some(path) = ffmpeg::newest_image_for_pattern(&pattern) {
        if let Ok(bytes) = std::fs::read(&path) {
          if !bytes.is_empty() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            let bytes = ffmpeg::downscale_for_preview(&bytes, ext, preview_width);
            let _ = window_clone.emit_to(target.clone(), "ffmpeg-capture-frame", FfmpegCaptureFrameEvent { bytes });
          }
        }
      }
    }
    let _ = window_clone.emit_to(
      target,
      "ffmpeg-capture-progress",
      FfmpegCaptureProgressEvent {
        percent: 100,
        done: true,
        cancelled,
        error,
        phase: if trimmed_pass { "trim".to_string() } else { "capture".to_string() },
        current: 0,
        total: 0,
      },
    );
  })
  .await?;
  Ok(())
}

pub async fn run_mkvextract(window: Window, file: String, args: Vec<String>, children: ChildMap) -> Result<()> {
  let mut child = mkvtoolnix::spawn_mkvextract(&file, &args)?;
  let stdout = child
    .stdout
    .take()
    .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
  let label = window.label().to_owned();
  children.lock().unwrap().insert(label.clone(), child);
  let children_arc = children.clone();
  let window_clone = window.clone();
  #[cfg(target_os = "windows")]
  let hwnd_raw: Option<isize> = window.hwnd().ok().map(|h| h.0 as isize);
  tokio::task::spawn_blocking(move || {
    let target = EventTarget::webview_window(&label);
    #[cfg(target_os = "windows")]
    if let Some(hwnd) = hwnd_raw {
      taskbar::set_progress(hwnd, 0);
    }
    mkvtoolnix::read_mkvextract_output(stdout, |line| {
      if let Some(percent) = mkvtoolnix::parse_mkvextract_progress(line) {
        #[cfg(target_os = "windows")]
        if let Some(hwnd) = hwnd_raw {
          taskbar::set_progress(hwnd, percent);
        }
        let _ = window_clone.emit_to(
          target.clone(),
          "mkvextract-progress",
          MkvextractProgressEvent {
            percent,
            done: false,
            cancelled: false,
            error: None,
          },
        );
      }
    });
    let child = children_arc.lock().unwrap().remove(&label);
    let (cancelled, error) = match child {
      Some(mut c) => match c.wait() {
        Ok(status) if status.success() => (false, None),
        Ok(status) => (
          false,
          Some(format!("mkvextract exited with code {}", status.code().unwrap_or(-1))),
        ),
        Err(e) => (false, Some(e.to_string())),
      },
      None => (true, None),
    };
    #[cfg(target_os = "windows")]
    if let Some(hwnd) = hwnd_raw {
      if error.is_some() {
        taskbar::set_error(hwnd);
      } else {
        taskbar::clear_progress(hwnd);
      }
    }
    let _ = window_clone.emit_to(
      target,
      "mkvextract-progress",
      MkvextractProgressEvent {
        percent: 100,
        done: true,
        cancelled,
        error,
      },
    );
  })
  .await?;
  Ok(())
}

pub async fn run_mkvmerge(window: Window, args: Vec<String>, children: ChildMap) -> Result<()> {
  let mut child = mkvtoolnix::spawn_mkvmerge(&args)?;
  let stdout = child
    .stdout
    .take()
    .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
  let label = window.label().to_owned();
  children.lock().unwrap().insert(label.clone(), child);
  let children_arc = children.clone();
  let window_clone = window.clone();
  #[cfg(target_os = "windows")]
  let hwnd_raw: Option<isize> = window.hwnd().ok().map(|h| h.0 as isize);
  tokio::task::spawn_blocking(move || {
    let target = EventTarget::webview_window(&label);
    #[cfg(target_os = "windows")]
    if let Some(hwnd) = hwnd_raw {
      taskbar::set_progress(hwnd, 0);
    }
    mkvtoolnix::read_mkvmerge_output(stdout, |line| {
      if let Some(percent) = mkvtoolnix::parse_mkvmerge_progress(line) {
        #[cfg(target_os = "windows")]
        if let Some(hwnd) = hwnd_raw {
          taskbar::set_progress(hwnd, percent);
        }
        let _ = window_clone.emit_to(
          target.clone(),
          "mkvmerge-progress",
          MkvmergeProgressEvent {
            percent,
            done: false,
            cancelled: false,
            error: None,
          },
        );
      }
    });
    let child = children_arc.lock().unwrap().remove(&label);
    let (cancelled, error) = match child {
      Some(mut c) => match c.wait() {
        Ok(status) if status.success() => (false, None),
        Ok(status) => (
          false,
          Some(format!("mkvmerge exited with code {}", status.code().unwrap_or(-1))),
        ),
        Err(e) => (false, Some(e.to_string())),
      },
      None => (true, None),
    };
    #[cfg(target_os = "windows")]
    if let Some(hwnd) = hwnd_raw {
      if error.is_some() {
        taskbar::set_error(hwnd);
      } else {
        taskbar::clear_progress(hwnd);
      }
    }
    let _ = window_clone.emit_to(
      target,
      "mkvmerge-progress",
      MkvmergeProgressEvent {
        percent: 100,
        done: true,
        cancelled,
        error,
      },
    );
  })
  .await?;
  Ok(())
}

pub async fn set_config(config: config::Config) -> Result<config::Config> {
  config::set_config(config)?;
  Ok(config::get_config())
}

pub async fn skip_version(version: String) -> Result<()> {
  let mut cfg = config::get_config();
  cfg.update.ignore_version = version;
  config::set_config(cfg)?;
  Ok(())
}

pub async fn suggest_merge_output_path(source_file: String) -> String {
  let source = Path::new(source_file.as_str());
  let parent = source.parent().unwrap_or_else(|| Path::new(""));
  let stem = source.file_stem().and_then(|s| s.to_str()).unwrap_or("");
  let is_mkv = source
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| e.eq_ignore_ascii_case("mkv"))
    .unwrap_or(false);
  let mut counter: u32 = if is_mkv { 1 } else { 0 };
  loop {
    let name = if counter == 0 {
      format!("{stem}.mkv")
    } else {
      format!("{stem} ({counter}).mkv")
    };
    let candidate = parent.join(&name);
    if !candidate.exists() {
      return candidate.to_string_lossy().into_owned();
    }
    counter = if counter == 0 { 2 } else { counter + 1 };
  }
}

pub async fn unregister_extensions_context_menu(extensions: Vec<String>) -> Result<()> {
  context_menu::unregister_extensions_context_menu(extensions)
}

pub async fn unregister_folder_context_menu() -> Result<()> {
  context_menu::unregister_folder_context_menu()
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

pub async fn write_binary_file(file: String, bytes: Vec<u8>) -> Result<()> {
  let path = Path::new(file.as_str());
  let mut file = File::create(path)?;
  file.write_all(&bytes)?;
  Ok(())
}

pub async fn write_text_file(file: String, text: String) -> Result<()> {
  let path = Path::new(file.as_str());
  let mut file = File::create(path)?;
  file.write_all(text.as_bytes())?;
  Ok(())
}
