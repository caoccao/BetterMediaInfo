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

use anyhow::Result;

use crate::media_info::*;
use crate::streams::*;

pub async fn get_about() -> Result<String> {
  let media_info = MediaInfo::new();
  let media_info_version = media_info.getOption(MediaInfoGetOption::InfoVersion).unwrap();
  let app_version = env!("CARGO_PKG_VERSION");
  Ok(format!("Better Media Info v{app_version} ({media_info_version})"))
}

pub async fn get_parameters() -> Result<String> {
  let media_info = MediaInfo::new();
  let info_parameters = media_info.getOption(MediaInfoGetOption::InfoParameters)?;
  Ok(
    Stream::parse(info_parameters)
      .into_iter()
      .map(|stream| format!("{:?}: {}", stream.stream_kind, stream.parameter).to_owned())
      .collect::<Vec<String>>()
      .join(", "),
  )
}
