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

use anyhow::{Error, Result};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::PathBuf;
use std::sync::{OnceLock, RwLock};

use crate::constants::APP_NAME;

static CONFIG: OnceLock<RwLock<Config>> = OnceLock::new();

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigStreamFormat {
  #[serde(rename = "bitRate", default)]
  pub bit_rate: ConfigBitRate,
  #[serde(default)]
  pub size: ConfigSize,
}

impl Default for ConfigStreamFormat {
  fn default() -> Self {
    Self {
      bit_rate: Default::default(),
      size: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct Config {
  #[serde(rename = "appendOnFileDrop")]
  pub append_on_file_drop: bool,
  #[serde(rename = "displayMode")]
  pub display_mode: DisplayMode,
  #[serde(default)]
  pub theme: Theme,
  #[serde(rename = "directoryMode")]
  pub directory_mode: ConfigDirectoryMode,
  #[serde(rename = "fileExtensions")]
  pub file_extensions: ConfigFileExtensions,
  #[serde(default = "Language::detect_system")]
  pub language: Language,
  #[serde(default)]
  pub video: ConfigStreamFormat,
  #[serde(default)]
  pub audio: ConfigStreamFormat,
  #[serde(default)]
  pub subtitle: ConfigStreamFormat,
  #[serde(default)]
  pub mkv: ConfigMkv,
  #[serde(rename = "batchMkvExtract", default)]
  pub batch_mkv_extract: ConfigBatchMkvExtract,
  #[serde(rename = "bdMaster", default)]
  pub bd_master: ConfigBDMaster,
  #[serde(rename = "mpcHc", default)]
  pub mpc_hc: ConfigMpcHc,
  #[serde(default)]
  pub ffmpeg: ConfigFfmpeg,
  #[serde(default)]
  pub view: ConfigView,
  #[serde(default)]
  pub update: ConfigUpdate,
  #[serde(default)]
  pub window: ConfigWindow,
  #[serde(default)]
  pub templates: ConfigTemplates,
}

impl Default for Config {
  fn default() -> Self {
    Self {
      append_on_file_drop: true,
      display_mode: Default::default(),
      theme: Default::default(),
      directory_mode: Default::default(),
      file_extensions: Default::default(),
      language: Language::detect_system(),
      video: Default::default(),
      audio: Default::default(),
      subtitle: Default::default(),
      mkv: Default::default(),
      batch_mkv_extract: Default::default(),
      bd_master: Default::default(),
      mpc_hc: Default::default(),
      ffmpeg: Default::default(),
      view: Default::default(),
      update: Default::default(),
      window: Default::default(),
      templates: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct ConfigTemplateGroup {
  #[serde(default, deserialize_with = "deserialize_template_properties")]
  pub properties: Vec<String>,
}

// Accepts both the new format (array of strings) and the legacy format
// (array of `{ property, enabled }` objects) so existing config files
// load without manual migration.
fn deserialize_template_properties<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
  D: serde::Deserializer<'de>,
{
  #[derive(Deserialize)]
  #[serde(untagged)]
  enum Item {
    Name(String),
    Legacy {
      property: String,
      #[serde(default)]
      #[allow(dead_code)]
      enabled: Option<bool>,
    },
  }
  let items = Vec::<Item>::deserialize(deserializer)?;
  Ok(
    items
      .into_iter()
      .map(|item| match item {
        Item::Name(s) => s,
        Item::Legacy { property, .. } => property,
      })
      .collect(),
  )
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct ConfigTemplates {
  #[serde(default)]
  pub general: ConfigTemplateGroup,
  #[serde(default)]
  pub video: ConfigTemplateGroup,
  #[serde(default)]
  pub audio: ConfigTemplateGroup,
  #[serde(default)]
  pub text: ConfigTemplateGroup,
  #[serde(default)]
  pub other: ConfigTemplateGroup,
  #[serde(default)]
  pub image: ConfigTemplateGroup,
  #[serde(default)]
  pub menu: ConfigTemplateGroup,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigWindow {
  #[serde(default)]
  pub position: ConfigWindowPosition,
  #[serde(default)]
  pub size: ConfigWindowSize,
}

impl Default for ConfigWindow {
  fn default() -> Self {
    Self {
      position: Default::default(),
      size: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigWindowPosition {
  pub x: i32,
  pub y: i32,
}

impl Default for ConfigWindowPosition {
  fn default() -> Self {
    Self { x: -1, y: -1 }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigWindowSize {
  pub width: u32,
  pub height: u32,
}

impl Default for ConfigWindowSize {
  fn default() -> Self {
    Self {
      width: 1200,
      height: 900,
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigUpdate {
  #[serde(rename = "checkInterval", default)]
  pub check_interval: UpdateCheckInterval,
  #[serde(rename = "lastChecked", default)]
  pub last_checked: i64,
  #[serde(rename = "lastVersion", default)]
  pub last_version: String,
  #[serde(rename = "ignoreVersion", default)]
  pub ignore_version: String,
}

impl Default for ConfigUpdate {
  fn default() -> Self {
    Self {
      check_interval: Default::default(),
      last_checked: 0,
      last_version: String::new(),
      ignore_version: String::new(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum UpdateCheckInterval {
  Daily,
  Weekly,
  Monthly,
}

impl Default for UpdateCheckInterval {
  fn default() -> Self {
    Self::Weekly
  }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub enum MkvPriority {
  Lowest,
  Lower,
  Normal,
  Higher,
  Highest,
}

impl Default for MkvPriority {
  fn default() -> Self {
    Self::Lowest
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigMkvAdditionalParameters {
  #[serde(default)]
  pub priority: MkvPriority,
}

impl Default for ConfigMkvAdditionalParameters {
  fn default() -> Self {
    Self {
      priority: MkvPriority::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigMkvLanguages {
  #[serde(default = "ConfigMkvLanguages::default_preferred")]
  pub preferred: Vec<String>,
}

impl ConfigMkvLanguages {
  fn default_preferred() -> Vec<String> {
    vec![
      "chi".to_owned(),
      "eng".to_owned(),
      "fre".to_owned(),
      "ger".to_owned(),
      "jpn".to_owned(),
      "spa".to_owned(),
    ]
  }
}

impl Default for ConfigMkvLanguages {
  fn default() -> Self {
    Self {
      preferred: Self::default_preferred(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigMkvTitleAutocompletion {
  #[serde(default = "ConfigMkvTitleAutocompletion::default_titles")]
  pub titles: Vec<String>,
}

impl ConfigMkvTitleAutocompletion {
  fn default_titles() -> Vec<String> {
    vec![
      "Cantonese".to_owned(),
      "English".to_owned(),
      "French".to_owned(),
      "German".to_owned(),
      "Japanese".to_owned(),
      "Mandarin".to_owned(),
      "Simplified Chinese".to_owned(),
      "Spanish".to_owned(),
      "Traditional Chinese".to_owned(),
    ]
  }
}

impl Default for ConfigMkvTitleAutocompletion {
  fn default() -> Self {
    Self {
      titles: Self::default_titles(),
    }
  }
}

#[derive(Debug, Clone, Serialize)]
pub struct ConfigMkv {
  #[serde(rename = "mkvToolNixPath", default = "ConfigMkv::default_mkv_toolnix_path")]
  pub mkv_toolnix_path: String,
  #[serde(rename = "additionalParameters", default)]
  pub additional_parameters: ConfigMkvAdditionalParameters,
  #[serde(default)]
  pub languages: ConfigMkvLanguages,
  #[serde(rename = "titleAutocompletion", default)]
  pub title_autocompletion: ConfigMkvTitleAutocompletion,
}

impl<'de> Deserialize<'de> for ConfigMkv {
  fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
  where
    D: serde::Deserializer<'de>,
  {
    #[derive(Deserialize)]
    struct ConfigMkvWire {
      #[serde(rename = "mkvToolNixPath", default = "ConfigMkv::default_mkv_toolnix_path")]
      mkv_toolnix_path: String,
      #[serde(rename = "additionalParameters")]
      additional_parameters: Option<ConfigMkvAdditionalParameters>,
      #[serde(default)]
      priority: Option<MkvPriority>,
      #[serde(default)]
      languages: ConfigMkvLanguages,
      #[serde(rename = "titleAutocompletion", default)]
      title_autocompletion: ConfigMkvTitleAutocompletion,
    }

    let wire = ConfigMkvWire::deserialize(deserializer)?;
    let additional_parameters = wire
      .additional_parameters
      .unwrap_or_else(|| ConfigMkvAdditionalParameters {
        priority: wire.priority.unwrap_or_default(),
      });

    Ok(Self {
      mkv_toolnix_path: wire.mkv_toolnix_path,
      additional_parameters,
      languages: wire.languages,
      title_autocompletion: wire.title_autocompletion,
    })
  }
}

impl ConfigMkv {
  fn default_mkv_toolnix_path() -> String {
    if cfg!(target_os = "windows") {
      r"C:\Program Files\MKVToolNix".to_owned()
    } else if cfg!(target_os = "macos") {
      "/Applications/MKVToolNix.app/Contents/MacOS".to_owned()
    } else {
      "/usr/bin".to_owned()
    }
  }
}

impl Default for ConfigMkv {
  fn default() -> Self {
    Self {
      mkv_toolnix_path: Self::default_mkv_toolnix_path(),
      additional_parameters: ConfigMkvAdditionalParameters::default(),
      languages: ConfigMkvLanguages::default(),
      title_autocompletion: ConfigMkvTitleAutocompletion::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigBatchMkvExtract {
  #[serde(default = "ConfigBatchMkvExtract::default_path")]
  pub path: String,
}

impl ConfigBatchMkvExtract {
  fn default_path() -> String {
    if cfg!(target_os = "windows") {
      r"C:\Program Files\BatchMkvExtract".to_owned()
    } else if cfg!(target_os = "macos") {
      "/Applications/BatchMkvExtract.app/Contents/MacOS".to_owned()
    } else {
      "/usr/bin".to_owned()
    }
  }
}

impl Default for ConfigBatchMkvExtract {
  fn default() -> Self {
    Self {
      path: Self::default_path(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigBDMaster {
  #[serde(default = "ConfigBDMaster::default_path")]
  pub path: String,
}

impl ConfigBDMaster {
  fn default_path() -> String {
    if cfg!(target_os = "windows") {
      r"C:\Program Files\BDMaster".to_owned()
    } else if cfg!(target_os = "macos") {
      "/Applications/BDMaster.app/Contents/MacOS".to_owned()
    } else {
      "/usr/bin".to_owned()
    }
  }
}

impl Default for ConfigBDMaster {
  fn default() -> Self {
    Self {
      path: Self::default_path(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigMpcHc {
  #[serde(default = "ConfigMpcHc::default_path")]
  pub path: String,
}

impl ConfigMpcHc {
  fn default_path() -> String {
    if cfg!(target_os = "windows") {
      r"C:\Program Files (x86)\K-Lite Codec Pack\MPC-HC64".to_owned()
    } else {
      String::new()
    }
  }
}

impl Default for ConfigMpcHc {
  fn default() -> Self {
    Self {
      path: Self::default_path(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigFfmpeg {
  #[serde(default = "ConfigFfmpeg::default_path")]
  pub path: String,
}

impl ConfigFfmpeg {
  fn default_path() -> String {
    // FFmpeg ships as a bare CLI binary (`ffmpeg`/`ffmpeg.exe`), not a GUI app
    // bundle, so the conventional install locations differ from the other
    // tools: a manual unzip dir on Windows and the package-manager bin dirs
    // on macOS/Linux.
    if cfg!(target_os = "windows") {
      r"C:\ffmpeg\bin".to_owned()
    } else if cfg!(target_os = "macos") {
      "/usr/local/bin".to_owned()
    } else {
      "/usr/bin".to_owned()
    }
  }
}

impl Default for ConfigFfmpeg {
  fn default() -> Self {
    Self {
      path: Self::default_path(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigView {
  #[serde(default)]
  pub card: ConfigCardView,
  #[serde(default)]
  pub detail: ConfigDetailView,
}

impl Default for ConfigView {
  fn default() -> Self {
    Self {
      card: Default::default(),
      detail: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigCardView {
  #[serde(rename = "showGeneral", default = "default_true")]
  pub show_general: bool,
  #[serde(rename = "showVideo", default = "default_true")]
  pub show_video: bool,
  #[serde(rename = "showAudio", default = "default_true")]
  pub show_audio: bool,
  #[serde(rename = "showSubtitle", default = "default_true")]
  pub show_subtitle: bool,
  #[serde(rename = "showImage", default = "default_true")]
  pub show_image: bool,
  #[serde(rename = "showMenu", default = "default_false")]
  pub show_menu: bool,
}

fn default_true() -> bool {
  true
}

fn default_false() -> bool {
  false
}

impl Default for ConfigCardView {
  fn default() -> Self {
    Self {
      show_general: true,
      show_video: true,
      show_audio: true,
      show_subtitle: true,
      show_image: true,
      show_menu: false,
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigDetailView {
  #[serde(rename = "showGeneral", default = "default_true")]
  pub show_general: bool,
  #[serde(rename = "showVideo", default = "default_true")]
  pub show_video: bool,
  #[serde(rename = "showAudio", default = "default_true")]
  pub show_audio: bool,
  #[serde(rename = "showSubtitle", default = "default_true")]
  pub show_subtitle: bool,
  #[serde(rename = "showImage", default = "default_true")]
  pub show_image: bool,
  #[serde(rename = "showMenu", default = "default_true")]
  pub show_menu: bool,
}

impl Default for ConfigDetailView {
  fn default() -> Self {
    Self {
      show_general: true,
      show_video: true,
      show_audio: true,
      show_subtitle: true,
      show_image: true,
      show_menu: true,
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum Language {
  #[serde(rename = "de")]
  De,
  #[serde(rename = "en-US")]
  EnUS,
  #[serde(rename = "es")]
  Es,
  #[serde(rename = "fr")]
  Fr,
  #[serde(rename = "it")]
  It,
  #[serde(rename = "ja")]
  Ja,
  #[serde(rename = "zh-CN")]
  ZhCN,
  #[serde(rename = "zh-HK")]
  ZhHK,
  #[serde(rename = "zh-TW")]
  ZhTW,
}

impl Default for Language {
  fn default() -> Self {
    Self::EnUS
  }
}

impl Language {
  fn detect_system() -> Self {
    let locales: Vec<String> = sys_locale::get_locales().collect();
    for locale in &locales {
      if let Some(language) = Self::from_locale_tag(locale) {
        log::debug!("Detected system language {:?} from locale {}.", language, locale);
        return language;
      }
    }
    if !locales.is_empty() {
      log::debug!("No supported app language found in system locales {:?}.", locales);
    }
    Self::default()
  }

  fn from_locale_tag(locale: &str) -> Option<Self> {
    let normalized = normalize_locale_tag(locale)?;
    let mut parts = normalized.split('-');
    let language = parts.next()?;
    let mut script: Option<&str> = None;
    let mut region: Option<&str> = None;
    for part in parts {
      if part.len() == 4 && script.is_none() {
        script = Some(part);
      } else if (part.len() == 2 || part.len() == 3) && region.is_none() {
        region = Some(part);
      }
    }

    match language {
      "de" => Some(Self::De),
      "en" => Some(Self::EnUS),
      "es" => Some(Self::Es),
      "fr" => Some(Self::Fr),
      "it" => Some(Self::It),
      "ja" => Some(Self::Ja),
      "zh" => Some(match (script, region) {
        (Some("hant"), Some("hk" | "mo")) => Self::ZhHK,
        (Some("hant"), _) => Self::ZhTW,
        (Some("hans"), _) => Self::ZhCN,
        (_, Some("tw")) => Self::ZhTW,
        (_, Some("hk" | "mo")) => Self::ZhHK,
        _ => Self::ZhCN,
      }),
      _ => None,
    }
  }
}

fn normalize_locale_tag(locale: &str) -> Option<String> {
  let locale = locale
    .split(':')
    .find(|part| !part.trim().is_empty())
    .unwrap_or(locale)
    .trim();
  if locale.eq_ignore_ascii_case("c") || locale.eq_ignore_ascii_case("posix") {
    return None;
  }
  let locale = locale
    .split('.')
    .next()
    .unwrap_or(locale)
    .split('@')
    .next()
    .unwrap_or(locale)
    .replace('_', "-")
    .to_ascii_lowercase();
  if locale.is_empty() || locale == "c" || locale == "posix" {
    None
  } else {
    Some(locale)
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FormatPrecision {
  Zero,
  One,
  Two,
}

impl Default for FormatPrecision {
  fn default() -> Self {
    Self::Two
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FormatUnit {
  K,
  KM,
  KMG,
  KMGT,
  KMi,
  KMiGi,
  KMiGiTi,
}

impl Default for FormatUnit {
  fn default() -> Self {
    Self::KMGT
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigBitRate {
  pub precision: FormatPrecision,
  pub unit: FormatUnit,
}

impl Default for ConfigBitRate {
  fn default() -> Self {
    Self {
      precision: Default::default(),
      unit: Default::default(),
    }
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigSize {
  pub precision: FormatPrecision,
  pub unit: FormatUnit,
}

impl Default for ConfigSize {
  fn default() -> Self {
    Self {
      precision: Default::default(),
      unit: Default::default(),
    }
  }
}

impl Config {
  fn new() -> Self {
    let config_path_buf = Self::get_path_buf();
    if config_path_buf.exists() {
      Self::load(config_path_buf)
    } else {
      log::debug!("Loading default config.");
      let config = Self::default();
      if let Err(err) = config.save(config_path_buf) {
        log::error!("Couldn't save the default config because {}", err);
      }
      config
    }
  }

  fn get_path_buf() -> PathBuf {
    let config_dir = Self::get_config_dir();
    if !config_dir.exists() {
      if let Err(err) = std::fs::create_dir_all(&config_dir) {
        log::warn!("Couldn't create config dir {}: {}", config_dir.display(), err);
      }
    }
    config_dir.join(format!("{}.json", APP_NAME))
  }

  fn get_exe_dir() -> PathBuf {
    std::env::current_exe().unwrap().parent().unwrap().to_path_buf()
  }

  #[cfg(target_os = "linux")]
  fn get_config_dir() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
      if !xdg.is_empty() {
        return PathBuf::from(xdg).join(APP_NAME);
      }
    }
    if let Ok(home) = std::env::var("HOME") {
      return PathBuf::from(home).join(".config").join(APP_NAME);
    }
    Self::get_exe_dir()
  }

  #[cfg(target_os = "macos")]
  fn get_config_dir() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
      return PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join(APP_NAME);
    }
    Self::get_exe_dir()
  }

  #[cfg(target_os = "windows")]
  fn get_config_dir() -> PathBuf {
    let exe_dir = Self::get_exe_dir();
    let exe_path_lc = exe_dir.to_string_lossy().to_ascii_lowercase();
    let starts_with_env = |env_var: &str| -> bool {
      std::env::var(env_var)
        .ok()
        .map(|p| !p.is_empty() && exe_path_lc.starts_with(&p.to_ascii_lowercase()))
        .unwrap_or(false)
    };
    let is_installed =
      starts_with_env("LOCALAPPDATA") || starts_with_env("ProgramFiles") || starts_with_env("ProgramFiles(x86)");
    if is_installed {
      if let Ok(appdata) = std::env::var("APPDATA") {
        if !appdata.is_empty() {
          return PathBuf::from(appdata).join(APP_NAME);
        }
      }
    }
    exe_dir
  }

  fn load(path: PathBuf) -> Self {
    let path_string = path.to_str().unwrap();
    log::debug!("Loading config from {}.", path_string);
    let file = File::open(&path).expect(format!("Couldn't open config file {}.", path_string).as_str());
    let buf_reader = BufReader::new(file);
    let value: serde_json::Value =
      serde_json::from_reader(buf_reader).expect(format!("Couldn't parse config file {}.", path_string).as_str());
    let should_save_language = value
      .as_object()
      .map(|object| !object.contains_key("language"))
      .unwrap_or(false);
    let config: Self =
      serde_json::from_value(value).expect(format!("Couldn't parse config file {}.", path_string).as_str());
    if should_save_language {
      log::debug!("Saving detected language to config {}.", path_string);
      if let Err(err) = config.save(path) {
        log::error!("Couldn't save the detected language because {}", err);
      }
    }
    config
  }

  fn save(&self, path: PathBuf) -> Result<()> {
    let cloned_path = path.clone();
    let path_string = cloned_path.to_str().unwrap();
    log::debug!("Saving config to {}.", path_string);
    let file = File::create(path).expect(format!("Couldn't create config file {}.", path_string).as_str());
    let buf_writer = BufWriter::new(file);
    serde_json::to_writer_pretty(buf_writer, &self).map_err(Error::msg)
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum DisplayMode {
  Auto,
  Light,
  Dark,
}

impl Default for DisplayMode {
  fn default() -> Self {
    Self::Auto
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum Theme {
  #[serde(alias = "Default")]
  Ocean,
  Aqua,
  Sky,
  Arctic,
  Glacier,
  Mist,
  Slate,
  Charcoal,
  Midnight,
  Indigo,
  Violet,
  Lavender,
  Rose,
  Blush,
  Coral,
  Sunset,
  Amber,
  Sand,
  Forest,
  Emerald,
}

impl Default for Theme {
  fn default() -> Self {
    Self::Ocean
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum ConfigDirectoryMode {
  All = 0,
  Audio,
  Image,
  Video,
}

impl Default for ConfigDirectoryMode {
  fn default() -> Self {
    Self::All
  }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfigFileExtensions {
  pub audio: Vec<String>,
  pub image: Vec<String>,
  pub video: Vec<String>,
}

impl Default for ConfigFileExtensions {
  fn default() -> Self {
    Self {
      audio: vec![
        "mp3".to_owned(),
        "aac".to_owned(),
        "flac".to_owned(),
        "wav".to_owned(),
        "ogg".to_owned(),
        "m4a".to_owned(),
        "mka".to_owned(),
        "ape".to_owned(),
        "ac3".to_owned(),
        "dts".to_owned(),
      ],
      image: vec![
        "jpg".to_owned(),
        "jpeg".to_owned(),
        "png".to_owned(),
        "gif".to_owned(),
        "bmp".to_owned(),
        "tif".to_owned(),
      ],
      video: vec![
        "mkv".to_owned(),
        "mp4".to_owned(),
        "m2ts".to_owned(),
        "ts".to_owned(),
        "avi".to_owned(),
        "mov".to_owned(),
        "wmv".to_owned(),
        "flv".to_owned(),
        "webm".to_owned(),
      ],
    }
  }
}

pub fn get_active_file_extensions() -> Vec<String> {
  let config = get_config();
  match config.directory_mode {
    ConfigDirectoryMode::Audio => config.file_extensions.audio.clone(),
    ConfigDirectoryMode::Image => config.file_extensions.image.clone(),
    ConfigDirectoryMode::Video => config.file_extensions.video.clone(),
    _ => vec![],
  }
}

pub fn get_config() -> Config {
  CONFIG
    .get_or_init(|| RwLock::new(Config::new()))
    .read()
    .unwrap()
    .clone()
}

pub fn set_config(config: Config) -> Result<()> {
  let config_path_buf = Config::get_path_buf();
  let result = config.save(config_path_buf);
  CONFIG
    .get_or_init(|| RwLock::new(Config::new()))
    .write()
    .unwrap()
    .clone_from(&config);
  result
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn config_deserialization_uses_defaults_for_missing_nodes() {
    let config: Config = serde_json::from_str("{}").unwrap();

    assert!(config.append_on_file_drop);
    assert!(matches!(config.display_mode, DisplayMode::Auto));
    assert!(matches!(config.directory_mode, ConfigDirectoryMode::All));
    assert_eq!(config.file_extensions.video, ConfigFileExtensions::default().video);
    assert_eq!(config.window.position.x, -1);
    assert_eq!(config.window.position.y, -1);
    assert_eq!(config.window.size.width, 1200);
    assert_eq!(config.window.size.height, 900);
    assert!(matches!(config.video.bit_rate.precision, FormatPrecision::Two));
    assert!(matches!(config.video.bit_rate.unit, FormatUnit::KMGT));
    assert_eq!(config.mkv.languages.preferred, ConfigMkvLanguages::default().preferred);
    assert_eq!(
      config.mkv.title_autocompletion.titles,
      ConfigMkvTitleAutocompletion::default().titles
    );
    assert!(config.view.card.show_image);
    assert!(config.view.detail.show_image);
  }

  #[test]
  fn config_deserialization_preserves_present_nodes_while_filling_missing_children() {
    let config: Config = serde_json::from_str(
      r#"{
        "appendOnFileDrop": false,
        "language": "ja",
        "fileExtensions": {
          "video": ["mkv"]
        },
        "video": {
          "bitRate": {
            "unit": "KMi"
          }
        },
        "window": {
          "position": {
            "x": 10
          }
        },
        "mkv": {
          "priority": "Highest",
          "languages": {},
          "titleAutocompletion": {}
        },
        "view": {
          "card": {
            "showVideo": false
          },
          "detail": {
            "showAudio": false
          }
        }
      }"#,
    )
    .unwrap();

    assert!(!config.append_on_file_drop);
    assert!(matches!(config.language, Language::Ja));
    assert_eq!(config.file_extensions.video, vec!["mkv".to_owned()]);
    assert_eq!(config.file_extensions.audio, ConfigFileExtensions::default().audio);
    assert_eq!(config.file_extensions.image, ConfigFileExtensions::default().image);
    assert!(matches!(config.video.bit_rate.precision, FormatPrecision::Two));
    assert!(matches!(config.video.bit_rate.unit, FormatUnit::KMi));
    assert_eq!(config.window.position.x, 10);
    assert_eq!(config.window.position.y, -1);
    assert_eq!(config.mkv.additional_parameters.priority, MkvPriority::Highest);
    assert_eq!(config.mkv.languages.preferred, ConfigMkvLanguages::default().preferred);
    assert_eq!(
      config.mkv.title_autocompletion.titles,
      ConfigMkvTitleAutocompletion::default().titles
    );
    assert!(!config.view.card.show_video);
    assert!(!config.view.detail.show_audio);
    assert!(config.view.card.show_image);
    assert!(config.view.detail.show_image);
  }

  #[test]
  fn language_from_locale_tag_maps_supported_locales() {
    assert!(matches!(Language::from_locale_tag("de-DE"), Some(Language::De)));
    assert!(matches!(Language::from_locale_tag("en_US.UTF-8"), Some(Language::EnUS)));
    assert!(matches!(Language::from_locale_tag("es-MX"), Some(Language::Es)));
    assert!(matches!(Language::from_locale_tag("fr-CA"), Some(Language::Fr)));
    assert!(matches!(Language::from_locale_tag("it-IT"), Some(Language::It)));
    assert!(matches!(Language::from_locale_tag("ja-JP"), Some(Language::Ja)));
    assert!(matches!(Language::from_locale_tag("zh-Hans-CN"), Some(Language::ZhCN)));
    assert!(matches!(Language::from_locale_tag("zh-Hant-TW"), Some(Language::ZhTW)));
    assert!(matches!(Language::from_locale_tag("zh-Hant-HK"), Some(Language::ZhHK)));
    assert!(matches!(Language::from_locale_tag("zh-MO"), Some(Language::ZhHK)));
    assert!(matches!(Language::from_locale_tag("C.UTF-8"), None));
  }
}
