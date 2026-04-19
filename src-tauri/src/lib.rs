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

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

mod config;
mod constants;
mod controller;
mod media_info;
mod mkvtoolnix;
mod protocol;
mod streams;

use protocol::{MkvextractProgressEvent, MkvextractState, UpdateCheckResult, UpdateCheckState};

fn convert_error(error: anyhow::Error) -> String {
  error.to_string()
}

#[tauri::command]
async fn cancel_mkvextract(
  window: tauri::Window,
  state: tauri::State<'_, MkvextractState>,
) -> Result<(), String> {
  log::debug!("cancel_mkvextract({})", window.label());
  let label = window.label().to_owned();
  let child = state.children.lock().unwrap().remove(&label);
  if let Some(mut child) = child {
    let _ = child.kill();
    let _ = child.wait();
  }
  Ok(())
}

#[tauri::command]
async fn get_about() -> Result<protocol::About, String> {
  log::debug!("get_about");
  controller::get_about().await.map_err(convert_error)
}

#[tauri::command]
async fn get_config() -> Result<config::Config, String> {
  log::debug!("get_config");
  controller::get_config().await.map_err(convert_error)
}

#[tauri::command]
async fn get_files(files: Vec<String>) -> Result<Vec<String>, String> {
  log::debug!("get_files({:?})", files);
  controller::get_files(files).await.map_err(convert_error)
}

#[tauri::command]
async fn get_mkv_tracks(file: String) -> Result<Vec<protocol::MkvTrack>, String> {
  log::debug!("get_mkv_tracks({})", file);
  mkvtoolnix::get_mkv_tracks(file).await.map_err(convert_error)
}

#[tauri::command]
async fn get_parameters() -> Result<Vec<protocol::Parameter>, String> {
  log::debug!("get_parameters");
  controller::get_parameters().await.map_err(convert_error)
}

#[tauri::command]
async fn get_properties(
  file: String,
  properties: Option<Vec<protocol::StreamProperty>>,
) -> Result<Vec<protocol::StreamPropertyMap>, String> {
  log::debug!("get_properties({}, {:?})", file, properties);
  controller::get_properties(file, properties)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn get_stream_count(file: String) -> Result<Vec<protocol::StreamCount>, String> {
  log::debug!("get_stream_count({})", file);
  controller::get_stream_count(file).await.map_err(convert_error)
}

#[tauri::command]
fn get_update_result(state: tauri::State<'_, UpdateCheckState>) -> Option<UpdateCheckResult> {
  state.result.lock().unwrap().clone()
}

#[tauri::command]
async fn is_mkvtoolnix_found(path: String) -> Result<protocol::MkvToolNixStatus, String> {
  log::debug!("is_mkvtoolnix_found({})", path);
  mkvtoolnix::is_mkvtoolnix_found(path).await.map_err(convert_error)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  env_logger::init();

  let runtime = tokio::runtime::Builder::new_multi_thread()
    .worker_threads(4)
    .enable_all()
    .build()
    .expect("Failed to build Tokio runtime");

  tauri::async_runtime::set(runtime.handle().clone());

  tauri::Builder::default()
    .manage(MkvextractState {
      children: Arc::new(Mutex::new(HashMap::new())),
    })
    .manage(UpdateCheckState {
      result: Arc::new(Mutex::new(None)),
    })
    .plugin(tauri_plugin_cli::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let _ = window.set_title(&format!("{} v{}", constants::APP_NAME, controller::get_app_version()));

      // Check for updates in background
      let update_state = app.state::<UpdateCheckState>();
      let result_arc = update_state.result.clone();
      let cfg = config::get_config();
      let interval_seconds: i64 = match cfg.update.check_interval {
        config::UpdateCheckInterval::Daily => 86400,
        config::UpdateCheckInterval::Weekly => 604800,
        config::UpdateCheckInterval::Monthly => 2592000,
      };
      let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
      if cfg.update.last_checked == 0 || now - cfg.update.last_checked > interval_seconds {
        std::thread::spawn(move || {
          let check_result = std::panic::catch_unwind(|| {
            controller::check_for_updates()
          }).unwrap_or_else(|_| {
            log::error!("Update check panicked");
            Err(anyhow::anyhow!("Update check panicked"))
          });
          match check_result {
            Ok(result) => {
              log::info!("Update check result: has_update={}, latest_version={:?}", result.has_update, result.latest_version);
              // Only update lastChecked on successful check
              let mut updated_config = config::get_config();
              updated_config.update.last_checked = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
              if let Some(ref version) = result.latest_version {
                updated_config.update.last_version = version.clone();
              }
              let _ = config::set_config(updated_config.clone());
              // Suppress if this version is ignored
              let final_result = if result.has_update
                && result.latest_version.as_deref() == Some(updated_config.update.ignore_version.as_str())
                && !updated_config.update.ignore_version.is_empty() {
                UpdateCheckResult { has_update: false, latest_version: None }
              } else {
                result
              };
              *result_arc.lock().unwrap() = Some(final_result);
            }
            Err(e) => {
              log::warn!("Update check failed: {}", e);
              *result_arc.lock().unwrap() = Some(UpdateCheckResult { has_update: false, latest_version: None });
            }
          }
        });
      } else if !cfg.update.last_version.is_empty()
        && controller::is_newer_version(&cfg.update.last_version, controller::get_app_version())
        && cfg.update.last_version != cfg.update.ignore_version {
        *result_arc.lock().unwrap() = Some(UpdateCheckResult { has_update: true, latest_version: Some(cfg.update.last_version.clone()) });
      } else {
        *result_arc.lock().unwrap() = Some(UpdateCheckResult { has_update: false, latest_version: None });
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::Destroyed = event {
        if window.label() == "main" {
          let app_handle = window.app_handle();
          for (label, win) in app_handle.webview_windows() {
            if label != "main" {
              let _ = win.destroy();
            }
          }
        }
      }
    })
    .invoke_handler(tauri::generate_handler![
      get_about,
      get_config,
      get_update_result,
      skip_version,
      get_files,
      get_mkv_tracks,
      is_mkvtoolnix_found,
      run_mkvextract,
      cancel_mkvextract,
      get_parameters,
      get_properties,
      get_stream_count,
      set_config,
      write_text_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
async fn run_mkvextract(
  window: tauri::Window,
  file: String,
  args: Vec<String>,
  state: tauri::State<'_, MkvextractState>,
) -> Result<(), String> {
  log::debug!("run_mkvextract({}, {:?})", file, args);
  let mut child = mkvtoolnix::spawn_mkvextract(&file, &args).map_err(convert_error)?;
  let stdout = child.stdout.take().ok_or("Failed to capture stdout".to_string())?;
  let label = window.label().to_owned();
  state.children.lock().unwrap().insert(label.clone(), child);
  let children_arc = state.children.clone();
  let window_clone = window.clone();
  tokio::task::spawn_blocking(move || {
    mkvtoolnix::read_mkvextract_output(stdout, |line| {
      if let Some(percent) = mkvtoolnix::parse_mkvextract_progress(line) {
        let _ = window_clone.emit("mkvextract-progress", MkvextractProgressEvent {
          percent,
          done: false,
          cancelled: false,
          error: None,
        });
      }
    });
    let child = children_arc.lock().unwrap().remove(&label);
    let (cancelled, error) = match child {
      Some(mut c) => {
        match c.wait() {
          Ok(status) if status.success() => (false, None),
          Ok(status) => (false, Some(format!("mkvextract exited with code {}", status.code().unwrap_or(-1)))),
          Err(e) => (false, Some(e.to_string())),
        }
      }
      None => (true, None),
    };
    let _ = window_clone.emit("mkvextract-progress", MkvextractProgressEvent {
      percent: 100,
      done: true,
      cancelled,
      error,
    });
  }).await.map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
async fn set_config(config: config::Config) -> Result<config::Config, String> {
  log::debug!("set_config({:?})", config);
  controller::set_config(config).await.map_err(convert_error)
}

#[tauri::command]
fn skip_version(version: String) -> Result<(), String> {
  log::debug!("skip_version({})", version);
  let mut cfg = config::get_config();
  cfg.update.ignore_version = version;
  config::set_config(cfg).map_err(convert_error)
}

#[tauri::command]
async fn write_text_file(file: String, text: String) -> Result<(), String> {
  log::debug!("write_text_file({})", file);
  controller::write_text_file(file, text).await.map_err(convert_error)
}
