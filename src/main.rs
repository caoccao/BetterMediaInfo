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

mod media_info;

use media_info::*;
use std::path::Path;

fn main() {
  env_logger::init();
  let media_info = MediaInfo::new();
  let error_code = media_info
    .open(Path::new("y:\\test.mkv"))
    .expect("Failed to open video file.");
  println!("Error code: {}", error_code);
}
