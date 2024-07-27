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

#![allow(
  non_camel_case_types,
  non_upper_case_globals,
  nonstandard_style,
  dead_code,
  unused_imports
)]

use std::{borrow::BorrowMut, collections::BTreeMap};

use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;

use crate::media_info::*;

static mut BUILT_IN_STREAM_MAP: Lazy<BTreeMap<String, Stream>> = Lazy::new(|| BTreeMap::new());

static BUILT_IN_GENERAL_STREAMS: Lazy<Vec<Stream>> = Lazy::new(|| {
  vec![
    Stream::new_built_in(MediaInfoStreamKind::General, "CompleteName".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "Duration".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "Encoded_Application".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "Encoded_Date".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "Encoded_Library".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "FileSize".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "Format".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "FrameRate".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "Movie".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "OverallBitRate".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "Title".to_owned()),
    Stream::new_built_in(MediaInfoStreamKind::General, "UniqueID".to_owned()),
  ]
});

#[derive(Debug, Clone, Copy)]
pub enum StreamType {
  BuiltIn,
  External,
}

#[derive(Debug, Clone)]
pub struct Stream {
  pub info_kind: MediaInfoPropertyKind,
  pub parameter: String,
  pub search_kind: MediaInfoPropertyKind,
  pub stream_kind: MediaInfoStreamKind,
  pub stream_type: StreamType,
}

impl Stream {
  pub fn new_built_in(stream_kind: MediaInfoStreamKind, parameter: String) -> Self {
    let stream = Self {
      info_kind: MediaInfoPropertyKind::Text,
      parameter,
      search_kind: MediaInfoPropertyKind::Name,
      stream_kind,
      stream_type: StreamType::BuiltIn,
    };
    unsafe { BUILT_IN_STREAM_MAP.insert(stream.get_identifier(), stream.clone()) };
    stream
  }

  pub fn get(&self, media_info: &MediaInfo, stream_number: usize) -> Result<String> {
    media_info.get(
      self.stream_kind,
      stream_number,
      self.parameter.as_str(),
      self.info_kind,
      self.search_kind,
    )
  }

  pub fn get_built_in_streams(stream_kind: MediaInfoStreamKind) -> Vec<Stream> {
    match stream_kind {
      MediaInfoStreamKind::General => BUILT_IN_GENERAL_STREAMS.clone(),
      _ => panic!("not supported"),
    }
  }

  pub fn get_identifier(&self) -> String {
    format!("{:?}/{}", self.stream_kind, self.parameter)
  }

  pub fn parse(info_parameters: String) -> Vec<Stream> {
    let mut streams = Vec::new();
    for line in info_parameters.split("\n").into_iter() {
      println!("{}", line);
    }
    streams
  }
}
