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

mod batchmkvextract;
mod bd;
mod bdmaster;
mod config;
mod constants;
mod context_menu;
mod controller;
mod ffmpeg;
mod media_info;
mod mkvtoolnix;
mod mpchc;
mod protocol;
mod streams;
#[cfg(target_os = "windows")]
mod taskbar;
mod window;

use protocol::{FfmpegCaptureState, MkvextractState, MkvmergeState, TrimOptions, UpdateCheckResult, UpdateCheckState};

fn convert_error(error: anyhow::Error) -> String {
  error.to_string()
}

// Tauri command handlers (IPC entry points). Each one is an async wrapper that
// delegates to a `controller` method; keep them ordered alphabetically by name.

#[tauri::command]
async fn are_extensions_context_menu_registered(extensions: Vec<String>) -> Result<bool, String> {
  log::debug!("are_extensions_context_menu_registered({:?})", extensions);
  controller::are_extensions_context_menu_registered(extensions)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn cancel_ffmpeg_capture(window: tauri::Window, state: tauri::State<'_, FfmpegCaptureState>) -> Result<(), String> {
  log::debug!("cancel_ffmpeg_capture({})", window.label());
  controller::cancel_ffmpeg_capture(&window, &state.children, &state.cancels).await;
  Ok(())
}

#[tauri::command]
async fn cancel_mkvextract(window: tauri::Window, state: tauri::State<'_, MkvextractState>) -> Result<(), String> {
  log::debug!("cancel_mkvextract({})", window.label());
  controller::cancel_child(&window, &state.children).await;
  Ok(())
}

#[tauri::command]
async fn cancel_mkvmerge(window: tauri::Window, state: tauri::State<'_, MkvmergeState>) -> Result<(), String> {
  log::debug!("cancel_mkvmerge({})", window.label());
  controller::cancel_child(&window, &state.children).await;
  Ok(())
}

#[tauri::command]
async fn capture_ffmpeg_frame(file: String, position_seconds: f64, max_width: u32) -> Result<Vec<u8>, String> {
  log::debug!("capture_ffmpeg_frame({}, {}, {})", file, position_seconds, max_width);
  controller::capture_ffmpeg_frame(file, position_seconds, max_width)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn get_about() -> Result<protocol::About, String> {
  log::debug!("get_about");
  controller::get_about().await.map_err(convert_error)
}

#[tauri::command]
async fn get_batchmkvextract_status(
  path: String,
  check_running: bool,
) -> Result<protocol::BatchMkvExtractStatus, String> {
  log::debug!("get_batchmkvextract_status({}, {})", path, check_running);
  controller::get_batchmkvextract_status(path, check_running)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn get_bd_status(path: String) -> Result<protocol::BDStatus, String> {
  log::debug!("get_bd_status({})", path);
  controller::get_bd_status(path).await.map_err(convert_error)
}

#[tauri::command]
async fn get_bdmaster_status(path: String, check_running: bool) -> Result<protocol::BDMasterStatus, String> {
  log::debug!("get_bdmaster_status({}, {})", path, check_running);
  controller::get_bdmaster_status(path, check_running)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn get_config() -> Result<config::Config, String> {
  log::debug!("get_config");
  controller::get_config().await.map_err(convert_error)
}

#[tauri::command]
async fn get_ffmpeg_status(path: String) -> Result<protocol::FfmpegStatus, String> {
  log::debug!("get_ffmpeg_status({})", path);
  controller::get_ffmpeg_status(path).await.map_err(convert_error)
}

#[tauri::command]
async fn get_files(files: Vec<String>) -> Result<Vec<String>, String> {
  log::debug!("get_files({:?})", files);
  controller::get_files(files).await.map_err(convert_error)
}

#[tauri::command]
async fn get_launch_args() -> Result<Vec<String>, String> {
  log::debug!("get_launch_args");
  controller::get_launch_args().await.map_err(convert_error)
}

#[tauri::command]
async fn get_mkv_tracks(file: String) -> Result<Vec<protocol::MkvTrack>, String> {
  log::debug!("get_mkv_tracks({})", file);
  controller::get_mkv_tracks(file).await.map_err(convert_error)
}

#[tauri::command]
async fn get_mkvtoolnix_status(path: String, check_running: bool) -> Result<protocol::MkvToolNixStatus, String> {
  log::debug!("get_mkvtoolnix_status({}, {})", path, check_running);
  controller::get_mkvtoolnix_status(path, check_running)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn get_mpchc_status(path: String, check_running: bool) -> Result<protocol::MpcHcStatus, String> {
  log::debug!("get_mpchc_status({}, {})", path, check_running);
  controller::get_mpchc_status(path, check_running)
    .await
    .map_err(convert_error)
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
async fn get_update_result(
  state: tauri::State<'_, UpdateCheckState>,
) -> Result<Option<UpdateCheckResult>, String> {
  log::debug!("get_update_result");
  Ok(controller::get_update_result(&state.result).await)
}

#[tauri::command]
async fn is_folder_context_menu_registered() -> Result<bool, String> {
  log::debug!("is_folder_context_menu_registered");
  controller::is_folder_context_menu_registered().await.map_err(convert_error)
}

#[tauri::command]
async fn open_batchmkvextract(file: String) -> Result<(), String> {
  log::debug!("open_batchmkvextract({})", file);
  controller::open_batchmkvextract(file).await.map_err(convert_error)
}

#[tauri::command]
async fn open_bdmaster(file: String) -> Result<(), String> {
  log::debug!("open_bdmaster({})", file);
  controller::open_bdmaster(file).await.map_err(convert_error)
}

#[tauri::command]
async fn open_mkvtoolnix_gui(file: String) -> Result<(), String> {
  log::debug!("open_mkvtoolnix_gui({})", file);
  controller::open_mkvtoolnix_gui(file).await.map_err(convert_error)
}

#[tauri::command]
async fn open_mpchc(file: String) -> Result<(), String> {
  log::debug!("open_mpchc({})", file);
  controller::open_mpchc(file).await.map_err(convert_error)
}

#[tauri::command]
async fn register_extensions_context_menu(extensions: Vec<String>) -> Result<(), String> {
  log::debug!("register_extensions_context_menu({:?})", extensions);
  controller::register_extensions_context_menu(extensions)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn register_folder_context_menu() -> Result<(), String> {
  log::debug!("register_folder_context_menu");
  controller::register_folder_context_menu().await.map_err(convert_error)
}

#[tauri::command]
async fn run_ffmpeg_capture(
  window: tauri::Window,
  args: Vec<String>,
  output_pattern: String,
  duration_seconds: f64,
  trim: Option<TrimOptions>,
  preview_width: u32,
  state: tauri::State<'_, FfmpegCaptureState>,
) -> Result<(), String> {
  log::debug!("run_ffmpeg_capture({:?}, {}, {})", args, output_pattern, duration_seconds);
  controller::run_ffmpeg_capture(
    window,
    args,
    output_pattern,
    duration_seconds,
    trim,
    preview_width,
    state.children.clone(),
    state.cancels.clone(),
  )
  .await
  .map_err(convert_error)
}

#[tauri::command]
async fn run_mkvextract(
  window: tauri::Window,
  file: String,
  args: Vec<String>,
  state: tauri::State<'_, MkvextractState>,
) -> Result<(), String> {
  log::debug!("run_mkvextract({}, {:?})", file, args);
  controller::run_mkvextract(window, file, args, state.children.clone())
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn run_mkvmerge(
  window: tauri::Window,
  args: Vec<String>,
  state: tauri::State<'_, MkvmergeState>,
) -> Result<(), String> {
  log::debug!("run_mkvmerge({:?})", args);
  controller::run_mkvmerge(window, args, state.children.clone())
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn set_config(config: config::Config) -> Result<config::Config, String> {
  log::debug!("set_config({:?})", config);
  controller::set_config(config).await.map_err(convert_error)
}

#[tauri::command]
async fn skip_version(version: String) -> Result<(), String> {
  log::debug!("skip_version({})", version);
  controller::skip_version(version).await.map_err(convert_error)
}

#[tauri::command]
async fn suggest_merge_output_path(source_file: String) -> String {
  log::debug!("suggest_merge_output_path({})", source_file);
  controller::suggest_merge_output_path(source_file).await
}

#[tauri::command]
async fn unregister_extensions_context_menu(extensions: Vec<String>) -> Result<(), String> {
  log::debug!("unregister_extensions_context_menu({:?})", extensions);
  controller::unregister_extensions_context_menu(extensions)
    .await
    .map_err(convert_error)
}

#[tauri::command]
async fn unregister_folder_context_menu() -> Result<(), String> {
  log::debug!("unregister_folder_context_menu");
  controller::unregister_folder_context_menu().await.map_err(convert_error)
}

#[tauri::command]
async fn write_binary_file(file: String, bytes: Vec<u8>) -> Result<(), String> {
  log::debug!("write_binary_file({})", file);
  controller::write_binary_file(file, bytes).await.map_err(convert_error)
}

#[tauri::command]
async fn write_text_file(file: String, text: String) -> Result<(), String> {
  log::debug!("write_text_file({})", file);
  controller::write_text_file(file, text).await.map_err(convert_error)
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
    .manage(MkvmergeState {
      children: Arc::new(Mutex::new(HashMap::new())),
    })
    .manage(FfmpegCaptureState {
      children: Arc::new(Mutex::new(HashMap::new())),
      cancels: Arc::new(Mutex::new(HashMap::new())),
    })
    .manage(UpdateCheckState {
      result: Arc::new(Mutex::new(None)),
    })
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_opener::init())
    .setup(window::setup)
    .on_window_event(window::on_window_event)
    .invoke_handler(tauri::generate_handler![
      are_extensions_context_menu_registered,
      cancel_ffmpeg_capture,
      cancel_mkvextract,
      cancel_mkvmerge,
      capture_ffmpeg_frame,
      get_about,
      get_batchmkvextract_status,
      get_bd_status,
      get_bdmaster_status,
      get_config,
      get_ffmpeg_status,
      get_files,
      get_launch_args,
      get_mkv_tracks,
      get_mkvtoolnix_status,
      get_mpchc_status,
      get_parameters,
      get_properties,
      get_stream_count,
      get_update_result,
      is_folder_context_menu_registered,
      open_batchmkvextract,
      open_bdmaster,
      open_mkvtoolnix_gui,
      open_mpchc,
      register_extensions_context_menu,
      register_folder_context_menu,
      run_ffmpeg_capture,
      run_mkvextract,
      run_mkvmerge,
      set_config,
      skip_version,
      suggest_merge_output_path,
      unregister_extensions_context_menu,
      unregister_folder_context_menu,
      write_binary_file,
      write_text_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
