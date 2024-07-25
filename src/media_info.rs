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
use std::ffi::{CStr, CString};
use std::os::raw;
use std::path::Path;

use crate::media_info;

type mi_char = raw::c_char;
type mi_void = raw::c_void;

extern "C" {
  fn MediaInfo_New() -> *mut mi_void;
  fn MediaInfo_Close(handle: *mut mi_void);
  fn MediaInfo_Open(handle: *mut mi_void, path: *const mi_char) -> usize;
  fn MediaInfo_Option(handle: *mut mi_void, option: *const mi_char, value: *const mi_char) -> *const mi_char;
}

pub struct MediaInfo {
  handle: *mut mi_void,
}

impl MediaInfo {
  pub fn new() -> Self {
    log::debug!("MediaInfo::new()");
    let media_info = Self {
      handle: unsafe { MediaInfo_New() },
    };
    media_info
      .option("CharSet", "UTF-8")
      .expect("Failed to set charset to UTF-8 in MediaInfo::new().");
    media_info
  }

  pub fn open(&self, path: &Path) -> Result<usize> {
    if let Some(path) = path.to_str() {
      log::debug!("MediaInfo::open(\"{}\")", path);
      let path = CString::new(path)?;
      let error_code = unsafe { MediaInfo_Open(self.handle, path.as_ptr()) };
      Ok(error_code)
    } else {
      log::error!("MediaInfo::open()");
      Err(anyhow!("Failed to convert file path to string in MediaInfo::open()."))
    }
  }

  pub fn option(&self, option: &str, value: &str) -> Result<String> {
    log::debug!("MediaInfo::option(\"{}\", \"{}\")", option, value);
    unsafe {
      let option = CString::new(option)?;
      let value = CString::new(value)?;
      Ok(
        CStr::from_ptr(MediaInfo_Option(self.handle, option.as_ptr(), value.as_ptr()))
          .to_str()
          .map(|s| s.to_string())?,
      )
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
