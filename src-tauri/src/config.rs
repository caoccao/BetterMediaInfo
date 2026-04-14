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

use anyhow::{Error, Result};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::PathBuf;
use std::sync::{OnceLock, RwLock};

static CONFIG: OnceLock<RwLock<Config>> = OnceLock::new();

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfigStreamFormat {
  #[serde(rename = "bitRate", default)]
  pub bit_rate: ConfigBitRate,
  #[serde(default)]
  pub size: ConfigSize,
}

impl Default for ConfigStreamFormat {
  fn default() -> Self {
    Self {
      bit_rate: Default::default(),
      size: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
  #[serde(rename = "appendOnFileDrop")]
  pub append_on_file_drop: bool,
  #[serde(rename = "displayMode")]
  pub display_mode: DisplayMode,
  #[serde(default)]
  pub theme: Theme,
  #[serde(rename = "directoryMode")]
  pub directory_mode: ConfigDirectoryMode,
  #[serde(rename = "fileExtensions")]
  pub file_extensions: ConfigFileExtensions,
  #[serde(default)]
  pub language: Language,
  #[serde(default)]
  pub video: ConfigStreamFormat,
  #[serde(default)]
  pub audio: ConfigStreamFormat,
  #[serde(default)]
  pub subtitle: ConfigStreamFormat,
  #[serde(default)]
  pub mkv: ConfigMkv,
}

impl Default for Config {
  fn default() -> Self {
    Self {
      append_on_file_drop: true,
      display_mode: Default::default(),
      theme: Default::default(),
      directory_mode: Default::default(),
      file_extensions: Default::default(),
      language: Default::default(),
      video: Default::default(),
      audio: Default::default(),
      subtitle: Default::default(),
      mkv: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfigMkv {
  #[serde(rename = "mkvToolNixPath", default = "ConfigMkv::default_mkv_toolnix_path")]
  pub mkv_toolnix_path: String,
}

impl ConfigMkv {
  fn default_mkv_toolnix_path() -> String {
    if cfg!(target_os = "windows") {
      r"C:\Program Files\MKVToolNix".to_owned()
    } else if cfg!(target_os = "macos") {
      "/Applications/MKVToolNix.app/Contents/MacOS".to_owned()
    } else {
      "/usr/bin".to_owned()
    }
  }
}

impl Default for ConfigMkv {
  fn default() -> Self {
    Self {
      mkv_toolnix_path: Self::default_mkv_toolnix_path(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum Language {
  #[serde(rename = "de")]
  De,
  #[serde(rename = "en-US")]
  EnUS,
  #[serde(rename = "es")]
  Es,
  #[serde(rename = "fr")]
  Fr,
  #[serde(rename = "ja")]
  Ja,
  #[serde(rename = "zh-CN")]
  ZhCN,
  #[serde(rename = "zh-HK")]
  ZhHK,
  #[serde(rename = "zh-TW")]
  ZhTW,
}

impl Default for Language {
  fn default() -> Self {
    Self::EnUS
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FormatPrecision {
  Zero,
  One,
  Two,
}

impl Default for FormatPrecision {
  fn default() -> Self {
    Self::Two
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FormatUnit {
  K,
  KM,
  KMG,
  KMGT,
  KMi,
  KMiGi,
  KMiGiTi,
}

impl Default for FormatUnit {
  fn default() -> Self {
    Self::KMGT
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfigBitRate {
  pub precision: FormatPrecision,
  pub unit: FormatUnit,
}

impl Default for ConfigBitRate {
  fn default() -> Self {
    Self {
      precision: Default::default(),
      unit: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfigSize {
  pub precision: FormatPrecision,
  pub unit: FormatUnit,
}

impl Default for ConfigSize {
  fn default() -> Self {
    Self {
      precision: Default::default(),
      unit: Default::default(),
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
    config_path_buf.push("BetterMediaInfo.json");
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
pub enum DisplayMode {
  Auto,
  Light,
  Dark,
}

impl Default for DisplayMode {
  fn default() -> Self {
    Self::Auto
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum Theme {
  #[serde(alias = "Default")]
  Ocean,
  Aqua,
  Sky,
  Arctic,
  Glacier,
  Mist,
  Slate,
  Charcoal,
  Midnight,
  Indigo,
  Violet,
  Lavender,
  Rose,
  Blush,
  Coral,
  Sunset,
  Amber,
  Sand,
  Forest,
  Emerald,
}

impl Default for Theme {
  fn default() -> Self {
    Self::Ocean
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
  CONFIG
    .get_or_init(|| RwLock::new(Config::new()))
    .read()
    .unwrap()
    .clone()
}

pub fn set_config(config: Config) -> Result<()> {
  let config_path_buf = Config::get_path_buf();
  let result = config.save(config_path_buf);
  CONFIG
    .get_or_init(|| RwLock::new(Config::new()))
    .write()
    .unwrap()
    .clone_from(&config);
  result
}
