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
use std::rc::Rc;

use config::*;
use media_info::*;
use streams::*;

slint::include_modules!();

fn main() -> Result<(), slint::PlatformError> {
  env_logger::init();
  let config = get_config();
  let media_info = MediaInfo::new();
  let media_info_version = media_info.getOption(MediaInfoGetOption::InfoVersion).unwrap();
  let app_version = env!("CARGO_PKG_VERSION");
  let text_about = format!("Better Media Info v{app_version} ({media_info_version})");
  let stream_properties: Rc<slint::VecModel<slint::ModelRc<slint::StandardListViewItem>>> =
    Rc::new(slint::VecModel::default());
  Stream::parse(
    media_info
      .getOption(MediaInfoGetOption::InfoParameters)
      .expect(format!("Failed to get {:?}.", MediaInfoGetOption::InfoParameters).as_str()),
  ).into_iter().for_each(|stream| {
    let columns = Rc::new(slint::VecModel::default());
    columns.push(slint::format!("{:?}", stream.stream_kind).into());
    columns.push(slint::format!("{}", stream.parameter).into());
    stream_properties.push(columns.into());
  });

  let main_window = MainWindow::new()?;
  let main_window_properties = main_window.global::<MainWindowProperties>();
  main_window_properties.set_about(text_about.into());
  main_window_properties.set_font_size(config.settings.font_size);
  main_window_properties.set_stream_properties(stream_properties.into());
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
