/*
* Copyright (c) 2024-2026. caoccao.com Sam Cao
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
use std::path::{Path, PathBuf};

use crate::protocol::BDStatus;

// A valid Blu-ray folder has a BDMV directory with PLAYLIST and CLIPINF
// subdirectories, each containing at least one entry. This is the minimum
// check used by BDMaster (see BDMaster/src-tauri/src/bdrom/mod.rs validation).
fn find_child_dir_case_insensitive(parent: &Path, name: &str) -> Option<PathBuf> {
  let entries = std::fs::read_dir(parent).ok()?;
  for entry in entries.flatten() {
    let path = entry.path();
    if !path.is_dir() {
      continue;
    }
    if path
      .file_name()
      .and_then(|n| n.to_str())
      .is_some_and(|n| n.eq_ignore_ascii_case(name))
    {
      return Some(path);
    }
  }
  None
}

fn dir_has_any_entry(dir: &Path) -> bool {
  std::fs::read_dir(dir)
    .map(|mut it| it.next().is_some())
    .unwrap_or(false)
}

fn is_blu_ray_folder(path: &Path) -> bool {
  let Some(bdmv) = find_child_dir_case_insensitive(path, "BDMV") else {
    return false;
  };
  let Some(playlist) = find_child_dir_case_insensitive(&bdmv, "PLAYLIST") else {
    return false;
  };
  let Some(clipinf) = find_child_dir_case_insensitive(&bdmv, "CLIPINF") else {
    return false;
  };
  dir_has_any_entry(&playlist) && dir_has_any_entry(&clipinf)
}

pub async fn is_bd(path: String) -> Result<BDStatus> {
  let p = Path::new(path.as_str());
  if !p.exists() {
    return Ok(BDStatus {
      is_blu_ray: false,
      is_folder: false,
    });
  }
  let is_folder = p.is_dir();
  let is_blu_ray = if is_folder { is_blu_ray_folder(p) } else { false };
  Ok(BDStatus {
    is_blu_ray,
    is_folder,
  })
}
