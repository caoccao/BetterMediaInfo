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

import {
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppBar,
  Autocomplete,
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
import FlagIcon from '@mui/icons-material/Flag';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TransformIcon from '@mui/icons-material/Transform';
import {
  closestCenter,
  DndContext,
  type DraggableNode,
  type DragEndEvent,
  KeyboardSensor,
  type KeyboardSensorOptions,
  PointerSensor,
  type PointerSensorOptions,
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
const LANGUAGE_OPTION_ROW_HEIGHT = 34;
const LANGUAGE_OPTION_VISIBLE_ROWS = 10;
const LANGUAGE_DROPDOWN_MAX_HEIGHT = LANGUAGE_OPTION_ROW_HEIGHT * LANGUAGE_OPTION_VISIBLE_ROWS;

function isInteractiveDragTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest([
    'button',
    'input',
    'select',
    'textarea',
    '[contenteditable="true"]',
    '[role="checkbox"]',
    '[role="combobox"]',
    '.MuiAutocomplete-root',
    '.MuiCheckbox-root',
    '.MuiInputBase-root',
  ].join(',')) !== null;
}

function isTextEntryShortcutTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest([
    'input:not([type="checkbox"]):not([type="radio"])',
    'select',
    'textarea',
    '[contenteditable="true"]',
    '[role="combobox"]',
    '.MuiAutocomplete-root',
    '.MuiInputBase-root',
  ].join(',')) !== null;
}

function isToggleStreamsShortcut(event: KeyboardEvent): boolean {
  return !event.ctrlKey
    && !event.altKey
    && (event.key === '*' || event.key === 'Multiply' || event.code === 'NumpadMultiply');
}

class InteractiveSafePointerSensor extends PointerSensor {
  static activators = [{
    eventName: 'onPointerDown' as const,
    handler: (
      { nativeEvent: event }: ReactPointerEvent,
      { onActivation }: PointerSensorOptions,
    ): boolean => {
      if (!event.isPrimary || event.button !== 0 || isInteractiveDragTarget(event.target)) {
        return false;
      }
      onActivation?.({ event });
      return true;
    },
  }];
}

const DEFAULT_KEYBOARD_DRAG_CODES = {
  start: ['Space', 'Enter'],
  cancel: ['Escape'],
  end: ['Space', 'Enter', 'Tab'],
};

class InteractiveSafeKeyboardSensor extends KeyboardSensor {
  static activators = [{
    eventName: 'onKeyDown' as const,
    handler: (
      event: ReactKeyboardEvent,
      { keyboardCodes = DEFAULT_KEYBOARD_DRAG_CODES, onActivation }: KeyboardSensorOptions,
      { active }: { active: DraggableNode },
    ): boolean => {
      const nativeEvent = event.nativeEvent;
      if (!keyboardCodes.start.includes(nativeEvent.code)) {
        return false;
      }
      if (isInteractiveDragTarget(event.target)) {
        return false;
      }

      const activator = active.activatorNode.current;
      if (activator && event.target !== activator) {
        return false;
      }

      event.preventDefault();
      onActivation?.({ event: nativeEvent });
      return true;
    },
  }];
}

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

function shortLanguageCodeFor(code: string, label: string): string {
  const match = label.match(/\(([a-z]{2});\s*[a-z]{3}\)$/i);
  return match?.[1] ?? code;
}

function displayLanguageNameFor(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function normalizeLanguageValue(value: string, shortCodeByCode: Map<string, string>): string {
  const trimmed = value.trim();
  return shortCodeByCode.get(trimmed.toLocaleLowerCase()) ?? trimmed;
}

function normalizeMergeDataLanguages(
  data: MergeData,
  shortCodeByCode: Map<string, string>,
): MergeData {
  let next = data;

  for (const track of data.videos) {
    const value = normalizeLanguageValue(track.language, shortCodeByCode);
    if (value !== track.language) {
      next = next.withVideoLanguage(track.num, value);
    }
  }

  for (const track of data.audios) {
    const value = normalizeLanguageValue(track.language, shortCodeByCode);
    if (value !== track.language) {
      next = next.withAudioLanguage(track.num, value);
    }
  }

  for (const track of data.texts) {
    const value = normalizeLanguageValue(track.language, shortCodeByCode);
    if (value !== track.language) {
      next = next.withTextLanguage(track.num, value);
    }
  }

  return next;
}

function firstMatchingLanguageOptionIndex(
  options: Array<string>,
  languageLabelByCode: Map<string, string>,
  shortLanguageCodeByCode: Map<string, string>,
  inputValue: string,
): number {
  const query = inputValue.trim().toLocaleLowerCase();
  if (query.length === 0) { return -1; }

  const exactCodeMatch = shortLanguageCodeByCode.get(query);
  if (exactCodeMatch) {
    const exactCodeIndex = options.indexOf(exactCodeMatch);
    if (exactCodeIndex >= 0) { return exactCodeIndex; }
  }

  return options.findIndex((option) => {
    const normalizedOption = option.toLocaleLowerCase();
    const normalizedLabel = (languageLabelByCode.get(option) ?? '').toLocaleLowerCase();
    return normalizedOption.startsWith(query) || normalizedLabel.includes(query);
  });
}

interface LanguageAutocompleteProps {
  value: string;
  options: Array<string>;
  preferredOptionCount: number;
  languageLabelByCode: Map<string, string>;
  shortLanguageCodeByCode: Map<string, string>;
  onChange: (value: string) => void;
}

function LanguageAutocomplete({
  value,
  options,
  preferredOptionCount,
  languageLabelByCode,
  shortLanguageCodeByCode,
  onChange,
}: LanguageAutocompleteProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);
  const [dropdownPlacement, setDropdownPlacement] = useState<'bottom-start' | 'top-start'>('bottom-start');
  const [dropdownOpenVersion, setDropdownOpenVersion] = useState(0);
  const matchingOptionIndex = useMemo(
    () => firstMatchingLanguageOptionIndex(options, languageLabelByCode, shortLanguageCodeByCode, value),
    [languageLabelByCode, options, shortLanguageCodeByCode, value],
  );
  const commitValue = useCallback((nextValue: string) => {
    onChange(normalizeLanguageValue(nextValue, shortLanguageCodeByCode));
  }, [onChange, shortLanguageCodeByCode]);
  const updateDropdownPlacement = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) { return; }

    const visibleRows = Math.min(options.length, LANGUAGE_OPTION_VISIBLE_ROWS);
    const dropdownHeight = visibleRows * LANGUAGE_OPTION_ROW_HEIGHT;
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    setDropdownPlacement(below >= dropdownHeight || below >= above ? 'bottom-start' : 'top-start');
  }, [options.length]);
  const handleOpen = useCallback(() => {
    updateDropdownPlacement();
    setDropdownOpenVersion((version) => version + 1);
  }, [updateDropdownPlacement]);
  const scrollToMatchingOption = useCallback((): boolean => {
    if (matchingOptionIndex < 0 || !listboxRef.current) { return false; }

    const visibleRows = Math.min(options.length, LANGUAGE_OPTION_VISIBLE_ROWS);
    const firstVisibleIndex = Math.max(0, matchingOptionIndex - Math.floor(visibleRows / 2));
    listboxRef.current.scrollTop = firstVisibleIndex * LANGUAGE_OPTION_ROW_HEIGHT;
    return true;
  }, [matchingOptionIndex, options.length]);

  useLayoutEffect(() => {
    if (matchingOptionIndex < 0) { return; }

    scrollToMatchingOption();
    let followUpAnimationFrame = 0;
    const animationFrame = requestAnimationFrame(() => {
      scrollToMatchingOption();
      followUpAnimationFrame = requestAnimationFrame(scrollToMatchingOption);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(followUpAnimationFrame);
    };
  }, [dropdownOpenVersion, matchingOptionIndex, scrollToMatchingOption, value]);

  return (
    <Autocomplete<string, false, false, true>
      ref={rootRef}
      freeSolo
      fullWidth
      size="small"
      options={options}
      filterOptions={(allOptions) => allOptions}
      value={value}
      inputValue={value}
      getOptionLabel={(option) => languageLabelByCode.get(option) ?? option}
      renderOption={(props, option, state) => {
        const { key, ...optionProps } = props;
        const isFirstAvailable = state.index === preferredOptionCount
          && preferredOptionCount > 0
          && preferredOptionCount < options.length;
        const isMatchedOption = state.index === matchingOptionIndex;

        return (
          <Box
            key={key}
            component="li"
            {...optionProps}
            sx={{
              borderTop: isFirstAvailable ? 1 : 0,
              borderColor: 'divider',
              bgcolor: isMatchedOption ? 'action.selected' : undefined,
              '&.Mui-focused': {
                bgcolor: isMatchedOption ? 'action.selected' : 'action.hover',
              },
            }}
          >
            {languageLabelByCode.get(option) ?? option}
          </Box>
        );
      }}
      onChange={(_e, nextValue) => {
        commitValue(nextValue ?? '');
      }}
      onInputChange={(_e, nextValue, reason) => {
        if (reason === 'input' || reason === 'clear') {
          onChange(nextValue);
        }
      }}
      onOpen={handleOpen}
      slotProps={{
        popper: {
          placement: dropdownPlacement,
          modifiers: [
            { name: 'flip', enabled: false },
            {
              name: 'preventOverflow',
              enabled: true,
              options: {
                mainAxis: true,
                altAxis: false,
                padding: 8,
              },
            },
            { name: 'offset', options: { offset: [0, 0] } },
          ],
          sx: {
            width: 'max-content !important',
            minWidth: 320,
            maxWidth: 'calc(100vw - 32px)',
            '& .MuiAutocomplete-paper': {
              width: 'max-content',
              minWidth: 320,
              maxWidth: 'calc(100vw - 32px)',
            },
            '& .MuiAutocomplete-listbox': {
              p: 0,
              boxSizing: 'border-box',
              maxHeight: `min(${LANGUAGE_DROPDOWN_MAX_HEIGHT}px, calc(100vh - 16px))`,
              overflowY: options.length > LANGUAGE_OPTION_VISIBLE_ROWS ? 'auto' : 'hidden',
            },
            '& .MuiAutocomplete-option': {
              boxSizing: 'border-box',
              height: LANGUAGE_OPTION_ROW_HEIGHT,
              minHeight: LANGUAGE_OPTION_ROW_HEIGHT,
              minWidth: 280,
              py: 0.5,
              whiteSpace: 'nowrap',
            },
          },
        },
        listbox: {
          ref: listboxRef,
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          fullWidth
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps.htmlInput,
              onFocus: (event: FocusEvent<HTMLInputElement>) => {
                params.slotProps.htmlInput.onFocus?.(event);
                updateDropdownPlacement();
                event.currentTarget.select();
              },
              onClick: (event: MouseEvent<HTMLInputElement>) => {
                params.slotProps.htmlInput.onClick?.(event);
                updateDropdownPlacement();
                event.currentTarget.select();
              },
              onMouseUp: (event: MouseEvent<HTMLInputElement>) => {
                params.slotProps.htmlInput.onMouseUp?.(event);
                event.preventDefault();
              },
              onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  const normalizedValue = normalizeLanguageValue(event.currentTarget.value, shortLanguageCodeByCode);
                  if (normalizedValue !== event.currentTarget.value && options.includes(normalizedValue)) {
                    event.preventDefault();
                    event.stopPropagation();
                    commitValue(event.currentTarget.value);
                    return;
                  }
                }
                params.slotProps.htmlInput.onKeyDown?.(event);
              },
            },
          }}
        />
      )}
    />
  );
}

interface TrackArgInput {
  num: number;
  isEnabled: boolean;
  title: string;
  language: string;
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
      const lang = track.language.trim();
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

function streamEntriesForData(data: MergeData): Array<AnyStreamEntry> {
  return [...data.videos, ...data.audios, ...data.texts, ...data.menus];
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

function allStreamsEnabledSetter(data: MergeData, value: boolean): MergeData {
  let next = data;
  for (const track of data.videos) {
    next = next.withVideoEnabled(track.num, value);
  }
  for (const track of data.audios) {
    next = next.withAudioEnabled(track.num, value);
  }
  for (const track of data.texts) {
    next = next.withTextEnabled(track.num, value);
  }
  for (const track of data.menus) {
    next = next.withMenuEnabled(track.num, value);
  }
  return next;
}

function defaultTracksFollowFirstTrackRule(data: MergeData): boolean {
  return [data.videos, data.audios, data.texts].every((tracks) =>
    tracks.every((track, index) => track.isDefault === (index === 0))
  );
}

function resetDefaultTracks(data: MergeData): MergeData {
  let next = data;
  for (const [index, track] of data.videos.entries()) {
    next = next.withVideoDefault(track.num, index === 0);
  }
  for (const [index, track] of data.audios.entries()) {
    next = next.withAudioDefault(track.num, index === 0);
  }
  for (const [index, track] of data.texts.entries()) {
    next = next.withTextDefault(track.num, index === 0);
  }
  return next;
}

function forcedTracksFollowResetRule(data: MergeData): boolean {
  return [data.videos, data.audios, data.texts].every((tracks) =>
    tracks.every((track) => !track.isForced)
  );
}

function resetForcedTracks(data: MergeData): MergeData {
  let next = data;
  for (const track of data.videos) {
    next = next.withVideoForced(track.num, false);
  }
  for (const track of data.audios) {
    next = next.withAudioForced(track.num, false);
  }
  for (const track of data.texts) {
    next = next.withTextForced(track.num, false);
  }
  return next;
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

function languageSetterFor(
  data: MergeData,
  stream: Protocol.StreamKind,
  num: number,
  value: string,
): MergeData {
  switch (stream) {
    case Protocol.StreamKind.Video: return data.withVideoLanguage(num, value);
    case Protocol.StreamKind.Audio: return data.withAudioLanguage(num, value);
    case Protocol.StreamKind.Text: return data.withTextLanguage(num, value);
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

  const refreshConfig = useCallback(() => {
    void getConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  useEffect(() => { closeWhenDoneRef.current = closeWhenDone; }, [closeWhenDone]);

  const commonPropertiesMap = useMemo(
    () => buildCommonPropertiesMap(config, t),
    [config, t]
  );

  const preferredLanguageCodes = useMemo(
    () => config?.mkv?.languages?.preferred ?? [],
    [config],
  );
  const [languageLabelByCode, setLanguageLabelByCode] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [shortLanguageCodeByCode, setShortLanguageCodeByCode] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [availableLanguageOptions, setAvailableLanguageOptions] = useState<Array<string>>([]);
  const shortLanguageCodeByCodeRef = useRef<Map<string, string>>(new Map());
  const preferredLanguageOptions = useMemo(() => {
    const seen = new Set<string>();
    return preferredLanguageCodes
      .map((code) => shortLanguageCodeByCode.get(code.toLocaleLowerCase()) ?? code)
      .filter((code) => {
        if (seen.has(code)) { return false; }
        seen.add(code);
        return true;
      });
  }, [preferredLanguageCodes, shortLanguageCodeByCode]);
  const languageOptions = useMemo(() => {
    const seen = new Set<string>();
    const appendUnique = (options: Array<string>) => options.filter((option) => {
      if (seen.has(option)) { return false; }
      seen.add(option);
      return true;
    });

    return [
      ...appendUnique(preferredLanguageOptions),
      ...appendUnique(availableLanguageOptions),
    ];
  }, [availableLanguageOptions, preferredLanguageOptions]);

  useEffect(() => {
    let isMounted = true;

    void import('../lib/mkvLanguages').then(({ MKV_LANGUAGES }) => {
      if (isMounted) {
        const nextLabelByCode = new Map<string, string>();
        const nextShortCodeByCode = new Map<string, string>();
        const nextAvailableLanguageOptions: Array<string> = [];
        const seenAvailableLanguageOptions = new Set<string>();

        for (const language of MKV_LANGUAGES) {
          const shortCode = shortLanguageCodeFor(language.code, language.label);
          const displayName = displayLanguageNameFor(language.label);
          nextLabelByCode.set(shortCode, language.label);
          nextLabelByCode.set(language.code, language.label);
          nextShortCodeByCode.set(language.code.toLocaleLowerCase(), shortCode);
          nextShortCodeByCode.set(shortCode.toLocaleLowerCase(), shortCode);
          nextShortCodeByCode.set(displayName.toLocaleLowerCase(), shortCode);
          nextShortCodeByCode.set(language.label.toLocaleLowerCase(), shortCode);
          if (!seenAvailableLanguageOptions.has(shortCode)) {
            seenAvailableLanguageOptions.add(shortCode);
            nextAvailableLanguageOptions.push(shortCode);
          }
        }

        setLanguageLabelByCode(nextLabelByCode);
        setAvailableLanguageOptions(nextAvailableLanguageOptions);
        shortLanguageCodeByCodeRef.current = nextShortCodeByCode;
        setShortLanguageCodeByCode(nextShortCodeByCode);
        setMergeData((prev) => normalizeMergeDataLanguages(prev, nextShortCodeByCode));
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const desiredExtension = useMemo(() => pickExtension(mergeData), [mergeData]);
  const canMerge = desiredExtension !== null;
  const canCopyCommand = Boolean(mergeData.destinationFile) && canMerge;
  const canRunMerge = canCopyCommand && !merging;
  const streamEntries = useMemo(() => streamEntriesForData(mergeData), [mergeData]);
  const streamCheckboxCount = streamEntries.length;
  const enabledStreamCheckboxCount = streamEntries.filter((entry) => entry.isEnabled).length;
  const allStreamsChecked = streamCheckboxCount > 0
    && enabledStreamCheckboxCount === streamCheckboxCount;
  const allStreamsIndeterminate = enabledStreamCheckboxCount > 0
    && enabledStreamCheckboxCount < streamCheckboxCount;
  const canResetDefaultStreams = !defaultTracksFollowFirstTrackRule(mergeData);
  const canResetForcedStreams = !forcedTracksFollowResetRule(mergeData);
  const handleToggleAllStreams = useCallback(() => {
    if (streamCheckboxCount === 0) { return; }
    setMergeData((prev) => allStreamsEnabledSetter(prev, !allStreamsChecked));
  }, [allStreamsChecked, streamCheckboxCount]);
  const handleResetDefaultStreams = useCallback(() => {
    if (!canResetDefaultStreams) { return; }
    setMergeData((prev) => resetDefaultTracks(prev));
  }, [canResetDefaultStreams]);
  const handleResetForcedStreams = useCallback(() => {
    if (!canResetForcedStreams) { return; }
    setMergeData((prev) => resetForcedTracks(prev));
  }, [canResetForcedStreams]);

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
    refreshConfig();
  }, [refreshConfig]);

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
          const fresh = normalizeMergeDataLanguages(
            MergeData.fromPropertyMaps(maps),
            shortLanguageCodeByCodeRef.current,
          );
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
    if (!canCopyCommand) { return; }
    const command = buildMergeCommand(mkvToolNixPath, file, mergeData, propertyMaps, config?.mkv?.additionalParameters?.priority ?? null);
    await writeText(command);
  };

  const handleMerge = async () => {
    if (!canRunMerge) { return; }
    setMerging(true);
    setProgress(0);
    setCompletion(null);
    setDialogOpen(true);
    try {
      const args = buildMergeArgs(file, mergeData, propertyMaps, config?.mkv?.additionalParameters?.priority ?? null);
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
    useSensor(InteractiveSafePointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(InteractiveSafeKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) { return; }
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'F2') {
        e.preventDefault();
        void handleCopyCommand();
        return;
      }
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'F3') {
        e.preventDefault();
        void handleMerge();
        return;
      }
      if (isToggleStreamsShortcut(e) && !isTextEntryShortcutTarget(e.target)) {
        e.preventDefault();
        handleToggleAllStreams();
        return;
      }
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'F5') {
        e.preventDefault();
        handleResetDefaultStreams();
        return;
      }
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'F6') {
        e.preventDefault();
        handleResetForcedStreams();
        return;
      }
      if (e.ctrlKey && !e.altKey && !e.shiftKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        void handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, handleCopyCommand, handleMerge, handleResetDefaultStreams, handleResetForcedStreams, handleToggleAllStreams]);

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
          <Tooltip title={t('merge.copyCommandTooltip')}>
            <span>
              <Button variant="outlined" size="small" disabled={!canCopyCommand} onClick={handleCopyCommand} startIcon={<ContentCopyIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
                {t('merge.copyCommand')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('merge.mergeTooltip')}>
            <span>
              <Button variant="outlined" size="small" disabled={!canRunMerge} onClick={handleMerge} startIcon={<TransformIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
                {t('merge.merge')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('merge.closeTooltip')}>
            <span>
              <Button variant="outlined" size="small" disabled={merging} onClick={handleClose} startIcon={<CloseIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
                {t('merge.close')}
              </Button>
            </span>
          </Tooltip>
        </Toolbar>
        <Toolbar
          variant="dense"
          disableGutters
          sx={{ minHeight: '32px !important', px: 2.5 }}
        >
          <Tooltip title={t('merge.toggleAllStreams')}>
            <span>
              <Checkbox
                size="small"
                checked={allStreamsChecked}
                indeterminate={allStreamsIndeterminate}
                disabled={streamCheckboxCount === 0}
                onChange={(e) => {
                  setMergeData((prev) => allStreamsEnabledSetter(prev, e.target.checked));
                }}
                slotProps={{
                  input: {
                    'aria-label': t('merge.toggleAllStreams'),
                  },
                }}
                sx={{ p: 0.5 }}
              />
            </span>
          </Tooltip>
          <Tooltip title={t('merge.resetDefaultStreams')}>
            <span>
              <IconButton
                size="small"
                disabled={!canResetDefaultStreams}
                aria-label={t('merge.resetDefaultStreams')}
                onClick={handleResetDefaultStreams}
                sx={{ p: 0.5 }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('merge.resetForcedStreams')}>
            <span>
              <IconButton
                size="small"
                disabled={!canResetForcedStreams}
                aria-label={t('merge.resetForcedStreams')}
                onClick={handleResetForcedStreams}
                sx={{ p: 0.5 }}
              >
                <FlagIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'auto', pt: 0.5, pb: 2, pl: 2, pr: 2 }}>
        {[...commonPropertiesMap.entries()].map(([stream, commonProperties]) => {
          const rawStreamMaps = propertyMaps.filter((map) => map.stream === stream);
          if (rawStreamMaps.length === 0) { return null; }
          const sortable = stream !== Protocol.StreamKind.General;
          const streamMaps = orderedStreamMaps(stream, rawStreamMaps, mergeData);
          const sortableIds = streamMaps.map((map) => rowId(map.stream, map.num));
          const tableContent = (
            <TableContainer key={stream} sx={{ mt: 0.5 }}>
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
                    const languageValue = trackRefs?.language ?? '';
                    const setTitleValue = (value: string) => {
                      setMergeData((prev) => titleSetterFor(prev, map.stream, map.num, value));
                    };
                    const setLanguageValue = (value: string) => {
                      setMergeData((prev) => languageSetterFor(prev, map.stream, map.num, value));
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
                            const isEditableLanguage = prop.name === 'Language' && trackRefs !== null;
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
                                ) : isEditableLanguage ? (
                                  <Box sx={{ width: '100%' }} onPointerDown={(e) => e.stopPropagation()}>
                                    <LanguageAutocomplete
                                      options={languageOptions}
                                      preferredOptionCount={preferredLanguageOptions.length}
                                      value={languageValue}
                                      languageLabelByCode={languageLabelByCode}
                                      shortLanguageCodeByCode={shortLanguageCodeByCode}
                                      onChange={setLanguageValue}
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
