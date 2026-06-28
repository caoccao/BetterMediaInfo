/*
 *   Copyright (c) 2024-2026. caoccao.com Sam Cao
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import StopIcon from '@mui/icons-material/Stop';
import { useTranslation } from 'react-i18next';
import { basename, dirname, extname, join } from '@tauri-apps/api/path';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { open } from '@tauri-apps/plugin-dialog';
import * as Protocol from '../lib/protocol';
import { useAppStore } from '../lib/store';
import { captureFfmpegFrame, cancelFfmpegCapture, getPropertiesMap, runFfmpegCapture } from '../lib/service';

// Fixed width (px) of the tab control drawn beside the preview panel.
const TAB_PANEL_WIDTH = 400;
// Height (px) reserved for the seek slider + time labels under the video.
const SLIDER_AREA_HEIGHT = 76;
// Floor so the window stays usable for tiny/portrait videos.
const MIN_WINDOW_WIDTH = 760;
const MIN_WINDOW_HEIGHT = 460;
// Fallback preview dimensions before the real video size is known.
const DEFAULT_PREVIEW_WIDTH = 640;
const DEFAULT_PREVIEW_HEIGHT = 360;

// Logical CPU core count, used as the max (and default) for the trim thread slider.
const CPU_COUNT = Math.max(1, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4);

// Size the preview panel to the video, capped at 50% of the screen width and
// 70% of the screen height, preserving aspect ratio.
function computePreviewSize(videoW: number, videoH: number): { w: number; h: number } {
  const w0 = videoW > 0 ? videoW : DEFAULT_PREVIEW_WIDTH;
  const h0 = videoH > 0 ? videoH : DEFAULT_PREVIEW_HEIGHT;
  const maxW = window.screen.availWidth * 0.5;
  const maxH = window.screen.availHeight * 0.7;
  const scale = Math.min(1, maxW / w0, maxH / h0);
  return { w: Math.round(w0 * scale), h: Math.round(h0 * scale) };
}

type CaptureMode =
  | 'frame'
  | 'everyNthFrame'
  | 'everyXSeconds'
  | 'everySecond'
  | 'keyframes'
  | 'sceneChanges'
  | 'thumbnail'
  | 'tile'
  | 'nonDuplicate'
  | 'timestampList';

const CAPTURE_MODES: CaptureMode[] = [
  'frame',
  'everyNthFrame',
  'everyXSeconds',
  'everySecond',
  'keyframes',
  'sceneChanges',
  'thumbnail',
  'tile',
  'nonDuplicate',
  'timestampList',
];

interface CaptureParams {
  frameNumber: number;
  nthFrame: number;
  intervalSeconds: number;
  sceneThreshold: number;
  thumbnailBatch: number;
  tileInterval: number;
  tileCols: number;
  tileRows: number;
  dedupeFps: number;
}

interface OutputOptions {
  outputDir: string;
  // Output filename pattern (without extension). The frame-number token follows
  // ffmpeg's image2 muxer syntax (%d, %04d, ...); `{name}` expands to the source
  // file's base name. The extension comes from `format`.
  pattern: string;
  format: 'png' | 'jpg';
  jpgQuality: number;
  scaleEnabled: boolean;
  scaleWidth: number;
  cropEnabled: boolean;
  cropW: number;
  cropH: number;
  cropX: number;
  cropY: number;
  hwaccelEnabled: boolean;
  hwaccel: string;
}

const HWACCELS = ['auto', 'cuda', 'd3d11va', 'dxva2', 'videotoolbox', 'vaapi', 'qsv'];

// Default output filename pattern. `{name}` = source base name; `%04d` is
// ffmpeg's image2 frame-number token. The extension is appended from the format.
const DEFAULT_NAME_PATTERN = '{name}_shot_%04d';

// Expand our `{name}` placeholder (the source file's base name) in a pattern. The
// ffmpeg frame-number token (%d / %04d) is left untouched for ffmpeg to fill.
function applyName(pattern: string, stem: string): string {
  return pattern.replace(/\{name\}/g, stem);
}

// Replace the ffmpeg frame-number token with a concrete zero-padded index. Used
// by the timestamp mode, where each frame is its own single-image ffmpeg run, so
// ffmpeg's own %d would be 1 every time and the files would collide. Falls back
// to appending the index when the pattern contains no token.
function fillFrameToken(name: string, index: number): string {
  const m = name.match(/%(\d*)d/);
  if (!m) return `${name}_${String(index).padStart(4, '0')}`;
  const width = m[1] ? parseInt(m[1], 10) : 1;
  return name.replace(/%(\d*)d/, String(index).padStart(width, '0'));
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function bytesToBlobUrl(bytes: number[], mime: string): string {
  return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
}

async function getStem(file: string): Promise<string> {
  let ext = '';
  try {
    ext = await extname(file);
  } catch {
    ext = '';
  }
  return await basename(file, ext ? `.${ext}` : undefined);
}

// FFmpeg filtergraph: single quotes protect the inner commas of expression
// filters (eq/not/gt), so they are passed verbatim as one argv token.
function buildVideoFilters(mode: CaptureMode, p: CaptureParams, opts: OutputOptions): string[] {
  const filters: string[] = [];
  switch (mode) {
    case 'frame':
      filters.push(`select='eq(n,${p.frameNumber})'`);
      break;
    case 'everyNthFrame':
      filters.push(`select='not(mod(n,${p.nthFrame}))'`);
      break;
    case 'everyXSeconds':
      filters.push(`fps=1/${p.intervalSeconds}`);
      break;
    case 'everySecond':
      filters.push('fps=1');
      break;
    case 'keyframes':
      filters.push(`select='eq(pict_type,I)'`);
      break;
    case 'sceneChanges':
      filters.push(`select='gt(scene,${p.sceneThreshold})'`);
      break;
    case 'thumbnail':
      filters.push(`thumbnail=${p.thumbnailBatch}`);
      break;
    case 'tile':
      filters.push(`fps=1/${p.tileInterval}`, 'scale=320:-1', `tile=${p.tileCols}x${p.tileRows}`);
      break;
    case 'nonDuplicate':
      filters.push('mpdecimate');
      if (p.dedupeFps > 0) filters.push(`fps=${p.dedupeFps}`);
      break;
  }
  if (opts.cropEnabled) {
    filters.push(`crop=${opts.cropW}:${opts.cropH}:${opts.cropX}:${opts.cropY}`);
  }
  if (opts.scaleEnabled) {
    filters.push(`scale=${opts.scaleWidth}:-1`);
  }
  return filters;
}

// Returns the ffmpeg argv plus the output filename pattern (the same value that
// is the last argv token). The backend discovers the produced frames by matching
// this pattern by name, so it must be passed through explicitly.
async function buildCaptureArgs(
  mode: CaptureMode,
  p: CaptureParams,
  opts: OutputOptions,
  file: string
): Promise<{ args: string[]; output: string }> {
  const ext = opts.format === 'jpg' ? 'jpg' : 'png';
  const stem = await getStem(file);
  const pat = opts.pattern.trim() || DEFAULT_NAME_PATTERN;
  const outPattern = await join(opts.outputDir, `${applyName(pat, stem)}.${ext}`);
  const args: string[] = [];
  if (opts.hwaccelEnabled && opts.hwaccel) {
    args.push('-hwaccel', opts.hwaccel);
  }
  if (mode === 'keyframes') {
    args.push('-skip_frame', 'nokey');
  }
  args.push('-i', file);
  const filters = buildVideoFilters(mode, p, opts);
  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }
  if (mode === 'frame' || mode === 'thumbnail' || mode === 'tile') {
    args.push('-frames:v', '1');
  }
  if (mode === 'everyNthFrame' || mode === 'keyframes' || mode === 'sceneChanges' || mode === 'nonDuplicate') {
    args.push('-fps_mode', 'vfr');
  }
  if (opts.format === 'jpg') {
    args.push('-q:v', String(opts.jpgQuality));
  }
  args.push(outPattern);
  return { args, output: outPattern };
}

// Timestamp mode writes one explicit filename per invocation (no `%d` token); the
// backend matches that literal name. Returns the argv plus that output filename.
async function buildTimestampArgs(
  file: string,
  opts: OutputOptions,
  timeSec: number,
  index: number
): Promise<{ args: string[]; output: string }> {
  const ext = opts.format === 'jpg' ? 'jpg' : 'png';
  const stem = await getStem(file);
  const pat = opts.pattern.trim() || DEFAULT_NAME_PATTERN;
  const out = await join(opts.outputDir, `${fillFrameToken(applyName(pat, stem), index + 1)}.${ext}`);
  const args: string[] = [];
  if (opts.hwaccelEnabled && opts.hwaccel) {
    args.push('-hwaccel', opts.hwaccel);
  }
  args.push('-ss', String(timeSec), '-i', file, '-frames:v', '1');
  const filters: string[] = [];
  if (opts.cropEnabled) {
    filters.push(`crop=${opts.cropW}:${opts.cropH}:${opts.cropX}:${opts.cropY}`);
  }
  if (opts.scaleEnabled) {
    filters.push(`scale=${opts.scaleWidth}:-1`);
  }
  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }
  if (opts.format === 'jpg') {
    args.push('-q:v', String(opts.jpgQuality));
  }
  args.push(out);
  return { args, output: out };
}

function parseTimestamps(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseFloat(s))
    .filter((n) => isFinite(n) && n >= 0);
}

interface FfmpegToolsProps {
  file: string;
  ffmpegPath: string;
}

function FfmpegTools({ file }: FfmpegToolsProps) {
  const { t } = useTranslation();

  // Metadata (sourced from MediaInfo, no ffprobe needed).
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  // Preview frame + the panel size derived from the video dimensions.
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [previewSize, setPreviewSize] = useState({ w: DEFAULT_PREVIEW_WIDTH, h: DEFAULT_PREVIEW_HEIGHT });
  const frameUrlRef = useRef<string | null>(null);
  const previewWidthRef = useRef(DEFAULT_PREVIEW_WIDTH);
  const seekReqRef = useRef(0);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Capture state.
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<CaptureMode>('keyframes');
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  // Which pass is running and the trim pass's per-image counts. While trimming,
  // the slider doubles as the trim progress bar and the label reflects the count.
  const [phase, setPhase] = useState<'capture' | 'trim'>('capture');
  const [trimCurrent, setTrimCurrent] = useState(0);
  const [trimTotal, setTrimTotal] = useState(0);
  // Shown when the user tries to close (Esc) while a capture/trim is running.
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  // Capture results are surfaced through the app's standard notification
  // snackbar (rendered by App for every window), like the other tool windows.
  const setNotification = useAppStore((s) => s.setDialogNotification);
  const manualModeRef = useRef(false);
  const cancelRef = useRef(false);
  const captureMimeRef = useRef('image/png');
  // Slider position before a capture started, restored when it finishes.
  const savedPositionRef = useRef(0);

  // Capture parameters.
  const [frameNumber, setFrameNumber] = useState(0);
  const [nthFrame, setNthFrame] = useState(100);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [sceneThreshold, setSceneThreshold] = useState(0.4);
  const [thumbnailBatch, setThumbnailBatch] = useState(100);
  const [tileInterval, setTileInterval] = useState(60);
  const [tileCols, setTileCols] = useState(4);
  const [tileRows, setTileRows] = useState(4);
  const [dedupeFps, setDedupeFps] = useState(0);
  const [timestamps, setTimestamps] = useState('');

  // Output options.
  const [outputDir, setOutputDir] = useState('');
  const [namePattern, setNamePattern] = useState(DEFAULT_NAME_PATTERN);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [jpgQuality, setJpgQuality] = useState(2);
  const [scaleEnabled, setScaleEnabled] = useState(false);
  const [scaleWidth, setScaleWidth] = useState(640);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropW, setCropW] = useState(1280);
  const [cropH, setCropH] = useState(720);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [hwaccelEnabled, setHwaccelEnabled] = useState(false);
  const [hwaccel, setHwaccel] = useState('auto');

  // Trim options (post-process each captured image to crop solid borders).
  const [trimEnabled, setTrimEnabled] = useState(false);
  const [trimColor, setTrimColor] = useState('#000000');
  const [trimTolerance, setTrimTolerance] = useState(10);
  const [trimThreads, setTrimThreads] = useState(CPU_COUNT);

  const collectParams = useCallback(
    (): CaptureParams => ({
      frameNumber,
      nthFrame,
      intervalSeconds,
      sceneThreshold,
      thumbnailBatch,
      tileInterval,
      tileCols,
      tileRows,
      dedupeFps,
    }),
    [frameNumber, nthFrame, intervalSeconds, sceneThreshold, thumbnailBatch, tileInterval, tileCols, tileRows, dedupeFps]
  );

  const collectOpts = useCallback(
    (): OutputOptions => ({
      outputDir,
      pattern: namePattern,
      format,
      jpgQuality,
      scaleEnabled,
      scaleWidth,
      cropEnabled,
      cropW,
      cropH,
      cropX,
      cropY,
      hwaccelEnabled,
      hwaccel,
    }),
    [
      outputDir,
      namePattern,
      format,
      jpgQuality,
      scaleEnabled,
      scaleWidth,
      cropEnabled,
      cropW,
      cropH,
      cropX,
      cropY,
      hwaccelEnabled,
      hwaccel,
    ]
  );

  const collectTrim = useCallback(
    (): Protocol.FfmpegTrimOptions => ({
      enabled: trimEnabled,
      color: trimColor,
      tolerance: trimTolerance,
      threads: trimThreads,
    }),
    [trimEnabled, trimColor, trimTolerance, trimThreads]
  );

  // Swap the preview image only once the new frame decodes, so partially
  // written capture files never flash a broken image.
  const showFrame = useCallback((bytes: number[], mime: string) => {
    if (bytes.length === 0) return;
    const url = bytesToBlobUrl(bytes, mime);
    const img = new Image();
    img.onload = () => {
      const prev = frameUrlRef.current;
      frameUrlRef.current = url;
      setFrameUrl(url);
      if (prev) URL.revokeObjectURL(prev);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, []);

  const requestFrame = useCallback(
    (pos: number) => {
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      seekTimerRef.current = setTimeout(async () => {
        const reqId = ++seekReqRef.current;
        setFrameLoading(true);
        try {
          const bytes = await captureFfmpegFrame(file, pos, previewWidthRef.current);
          if (reqId === seekReqRef.current) showFrame(bytes, 'image/png');
        } catch {
          /* ignore stale / failed seek */
        } finally {
          if (reqId === seekReqRef.current) setFrameLoading(false);
        }
      }, 180);
    },
    [file, showFrame]
  );

  // Restore the slider (and its frame) to where it was before the capture.
  const restorePosition = useCallback(() => {
    const saved = savedPositionRef.current;
    setPosition(saved);
    requestFrame(saved);
  }, [requestFrame]);

  // Size the preview panel to the video, resize the window to fit it plus the
  // tab control beside it (no empty space), then reveal the window.
  const applyLayout = useCallback(async (videoW: number, videoH: number) => {
    const size = computePreviewSize(videoW, videoH);
    setPreviewSize(size);
    previewWidthRef.current = Math.max(320, size.w);
    const winW = Math.max(size.w + TAB_PANEL_WIDTH, MIN_WINDOW_WIDTH);
    const winH = Math.max(size.h + SLIDER_AREA_HEIGHT, MIN_WINDOW_HEIGHT);
    try {
      const win = getCurrentWindow();
      await win.setSize(new LogicalSize(winW, winH));
      await win.center();
      await win.show();
      await win.setFocus();
    } catch {
      /* window APIs unavailable (e.g. non-Tauri preview) — ignore */
    }
  }, []);

  // Load metadata from MediaInfo (width/height come from the same call as
  // duration and frame rate).
  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    setMetaError(null);
    getPropertiesMap(file, [
      { stream: Protocol.StreamKind.General, property: 'Duration' },
      { stream: Protocol.StreamKind.Video, property: 'Duration' },
      { stream: Protocol.StreamKind.Video, property: 'FrameRate' },
      { stream: Protocol.StreamKind.Video, property: 'FrameCount' },
      { stream: Protocol.StreamKind.Video, property: 'Width' },
      { stream: Protocol.StreamKind.Video, property: 'Height' },
    ])
      .then((maps) => {
        if (cancelled) return;
        const video = maps.find((m) => m.stream === Protocol.StreamKind.Video && m.num === 0);
        const general = maps.find((m) => m.stream === Protocol.StreamKind.General && m.num === 0);
        const durMs = parseFloat(video?.propertyMap['Duration'] ?? general?.propertyMap['Duration'] ?? '');
        const vw = parseInt(video?.propertyMap['Width'] ?? '') || 0;
        const vh = parseInt(video?.propertyMap['Height'] ?? '') || 0;
        setDurationSeconds(isFinite(durMs) ? durMs / 1000 : 0);
        setFps(parseFloat(video?.propertyMap['FrameRate'] ?? '') || 0);
        setFrameCount(parseInt(video?.propertyMap['FrameCount'] ?? '') || 0);
        setWidth(vw);
        setHeight(vh);
        setMetaLoading(false);
        void applyLayout(vw, vh);
      })
      .catch((e) => {
        if (cancelled) return;
        setMetaError(String(e));
        setMetaLoading(false);
        void applyLayout(0, 0);
      });
    return () => {
      cancelled = true;
    };
  }, [file, applyLayout]);

  // Initialize output directory from the source file's folder.
  useEffect(() => {
    dirname(file).then(setOutputDir).catch(() => undefined);
  }, [file]);

  // Load the first frame once metadata is ready.
  useEffect(() => {
    if (!metaLoading && !metaError) requestFrame(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaLoading]);

  // Listen for capture progress + the frame currently being captured.
  useEffect(() => {
    const w = getCurrentWebviewWindow();
    const unlistenProgress = w.listen<Protocol.FfmpegCaptureProgress>('ffmpeg-capture-progress', (event) => {
      const { percent, done, cancelled, error, phase: evPhase, current, total } = event.payload;
      // In timestamp mode the frontend loop owns the progress UI (one ffmpeg run
      // per timestamp), so don't let the per-run backend events fight it.
      if (!manualModeRef.current) {
        setProgress(percent);
        setPhase(evPhase === 'trim' ? 'trim' : 'capture');
        setTrimCurrent(current);
        setTrimTotal(total);
      }
      if (done && !manualModeRef.current) {
        setCapturing(false);
        if (error) {
          setNotification({ title: t('ffmpegTools.captureFailed', { detail: error }), type: Protocol.DialogNotificationType.Error });
        } else if (!cancelled) {
          setNotification({ title: t('ffmpegTools.captureComplete'), type: Protocol.DialogNotificationType.Info });
        }
        restorePosition();
      }
    });
    const unlistenFrame = w.listen<Protocol.FfmpegCaptureFrame>('ffmpeg-capture-frame', (event) => {
      showFrame(event.payload.bytes, captureMimeRef.current);
    });
    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenFrame.then((fn) => fn());
    };
  }, [t, showFrame, restorePosition, setNotification]);

  // Cancel any running capture and free blob URLs on unmount.
  useEffect(() => {
    return () => {
      cancelFfmpegCapture();
      if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current);
    };
  }, []);

  const handleSliderChange = (value: number) => {
    setPosition(value);
    if (!capturing) requestFrame(value);
  };

  const handleCapture = async () => {
    if (capturing) return;
    if (!outputDir) {
      setNotification({ title: t('ffmpegTools.noOutputDir'), type: Protocol.DialogNotificationType.Error });
      return;
    }
    captureMimeRef.current = format === 'jpg' ? 'image/jpeg' : 'image/png';
    savedPositionRef.current = position;
    setPhase('capture');
    setTrimCurrent(0);
    setTrimTotal(0);

    if (mode === 'timestampList') {
      const times = parseTimestamps(timestamps);
      if (times.length === 0) {
        setNotification({ title: t('ffmpegTools.noTimestamps'), type: Protocol.DialogNotificationType.Error });
        return;
      }
      manualModeRef.current = true;
      cancelRef.current = false;
      setCapturing(true);
      setProgress(0);
      try {
        for (let i = 0; i < times.length; i++) {
          if (cancelRef.current) break;
          const { args, output } = await buildTimestampArgs(file, collectOpts(), times[i], i);
          await runFfmpegCapture(args, output, durationSeconds, collectTrim(), previewWidthRef.current);
          setProgress(Math.round(((i + 1) / times.length) * 100));
        }
        if (!cancelRef.current) {
          setNotification({ title: t('ffmpegTools.captureComplete'), type: Protocol.DialogNotificationType.Info });
        }
      } catch (e) {
        setNotification({ title: t('ffmpegTools.captureFailed', { detail: String(e) }), type: Protocol.DialogNotificationType.Error });
      } finally {
        setCapturing(false);
        manualModeRef.current = false;
        restorePosition();
      }
      return;
    }

    setCapturing(true);
    setProgress(0);
    try {
      const { args, output } = await buildCaptureArgs(mode, collectParams(), collectOpts(), file);
      await runFfmpegCapture(args, output, durationSeconds, collectTrim(), previewWidthRef.current);
    } catch (e) {
      setCapturing(false);
      setNotification({ title: t('ffmpegTools.captureFailed', { detail: String(e) }), type: Protocol.DialogNotificationType.Error });
      restorePosition();
    }
  };

  const handleCancel = async () => {
    cancelRef.current = true;
    await cancelFfmpegCapture();
  };

  // Esc closes the window. If a capture/trim is still running, confirm first so
  // the user doesn't lose an in-flight job by accident.
  const requestClose = useCallback(() => {
    if (capturing) {
      setConfirmCloseOpen(true);
    } else {
      void getCurrentWindow().close();
    }
  }, [capturing]);

  // Stop the running capture/trim, then close the window.
  const handleConfirmStopAndClose = useCallback(async () => {
    setConfirmCloseOpen(false);
    cancelRef.current = true;
    await cancelFfmpegCapture();
    await getCurrentWindow().close();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat) return;
      // While the confirm dialog is open let it own Esc (dismiss = keep running).
      if (confirmCloseOpen) return;
      e.preventDefault();
      requestClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmCloseOpen, requestClose]);

  const handleBrowseOutputDir = async () => {
    const dir = await open({ directory: true, defaultPath: outputDir || undefined });
    if (dir) setOutputDir(dir as string);
  };

  const numberField = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    opts?: { min?: number; max?: number; step?: number; integer?: boolean; helperText?: string }
  ) => (
    <TextField
      label={label}
      type="number"
      size="small"
      fullWidth
      value={Number.isNaN(value) ? '' : value}
      disabled={capturing}
      helperText={opts?.helperText}
      onChange={(e) => {
        const raw = e.target.value;
        const parsed = opts?.integer ? parseInt(raw) : parseFloat(raw);
        onChange(Number.isNaN(parsed) ? 0 : parsed);
      }}
      slotProps={{ htmlInput: { min: opts?.min, max: opts?.max, step: opts?.step } }}
    />
  );

  const renderModeParams = () => {
    switch (mode) {
      case 'frame':
        return numberField(t('ffmpegTools.params.frameNumber'), frameNumber, setFrameNumber, {
          min: 0,
          integer: true,
          helperText: frameCount > 0 ? t('ffmpegTools.params.frameCountHint', { count: frameCount }) : undefined,
        });
      case 'everyNthFrame':
        return numberField(t('ffmpegTools.params.nthFrame'), nthFrame, setNthFrame, { min: 1, integer: true });
      case 'everyXSeconds':
        return numberField(t('ffmpegTools.params.intervalSeconds'), intervalSeconds, setIntervalSeconds, { min: 0.01, step: 0.5 });
      case 'everySecond':
        return (
          <Typography variant="body2" color="text.secondary">
            {t('ffmpegTools.params.everySecondHint')}
          </Typography>
        );
      case 'keyframes':
        return (
          <Typography variant="body2" color="text.secondary">
            {t('ffmpegTools.params.keyframesHint')}
          </Typography>
        );
      case 'sceneChanges':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              {t('ffmpegTools.params.sceneThreshold')}: {sceneThreshold.toFixed(2)}
            </Typography>
            <Slider
              value={sceneThreshold}
              min={0.1}
              max={0.6}
              step={0.05}
              marks
              disabled={capturing}
              valueLabelDisplay="auto"
              onChange={(_, v) => setSceneThreshold(v as number)}
            />
            <Typography variant="caption" color="text.secondary">
              {t('ffmpegTools.params.sceneThresholdHint')}
            </Typography>
          </Box>
        );
      case 'thumbnail':
        return numberField(t('ffmpegTools.params.thumbnailBatch'), thumbnailBatch, setThumbnailBatch, {
          min: 2,
          integer: true,
          helperText: t('ffmpegTools.params.thumbnailBatchHint'),
        });
      case 'tile':
        return (
          <Stack spacing={2}>
            {numberField(t('ffmpegTools.params.tileInterval'), tileInterval, setTileInterval, { min: 0.01, step: 1 })}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {numberField(t('ffmpegTools.params.tileCols'), tileCols, setTileCols, { min: 1, integer: true })}
              {numberField(t('ffmpegTools.params.tileRows'), tileRows, setTileRows, { min: 1, integer: true })}
            </Box>
          </Stack>
        );
      case 'nonDuplicate':
        return numberField(t('ffmpegTools.params.dedupeFps'), dedupeFps, setDedupeFps, {
          min: 0,
          step: 0.5,
          helperText: t('ffmpegTools.params.dedupeFpsHint'),
        });
      case 'timestampList':
        return (
          <TextField
            label={t('ffmpegTools.params.timestamps')}
            multiline
            minRows={3}
            fullWidth
            size="small"
            value={timestamps}
            disabled={capturing}
            placeholder={t('ffmpegTools.params.timestampsPlaceholder')}
            helperText={t('ffmpegTools.params.timestampsHint')}
            onChange={(e) => setTimestamps(e.target.value)}
          />
        );
    }
  };

  // Single right-aligned line under the progress bar / slider. While capturing it
  // describes the active pass: the capture pass shows "{percent}% · {time} /
  // {total}" (time derived from the percentage), and the trim pass shows the
  // per-image trim count. Otherwise it shows the video metadata.
  let sliderInfo: string;
  if (capturing) {
    sliderInfo =
      phase === 'trim'
        ? t('ffmpegTools.trimmingStatus', { current: trimCurrent, total: trimTotal, percent: progress })
        : `${progress}% · ${formatTime((progress / 100) * durationSeconds)} / ${formatTime(durationSeconds)}`;
  } else {
    const infoSegments: string[] = [];
    if (width > 0 && height > 0) infoSegments.push(`${width}x${height}`);
    if (fps > 0) infoSegments.push(`${fps.toFixed(3)} fps`);
    if (frameCount > 0) infoSegments.push(`${frameCount} ${t('ffmpegTools.frames')}`);
    infoSegments.push(`${formatTime(position)} / ${formatTime(durationSeconds)}`);
    sliderInfo = infoSegments.join(' · ');
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Left: preview panel sized to the video + seek slider */}
      <Box
        sx={{
          width: previewSize.w,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {frameUrl ? (
            <Box component="img" src={frameUrl} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : metaError ? (
            <Typography variant="body2" color="error" sx={{ p: 2 }}>
              {metaError}
            </Typography>
          ) : (
            <CircularProgress size={28} sx={{ color: 'grey.500' }} />
          )}
          {frameLoading && (
            <CircularProgress size={20} sx={{ position: 'absolute', top: 8, right: 8, color: 'grey.400' }} />
          )}
        </Box>
        <Box sx={{ px: 2, pt: 1, pb: 2, flexShrink: 0, height: SLIDER_AREA_HEIGHT, boxSizing: 'border-box' }}>
          {/* While capturing the seek slider is useless, so it is replaced by a
              single dedicated progress bar for the active pass (capture, then
              trim) — avoiding a second "phantom" bar from the disabled slider. */}
          {capturing ? (
            <Box sx={{ height: 20, display: 'flex', alignItems: 'center' }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, progress))}
                sx={{ width: '100%', height: 6, borderRadius: 3 }}
              />
            </Box>
          ) : (
            <Slider
              value={Math.min(position, durationSeconds || 0)}
              min={0}
              max={durationSeconds > 0 ? durationSeconds : 1}
              step={0.1}
              disabled={metaLoading || durationSeconds <= 0}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => formatTime(v)}
              onChange={(_, v) => handleSliderChange(v as number)}
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right' }}>
            {sliderInfo}
          </Typography>
        </Box>
      </Box>

      {/* Right: tab control drawn beside the preview panel */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mt: 0,
            minHeight: '24px',
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: '24px', textTransform: 'none' },
          }}
        >
          <Tab label={t('ffmpegTools.tabs.screenshots')} style={{ minHeight: '24px' }} />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {tab === 0 && (
            <Stack spacing={2}>
              <TextField
                select
                label={t('ffmpegTools.mode')}
                size="small"
                fullWidth
                value={mode}
                disabled={capturing}
                onChange={(e) => setMode(e.target.value as CaptureMode)}
              >
                {CAPTURE_MODES.map((m) => (
                  <MenuItem key={m} value={m}>
                    {t(`ffmpegTools.modes.${m}`)}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="caption" color="text.secondary">
                {t(`ffmpegTools.modeDescriptions.${mode}`)}
              </Typography>
              <Divider />
              {renderModeParams()}

              <Accordion
                disableGutters
                elevation={0}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">{t('ffmpegTools.trimOptions')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Checkbox checked={trimEnabled} disabled={capturing} onChange={(e) => setTrimEnabled(e.target.checked)} />
                      }
                      label={<Typography variant="body2">{t('ffmpegTools.trimImage')}</Typography>}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2">{t('ffmpegTools.trimColor')}</Typography>
                      <input
                        type="color"
                        value={trimColor}
                        disabled={!trimEnabled || capturing}
                        onChange={(e) => setTrimColor(e.target.value)}
                        style={{
                          width: 48,
                          height: 32,
                          padding: 0,
                          border: '1px solid rgba(128, 128, 128, 0.4)',
                          borderRadius: 4,
                          background: 'transparent',
                          cursor: trimEnabled && !capturing ? 'pointer' : 'default',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {trimColor.toUpperCase()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        {t('ffmpegTools.trimTolerance')}: {trimTolerance}%
                      </Typography>
                      <Slider
                        value={trimTolerance}
                        min={0}
                        max={100}
                        step={1}
                        disabled={!trimEnabled || capturing}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `${v}%`}
                        onChange={(_, v) => setTrimTolerance(v as number)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('ffmpegTools.trimToleranceHint')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        {t('ffmpegTools.trimThreads')}: {trimThreads}
                      </Typography>
                      <Slider
                        value={Math.min(trimThreads, CPU_COUNT)}
                        min={1}
                        max={CPU_COUNT}
                        step={1}
                        disabled={!trimEnabled || capturing || CPU_COUNT <= 1}
                        valueLabelDisplay="auto"
                        onChange={(_, v) => setTrimThreads(v as number)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('ffmpegTools.trimThreadsHint', { count: CPU_COUNT })}
                      </Typography>
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>

              <Accordion
                disableGutters
                elevation={0}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">{t('ffmpegTools.outputOptions')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField
                      label={t('ffmpegTools.outputDir')}
                      size="small"
                      fullWidth
                      value={outputDir}
                      disabled={capturing}
                      onChange={(e) => setOutputDir(e.target.value)}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              {outputDir && (
                                <Tooltip title={t('ffmpegTools.clearOutputDir')}>
                                  <span>
                                    <IconButton size="small" disabled={capturing} onClick={() => setOutputDir('')} edge="end">
                                      <ClearIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              <Tooltip title={t('ffmpegTools.browse')}>
                                <span>
                                  <IconButton size="small" disabled={capturing} onClick={handleBrowseOutputDir} edge="end">
                                    <FolderOpenIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <TextField
                      label={t('ffmpegTools.namePattern')}
                      size="small"
                      fullWidth
                      value={namePattern}
                      disabled={capturing}
                      placeholder={DEFAULT_NAME_PATTERN}
                      onChange={(e) => setNamePattern(e.target.value)}
                      helperText={t('ffmpegTools.namePatternHint')}
                    />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('ffmpegTools.format')}
                      </Typography>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={format}
                        disabled={capturing}
                        onChange={(_, v) => v && setFormat(v)}
                        sx={{ display: 'block', mt: 0.5, '& .MuiToggleButton-root': { textTransform: 'none' } }}
                      >
                        <ToggleButton value="png">{t('ffmpegTools.formatPng')}</ToggleButton>
                        <ToggleButton value="jpg">{t('ffmpegTools.formatJpg')}</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    {format === 'jpg' && (
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          {t('ffmpegTools.jpgQuality')}: {jpgQuality}
                        </Typography>
                        <Slider
                          value={jpgQuality}
                          min={2}
                          max={31}
                          step={1}
                          disabled={capturing}
                          valueLabelDisplay="auto"
                          onChange={(_, v) => setJpgQuality(v as number)}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {t('ffmpegTools.jpgQualityHint')}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox checked={scaleEnabled} disabled={capturing} onChange={(e) => setScaleEnabled(e.target.checked)} />
                        }
                        label={<Typography variant="body2">{t('ffmpegTools.scale')}</Typography>}
                      />
                      {scaleEnabled && numberField(t('ffmpegTools.scaleWidth'), scaleWidth, setScaleWidth, { min: 1, integer: true })}
                    </Box>
                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox checked={cropEnabled} disabled={capturing} onChange={(e) => setCropEnabled(e.target.checked)} />
                        }
                        label={<Typography variant="body2">{t('ffmpegTools.crop')}</Typography>}
                      />
                      {cropEnabled && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 0.5 }}>
                          {numberField(t('ffmpegTools.cropW'), cropW, setCropW, { min: 1, integer: true })}
                          {numberField(t('ffmpegTools.cropH'), cropH, setCropH, { min: 1, integer: true })}
                          {numberField(t('ffmpegTools.cropX'), cropX, setCropX, { min: 0, integer: true })}
                          {numberField(t('ffmpegTools.cropY'), cropY, setCropY, { min: 0, integer: true })}
                        </Box>
                      )}
                    </Box>
                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={hwaccelEnabled}
                            disabled={capturing}
                            onChange={(e) => setHwaccelEnabled(e.target.checked)}
                          />
                        }
                        label={<Typography variant="body2">{t('ffmpegTools.hwaccel')}</Typography>}
                      />
                      {hwaccelEnabled && (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={hwaccel}
                          disabled={capturing}
                          onChange={(e) => setHwaccel(e.target.value)}
                          helperText={t('ffmpegTools.hwaccelHint')}
                        >
                          {HWACCELS.map((h) => (
                            <MenuItem key={h} value={h}>
                              {h}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          )}
        </Box>

        {/* Bottom: capture/cancel */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          {capturing ? (
            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<StopIcon />}
              onClick={handleCancel}
              sx={{ textTransform: 'none' }}
            >
              {t('ffmpegTools.cancel')}
            </Button>
          ) : (
            <Button
              variant="contained"
              fullWidth
              startIcon={<PhotoCameraIcon />}
              disabled={metaLoading || !!metaError}
              onClick={handleCapture}
              sx={{ textTransform: 'none' }}
            >
              {t('ffmpegTools.capture')}
            </Button>
          )}
        </Box>
      </Box>

      {/* Esc-while-running confirmation: stop the capture/trim and close, or keep going. */}
      <Dialog open={confirmCloseOpen} onClose={() => setConfirmCloseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('ffmpegTools.confirmClose.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('ffmpegTools.confirmClose.message')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCloseOpen(false)} sx={{ textTransform: 'none' }}>
            {t('ffmpegTools.confirmClose.keepRunning')}
          </Button>
          <Button color="error" onClick={handleConfirmStopAndClose} sx={{ textTransform: 'none' }}>
            {t('ffmpegTools.confirmClose.stopAndClose')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FfmpegTools;
