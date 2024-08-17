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

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::os::raw;
use std::path::{Path, PathBuf};
use std::usize;
use widestring::WideCString;

use crate::streams::*;

type mi_kind = raw::c_int;
type mi_void = raw::c_void;
#[cfg(target_os = "windows")]
type mi_wchar = u16;
#[cfg(target_os = "macos")]
type mi_wchar = u32;

const DEFAULT_OPTION_VALUE: &str = "";

extern "C" {
  fn MediaInfo_New() -> *mut mi_void;
  fn MediaInfo_Close(handle: *mut mi_void);
  fn MediaInfo_Count_Get(handle: *mut mi_void, stream_kind: mi_kind, stream_number: usize) -> usize;
  fn MediaInfo_Get(
    handle: *mut mi_void,
    stream_kind: mi_kind,
    stream_number: usize,
    parameter: *const mi_wchar,
    info_kind: mi_kind,
    search_kind: mi_kind,
  ) -> *const mi_wchar;
  fn MediaInfo_Inform(handle: *mut mi_void, reserved: usize) -> *const mi_wchar;
  fn MediaInfo_Open(handle: *mut mi_void, path: *const mi_wchar) -> usize;
  fn MediaInfo_Option(handle: *mut mi_void, option: *const mi_wchar, value: *const mi_wchar) -> *const mi_wchar;
}

fn to_wchars(s: &str) -> Vec<mi_wchar> {
  WideCString::from_str_truncate(s).into_vec()
}

fn from_wchars(pointer: *const mi_wchar) -> String {
  let mut current_pointer = pointer;
  let mut length = 0;
  while (unsafe { *current_pointer } != 0) {
    unsafe {
      current_pointer = current_pointer.offset(1);
    }
    length += 1;
  }
  unsafe { WideCString::from_ptr_truncate(pointer, length) }.to_string_lossy()
}

#[derive(Debug, Clone, Copy)]
pub enum MediaInfoGetOption {
  CompleteGet,
  InfoCodecs,
  InfoParameters,
  InfoVersion,
}

impl MediaInfoGetOption {
  pub fn as_str(&self) -> &'static str {
    match self {
      Self::CompleteGet => "Complete_Get",
      Self::InfoCodecs => "Info_Codecs",
      Self::InfoParameters => "Info_Parameters",
      Self::InfoVersion => "Info_Version",
    }
  }
}

#[derive(Debug, Clone, Copy)]
pub enum MediaInfoSetOption {
  CharSet,
  Complete,
  Locale,
}

impl MediaInfoSetOption {
  pub fn as_str(&self) -> &'static str {
    match self {
      Self::CharSet => "CharSet",
      Self::Complete => "Complete",
      Self::Locale => "setlocale_LC_CTYPE",
    }
  }
}

#[derive(Debug, Clone, Copy, Eq, Hash, PartialEq, Deserialize, Serialize)]
pub enum MediaInfoStreamKind {
  General = 0,
  Video,
  Audio,
  Text,
  Other,
  Image,
  Menu,
  Max,
}

impl MediaInfoStreamKind {
  pub fn get_name(&self) -> &str {
    match self {
      Self::General => "General",
      Self::Video => "Video",
      Self::Audio => "Audio",
      Self::Text => "Text",
      Self::Other => "Other",
      Self::Image => "Image",
      Self::Menu => "Menu",
      Self::Max => "Max",
    }
  }

  pub fn parse(text: &str) -> Self {
    match text {
      "General" => Self::General,
      "Video" => Self::Video,
      "Audio" => Self::Audio,
      "Text" => Self::Text,
      "Other" => Self::Other,
      "Image" => Self::Image,
      "Menu" => Self::Menu,
      _ => Self::Max,
    }
  }

  pub fn values() -> &'static [MediaInfoStreamKind] {
    &[
      Self::General,
      Self::Video,
      Self::Audio,
      Self::Text,
      Self::Other,
      Self::Image,
      Self::Menu,
      Self::Max,
    ]
  }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MediaInfoPropertyKind {
  Name = 0,
  Text,
  Measure,
  Options,
  NameText,
  MeasureText,
  Info,
  HowTo,
  Max,
}

impl MediaInfoPropertyKind {
  pub fn get_name(&self) -> &str {
    match self {
      Self::Name => "Name",
      Self::Text => "Text",
      Self::Measure => "Measure",
      Self::Options => "Options",
      Self::NameText => "NameText",
      Self::MeasureText => "MeasureText",
      Self::Info => "Info",
      Self::HowTo => "HowTo",
      Self::Max => "Max",
    }
  }

  pub fn values() -> &'static [MediaInfoPropertyKind] {
    &[
      Self::Name,
      Self::Text,
      Self::Measure,
      Self::Options,
      Self::NameText,
      Self::MeasureText,
      Self::Info,
      Self::HowTo,
      Self::Max,
    ]
  }
}

#[derive(Debug)]
pub struct MediaInfo {
  handle: *mut mi_void,
}

impl MediaInfo {
  pub fn new() -> Self {
    log::debug!("MediaInfo::new()");
    Self {
      handle: unsafe { MediaInfo_New() },
    }
  }

  pub fn get(
    &self,
    stream_kind: MediaInfoStreamKind,
    stream_number: usize,
    parameter: &str,
    info_kind: MediaInfoPropertyKind,
    search_kind: MediaInfoPropertyKind,
  ) -> Result<String> {
    log::debug!(
      "MediaInfo::get({}, {}, \"{}\", {}, {})",
      stream_kind.get_name(),
      stream_number,
      parameter,
      info_kind.get_name(),
      search_kind.get_name(),
    );
    let parameter = to_wchars(parameter);
    let result = unsafe {
      MediaInfo_Get(
        self.handle,
        stream_kind as mi_kind,
        stream_number,
        parameter.as_ptr(),
        info_kind as mi_kind,
        search_kind as mi_kind,
      )
    };
    Ok(from_wchars(result))
  }

  pub fn getCountByStreamKind(&self, stream_kind: MediaInfoStreamKind) -> usize {
    log::debug!("MediaInfo::getCountByStreamKind({})", stream_kind.get_name());
    unsafe { MediaInfo_Count_Get(self.handle, stream_kind as mi_kind, usize::MAX) }
  }

  pub fn getInformation(&self) -> String {
    log::debug!("MediaInfo::getInformation()");
    unsafe { from_wchars(MediaInfo_Inform(self.handle, 0)) }
  }

  pub fn getOption(&self, option: MediaInfoGetOption) -> Result<String> {
    let option = option.as_str();
    log::debug!("MediaInfo::getOption(\"{}\")", option);
    let option = to_wchars(option);
    let value = to_wchars(DEFAULT_OPTION_VALUE);
    let result = unsafe { MediaInfo_Option(self.handle, option.as_ptr(), value.as_ptr()) };
    Ok(from_wchars(result))
  }

  pub fn open(&self, path: &Path) -> Result<usize> {
    if let Some(path) = path.to_str() {
      log::debug!("MediaInfo::open(\"{}\")", path);
      let path = to_wchars(path);
      let error_code = unsafe { MediaInfo_Open(self.handle, path.as_ptr()) };
      Ok(error_code)
    } else {
      log::error!("MediaInfo::open()");
      Err(anyhow!("Failed to convert file path to string in MediaInfo::open()."))
    }
  }

  pub fn setOption(&self, option: MediaInfoSetOption, value: &str) -> Result<String> {
    let option_string = option.as_str();
    log::debug!("MediaInfo::setOption(\"{}\", \"{}\")", option_string, value);
    let option = to_wchars(option_string);
    let value = to_wchars(value);
    let result = unsafe { MediaInfo_Option(self.handle, option.as_ptr(), value.as_ptr()) };
    Ok(from_wchars(result))
  }
}

impl Default for MediaInfo {
  fn default() -> Self {
    Self::new()
  }
}

impl Drop for MediaInfo {
  fn drop(&mut self) {
    log::debug!("MediaInfo::drop()");
    unsafe {
      MediaInfo_Close(self.handle);
    }
  }
}

#[derive(Debug)]
pub struct MediaInfoFile {
  pub media_info: MediaInfo,
  pub path: PathBuf,
  pub streams: Vec<Stream>,
}

impl MediaInfoFile {
  pub fn new(path: &Path) -> Self {
    let media_info = MediaInfo::new();
    media_info
      .setOption(MediaInfoSetOption::CharSet, "UTF-8")
      .expect("Failed to set charset to utf-8.");
    media_info
      .setOption(MediaInfoSetOption::Locale, "zh-CN")
      .expect("Failed to set locale.");
    media_info.open(&path).expect("Failed to open video file.");
    let streams = Stream::parse(
      media_info
        .getOption(MediaInfoGetOption::InfoParameters)
        .expect(format!("Failed to get {:?}.", MediaInfoGetOption::InfoParameters).as_str()),
    );
    let path = path.to_path_buf();
    Self {
      media_info,
      path,
      streams,
    }
  }
}
