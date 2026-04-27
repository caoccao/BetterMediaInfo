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

#![cfg(target_os = "windows")]

use anyhow::Result;
use std::cell::Cell;
use std::ffi::c_void;
use windows::Win32::Foundation::HWND;
use windows::Win32::System::Com::{
  CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx,
};
use windows::Win32::UI::Shell::{
  ITaskbarList3, TBPF_ERROR, TBPF_NOPROGRESS, TBPF_NORMAL, TaskbarList,
};

thread_local! {
  static COM_INITIALIZED: Cell<bool> = const { Cell::new(false) };
}

fn ensure_com_initialized() {
  COM_INITIALIZED.with(|init| {
    if !init.get() {
      // Initialize COM for this thread. S_FALSE (already initialized) is fine;
      // RPC_E_CHANGED_MODE means another mode was active and is also tolerable
      // because creating ITaskbarList3 will still work in either apartment.
      unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
      }
      init.set(true);
    }
  });
}

fn create_taskbar() -> Result<ITaskbarList3> {
  ensure_com_initialized();
  let taskbar: ITaskbarList3 =
    unsafe { CoCreateInstance(&TaskbarList, None, CLSCTX_INPROC_SERVER)? };
  unsafe { taskbar.HrInit()? };
  Ok(taskbar)
}

fn hwnd_from_raw(raw: isize) -> HWND {
  HWND(raw as *mut c_void)
}

pub fn set_progress(hwnd_raw: isize, percent: u32) {
  let _ = (|| -> Result<()> {
    let hwnd = hwnd_from_raw(hwnd_raw);
    let taskbar = create_taskbar()?;
    unsafe {
      taskbar.SetProgressState(hwnd, TBPF_NORMAL)?;
      taskbar.SetProgressValue(hwnd, percent.min(100) as u64, 100)?;
    }
    Ok(())
  })();
}

pub fn set_error(hwnd_raw: isize) {
  let _ = (|| -> Result<()> {
    let hwnd = hwnd_from_raw(hwnd_raw);
    let taskbar = create_taskbar()?;
    unsafe {
      taskbar.SetProgressState(hwnd, TBPF_ERROR)?;
      taskbar.SetProgressValue(hwnd, 100, 100)?;
    }
    Ok(())
  })();
}

pub fn clear_progress(hwnd_raw: isize) {
  let _ = (|| -> Result<()> {
    let hwnd = hwnd_from_raw(hwnd_raw);
    let taskbar = create_taskbar()?;
    unsafe {
      taskbar.SetProgressState(hwnd, TBPF_NOPROGRESS)?;
    }
    Ok(())
  })();
}
