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

fn main() {
  let project_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
  #[cfg(target_os = "windows")]
  {
    println!(
      "cargo:rustc-link-search={}/../MediaInfoLib/Project/MSVC2022/x64/Release",
      project_dir
    );
    println!("cargo:rustc-link-lib=MediaInfo");
  }
}
