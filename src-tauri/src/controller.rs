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
use once_cell::sync::Lazy;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use crate::config;
use crate::media_info::*;
use crate::protocol::*;
use crate::streams::*;

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

pub async fn get_about() -> Result<About> {
  let media_info = MediaInfo::new();
  let media_info_version = media_info.getOption(MediaInfoGetOption::InfoVersion)?;
  let app_version = env!("CARGO_PKG_VERSION").to_owned();
  Ok(About {
    app_version,
    media_info_version,
  })
}

pub async fn get_config() -> Result<config::Config> {
  Ok(config::get_config())
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

pub async fn get_properties(
  file: String,
  properties: Option<Vec<StreamProperty>>,
) -> Result<Vec<StreamPropertyMap>> {
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
  Ok(stream_property_maps)
}

pub async fn set_config(config: config::Config) -> Result<config::Config> {
  config::set_config(config)?;
  Ok(config::get_config())
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
