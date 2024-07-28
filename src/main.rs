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

mod config;
mod media_info;
mod streams;

use std::path::Path;

use media_info::*;

slint::include_modules!();

fn main() -> Result<(), slint::PlatformError> {
  env_logger::init();
  let main_window = MainWindow::new()?;
  main_window.run()
  // let media_info_file = MediaInfoFile::new(Path::new("y:/test.mkv"));
  // media_info_file
  //   .streams
  //   .into_iter()
  //   .filter(|stream| stream.stream_type.is_internal())
  //   .for_each(|stream| {
  //     println!(
  //       "{}: {}",
  //       stream.get_identifier(),
  //       stream.get(&media_info_file.media_info, 0).unwrap_or_default()
  //     );
  //   });
}
