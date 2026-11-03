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

//! Picks the C runtime `LC_CTYPE` locale that MediaInfoLib runs under, from the
//! locales the OS reports for the user.
//!
//! On Linux and macOS, MediaInfoLib turns wide-char file paths back into bytes with
//! `wcstombs`, which follows `LC_CTYPE`. The locale must use UTF-8 there, or files
//! with non-ASCII names can't be opened. On Windows, MediaInfoLib opens files through
//! wide-char APIs, and the locale only affects the CRT's own text conversions.

use std::ffi::CString;

use crate::config::normalize_locale_tag;

/// Tried in order after the OS locales, so a UTF-8 locale is still picked when the
/// OS locale isn't installed or the OS reports none. `UTF-8` exists on macOS.
#[cfg(unix)]
const FALLBACK_LOCALES: &[&str] = &["C.UTF-8", "en_US.UTF-8", "UTF-8"];
/// An empty name makes the CRT use the user's default locale from the OS settings.
#[cfg(windows)]
const FALLBACK_LOCALES: &[&str] = &[""];

/// Returns the name to pass to `setlocale(LC_CTYPE, ...)`, or `None` when the C
/// runtime accepts none of the candidates and the current locale should be kept.
pub fn detect_ctype_locale() -> Option<String> {
  let os_locales: Vec<String> = sys_locale::get_locales().collect();
  let candidates = ctype_locale_candidates(&os_locales);
  let locale = candidates.iter().find(|candidate| is_supported(candidate)).cloned();
  match &locale {
    Some(locale) => log::info!("Using C runtime locale \"{}\" (OS locales {:?}).", locale, os_locales),
    None => log::warn!(
      "The C runtime accepts none of the locales {:?} (OS locales {:?}).",
      candidates,
      os_locales
    ),
  }
  locale
}

/// Builds the `setlocale` names to try, best match first: each OS locale with its
/// region, then without it, then `FALLBACK_LOCALES`.
fn ctype_locale_candidates(os_locales: &[String]) -> Vec<String> {
  let mut candidates = Vec::new();
  for os_locale in os_locales {
    if let Some((language, region)) = parse_language_region(os_locale) {
      if let Some(region) = region {
        push_unique(&mut candidates, format_locale(&language, Some(&region)));
      }
      push_unique(&mut candidates, format_locale(&language, None));
    }
  }
  for fallback in FALLBACK_LOCALES {
    push_unique(&mut candidates, fallback.to_string());
  }
  candidates
}

#[cfg(unix)]
fn format_locale(language: &str, region: Option<&str>) -> String {
  match region {
    Some(region) => format!("{}_{}.UTF-8", language, region),
    None => format!("{}.UTF-8", language),
  }
}

#[cfg(windows)]
fn format_locale(language: &str, region: Option<&str>) -> String {
  match region {
    Some(region) => format!("{}-{}", language, region),
    None => language.to_owned(),
  }
}

/// Whether the C runtime accepts `name` for `LC_CTYPE`. The check builds a separate
/// locale object, so the process locale doesn't change.
#[cfg(unix)]
fn is_supported(name: &str) -> bool {
  let Ok(name) = CString::new(name) else {
    return false;
  };
  let locale = unsafe { libc::newlocale(libc::LC_CTYPE_MASK, name.as_ptr(), std::ptr::null_mut()) };
  if locale.is_null() {
    false
  } else {
    unsafe { libc::freelocale(locale) };
    true
  }
}

/// Whether the C runtime accepts `name` for `LC_CTYPE`. `_create_locale` makes the
/// same checks as `setlocale`, but on a separate locale object, so the process
/// locale doesn't change.
#[cfg(windows)]
fn is_supported(name: &str) -> bool {
  use std::ffi::{c_char, c_int, c_void};

  unsafe extern "C" {
    fn _create_locale(category: c_int, locale: *const c_char) -> *mut c_void;
    fn _free_locale(locale: *mut c_void);
  }
  const LC_CTYPE: c_int = 2;

  let Ok(name) = CString::new(name) else {
    return false;
  };
  let locale = unsafe { _create_locale(LC_CTYPE, name.as_ptr()) };
  if locale.is_null() {
    false
  } else {
    unsafe { _free_locale(locale) };
    true
  }
}

/// Splits an OS locale such as `zh-Hans-CN`, `en_US.UTF-8` or `de-DE-u-co-phonebk`
/// into a lowercase language and an uppercase region. The script subtag is skipped,
/// and everything from the first extension on is ignored. `C` and `POSIX` give `None`.
fn parse_language_region(os_locale: &str) -> Option<(String, Option<String>)> {
  let normalized = normalize_locale_tag(os_locale)?;
  let mut subtags = normalized.split('-');
  let language = subtags.next()?;
  if !(2..=3).contains(&language.len()) || !language.bytes().all(|b| b.is_ascii_alphabetic()) {
    return None;
  }
  let region = subtags
    .take_while(|subtag| subtag.len() > 1)
    .find(|subtag| {
      (subtag.len() == 2 && subtag.bytes().all(|b| b.is_ascii_alphabetic()))
        || (subtag.len() == 3 && subtag.bytes().all(|b| b.is_ascii_digit()))
    })
    .map(|region| region.to_ascii_uppercase());
  Some((language.to_owned(), region))
}

fn push_unique(candidates: &mut Vec<String>, candidate: String) {
  if !candidates.contains(&candidate) {
    candidates.push(candidate);
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn language_region(language: &str, region: Option<&str>) -> Option<(String, Option<String>)> {
    Some((language.to_owned(), region.map(str::to_owned)))
  }

  fn to_strings(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
  }

  #[test]
  fn test_parse_language_region() {
    assert_eq!(parse_language_region("en-US"), language_region("en", Some("US")));
    assert_eq!(parse_language_region("zh_CN.UTF-8"), language_region("zh", Some("CN")));
    assert_eq!(parse_language_region("zh-Hans-CN"), language_region("zh", Some("CN")));
    assert_eq!(parse_language_region("fr_FR.UTF-8@euro"), language_region("fr", Some("FR")));
    assert_eq!(parse_language_region("es-419"), language_region("es", Some("419")));
    assert_eq!(parse_language_region("de-u-co-phonebk"), language_region("de", None));
    assert_eq!(parse_language_region("ja"), language_region("ja", None));
    assert_eq!(parse_language_region("C"), None);
    assert_eq!(parse_language_region("C.UTF-8"), None);
    assert_eq!(parse_language_region("POSIX"), None);
  }

  #[test]
  #[cfg(unix)]
  fn test_ctype_locale_candidates() {
    assert_eq!(
      ctype_locale_candidates(&to_strings(&["zh-Hans-CN", "en-US", "C"])),
      to_strings(&["zh_CN.UTF-8", "zh.UTF-8", "en_US.UTF-8", "en.UTF-8", "C.UTF-8", "UTF-8"])
    );
    assert_eq!(ctype_locale_candidates(&[]), to_strings(FALLBACK_LOCALES));
  }

  #[test]
  #[cfg(windows)]
  fn test_ctype_locale_candidates() {
    assert_eq!(
      ctype_locale_candidates(&to_strings(&["zh-Hans-CN", "en-US", "en"])),
      to_strings(&["zh-CN", "zh", "en-US", "en", ""])
    );
    assert_eq!(ctype_locale_candidates(&[]), to_strings(FALLBACK_LOCALES));
  }

  #[test]
  fn test_detect_ctype_locale() {
    assert!(detect_ctype_locale().is_some(), "The C runtime should accept a detected or fallback locale.");
  }
}
