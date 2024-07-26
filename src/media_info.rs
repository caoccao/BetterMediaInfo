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
use std::os::raw;
use std::path::Path;
use std::usize;

use crate::media_info;

type mi_stream_kind = raw::c_int;
type mi_void = raw::c_void;
type mi_wchar = u16;

extern "C" {
  fn MediaInfo_New() -> *mut mi_void;
  fn MediaInfo_Close(handle: *mut mi_void);
  fn MediaInfo_Count_Get(handle: *mut mi_void, stream_kind: mi_stream_kind, stream_number: usize) -> usize;
  fn MediaInfo_Inform(handle: *mut mi_void, reserved: usize) -> *const mi_wchar;
  fn MediaInfo_Open(handle: *mut mi_void, path: *const mi_wchar) -> usize;
  fn MediaInfo_Option(handle: *mut mi_void, option: *const mi_wchar, value: *const mi_wchar) -> *const mi_wchar;
}

fn to_wchars(s: &str) -> Vec<u16> {
  s.encode_utf16().collect()
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
  let wcstr = unsafe { std::slice::from_raw_parts(pointer, length) };
  String::from_utf16_lossy(wcstr)
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MediaInfoStream {
  General = 0,
  Video,
  Audio,
  Text,
  Other,
  Image,
  Menu,
  Max,
}

impl MediaInfoStream {
  pub fn values() -> &'static [MediaInfoStream] {
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

  pub fn getCountByStreamKind(&self, stream_kind: MediaInfoStream) -> usize {
    log::debug!("MediaInfo::getCountByStreamKind({:?})", stream_kind);
    unsafe { MediaInfo_Count_Get(self.handle, stream_kind as mi_stream_kind, usize::MAX) }
  }

  pub fn getInformation(&self) -> String {
    log::debug!("MediaInfo::getInformation()");
    unsafe { from_wchars(MediaInfo_Inform(self.handle, 0)) }
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

  pub fn option(&self, option: &str, value: &str) -> Result<String> {
    log::debug!("MediaInfo::option(\"{}\", \"{}\")", option, value);
    let option = to_wchars(option);
    let value = to_wchars(value);
    unsafe {
      Ok(from_wchars(MediaInfo_Option(
        self.handle,
        option.as_ptr(),
        value.as_ptr(),
      )))
    }
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
