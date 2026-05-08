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

use crate::config;
use crate::protocol::BatchMkvExtractStatus;

const TOOL_STEM: &str = "BatchMkvExtract";

fn process_name() -> &'static str {
  // Windows binaries carry the .exe suffix in sysinfo's process name; Linux
  // and macOS report the bare executable name. On macOS the running process
  // is the bundle binary at `<App>.app/Contents/MacOS/BatchMkvExtract`, so
  // the bare name still matches.
  if cfg!(target_os = "windows") {
    "BatchMkvExtract.exe"
  } else {
    TOOL_STEM
  }
}

fn find_running_process_dir() -> Option<PathBuf> {
  let exe_name = process_name();
  let sys = sysinfo::System::new_all();
  for process in sys.processes().values() {
    let name = process.name().to_string_lossy();
    // Process names are case-sensitive on Linux/macOS but conventionally
    // case-insensitive on Windows; eq_ignore_ascii_case is safe across all
    // three because the canonical name we look for is unambiguous.
    if !name.eq_ignore_ascii_case(exe_name) {
      continue;
    }
    if let Some(exe) = process.exe() {
      if let Some(parent) = exe.parent() {
        return Some(parent.to_path_buf());
      }
    }
  }
  None
}

fn binary_path(dir: &Path) -> Option<PathBuf> {
  let direct = dir.join(TOOL_STEM);
  if direct.exists() && direct.is_file() {
    return Some(direct);
  }
  #[cfg(target_os = "windows")]
  {
    let exe = dir.join(format!("{}.exe", TOOL_STEM));
    if exe.exists() && exe.is_file() {
      return Some(exe);
    }
  }
  None
}

fn has_executable(path: &Path) -> bool {
  binary_path(path).is_some()
}

fn resolve(path: &str) -> (PathBuf, bool) {
  let trimmed = path.trim();
  let configured = PathBuf::from(trimmed);
  if has_executable(&configured) {
    return (configured, true);
  }
  (configured, false)
}

fn persist_path(path: &Path) -> Result<()> {
  let new_path = path.to_string_lossy().to_string();
  let mut cfg = config::get_config();
  if cfg.batch_mkv_extract.path == new_path {
    return Ok(());
  }
  cfg.batch_mkv_extract.path = new_path;
  config::set_config(cfg)?;
  Ok(())
}

pub async fn is_batchmkvextract_found(
  path: String,
  check_running: bool,
) -> Result<BatchMkvExtractStatus> {
  if check_running {
    if let Some(dir) = find_running_process_dir() {
      // The directory we got back is the directory holding the running
      // binary. On macOS that's `<App>.app/Contents/MacOS`, which is what
      // we want to store. On Windows/Linux it's the install directory
      // (e.g. `C:\Program Files\BatchMkvExtract`, `/usr/bin`).
      if has_executable(&dir) {
        persist_path(&dir)?;
        return Ok(BatchMkvExtractStatus {
          found: true,
          path: dir.to_string_lossy().to_string(),
        });
      }
    }
  }
  let trimmed = path.trim();
  if trimmed.is_empty() {
    return Ok(BatchMkvExtractStatus {
      found: false,
      path: String::new(),
    });
  }
  let (resolved, found) = resolve(trimmed);
  if found {
    persist_path(&resolved)?;
  }
  Ok(BatchMkvExtractStatus {
    found,
    path: resolved.to_string_lossy().to_string(),
  })
}

pub fn spawn_batchmkvextract(file: &str) -> Result<()> {
  let file_path = Path::new(file);
  if !file_path.exists() {
    return Err(anyhow::anyhow!("File {} does not exist.", file));
  }
  let cfg = config::get_config();
  let dir = PathBuf::from(&cfg.batch_mkv_extract.path);
  let bin = binary_path(&dir).ok_or_else(|| {
    anyhow::anyhow!(
      "BatchMkvExtract executable not found under {}.",
      dir.display()
    )
  })?;
  let mut cmd = std::process::Command::new(&bin);
  cmd.arg(file);
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
  }
  cmd
    .spawn()
    .map_err(|e| anyhow::anyhow!("Failed to launch BatchMkvExtract: {}", e))?;
  Ok(())
}
