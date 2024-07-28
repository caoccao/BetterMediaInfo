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

use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(target_os = "windows")]
const MEDIA_INFO_PATH: &str = "MediaInfoLib\\Project\\MSVC2022\\x64\\Release";
#[cfg(target_os = "windows")]
const MEDIA_INFO_LIB_NAME: &str = "MediaInfo.dll";

fn copy_lib(media_info_path_buf: &PathBuf) {
  let source_media_info_lib_path_buf = media_info_path_buf.join(MEDIA_INFO_LIB_NAME);
  let out_dir = env::var("OUT_DIR").unwrap();
  let out_path = Path::new(out_dir.as_str())
    .parent()
    .unwrap()
    .parent()
    .unwrap()
    .parent()
    .unwrap();
  let target_media_info_lib_path_buf = out_path.join(MEDIA_INFO_LIB_NAME);
  let is_copy = if target_media_info_lib_path_buf.exists() {
    let source_metadata = fs::metadata(source_media_info_lib_path_buf.clone()).expect(
      format!(
        "Failed to get metadata of {}",
        source_media_info_lib_path_buf.to_str().unwrap()
      )
      .as_str(),
    );
    let target_metadata = fs::metadata(target_media_info_lib_path_buf.clone()).expect(
      format!(
        "Failed to get metadata of {}",
        target_media_info_lib_path_buf.to_str().unwrap()
      )
      .as_str(),
    );
    source_metadata.modified().unwrap() != target_metadata.modified().unwrap()
  } else {
    true
  };
  if is_copy {
    fs::copy(
      source_media_info_lib_path_buf.clone(),
      target_media_info_lib_path_buf.clone(),
    )
    .unwrap();
    println!(
      "cargo::warning=Copy from {} to {}",
      source_media_info_lib_path_buf.to_str().unwrap(),
      target_media_info_lib_path_buf.to_str().unwrap()
    );
  }
}

fn main() {
  let cargo_manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
  let better_media_info_path = Path::new(cargo_manifest_dir.as_str());
  let root_path = better_media_info_path.parent().unwrap();
  let media_info_path_buf = root_path.join(MEDIA_INFO_PATH);
  let media_info_dir = media_info_path_buf.to_str().unwrap();
  println!("cargo:rustc-link-search={media_info_dir}");
  println!("cargo:rustc-link-lib=MediaInfo");
  copy_lib(&media_info_path_buf);
  slint_build::compile("ui/main_window.slint").unwrap();
}
