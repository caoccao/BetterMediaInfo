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

use anyhow::{Error, Result};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::PathBuf;

static mut CONFIG: Lazy<Config> = Lazy::new(|| Config::new());

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
  #[serde(rename = "appendOnFileDrop")]
  pub append_on_file_drop: bool,
  #[serde(rename = "directoryMode")]
  pub directory_mode: ConfigDirectoryMode,
  #[serde(rename = "fileExtensions")]
  pub file_extensions: ConfigFileExtensions,
}

impl Default for Config {
  fn default() -> Self {
    Self {
      append_on_file_drop: true,
      directory_mode: Default::default(),
      file_extensions: Default::default(),
    }
  }
}

impl Config {
  fn new() -> Self {
    let config_path_buf = Self::get_path_buf();
    if config_path_buf.exists() {
      Self::load(config_path_buf)
    } else {
      log::debug!("Loading default config.");
      let config = Self::default();
      if let Err(err) = config.save(config_path_buf) {
        log::error!("Couldn't save the default config because {}", err);
      }
      config
    }
  }

  fn get_path_buf() -> PathBuf {
    let mut config_path_buf = std::env::current_exe().unwrap().parent().unwrap().to_path_buf();
    config_path_buf.push("Better Media Info.json");
    config_path_buf
  }

  fn load(path: PathBuf) -> Self {
    let cloned_path = path.clone();
    let path_string = cloned_path.to_str().unwrap();
    log::debug!("Loading config from {}.", path_string);
    let file = File::open(path).expect(format!("Couldn't open config file {}.", path_string).as_str());
    let buf_reader = BufReader::new(file);
    serde_json::from_reader(buf_reader).expect(format!("Couldn't parse config file {}.", path_string).as_str())
  }

  fn save(&self, path: PathBuf) -> Result<()> {
    let cloned_path = path.clone();
    let path_string = cloned_path.to_str().unwrap();
    log::debug!("Saving config to {}.", path_string);
    let file = File::create(path).expect(format!("Couldn't create config file {}.", path_string).as_str());
    let buf_writer = BufWriter::new(file);
    serde_json::to_writer_pretty(buf_writer, &self).map_err(Error::msg)
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum ConfigDirectoryMode {
  All = 0,
  Audio,
  Image,
  Video,
}

impl Default for ConfigDirectoryMode {
  fn default() -> Self {
    Self::All
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfigFileExtensions {
  pub audio: Vec<String>,
  pub image: Vec<String>,
  pub video: Vec<String>,
}

impl Default for ConfigFileExtensions {
  fn default() -> Self {
    Self {
      audio: vec![
        "mp3".to_owned(),
        "aac".to_owned(),
        "flac".to_owned(),
        "wav".to_owned(),
        "ogg".to_owned(),
        "m4a".to_owned(),
        "mka".to_owned(),
        "ape".to_owned(),
        "ac3".to_owned(),
        "dts".to_owned(),
      ],
      image: vec![
        "jpg".to_owned(),
        "jpeg".to_owned(),
        "png".to_owned(),
        "gif".to_owned(),
        "bmp".to_owned(),
        "tif".to_owned(),
      ],
      video: vec![
        "mkv".to_owned(),
        "mp4".to_owned(),
        "m2ts".to_owned(),
        "ts".to_owned(),
        "avi".to_owned(),
        "mov".to_owned(),
        "wmv".to_owned(),
        "flv".to_owned(),
        "webm".to_owned(),
      ],
    }
  }
}

pub fn get_active_file_extensions() -> Vec<String> {
  let config = get_config();
  match config.directory_mode {
    ConfigDirectoryMode::Audio => config.file_extensions.audio.clone(),
    ConfigDirectoryMode::Image => config.file_extensions.image.clone(),
    ConfigDirectoryMode::Video => config.file_extensions.video.clone(),
    _ => vec![],
  }
}

pub fn get_config() -> Config {
  unsafe { CONFIG.to_owned() }
}

pub fn set_config(config: Config) -> Result<()> {
  let config_path_buf = Config::get_path_buf();
  let result = config.save(config_path_buf);
  unsafe { CONFIG.clone_from(&config) };
  result
}
