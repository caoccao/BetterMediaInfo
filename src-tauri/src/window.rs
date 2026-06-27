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

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

use crate::config;
use crate::constants;
use crate::controller;
use crate::protocol::{UpdateCheckResult, UpdateCheckState};

pub static WINDOW_READY: AtomicBool = AtomicBool::new(false);

/// Initialize the main window: title, restored size/position, visibility, and
/// the background update check. Wired up as the Tauri builder's `setup` hook.
pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let window = app.get_webview_window("main").unwrap();
  let _ = window.set_title(&format!("{} v{}", constants::APP_NAME, controller::get_app_version()));

  // Restore window size and position from config
  let cfg = config::get_config();
  let _ = window.set_size(tauri::LogicalSize::new(cfg.window.size.width, cfg.window.size.height));
  if cfg.window.position.x < 0 || cfg.window.position.y < 0 {
    let _ = window.center();
  } else {
    let _ = window.set_position(tauri::LogicalPosition::new(
      cfg.window.position.x,
      cfg.window.position.y,
    ));
  }
  let _ = window.show();
  let _ = window.set_focus();
  WINDOW_READY.store(true, Ordering::SeqCst);

  // Check for updates in background
  let update_state = app.state::<UpdateCheckState>();
  let result_arc = update_state.result.clone();
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
      let check_result = std::panic::catch_unwind(|| controller::check_for_updates()).unwrap_or_else(|_| {
        log::error!("Update check panicked");
        Err(anyhow::anyhow!("Update check panicked"))
      });
      match check_result {
        Ok(result) => {
          log::info!(
            "Update check result: has_update={}, latest_version={:?}",
            result.has_update,
            result.latest_version
          );
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
            && !updated_config.update.ignore_version.is_empty()
          {
            UpdateCheckResult {
              has_update: false,
              latest_version: None,
            }
          } else {
            result
          };
          *result_arc.lock().unwrap() = Some(final_result);
        }
        Err(e) => {
          log::warn!("Update check failed: {}", e);
          *result_arc.lock().unwrap() = Some(UpdateCheckResult {
            has_update: false,
            latest_version: None,
          });
        }
      }
    });
  } else if !cfg.update.last_version.is_empty()
    && controller::is_newer_version(&cfg.update.last_version, controller::get_app_version())
    && cfg.update.last_version != cfg.update.ignore_version
  {
    *result_arc.lock().unwrap() = Some(UpdateCheckResult {
      has_update: true,
      latest_version: Some(cfg.update.last_version.clone()),
    });
  } else {
    *result_arc.lock().unwrap() = Some(UpdateCheckResult {
      has_update: false,
      latest_version: None,
    });
  }

  Ok(())
}

/// Persist the main window's size/position on move/resize and tear down any
/// secondary windows when the main window is destroyed. Wired up as the Tauri
/// builder's `on_window_event` hook.
pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
  if window.label() != "main" {
    return;
  }
  match event {
    tauri::WindowEvent::Destroyed => {
      let app_handle = window.app_handle();
      for (label, win) in app_handle.webview_windows() {
        if label != "main" {
          let _ = win.destroy();
        }
      }
    }
    tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
      if !WINDOW_READY.load(Ordering::SeqCst) {
        return;
      }
      let Ok(scale) = window.scale_factor() else {
        return;
      };
      let Ok(pos) = window.outer_position() else {
        return;
      };
      let Ok(size) = window.inner_size() else {
        return;
      };
      let logical_pos: tauri::LogicalPosition<i32> = pos.to_logical(scale);
      let logical_size: tauri::LogicalSize<u32> = size.to_logical(scale);
      let mut cfg = config::get_config();
      cfg.window.position.x = logical_pos.x;
      cfg.window.position.y = logical_pos.y;
      cfg.window.size.width = logical_size.width;
      cfg.window.size.height = logical_size.height;
      if let Err(err) = config::set_config(cfg) {
        log::error!("Couldn't save window state because {}", err);
      }
    }
    _ => {}
  }
}
