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
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdout, Command, Stdio};
use std::time::SystemTime;

use crate::config;
use crate::protocol::FfmpegStatus;

const TOOL_STEM: &str = "ffmpeg";

fn binary_path(dir: &Path) -> Option<PathBuf> {
  // macOS/Linux carry the bare `ffmpeg` name; Windows uses the `.exe` suffix.
  // Unlike the GUI tools there is no running-process or app-bundle detection,
  // because FFmpeg is a command-line binary rather than a launchable app.
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
  if cfg.ffmpeg.path == new_path {
    return Ok(());
  }
  cfg.ffmpeg.path = new_path;
  config::set_config(cfg)?;
  Ok(())
}

pub async fn get_ffmpeg_status(path: String) -> Result<FfmpegStatus> {
  let trimmed = path.trim();
  if trimmed.is_empty() {
    return Ok(FfmpegStatus {
      found: false,
      path: String::new(),
    });
  }
  let (resolved, found) = resolve(trimmed);
  if found {
    persist_path(&resolved)?;
  }
  Ok(FfmpegStatus {
    found,
    path: resolved.to_string_lossy().to_string(),
  })
}

/// Resolve the configured FFmpeg binary (the directory in config + `ffmpeg[.exe]`).
fn ffmpeg_binary() -> Result<PathBuf> {
  let cfg = config::get_config();
  let (resolved, found) = resolve(&cfg.ffmpeg.path);
  if !found {
    return Err(anyhow::anyhow!("FFMPEG_NOT_AVAILABLE:{}", resolved.display()));
  }
  binary_path(&resolved).ok_or_else(|| anyhow::anyhow!("FFMPEG_NOT_AVAILABLE:{}", resolved.display()))
}

/// Spawn ffmpeg with the given arguments, piping stdout/stderr. Mirrors the
/// process-spawning convention used for mkvextract (hidden window on Windows).
pub fn spawn_ffmpeg(args: &[String]) -> Result<Child> {
  let exe = ffmpeg_binary()?;
  let mut cmd = Command::new(&exe);
  cmd
    .args(args)
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
  }
  cmd
    .spawn()
    .map_err(|e| anyhow::anyhow!("FFMPEG_NOT_AVAILABLE:{}: {}", exe.display(), e))
}

/// Grab a single frame at `position_seconds` as PNG bytes, downscaled to at
/// most `max_width` px wide so the IPC payload stays small. Used by the seek
/// slider in the preview window. `-ss` before `-i` is fast keyframe seeking.
pub fn capture_frame(file: String, position_seconds: f64, max_width: u32) -> Result<Vec<u8>> {
  let path = Path::new(&file);
  if !path.exists() || !path.is_file() {
    return Err(anyhow::anyhow!("File not found: {}", file));
  }
  let pos = if position_seconds.is_finite() && position_seconds > 0.0 {
    position_seconds
  } else {
    0.0
  };
  let width = max_width.max(16);
  let args = vec![
    "-hide_banner".to_string(),
    "-loglevel".to_string(),
    "error".to_string(),
    "-ss".to_string(),
    format!("{:.3}", pos),
    "-i".to_string(),
    file.clone(),
    "-frames:v".to_string(),
    "1".to_string(),
    "-vf".to_string(),
    format!("scale='min({},iw)':-1", width),
    "-f".to_string(),
    "image2pipe".to_string(),
    "-vcodec".to_string(),
    "png".to_string(),
    "pipe:1".to_string(),
  ];
  let mut child = spawn_ffmpeg(&args)?;
  let mut stdout = child
    .stdout
    .take()
    .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
  let mut buf = Vec::new();
  stdout.read_to_end(&mut buf)?;
  let status = child.wait()?;
  if !status.success() {
    let mut err = String::new();
    if let Some(mut stderr) = child.stderr.take() {
      let _ = stderr.read_to_string(&mut err);
    }
    return Err(anyhow::anyhow!("FFMPEG_FRAME_FAILED:{}", err.trim()));
  }
  if buf.is_empty() {
    return Err(anyhow::anyhow!("FFMPEG_FRAME_FAILED:no frame produced"));
  }
  Ok(buf)
}

/// Read ffmpeg's `-progress pipe:1` stream, invoking `on_time` with the output
/// position (in seconds) every time a progress block reports `out_time_us`.
pub fn read_capture_progress<F: FnMut(f64)>(stdout: ChildStdout, mut on_time: F) {
  let reader = BufReader::new(stdout);
  for line in reader.lines() {
    let Ok(line) = line else {
      break;
    };
    let line = line.trim();
    if let Some(rest) = line.strip_prefix("out_time_us=") {
      if let Ok(us) = rest.trim().parse::<i64>() {
        if us >= 0 {
          on_time(us as f64 / 1_000_000.0);
        }
      }
    }
  }
}

fn is_image_path(path: &Path) -> bool {
  path
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| matches!(e.to_ascii_lowercase().as_str(), "png" | "jpg" | "jpeg"))
    .unwrap_or(false)
}

/// Collect every image file in `dir` written at or after `since`. Used to apply
/// border trimming to the images a single capture run just produced.
pub fn images_in_dir_since(dir: &Path, since: SystemTime) -> Vec<PathBuf> {
  let mut out = Vec::new();
  let Ok(read_dir) = std::fs::read_dir(dir) else {
    return out;
  };
  for entry in read_dir.flatten() {
    let path = entry.path();
    if !path.is_file() || !is_image_path(&path) {
      continue;
    }
    if let Ok(modified) = entry.metadata().and_then(|m| m.modified()) {
      if modified >= since {
        out.push(path);
      }
    }
  }
  out
}

/// Parse a `#RRGGBB` (or `#RGB`) hex color into an `(r, g, b)` triple.
pub fn parse_hex_color(value: &str) -> Option<(u8, u8, u8)> {
  let hex = value.trim().trim_start_matches('#');
  match hex.len() {
    6 => {
      let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
      let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
      let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
      Some((r, g, b))
    }
    3 => {
      let r = u8::from_str_radix(&hex[0..1], 16).ok()?;
      let g = u8::from_str_radix(&hex[1..2], 16).ok()?;
      let b = u8::from_str_radix(&hex[2..3], 16).ok()?;
      // Expand each nibble (e.g. #abc -> #aabbcc).
      Some((r * 17, g * 17, b * 17))
    }
    _ => None,
  }
}

/// Squared Euclidean distance between a pixel's RGB and a reference color, with
/// each channel normalized to `0..=1` (so the result is directly comparable to a
/// `(percent / 100)^2` fuzz threshold).
fn color_dist_sq(p: &[u8], r: f64, g: f64, b: f64) -> f64 {
  let dr = (p[0] as f64 - r) / 255.0;
  let dg = (p[1] as f64 - g) / 255.0;
  let db = (p[2] as f64 - b) / 255.0;
  dr * dr + dg * dg + db * db
}

/// If the four corner pixels are all but identical, return their color — the
/// actual border color, sampled the way ImageMagick `-trim` does by default.
/// Returns `None` when the corners disagree (no uniform border) or are
/// transparent (handled by the alpha test instead). This is what lets
/// limited-range "black" bars (e.g. 16,16,16, not 0,0,0) be detected even when
/// the user leaves the trim color at pure black.
fn consistent_corner_color(rgba: &image::RgbaImage) -> Option<(u8, u8, u8)> {
  let (width, height) = rgba.dimensions();
  if width == 0 || height == 0 {
    return None;
  }
  let c = rgba.get_pixel(0, 0).0;
  if c[3] == 0 {
    return None;
  }
  // Corners within ~3% of each other count as the same uniform border.
  const AGREE_SQ: f64 = 0.03 * 0.03;
  let (r, g, b) = (c[0] as f64, c[1] as f64, c[2] as f64);
  for (x, y) in [(width - 1, 0), (0, height - 1), (width - 1, height - 1)] {
    let p = rgba.get_pixel(x, y).0;
    if color_dist_sq(&p, r, g, b) > AGREE_SQ {
      return None;
    }
  }
  Some((c[0], c[1], c[2]))
}

/// Compute the bounding box `(x, y, width, height)` of the non-background
/// content in `rgba`. A pixel is background when it is fully transparent or its
/// color is within `tolerance_percent` fuzz of a reference color. Returns `None`
/// when the whole image is background.
///
/// Reference colors are the user-chosen `color` plus the auto-detected border
/// color sampled from the corners (see [`consistent_corner_color`]). The fuzz
/// test matches ImageMagick: the squared Euclidean distance between the pixel and
/// a reference color, with each channel normalized to `0..=1`, is compared
/// against `(tolerance_percent / 100)^2`.
fn content_bounds(rgba: &image::RgbaImage, color: (u8, u8, u8), tolerance_percent: f64) -> Option<(u32, u32, u32, u32)> {
  let (width, height) = rgba.dimensions();
  if width == 0 || height == 0 {
    return None;
  }
  let fuzz = (tolerance_percent / 100.0).clamp(0.0, 1.0);
  let fuzz_sq = fuzz * fuzz;
  let mut refs: Vec<(f64, f64, f64)> = vec![(color.0 as f64, color.1 as f64, color.2 as f64)];
  if let Some(c) = consistent_corner_color(rgba) {
    refs.push((c.0 as f64, c.1 as f64, c.2 as f64));
  }
  let is_background = |x: u32, y: u32| -> bool {
    let p = rgba.get_pixel(x, y).0;
    if p[3] == 0 {
      return true; // fully transparent pixels are border regardless of color
    }
    refs.iter().any(|&(r, g, b)| color_dist_sq(&p, r, g, b) <= fuzz_sq)
  };
  let mut min_x = width;
  let mut min_y = height;
  let mut max_x = 0u32;
  let mut max_y = 0u32;
  let mut found = false;
  for y in 0..height {
    for x in 0..width {
      if !is_background(x, y) {
        found = true;
        min_x = min_x.min(x);
        max_x = max_x.max(x);
        min_y = min_y.min(y);
        max_y = max_y.max(y);
      }
    }
  }
  if !found {
    return None;
  }
  Some((min_x, min_y, max_x - min_x + 1, max_y - min_y + 1))
}

/// Outcome of trimming a single captured image.
#[derive(Debug, PartialEq, Eq)]
pub enum TrimResult {
  /// Cropped to the content bounding box and rewritten smaller.
  Trimmed,
  /// No border to remove; the file was left unchanged.
  Unchanged,
  /// The image was entirely border (no content), so the file was deleted.
  Removed,
}

/// Trim a solid-color border from an image in place, mirroring ImageMagick
/// `-trim`: the image is cropped to the bounding box of its non-background
/// content (see [`content_bounds`]). When the image has no content at all it is
/// a blank capture and the file is deleted instead.
pub fn trim_image_file(path: &Path, color: (u8, u8, u8), tolerance_percent: f64) -> Result<TrimResult> {
  let image = image::open(path)?;
  let rgba = image.to_rgba8();
  let (width, height) = rgba.dimensions();
  let Some((x, y, crop_w, crop_h)) = content_bounds(&rgba, color, tolerance_percent) else {
    // Entirely background — a blank frame. Remove it rather than keep it.
    std::fs::remove_file(path)?;
    return Ok(TrimResult::Removed);
  };
  // Already tight against the content; nothing to crop.
  if x == 0 && y == 0 && crop_w == width && crop_h == height {
    return Ok(TrimResult::Unchanged);
  }
  let cropped = image::imageops::crop_imm(&rgba, x, y, crop_w, crop_h).to_image();
  // Re-encode in the source format. JPEG is re-saved at high quality to limit the
  // generational loss inherent in decoding and re-encoding.
  let ext = path
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("")
    .to_ascii_lowercase();
  match ext.as_str() {
    "jpg" | "jpeg" => {
      let rgb = image::DynamicImage::ImageRgba8(cropped).into_rgb8();
      let file = std::fs::File::create(path)?;
      let mut writer = std::io::BufWriter::new(file);
      let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, 95);
      encoder.encode_image(&rgb)?;
    }
    _ => {
      // Fast PNG compression: re-encoding many large frames is the bottleneck of
      // a big capture, and a screenshot doesn't need maximum compression.
      use image::ImageEncoder;
      let writer = std::io::BufWriter::new(std::fs::File::create(path)?);
      let encoder = image::codecs::png::PngEncoder::new_with_quality(
        writer,
        image::codecs::png::CompressionType::Fast,
        image::codecs::png::FilterType::Adaptive,
      );
      encoder.write_image(cropped.as_raw(), crop_w, crop_h, image::ExtendedColorType::Rgba8)?;
    }
  }
  Ok(TrimResult::Trimmed)
}

/// Trim every image in `paths` in place, spreading the work across CPU cores and
/// containing any per-file error or panic so one bad frame can't abort the whole
/// batch. Re-encoding the trimmed frames is CPU-bound, so a large capture would
/// otherwise stall for a long time on a single thread.
pub fn trim_images(paths: Vec<PathBuf>, color: (u8, u8, u8), tolerance_percent: f64) {
  if paths.is_empty() {
    return;
  }
  let workers = std::thread::available_parallelism()
    .map(|n| n.get())
    .unwrap_or(4)
    .clamp(1, 8)
    .min(paths.len());
  let queue = std::sync::Arc::new(std::sync::Mutex::new(paths));
  let mut handles = Vec::with_capacity(workers);
  for _ in 0..workers {
    let queue = queue.clone();
    handles.push(std::thread::spawn(move || loop {
      let path = {
        let mut guard = queue.lock().unwrap();
        guard.pop()
      };
      let Some(path) = path else {
        break;
      };
      let outcome =
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| trim_image_file(&path, color, tolerance_percent)));
      match outcome {
        Ok(Ok(_)) => {}
        Ok(Err(e)) => log::warn!("Failed to trim {}: {}", path.display(), e),
        Err(_) => log::warn!("Trimming {} panicked; skipping", path.display()),
      }
    }));
  }
  for handle in handles {
    let _ = handle.join();
  }
}

/// Shrink an encoded image to at most `max_width` (preserving aspect ratio) and
/// re-encode it in the same family as `ext` (JPEG for jpg/jpeg, otherwise PNG),
/// for sending to the preview window. High-resolution captures would otherwise
/// be emitted as multi-megabyte payloads on every preview tick, which can
/// overwhelm the webview. Falls back to the original bytes if anything fails, so
/// a frame is always available; returns the original unchanged when already
/// within `max_width`.
pub fn downscale_for_preview(bytes: &[u8], ext: &str, max_width: u32) -> Vec<u8> {
  use image::ImageEncoder;
  let Ok(img) = image::load_from_memory(bytes) else {
    return bytes.to_vec();
  };
  if img.width() <= max_width {
    return bytes.to_vec();
  }
  let img = img.resize(max_width, u32::MAX, image::imageops::FilterType::Triangle);
  let mut out = std::io::Cursor::new(Vec::new());
  let encoded = if matches!(ext.to_ascii_lowercase().as_str(), "jpg" | "jpeg") {
    let rgb = img.to_rgb8();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 85)
      .write_image(rgb.as_raw(), rgb.width(), rgb.height(), image::ExtendedColorType::Rgb8)
      .is_ok()
  } else {
    let rgba = img.to_rgba8();
    image::codecs::png::PngEncoder::new_with_quality(
      &mut out,
      image::codecs::png::CompressionType::Fast,
      image::codecs::png::FilterType::NoFilter,
    )
    .write_image(rgba.as_raw(), rgba.width(), rgba.height(), image::ExtendedColorType::Rgba8)
    .is_ok()
  };
  if encoded {
    out.into_inner()
  } else {
    bytes.to_vec()
  }
}

/// Find the most recently modified image file in `dir` produced at or after
/// `since`. Used to show the frame currently being captured in the preview.
pub fn newest_image_in_dir(dir: &Path, since: SystemTime) -> Option<PathBuf> {
  let mut best: Option<(SystemTime, PathBuf)> = None;
  for entry in std::fs::read_dir(dir).ok()?.flatten() {
    let path = entry.path();
    if !path.is_file() {
      continue;
    }
    let is_image = path
      .extension()
      .and_then(|e| e.to_str())
      .map(|e| matches!(e.to_ascii_lowercase().as_str(), "png" | "jpg" | "jpeg"))
      .unwrap_or(false);
    if !is_image {
      continue;
    }
    let Ok(modified) = entry.metadata().and_then(|m| m.modified()) else {
      continue;
    };
    if modified < since {
      continue;
    }
    if best.as_ref().map_or(true, |(t, _)| modified >= *t) {
      best = Some((modified, path));
    }
  }
  best.map(|(_, p)| p)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parse_hex_color_variants() {
    assert_eq!(parse_hex_color("#000000"), Some((0, 0, 0)));
    assert_eq!(parse_hex_color("ffffff"), Some((255, 255, 255)));
    assert_eq!(parse_hex_color("#FF8800"), Some((255, 136, 0)));
    assert_eq!(parse_hex_color("#abc"), Some((0xaa, 0xbb, 0xcc)));
    assert_eq!(parse_hex_color("#12345"), None);
    assert_eq!(parse_hex_color("not-a-color"), None);
  }

  #[test]
  fn content_bounds_finds_tight_box() {
    // 10x10 black image with a 2x3 white block at (3, 2).
    let mut img = image::RgbaImage::from_pixel(10, 10, image::Rgba([0, 0, 0, 255]));
    for y in 2..5 {
      for x in 3..5 {
        img.put_pixel(x, y, image::Rgba([255, 255, 255, 255]));
      }
    }
    assert_eq!(content_bounds(&img, (0, 0, 0), 0.0), Some((3, 2, 2, 3)));
  }

  #[test]
  fn content_bounds_all_background_is_none() {
    let img = image::RgbaImage::from_pixel(8, 8, image::Rgba([0, 0, 0, 255]));
    assert_eq!(content_bounds(&img, (0, 0, 0), 0.0), None);
  }

  #[test]
  fn content_bounds_samples_corner_border() {
    // Limited-range "black" border (16,16,16, the common video case) around a
    // white pixel. The user left the trim color at pure black, but the corner is
    // auto-sampled, so the border is still detected at a low tolerance.
    let mut img = image::RgbaImage::from_pixel(6, 6, image::Rgba([16, 16, 16, 255]));
    img.put_pixel(3, 3, image::Rgba([255, 255, 255, 255]));
    assert_eq!(content_bounds(&img, (0, 0, 0), 5.0), Some((3, 3, 1, 1)));
  }

  #[test]
  fn content_bounds_skips_inconsistent_corners() {
    // A horizontal gradient: corners differ, so no uniform border is assumed and
    // a trim color that is absent from the image leaves the frame untouched.
    let mut img = image::RgbaImage::new(12, 12);
    for y in 0..12 {
      for x in 0..12 {
        let v = (x * 255 / 11) as u8;
        img.put_pixel(x, y, image::Rgba([v, v, v, 255]));
      }
    }
    assert_eq!(content_bounds(&img, (255, 0, 255), 10.0), Some((0, 0, 12, 12)));
  }

  #[test]
  fn content_bounds_treats_transparent_as_background() {
    // Transparent border around an opaque colored pixel; trim color is white but
    // transparent pixels are background regardless of color.
    let mut img = image::RgbaImage::from_pixel(5, 5, image::Rgba([0, 0, 0, 0]));
    img.put_pixel(2, 1, image::Rgba([10, 20, 30, 255]));
    assert_eq!(content_bounds(&img, (255, 255, 255), 0.0), Some((2, 1, 1, 1)));
  }

  fn temp_path(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!("bmi_trim_{}_{}", std::process::id(), name))
  }

  fn bordered_rgba(w: u32, h: u32, content: (u32, u32, u32, u32)) -> image::RgbaImage {
    let (cx, cy, cw, ch) = content;
    let mut img = image::RgbaImage::from_pixel(w, h, image::Rgba([0, 0, 0, 255]));
    for y in cy..cy + ch {
      for x in cx..cx + cw {
        img.put_pixel(x, y, image::Rgba([255, 255, 255, 255]));
      }
    }
    img
  }

  #[test]
  fn trim_image_file_png_crops_to_content() {
    let path = temp_path("crop.png");
    bordered_rgba(30, 20, (5, 4, 10, 6))
      .save_with_format(&path, image::ImageFormat::Png)
      .unwrap();
    assert_eq!(trim_image_file(&path, (0, 0, 0), 10.0).unwrap(), TrimResult::Trimmed);
    assert_eq!(image::open(&path).unwrap().to_rgba8().dimensions(), (10, 6));
    let _ = std::fs::remove_file(&path);
  }

  #[test]
  fn trim_image_file_removes_blank_capture() {
    let path = temp_path("blank.png");
    image::RgbaImage::from_pixel(16, 16, image::Rgba([0, 0, 0, 255]))
      .save_with_format(&path, image::ImageFormat::Png)
      .unwrap();
    assert_eq!(trim_image_file(&path, (0, 0, 0), 10.0).unwrap(), TrimResult::Removed);
    assert!(!path.exists(), "blank image should have been deleted");
  }

  #[test]
  fn trim_image_file_unchanged_when_already_tight() {
    let path = temp_path("tight.png");
    // Horizontal gradient: corners disagree (no uniform border) and the trim
    // color is absent, so there is nothing to trim.
    let mut img = image::RgbaImage::new(12, 12);
    for y in 0..12 {
      for x in 0..12 {
        let v = (x * 255 / 11) as u8;
        img.put_pixel(x, y, image::Rgba([v, v, v, 255]));
      }
    }
    img.save_with_format(&path, image::ImageFormat::Png).unwrap();
    assert_eq!(trim_image_file(&path, (255, 0, 255), 10.0).unwrap(), TrimResult::Unchanged);
    assert!(path.exists());
    let _ = std::fs::remove_file(&path);
  }

  #[test]
  fn downscale_for_preview_shrinks_large_and_keeps_small() {
    // Encode a 2000x1000 PNG, then downscale to <=1280 wide.
    let big = image::RgbaImage::from_pixel(2000, 1000, image::Rgba([20, 40, 60, 255]));
    let mut buf = std::io::Cursor::new(Vec::new());
    big.write_to(&mut buf, image::ImageFormat::Png).unwrap();
    let original = buf.into_inner();
    // The width is capped (which bounds the decoded payload), aspect preserved.
    let small = downscale_for_preview(&original, "png", 1280);
    assert_eq!(image::load_from_memory(&small).unwrap().to_rgba8().dimensions(), (1280, 640));
    // An image already within the cap is returned unchanged (no re-encode).
    let already = downscale_for_preview(&original, "png", 4096);
    assert_eq!(already, original);
  }

  #[test]
  fn trim_images_processes_batch() {
    // One letterboxed frame (trim) and one limited-range blank frame (remove),
    // handled together in a single parallel pass.
    let crop = temp_path("batch_crop.png");
    let blank = temp_path("batch_blank.png");
    bordered_rgba(20, 16, (4, 3, 12, 10))
      .save_with_format(&crop, image::ImageFormat::Png)
      .unwrap();
    image::RgbaImage::from_pixel(10, 10, image::Rgba([16, 16, 16, 255]))
      .save_with_format(&blank, image::ImageFormat::Png)
      .unwrap();
    trim_images(vec![crop.clone(), blank.clone()], (0, 0, 0), 10.0);
    assert_eq!(image::open(&crop).unwrap().to_rgba8().dimensions(), (12, 10));
    assert!(!blank.exists(), "blank frame should have been removed");
    let _ = std::fs::remove_file(&crop);
  }

  #[test]
  fn trim_image_file_jpeg_round_trip() {
    let path = temp_path("crop.jpg");
    let rgb = image::DynamicImage::ImageRgba8(bordered_rgba(40, 30, (10, 8, 20, 14))).into_rgb8();
    {
      let mut writer = std::io::BufWriter::new(std::fs::File::create(&path).unwrap());
      image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, 95)
        .encode_image(&rgb)
        .unwrap();
    }
    assert_eq!(trim_image_file(&path, (0, 0, 0), 20.0).unwrap(), TrimResult::Trimmed);
    let (tw, th) = image::open(&path).unwrap().to_rgba8().dimensions();
    assert!(tw < 40 && th < 30, "expected a smaller image, got {tw}x{th}");
    let _ = std::fs::remove_file(&path);
  }
}
