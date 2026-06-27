# Release Notes

## 1.1.0

* Added an FFmpeg Tools window for video files with a seekable frame preview and screenshot capture, including capture by frame number, interval, every second, keyframes, scene changes, thumbnails, contact sheets, and de-duplicated frames.

## 1.0.0

* Added an Image stream table to the card view and detail view, including type, color space, resolution, and size fields.
* Added View settings to toggle Image stream tables in card view and detail view.
* Added BatchMkvMerge to the welcome page with localized descriptions and a GitHub link.
* Added a portable 7z archive to the Windows release artifacts.
* Improved first-run language selection by detecting the system language and saving it to configuration.
* Updated Italian translations.

## 0.10.0

* Upgraded MediaInfoLib to v26.05
* Upgraded Rust toolchain to v1.95.0
* Added "Open in MkvToolNix GUI" action to the card view for video files when MKVToolNix is configured.
* Added MKV merge with stream selection, editable track metadata, progress tracking, cancellation, and clipboard command copy.
* Added drag-and-drop stream reordering in the MKV merge window.
* Added automatic output extension selection for MKV merge based on enabled stream types.
* Added toolbar actions and keyboard shortcuts for toggling streams, resetting default streams, and resetting forced streams in the MKV merge window.
* Added editable language dropdowns in the MKV merge window, backed by preferred languages from MKV options.
* Added MKV title autocompletion settings and editable title dropdowns in the MKV merge window.
* Added MKVToolNix additional parameter settings, including configurable mkvmerge process priority.
* Added keyboard shortcuts and updated tooltips for MKV merge and extract commands.
* Added multi-language support to the Windows installers.
* Added Italian as a new supported language.
* Added BDMaster integration with Blu-ray folder detection and "Open in BDMaster" action for ISO files.
* Added View settings to toggle General/Video/Audio/Subtitle tables in card view and detail view.
* Added Menu stream table with chapter Inform output, toggleable per view (off by default in card view).
* Added MPC HC integration on Windows with auto-detection and an "Open in MPC HC" action for video files.
* Added templates for customization of the details view.
* Added export to details view.
* Improved configuration backward compatibility so missing JSON nodes use default values while preserving existing settings.

## 0.9.0

* Added MKV track extraction with MKVToolNix integration, progress tracking, cancellation, and clipboard command copy.
* Added Dolby Vision (DV) column to the video table in card and list views.
* Added CLI support for launching with multiple files and directories.
* Added window position and size persistence across sessions.
* Added configurable precision and unit settings for bit rate and size display
* Added i18n support with 8 languages: English, German, Spanish, French, Japanese, Simplified Chinese, Traditional Chinese (Taiwan), Traditional Chinese (Hong Kong)
* Added separate stream format settings for video, audio, and subtitles in configuration.
* Improved UI responsiveness and overflow handling across layout, list, and details views.
* Added configurable UI theme selection with 20 built-in themes and immediate preview in Settings.
* Added BatchMkvExtract integration in Settings with running-process detection on Windows, macOS, and Linux.
* Added auto-switch to the details tab when clicking the details icon in the card view.

## 0.8.0

* Converted UI from Svelte to React
* Upgraded MediaInfoLib to v26.01

## 0.7.0

* Supported dark mode
* Upgraded MediaInfoLib to v25.10

## 0.6.0

* Upgraded MediaInfoLib to v25.09
* Upgraded Rust toolchain to v1.89.0
* Upgraded Rust edition to 2024
* Upgraded tauri to v2.8.5

## 0.5.0

* Upgraded MediaInfoLib to v25.04

## 0.4.0

* Upgraded Rust toolchain to v1.82.0
* Upgraded MediaInfoLib to v24.12
* Fixed error when non-ascii characters are in the file path for MacOS

## 0.3.0

* Upgraded tauri to v2
* Upgraded MediaInfoLib to v24.11

## 0.2.0

* Supported media file comparison view

## 0.1.0

* Supported MediaInfoLib v24.6
* Supported List View
* Supported Detail View
* Supported Json
