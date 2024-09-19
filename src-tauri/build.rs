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

trait Lib {
  fn deploy(&self, root_path: &Path);
  fn link(&self, root_path: &Path);
}

struct ExternalLib {
  is_static: bool,
  file_name: String,
  lib_name: String,
  source_path: String,
}

impl Lib for ExternalLib {
  fn deploy(&self, root_path: &Path) {
    if !self.is_static {
      let source_lib_path_buf = root_path.join(self.source_path.as_str()).join(self.file_name.as_str());
      let out_dir = env::var("OUT_DIR").unwrap();
      let out_path = Path::new(out_dir.as_str())
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .parent()
        .unwrap();
      let target_lib_path_buf = out_path.join(self.file_name.as_str());
      copy(source_lib_path_buf, target_lib_path_buf);
    }
  }

  fn link(&self, root_path: &Path) {
    let lib_path = root_path.join(self.source_path.as_str());
    if self.is_static {
      println!("cargo::warning=Search static lib at {}", lib_path.to_str().unwrap());
      println!("cargo:rustc-link-search=native={}", lib_path.to_str().unwrap());
      println!("cargo::warning=Static link {}", self.lib_name);
      println!("cargo::rustc-link-lib=static:+whole-archive={}", self.lib_name);
    } else {
      println!("cargo::warning=Search dynamic lib at {}", lib_path.to_str().unwrap());
      println!("cargo:rustc-link-search={}", lib_path.to_str().unwrap());
      println!("cargo::warning=Dynamic link {}", self.lib_name);
      println!("cargo:rustc-link-lib={}", self.lib_name);
    }
  }
}

fn copy(source_lib_path_buf: PathBuf, target_lib_path_buf: PathBuf) {
  let is_copy = if target_lib_path_buf.exists() {
    let source_metadata = fs::metadata(source_lib_path_buf.clone())
      .expect(format!("Failed to get metadata of {}", source_lib_path_buf.to_str().unwrap()).as_str());
    let target_metadata = fs::metadata(target_lib_path_buf.clone())
      .expect(format!("Failed to get metadata of {}", target_lib_path_buf.to_str().unwrap()).as_str());
    source_metadata.modified().unwrap() != target_metadata.modified().unwrap()
  } else {
    true
  };
  if is_copy {
    fs::copy(source_lib_path_buf.clone(), target_lib_path_buf.clone()).unwrap();
    println!(
      "cargo::warning=Copy from {} to {}",
      source_lib_path_buf.to_str().unwrap(),
      target_lib_path_buf.to_str().unwrap()
    );
  }
}

fn main() {
  let cargo_manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
  let better_media_info_path = Path::new(cargo_manifest_dir.as_str());
  let root_path = better_media_info_path.parent().unwrap().parent().unwrap();

  #[cfg(not(target_os = "windows"))]
  {
    let z_lib = ExternalLib {
      is_static: true,
      file_name: "libz.a".to_owned(),
      lib_name: "z".to_owned(),
      source_path: "zlib".to_owned(),
    };
    z_lib.link(root_path);

    let zen_lib = ExternalLib {
      is_static: true,
      file_name: "libzen.a".to_owned(),
      lib_name: "zen".to_owned(),
      source_path: "ZenLib/Project/GNU/Library/.libs".to_owned(),
    };
    zen_lib.link(root_path);
  }

  #[cfg(target_os = "linux")]
  println!("cargo:rustc-link-lib=stdc++");

  #[cfg(target_os = "macos")]
  println!("cargo:rustc-link-lib=c++");

  #[cfg(not(target_os = "windows"))]
  let media_info_lib = ExternalLib {
    is_static: true,
    file_name: "libmediainfo.a".to_owned(),
    lib_name: "mediainfo".to_owned(),
    source_path: "MediaInfoLib/Project/GNU/Library/.libs".to_owned(),
  };

  #[cfg(target_os = "windows")]
  let media_info_lib = ExternalLib {
    is_static: false,
    file_name: "MediaInfo.dll".to_owned(),
    lib_name: "MediaInfo".to_owned(),
    source_path: "MediaInfoLib\\Project\\MSVC2022\\x64\\Release".to_owned(),
  };

  media_info_lib.link(root_path);
  media_info_lib.deploy(root_path);

  #[cfg(target_os = "windows")]
  {
    let system_root_path = env::var("SystemRoot").expect("Failed to get SystemRoot");
    let out_dir = env::var("OUT_DIR").unwrap();
    let out_path = Path::new(out_dir.as_str())
      .parent()
      .unwrap()
      .parent()
      .unwrap()
      .parent()
      .unwrap();
    ["msvcp140.dll", "vcruntime140.dll", "vcruntime140_1.dll"]
      .into_iter()
      .for_each(|file_name| {
        let source_lib_path_buf = Path::new(system_root_path.as_str()).join("System32").join(file_name);
        let target_lib_path_buf = out_path.join(file_name);
        copy(source_lib_path_buf, target_lib_path_buf);
      });
  }

  tauri_build::build()
}
