/*
* Copyright (c) 2024-2025. caoccao.com Sam Cao
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

use tauri::Manager;

mod config;
mod controller;
mod media_info;
mod protocol;
mod streams;

fn convert_error(error: anyhow::Error) -> String {
  error.to_string()
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
async fn set_config(config: config::Config) -> Result<config::Config, String> {
  log::debug!("set_config({:?})", config);
  controller::set_config(config).await.map_err(convert_error)
}

#[tauri::command]
async fn write_text_file(file: String, text: String) -> Result<(), String> {
  log::debug!("write_text_file({})", file);
  controller::write_text_file(file, text).await.map_err(convert_error)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  env_logger::init();
  tauri::Builder::default()
    .plugin(tauri_plugin_cli::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let _ = window.set_title("BetterMediaInfo v0.5.0");
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_about,
      get_config,
      get_files,
      get_parameters,
      get_properties,
      get_stream_count,
      set_config,
      write_text_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
