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

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TransformIcon from '@mui/icons-material/Transform';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { sep as getSep } from '@tauri-apps/api/path';
import * as Protocol from '../lib/protocol';
import {
  buildCommonPropertiesMap,
  STREAM_KIND_COLORS,
} from '../lib/cardTables';
import {
  MergeAudioData,
  MergeData,
  MergeMenuData,
  MergeTextData,
  MergeVideoData,
} from '../lib/merge';
import {
  cancelMkvmerge,
  getConfig,
  getPropertiesMap,
  runMkvmerge,
  suggestMergeOutputPath,
} from '../lib/service';

const IS_WINDOWS = typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent);

/**
 * Quote a single command-line argument for safe copy-paste into the
 * target platform's shell.
 *
 * Windows: wraps in double quotes with Microsoft C runtime-style
 * backslash escaping (works for mkvmerge.exe and other native binaries
 * invoked from cmd or PowerShell, as long as the argument doesn't contain
 * cmd shell metachars that need additional escaping — titles/paths
 * generally don't).
 *
 * POSIX (Linux / macOS): wraps in single quotes; the close-then-escape
 * trick handles embedded apostrophes.
 */
function shellQuote(arg: string): string {
  if (IS_WINDOWS) {
    if (arg.length > 0 && !/[\s"]/.test(arg)) {
      return arg;
    }
    let result = '"';
    let backslashes = 0;
    for (const ch of arg) {
      if (ch === '\\') {
        backslashes++;
      } else if (ch === '"') {
        result += '\\'.repeat(backslashes * 2 + 1) + '"';
        backslashes = 0;
      } else {
        result += '\\'.repeat(backslashes) + ch;
        backslashes = 0;
      }
    }
    result += '\\'.repeat(backslashes * 2) + '"';
    return result;
  }
  if (arg.length > 0 && /^[A-Za-z0-9_./:=+,@%-]+$/.test(arg)) {
    return arg;
  }
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

/**
 * Look up an mkvmerge track ID for a (stream, num) pair. mediainfo's
 * `ID` for MKV files is the EBML TrackNumber (1-based); mkvmerge uses
 * 0-based TIDs in its command line, so we subtract 1.
 */
function getMkvmergeTid(
  stream: Protocol.StreamKind,
  num: number,
  propertyMaps: Array<Protocol.StreamPropertyMap>,
): number | null {
  const map = propertyMaps.find((m) => m.stream === stream && m.num === num);
  if (!map) { return null; }
  const idStr = map.propertyMap['ID'];
  if (!idStr) { return null; }
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) { return null; }
  return id - 1;
}

function getLanguageCode(
  stream: Protocol.StreamKind,
  num: number,
  propertyMaps: Array<Protocol.StreamPropertyMap>,
): string {
  const map = propertyMaps.find((m) => m.stream === stream && m.num === num);
  return (map?.propertyMap['Language'] ?? '').trim();
}

interface TrackArgInput {
  num: number;
  isEnabled: boolean;
  title: string;
  isDefault: boolean;
  isForced: boolean;
}

/**
 * Pick the right MKV-family extension for the given merge data.
 * mkvmerge can only produce an MKV-family container, and the convention is:
 *   - has video    → .mkv
 *   - audio-only   → .mka
 *   - subtitle-only → .mks
 *   - nothing      → null (output not possible)
 */
function pickExtension(data: MergeData): 'mkv' | 'mka' | 'mks' | null {
  if (data.videos.some((v) => v.isEnabled)) { return 'mkv'; }
  if (data.audios.some((a) => a.isEnabled)) { return 'mka'; }
  if (data.texts.some((t) => t.isEnabled)) { return 'mks'; }
  return null;
}

function replaceFileExtension(path: string, ext: string): string {
  if (!path) { return path; }
  const sepIdx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const dotIdx = path.lastIndexOf('.');
  if (dotIdx > sepIdx) {
    return path.substring(0, dotIdx) + '.' + ext;
  }
  return path + '.' + ext;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Build the raw mkvmerge argv (everything AFTER the mkvmerge binary itself).
 * Used both for the "Run merge" subprocess invocation (which doesn't need
 * shell quoting) and for the "Copy Command" string (which does).
 */
function buildMergeArgs(
  sourceFile: string,
  mergeData: MergeData,
  propertyMaps: Array<Protocol.StreamPropertyMap>,
  priority: Protocol.MkvPriority | null,
): string[] {
  const args: string[] = [];

  // Global options
  args.push('-o', mergeData.destinationFile);
  args.push('--title', mergeData.general.title);
  if (priority) {
    args.push('--priority', priority.toLowerCase());
  }

  const emitTrackType = (
    stream: Protocol.StreamKind,
    tracks: TrackArgInput[],
    selectFlag: string,
    noFlag: string,
  ): number[] => {
    const built = tracks
      .map((t) => ({ track: t, tid: getMkvmergeTid(stream, t.num, propertyMaps) }))
      .filter((entry): entry is { track: TrackArgInput; tid: number } => entry.tid !== null);
    const enabled = built.filter((e) => e.track.isEnabled);
    if (enabled.length === 0) {
      args.push(noFlag);
    } else if (enabled.length < built.length) {
      args.push(selectFlag, enabled.map((e) => String(e.tid)).join(','));
    }
    for (const { track, tid } of enabled) {
      args.push('--track-name', `${tid}:${track.title}`);
      const lang = getLanguageCode(stream, track.num, propertyMaps);
      if (lang.length > 0) {
        args.push('--language', `${tid}:${lang}`);
      }
      args.push('--default-track-flag', `${tid}:${track.isDefault ? 1 : 0}`);
      args.push('--forced-display-flag', `${tid}:${track.isForced ? 1 : 0}`);
    }
    return enabled.map((e) => e.tid);
  };

  const videoTids = emitTrackType(Protocol.StreamKind.Video, mergeData.videos, '-d', '--no-video');
  const audioTids = emitTrackType(Protocol.StreamKind.Audio, mergeData.audios, '-a', '--no-audio');
  const textTids = emitTrackType(Protocol.StreamKind.Text, mergeData.texts, '-s', '--no-subtitles');

  // Chapters (menus): all-or-nothing. Always emit --no-chapters when none enabled.
  if (!mergeData.menus.some((m) => m.isEnabled)) {
    args.push('--no-chapters');
  }

  // Source file (per-input-file options above all attach to this file).
  args.push(sourceFile);

  // Track order: top-to-bottom visual order across enabled video → audio → text.
  const orderedTracks = [
    ...videoTids.map((tid) => `0:${tid}`),
    ...audioTids.map((tid) => `0:${tid}`),
    ...textTids.map((tid) => `0:${tid}`),
  ];
  if (orderedTracks.length > 0) {
    args.push('--track-order', orderedTracks.join(','));
  }

  return args;
}

function buildMergeCommand(
  mkvToolNixPath: string,
  sourceFile: string,
  mergeData: MergeData,
  propertyMaps: Array<Protocol.StreamPropertyMap>,
  priority: Protocol.MkvPriority | null,
): string {
  const sep = getSep();
  const mkvmergeBinary = IS_WINDOWS ? 'mkvmerge.exe' : 'mkvmerge';
  const mkvmergePath = `${mkvToolNixPath}${sep}${mkvmergeBinary}`;
  const args = buildMergeArgs(sourceFile, mergeData, propertyMaps, priority);
  return [shellQuote(mkvmergePath), ...args.map(shellQuote)].join(' ');
}

/**
 * Helpers that bridge the table-driven render loop to the type-specific
 * MergeData API. Each stream kind has its own class and its own setters
 * on MergeData; these helpers dispatch by the iteration's stream kind.
 */
type EditableTrack = MergeVideoData | MergeAudioData | MergeTextData;
type AnyStreamEntry = EditableTrack | MergeMenuData;

function trackBindingsFor(
  stream: Protocol.StreamKind,
  num: number,
  data: MergeData,
): EditableTrack | null {
  switch (stream) {
    case Protocol.StreamKind.Video: return data.findVideo(num);
    case Protocol.StreamKind.Audio: return data.findAudio(num);
    case Protocol.StreamKind.Text: return data.findText(num);
    default: return null;
  }
}

function streamEntryFor(
  stream: Protocol.StreamKind,
  num: number,
  data: MergeData,
): AnyStreamEntry | null {
  switch (stream) {
    case Protocol.StreamKind.Video: return data.findVideo(num);
    case Protocol.StreamKind.Audio: return data.findAudio(num);
    case Protocol.StreamKind.Text: return data.findText(num);
    case Protocol.StreamKind.Menu: return data.findMenu(num);
    default: return null;
  }
}

function enabledSetterFor(
  data: MergeData,
  stream: Protocol.StreamKind,
  num: number,
  value: boolean,
): MergeData {
  switch (stream) {
    case Protocol.StreamKind.Video: return data.withVideoEnabled(num, value);
    case Protocol.StreamKind.Audio: return data.withAudioEnabled(num, value);
    case Protocol.StreamKind.Text: return data.withTextEnabled(num, value);
    case Protocol.StreamKind.Menu: return data.withMenuEnabled(num, value);
    default: return data;
  }
}

function titleSetterFor(
  data: MergeData,
  stream: Protocol.StreamKind,
  num: number,
  value: string,
): MergeData {
  switch (stream) {
    case Protocol.StreamKind.General: return data.withGeneralTitle(value);
    case Protocol.StreamKind.Video: return data.withVideoTitle(num, value);
    case Protocol.StreamKind.Audio: return data.withAudioTitle(num, value);
    case Protocol.StreamKind.Text: return data.withTextTitle(num, value);
    default: return data;
  }
}

function defaultSetterFor(
  data: MergeData,
  stream: Protocol.StreamKind,
  num: number,
  value: boolean,
): MergeData {
  switch (stream) {
    case Protocol.StreamKind.Video: return data.withVideoDefault(num, value);
    case Protocol.StreamKind.Audio: return data.withAudioDefault(num, value);
    case Protocol.StreamKind.Text: return data.withTextDefault(num, value);
    default: return data;
  }
}

function forcedSetterFor(
  data: MergeData,
  stream: Protocol.StreamKind,
  num: number,
  value: boolean,
): MergeData {
  switch (stream) {
    case Protocol.StreamKind.Video: return data.withVideoForced(num, value);
    case Protocol.StreamKind.Audio: return data.withAudioForced(num, value);
    case Protocol.StreamKind.Text: return data.withTextForced(num, value);
    default: return data;
  }
}

function reorderFor(
  data: MergeData,
  stream: Protocol.StreamKind,
  activeNum: number,
  overNum: number,
): MergeData {
  switch (stream) {
    case Protocol.StreamKind.Video: return data.withReorderedVideos(activeNum, overNum);
    case Protocol.StreamKind.Audio: return data.withReorderedAudios(activeNum, overNum);
    case Protocol.StreamKind.Text: return data.withReorderedTexts(activeNum, overNum);
    case Protocol.StreamKind.Menu: return data.withReorderedMenus(activeNum, overNum);
    default: return data;
  }
}

/**
 * Returns the stream property maps for the given stream, ordered by the
 * current row order tracked in mergeData. For General (single row) and
 * any unknown stream, returns the input as-is.
 */
function orderedStreamMaps(
  stream: Protocol.StreamKind,
  streamMaps: Array<Protocol.StreamPropertyMap>,
  data: MergeData,
): Array<Protocol.StreamPropertyMap> {
  let nums: number[];
  switch (stream) {
    case Protocol.StreamKind.Video: nums = data.videos.map((v) => v.num); break;
    case Protocol.StreamKind.Audio: nums = data.audios.map((a) => a.num); break;
    case Protocol.StreamKind.Text: nums = data.texts.map((t) => t.num); break;
    case Protocol.StreamKind.Menu: nums = data.menus.map((m) => m.num); break;
    default: return streamMaps;
  }
  if (nums.length === 0) { return streamMaps; }
  const byNum = new Map(streamMaps.map((map) => [map.num, map]));
  return nums
    .map((n) => byNum.get(n))
    .filter((m): m is Protocol.StreamPropertyMap => !!m);
}

function rowId(stream: Protocol.StreamKind, num: number): string {
  return `${stream}:${num}`;
}

function parseRowId(id: string): { stream: Protocol.StreamKind; num: number } | null {
  const parts = id.split(':');
  if (parts.length !== 2) { return null; }
  const streamValues = Object.values(Protocol.StreamKind) as string[];
  if (!streamValues.includes(parts[0])) { return null; }
  const num = Number(parts[1]);
  if (Number.isNaN(num)) { return null; }
  return { stream: parts[0] as Protocol.StreamKind, num };
}

interface SortableTableRowProps {
  id: string;
  sortable: boolean;
  children: React.ReactNode;
}

function SortableTableRow({ id, sortable, children }: SortableTableRowProps) {
  const sortableProps = useSortable({ id, disabled: !sortable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortableProps;
  return (
    <TableRow
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: sortable ? 'grab' : undefined,
      }}
      sx={sortable ? { '&:hover': { bgcolor: 'action.hover' } } : undefined}
    >
      {children}
    </TableRow>
  );
}

interface MergeProps {
  file: string;
  mkvToolNixPath: string;
}

function Merge({ file, mkvToolNixPath }: MergeProps) {
  const { t } = useTranslation();
  const [mergeData, setMergeData] = useState<MergeData>(() => new MergeData());
  const [config, setConfig] = useState<Protocol.Config | null>(null);
  const [propertyMaps, setPropertyMaps] = useState<Array<Protocol.StreamPropertyMap>>([]);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState(0);
  const [closeWhenDone, setCloseWhenDone] = useState(false);
  const closeWhenDoneRef = useRef(false);
  const [completion, setCompletion] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => { closeWhenDoneRef.current = closeWhenDone; }, [closeWhenDone]);

  const commonPropertiesMap = useMemo(
    () => buildCommonPropertiesMap(config, t),
    [config, t]
  );

  const desiredExtension = useMemo(() => pickExtension(mergeData), [mergeData]);
  const canMerge = desiredExtension !== null;

  // Keep the destination file extension in sync with what mkvmerge can
  // actually produce: .mkv (has video), .mka (audio-only), .mks (text-only).
  useEffect(() => {
    if (!desiredExtension) { return; }
    setMergeData((prev) => {
      if (!prev.destinationFile) { return prev; }
      const next = replaceFileExtension(prev.destinationFile, desiredExtension);
      return next === prev.destinationFile ? prev : prev.withDestinationFile(next);
    });
  }, [desiredExtension]);

  useEffect(() => {
    suggestMergeOutputPath(file).then((path) => {
      setMergeData((prev) => prev.withDestinationFile(path));
    });
  }, [file]);

  useEffect(() => {
    getConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (commonPropertiesMap.size === 0) { return; }
    const properties = [...commonPropertiesMap.entries()]
      .flatMap(([stream, propertyFormats]) =>
        propertyFormats
          .filter((prop) => !prop.virtual)
          .map((prop) => ({ stream, property: prop.name }))
      );
    if (properties.length === 0) { return; }
    getPropertiesMap(file, properties)
      .then((maps) => {
        setPropertyMaps(maps);
        setMergeData((prev) => {
          const fresh = MergeData.fromPropertyMaps(maps);
          fresh.destinationFile = prev.destinationFile;
          return fresh;
        });
      })
      .catch(() => {
        setPropertyMaps([]);
        setMergeData((prev) => new MergeData(prev.destinationFile));
      });
  }, [file, commonPropertiesMap]);

  // Listen for mkvmerge progress events
  useEffect(() => {
    const unlisten = getCurrentWebviewWindow().listen<Protocol.MkvmergeProgress>('mkvmerge-progress', (event) => {
      const { percent, done, cancelled, error: progressError } = event.payload;
      setProgress(percent);
      if (done) {
        const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        setMerging(false);
        if (cancelled) {
          setDialogOpen(false);
          setCompletion(null);
        } else if (progressError) {
          setCompletion({
            type: 'error',
            message: t('merge.error.mkvmergeFailed', { detail: progressError }),
          });
        } else if (closeWhenDoneRef.current) {
          setDialogOpen(false);
          setCompletion(null);
          getCurrentWindow().close();
        } else {
          setCompletion({
            type: 'success',
            message: t('merge.mergeComplete', { seconds: elapsedSec }),
          });
        }
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [t]);

  // Timer for elapsed / ETA
  useEffect(() => {
    if (merging) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      setEta(0);
      timerRef.current = setInterval(() => {
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(elapsedSec);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [merging]);

  // Recompute ETA when progress or elapsed changes
  useEffect(() => {
    if (progress > 0 && progress < 100 && elapsed > 0) {
      const totalEstimated = elapsed / (progress / 100);
      setEta(totalEstimated - elapsed);
    }
  }, [progress, elapsed]);

  const handleCopyCommand = async () => {
    if (!mergeData.destinationFile) { return; }
    const command = buildMergeCommand(mkvToolNixPath, file, mergeData, propertyMaps, config?.mkv?.priority ?? null);
    await writeText(command);
  };

  const handleMerge = async () => {
    if (!mergeData.destinationFile || merging) { return; }
    setMerging(true);
    setProgress(0);
    setCompletion(null);
    setDialogOpen(true);
    try {
      const args = buildMergeArgs(file, mergeData, propertyMaps, config?.mkv?.priority ?? null);
      await runMkvmerge(args);
    } catch (err) {
      const msg = String(err);
      setDialogOpen(false);
      setMerging(false);
      if (msg.includes('MKVMERGE_NOT_AVAILABLE:')) {
        const detail = msg.split('MKVMERGE_NOT_AVAILABLE:')[1];
        setCompletion({
          type: 'error',
          message: t('merge.error.mkvmergeNotAvailable', { detail }),
        });
        setDialogOpen(true);
      } else {
        setCompletion({ type: 'error', message: msg });
        setDialogOpen(true);
      }
    }
  };

  const handleCancel = async () => {
    await cancelMkvmerge();
  };

  const handleClose = async () => {
    if (merging) { return; }
    await getCurrentWindow().close();
  };

  // Cancel any in-flight merge when the window closes
  useEffect(() => {
    return () => { cancelMkvmerge(); };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (stream: Protocol.StreamKind) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) { return; }
    const activeRow = parseRowId(String(active.id));
    const overRow = parseRowId(String(over.id));
    if (!activeRow || !overRow || activeRow.stream !== overRow.stream) { return; }
    setMergeData((prev) => reorderFor(prev, stream, activeRow.num, overRow.num));
  };

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.shiftKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <TextField
            size="small"
            value={mergeData.destinationFile}
            onChange={(e) => setMergeData((prev) => prev.withDestinationFile(e.target.value))}
            sx={{ flex: 1, '& .MuiInputBase-root': { height: 32 } }}
            slotProps={{
              input: {
                endAdornment: mergeData.destinationFile ? (
                  <InputAdornment position="end">
                    <Tooltip title={t('merge.clearDestinationFile')}>
                      <IconButton
                        size="small"
                        aria-label={t('merge.clearDestinationFile')}
                        onClick={() => setMergeData((prev) => prev.withDestinationFile(''))}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Toolbar>
        <Toolbar variant="dense" sx={{ gap: 1, justifyContent: 'center' }}>
          <Button variant="outlined" size="small" disabled={!mergeData.destinationFile || !canMerge} onClick={handleCopyCommand} startIcon={<ContentCopyIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
            {t('merge.copyCommand')}
          </Button>
          <Button variant="outlined" size="small" disabled={!mergeData.destinationFile || !canMerge || merging} onClick={handleMerge} startIcon={<TransformIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
            {t('merge.merge')}
          </Button>
          <Tooltip title="Ctrl+W">
            <span>
              <Button variant="outlined" size="small" disabled={merging} onClick={handleClose} startIcon={<CloseIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
                {t('merge.close')}
              </Button>
            </span>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {[...commonPropertiesMap.entries()].map(([stream, commonProperties]) => {
          const rawStreamMaps = propertyMaps.filter((map) => map.stream === stream);
          if (rawStreamMaps.length === 0) { return null; }
          const sortable = stream !== Protocol.StreamKind.General;
          const streamMaps = orderedStreamMaps(stream, rawStreamMaps, mergeData);
          const sortableIds = streamMaps.map((map) => rowId(map.stream, map.num));
          const tableContent = (
            <TableContainer key={stream} sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {commonProperties
                      .filter((prop) => prop.inCardView)
                      .map((prop) => (
                        <TableCell
                          key={prop.name}
                          align={prop.align}
                          sx={{
                            bgcolor: `${STREAM_KIND_COLORS[stream]}20`,
                            fontWeight: 'bold',
                            borderTop: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                            borderBottom: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                            borderLeft: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                            borderRight: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                          }}
                        >
                          {prop.header ?? prop.name}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {streamMaps.map((map) => {
                    const trackRefs = trackBindingsFor(map.stream, map.num, mergeData);
                    const streamEntry = streamEntryFor(map.stream, map.num, mergeData);
                    const titleValue = map.stream === Protocol.StreamKind.General
                      ? mergeData.general.title
                      : trackRefs?.title ?? '';
                    const setTitleValue = (value: string) => {
                      setMergeData((prev) => titleSetterFor(prev, map.stream, map.num, value));
                    };
                    return (
                      <SortableTableRow
                        key={`${map.stream}:${map.num}`}
                        id={rowId(map.stream, map.num)}
                        sortable={sortable}
                      >
                        {commonProperties
                          .filter((prop) => prop.inCardView)
                          .map((prop) => {
                            const isEditableTitle = prop.name === 'Title';
                            const isDefault = prop.name === 'Default';
                            const isForced = prop.name === 'Forced';
                            const isId = (prop.name === 'ID' || prop.name === 'StreamKindID')
                              && streamEntry !== null;
                            return (
                              <TableCell
                                key={prop.name}
                                align={prop.align}
                                sx={{
                                  borderTop: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                  borderBottom: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                  borderLeft: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                  borderRight: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                  whiteSpace: 'pre-line',
                                }}
                              >
                                {isId && streamEntry ? (
                                  <Box
                                    onPointerDown={(e) => e.stopPropagation()}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                  >
                                    <Checkbox
                                      size="small"
                                      checked={streamEntry.isEnabled}
                                      onChange={(e) =>
                                        setMergeData((prev) =>
                                          enabledSetterFor(prev, map.stream, map.num, e.target.checked)
                                        )
                                      }
                                      sx={{ p: 0 }}
                                    />
                                    <span>{prop.format(map.propertyMap[prop.name], map.propertyMap)}</span>
                                  </Box>
                                ) : isEditableTitle ? (
                                  <Box onPointerDown={(e) => e.stopPropagation()}>
                                    <TextField
                                      size="small"
                                      value={titleValue}
                                      onChange={(e) => setTitleValue(e.target.value)}
                                      variant="standard"
                                      fullWidth
                                      slotProps={{
                                        input: {
                                          endAdornment: titleValue ? (
                                            <InputAdornment position="end">
                                              <Tooltip title={t('merge.clearTitle')}>
                                                <IconButton
                                                  size="small"
                                                  aria-label={t('merge.clearTitle')}
                                                  onClick={() => setTitleValue('')}
                                                  edge="end"
                                                >
                                                  <ClearIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </InputAdornment>
                                          ) : null,
                                        },
                                      }}
                                    />
                                  </Box>
                                ) : isDefault && trackRefs ? (
                                  <Box onPointerDown={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      size="small"
                                      checked={trackRefs.isDefault}
                                      onChange={(e) =>
                                        setMergeData((prev) =>
                                          defaultSetterFor(prev, map.stream, map.num, e.target.checked)
                                        )
                                      }
                                      sx={{ p: 0 }}
                                    />
                                  </Box>
                                ) : isForced && trackRefs ? (
                                  <Box onPointerDown={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      size="small"
                                      checked={trackRefs.isForced}
                                      onChange={(e) =>
                                        setMergeData((prev) =>
                                          forcedSetterFor(prev, map.stream, map.num, e.target.checked)
                                        )
                                      }
                                      sx={{ p: 0 }}
                                    />
                                  </Box>
                                ) : (
                                  prop.format(map.propertyMap[prop.name], map.propertyMap)
                                )}
                              </TableCell>
                            );
                          })}
                      </SortableTableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          );
          if (!sortable) { return tableContent; }
          return (
            <DndContext
              key={stream}
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd(stream)}
            >
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {tableContent}
              </SortableContext>
            </DndContext>
          );
        })}
      </Box>
      <Dialog open={dialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>{t('merge.merging')}</DialogTitle>
        <DialogContent>
          {completion ? (
            <Typography variant="body2" color={completion.type === 'error' ? 'error' : 'text.primary'} sx={{ mt: 1 }}>
              {completion.message}
            </Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <LinearProgress variant="determinate" value={progress} sx={{ flex: 1 }} />
                <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                  {progress}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('merge.elapsed')}: {formatTime(elapsed)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('merge.eta')}: {progress > 0 && progress < 100 ? formatTime(eta) : '--:--:--'}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={completion ? undefined : { justifyContent: 'space-between' }}>
          {completion ? (
            <Button variant="contained" onClick={() => { setDialogOpen(false); setCompletion(null); }}>
              {t('merge.close')}
            </Button>
          ) : (
            <>
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={closeWhenDone}
                    onChange={(e) => setCloseWhenDone(e.target.checked)}
                  />
                }
                label={<Typography variant="body2">{t('merge.closeWhenDone')}</Typography>}
              />
              <Button variant="contained" color="error" onClick={handleCancel}>{t('merge.cancel')}</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Merge;
