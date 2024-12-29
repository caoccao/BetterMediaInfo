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

use crate::config::*;
use crate::media_info::*;

#[derive(Debug, Clone)]
pub struct Stream {
  pub info_kind: MediaInfoPropertyKind,
  pub parameter: String,
  pub search_kind: MediaInfoPropertyKind,
  pub stream_kind: MediaInfoStreamKind,
}

impl Stream {
  pub fn new(stream_kind: MediaInfoStreamKind, parameter: String) -> Self {
    Self {
      info_kind: MediaInfoPropertyKind::Text,
      parameter,
      search_kind: MediaInfoPropertyKind::Name,
      stream_kind,
    }
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

  pub fn get_identifier(&self) -> String {
    format!("{}/{}", self.stream_kind.get_name(), self.parameter)
  }

  pub fn parse(info_parameters: String) -> Vec<Stream> {
    let mut streams = Vec::new();
    let mut stream_kind = MediaInfoStreamKind::General;
    let mut parse_stream_kind = true;
    for line in info_parameters.split("\n").into_iter() {
      let line = line.trim();
      if parse_stream_kind {
        if line.is_empty() {
          log::error!("Unexpected empty line.");
          break;
        }
        stream_kind = MediaInfoStreamKind::parse(line);
        if stream_kind == MediaInfoStreamKind::Max {
          log::error!("Unexpected stream {}.", line);
          break;
        }
        parse_stream_kind = false;
      } else {
        if line.is_empty() {
          parse_stream_kind = true;
        } else {
          let stream = Stream::new(stream_kind, line.to_owned());
          streams.push(stream);
        }
      }
    }
    streams
  }
}
