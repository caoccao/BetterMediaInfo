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

#[cfg(target_os = "windows")]
use crate::constants::APP_NAME;

#[cfg(target_os = "windows")]
const MENU_LABEL: &str = "Open with BetterMediaInfo";

#[cfg(target_os = "windows")]
fn normalize_ext(ext: &str) -> String {
  let trimmed = ext.trim().trim_start_matches('.');
  trimmed.to_ascii_lowercase()
}

#[cfg(target_os = "windows")]
fn extension_shell_path(ext: &str) -> String {
  format!(
    r"Software\Classes\SystemFileAssociations\.{}\shell\{}",
    normalize_ext(ext),
    APP_NAME
  )
}

#[cfg(target_os = "windows")]
fn folder_shell_paths() -> [String; 2] {
  [
    format!(r"Software\Classes\Directory\shell\{}", APP_NAME),
    format!(r"Software\Classes\Directory\Background\shell\{}", APP_NAME),
  ]
}

#[cfg(target_os = "windows")]
fn write_shell_entry(shell_path: &str, command: &str, exe: &str) -> Result<()> {
  use winreg::RegKey;
  use winreg::enums::HKEY_CURRENT_USER;
  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  let (key, _) = hkcu.create_subkey(shell_path)?;
  key.set_value("", &MENU_LABEL)?;
  key.set_value("Icon", &exe)?;
  let command_path = format!("{}\\command", shell_path);
  let (cmd_key, _) = hkcu.create_subkey(&command_path)?;
  cmd_key.set_value("", &command)?;
  Ok(())
}

#[cfg(target_os = "windows")]
fn delete_shell_entry(shell_path: &str) -> Result<()> {
  use winreg::RegKey;
  use winreg::enums::HKEY_CURRENT_USER;
  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  match hkcu.delete_subkey_all(shell_path) {
    Ok(_) => Ok(()),
    Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(e) => Err(e.into()),
  }
}

#[cfg(target_os = "windows")]
fn shell_entry_exists(shell_path: &str) -> bool {
  use winreg::RegKey;
  use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};
  let hkcu = RegKey::predef(HKEY_CURRENT_USER);
  hkcu.open_subkey_with_flags(shell_path, KEY_READ).is_ok()
}

#[cfg(target_os = "windows")]
fn build_command() -> Result<String> {
  let exe = std::env::current_exe()?;
  let exe_str = exe.to_string_lossy().to_string();
  Ok(format!("\"{}\" \"%1\"", exe_str))
}

#[cfg(target_os = "windows")]
fn current_exe_string() -> Result<String> {
  Ok(std::env::current_exe()?.to_string_lossy().to_string())
}

#[cfg(target_os = "windows")]
pub fn register_extensions_context_menu(extensions: Vec<String>) -> Result<()> {
  let command = build_command()?;
  let exe = current_exe_string()?;
  for ext in extensions {
    if ext.trim().is_empty() { continue; }
    write_shell_entry(&extension_shell_path(&ext), &command, &exe)?;
  }
  Ok(())
}

#[cfg(target_os = "windows")]
pub fn unregister_extensions_context_menu(extensions: Vec<String>) -> Result<()> {
  for ext in extensions {
    if ext.trim().is_empty() { continue; }
    delete_shell_entry(&extension_shell_path(&ext))?;
  }
  Ok(())
}

#[cfg(target_os = "windows")]
pub fn are_extensions_context_menu_registered(extensions: Vec<String>) -> bool {
  let filtered: Vec<String> = extensions.into_iter().filter(|e| !e.trim().is_empty()).collect();
  if filtered.is_empty() { return false; }
  filtered.iter().all(|e| shell_entry_exists(&extension_shell_path(e)))
}

#[cfg(target_os = "windows")]
pub fn register_folder_context_menu() -> Result<()> {
  let command = build_command()?;
  let exe = current_exe_string()?;
  for path in folder_shell_paths() {
    write_shell_entry(&path, &command, &exe)?;
  }
  Ok(())
}

#[cfg(target_os = "windows")]
pub fn unregister_folder_context_menu() -> Result<()> {
  for path in folder_shell_paths() {
    delete_shell_entry(&path)?;
  }
  Ok(())
}

#[cfg(target_os = "windows")]
pub fn is_folder_context_menu_registered() -> bool {
  folder_shell_paths().iter().all(|p| shell_entry_exists(p))
}

#[cfg(not(target_os = "windows"))]
pub fn register_extensions_context_menu(_extensions: Vec<String>) -> Result<()> {
  Err(anyhow::anyhow!("Context menu registration is only supported on Windows."))
}

#[cfg(not(target_os = "windows"))]
pub fn unregister_extensions_context_menu(_extensions: Vec<String>) -> Result<()> {
  Err(anyhow::anyhow!("Context menu registration is only supported on Windows."))
}

#[cfg(not(target_os = "windows"))]
pub fn are_extensions_context_menu_registered(_extensions: Vec<String>) -> bool {
  false
}

#[cfg(not(target_os = "windows"))]
pub fn register_folder_context_menu() -> Result<()> {
  Err(anyhow::anyhow!("Context menu registration is only supported on Windows."))
}

#[cfg(not(target_os = "windows"))]
pub fn unregister_folder_context_menu() -> Result<()> {
  Err(anyhow::anyhow!("Context menu registration is only supported on Windows."))
}

#[cfg(not(target_os = "windows"))]
pub fn is_folder_context_menu_registered() -> bool {
  false
}
