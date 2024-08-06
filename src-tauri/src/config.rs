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

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::PathBuf;

static mut CONFIG: Lazy<Config> = Lazy::new(|| Config::new());

#[derive(Debug, Default, Clone, Deserialize, Serialize)]
pub struct Config {
  pub settings: ConfigSettings,
  pub streams: ConfigStreams,
}

impl Config {
  fn new() -> Config {
    let mut config_path_buf = std::env::current_exe().unwrap().parent().unwrap().to_path_buf();
    config_path_buf.push("Better Media Info.json");
    if config_path_buf.exists() {
      Self::load(config_path_buf)
    } else {
      log::debug!("Loading default config.");
      let config = Self::default();
      config.save(config_path_buf);
      config
    }
  }

  fn load(path: PathBuf) -> Self {
    let cloned_path = path.clone();
    let path_string = cloned_path.to_str().unwrap();
    log::debug!("Loading config from {}.", path_string);
    let file = File::open(path).expect(format!("Couldn't open config file {}.", path_string).as_str());
    let buf_reader = BufReader::new(file);
    serde_json::from_reader(buf_reader).expect(format!("Couldn't parse config file {}.", path_string).as_str())
  }

  fn save(&self, path: PathBuf) {
    let cloned_path = path.clone();
    let path_string = cloned_path.to_str().unwrap();
    log::debug!("Saving config to {}.", path_string);
    let file = File::create(path).expect(format!("Couldn't create config file {}.", path_string).as_str());
    let buf_writer = BufWriter::new(file);
    serde_json::to_writer_pretty(buf_writer, &self)
      .expect(format!("Couldn't write config file {}.", path_string).as_str());
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfigStreams {
  pub general: Vec<String>,
}

impl Default for ConfigStreams {
  fn default() -> Self {
    Self {
      general: vec![
        "CompleteName".to_owned(),
        "Duration".to_owned(),
        "Encoded_Application".to_owned(),
        "Encoded_Date".to_owned(),
        "Encoded_Library".to_owned(),
        "FileSize".to_owned(),
        "Format".to_owned(),
        "FrameRate".to_owned(),
        "Movie".to_owned(),
        "OverallBitRate".to_owned(),
        "Title".to_owned(),
        "UniqueID".to_owned(),
      ],
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfigSettings {
  pub audio_file_extensions: Vec<String>,
  pub image_file_extensions: Vec<String>,
  pub video_file_extensions: Vec<String>,
}

impl Default for ConfigSettings {
  fn default() -> Self {
    Self {
      audio_file_extensions: vec![
        "mp3".to_owned(),
        "aac".to_owned(),
        "flac".to_owned(),
        "wav".to_owned(),
        "ogg".to_owned(),
        "m4a".to_owned(),
        "mka".to_owned(),
        "webm".to_owned(),
        "ape".to_owned(),
        "ac3".to_owned(),
        "dts".to_owned(),
      ],
      image_file_extensions: vec![
        "jpg".to_owned(),
        "jpeg".to_owned(),
        "png".to_owned(),
        "gif".to_owned(),
        "bmp".to_owned(),
        "tif".to_owned(),
      ],
      video_file_extensions: vec![
        "mkv".to_owned(),
        "mp4".to_owned(),
        "avi".to_owned(),
        "mov".to_owned(),
        "wmv".to_owned(),
        "flv".to_owned(),
        "webm".to_owned(),
      ],
    }
  }
}

pub fn get_config() -> Config {
  unsafe { CONFIG.to_owned() }
}
