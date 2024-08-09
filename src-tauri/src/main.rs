/*
* Copyright (c) 2024. caoccao.com Sam Cao
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

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
async fn get_file_info(
  file: String,
  properties: Vec<protocol::StreamProperty>,
) -> Result<Vec<protocol::StreamPropertyValue>, String> {
  log::debug!("get_file_info({}, {:?})", file, properties);
  controller::get_file_info(file, properties).await.map_err(convert_error)
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
async fn get_stream_count(file: String) -> Result<Vec<protocol::StreamCount>, String> {
  log::debug!("get_stream_count({})", file);
  controller::get_stream_count(file).await.map_err(convert_error)
}

#[tauri::command]
async fn set_config(config: config::Config) -> Result<(), String> {
  log::debug!("set_config({:?})", config);
  controller::set_config(config).await.map_err(convert_error)
}

fn main() {
  env_logger::init();
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_about,
      get_config,
      get_file_info,
      get_files,
      get_parameters,
      get_stream_count,
      set_config
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
