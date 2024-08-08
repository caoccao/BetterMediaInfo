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

use anyhow::Result;
use std::path::Path;

use crate::config;
use crate::media_info::*;
use crate::protocol::*;
use crate::streams::*;

pub async fn get_about() -> Result<About> {
  let media_info = MediaInfo::new();
  let media_info_version = media_info.getOption(MediaInfoGetOption::InfoVersion).unwrap();
  let app_version = env!("CARGO_PKG_VERSION").to_owned();
  Ok(About {
    app_version,
    media_info_version,
  })
}

pub async fn get_config() -> Result<config::Config> {
  Ok(config::get_config())
}

pub async fn get_file_info(file: String) -> Result<()> {
  Ok(())
}

pub async fn get_files(directory: String) -> Result<Vec<String>> {
  let path = Path::new(directory.as_str());
  if !path.exists() {
    Err(anyhow::anyhow!("Path {} does not exist.", path.display()))
  } else if !path.is_dir() {
    Err(anyhow::anyhow!("Path {} is not a directory.", path.display()))
  } else {
    let mut files = Vec::new();
    for result in path.read_dir().map_err(anyhow::Error::msg)? {
      let dir_entry = result.map_err(anyhow::Error::msg)?;
      dir_entry.path().to_str().map(|file| files.push(file.to_owned()));
    }
    Ok(files)
  }
}

pub async fn get_parameters() -> Result<Vec<Parameter>> {
  let media_info = MediaInfo::new();
  let info_parameters = media_info.getOption(MediaInfoGetOption::InfoParameters)?;
  let mut id = 0;
  Ok(
    Stream::parse(info_parameters)
      .into_iter()
      .map(|stream| {
        let parameter = Parameter {
          id,
          stream: stream.stream_kind.get_name().to_owned(),
          property: stream.parameter,
        };
        id += 1;
        parameter
      })
      .collect::<Vec<Parameter>>(),
  )
}

pub async fn set_config(config: config::Config) -> Result<()> {
  config::set_config(config)
}
