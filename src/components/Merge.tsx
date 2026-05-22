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

import { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TransformIcon from '@mui/icons-material/Transform';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
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
import { getConfig, getPropertiesMap, suggestMergeOutputPath } from '../lib/service';

function buildMergeCommand(mkvToolNixPath: string, sourceFile: string, destinationFile: string): string {
  const sep = getSep();
  const mkvmergePath = `${mkvToolNixPath}${sep}mkvmerge`;
  return `"${mkvmergePath}" -o "${destinationFile}" "${sourceFile}"`;
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

interface MergeProps {
  file: string;
  mkvToolNixPath: string;
}

function Merge({ file, mkvToolNixPath }: MergeProps) {
  const { t } = useTranslation();
  const [mergeData, setMergeData] = useState<MergeData>(() => new MergeData());
  const [config, setConfig] = useState<Protocol.Config | null>(null);
  const [propertyMaps, setPropertyMaps] = useState<Array<Protocol.StreamPropertyMap>>([]);

  const commonPropertiesMap = useMemo(
    () => buildCommonPropertiesMap(config, t),
    [config, t]
  );

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

  const handleCopyCommand = async () => {
    if (!mergeData.destinationFile) { return; }
    const command = buildMergeCommand(mkvToolNixPath, file, mergeData.destinationFile);
    await writeText(command);
  };

  const handleMerge = async () => {
    // TODO: implement merge action — will consume `mergeData`
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
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
          <Button variant="outlined" size="small" disabled={!mergeData.destinationFile} onClick={handleCopyCommand} startIcon={<ContentCopyIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
            {t('merge.copyCommand')}
          </Button>
          <Button variant="outlined" size="small" disabled={!mergeData.destinationFile} onClick={handleMerge} startIcon={<TransformIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
            {t('merge.merge')}
          </Button>
          <Tooltip title="Ctrl+W">
            <span>
              <Button variant="outlined" size="small" onClick={handleClose} startIcon={<CloseIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
                {t('merge.close')}
              </Button>
            </span>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {[...commonPropertiesMap.entries()].map(([stream, commonProperties]) => {
          const streamMaps = propertyMaps.filter((map) => map.stream === stream);
          if (streamMaps.length === 0) { return null; }
          return (
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
                      <TableRow key={`${map.stream}:${map.num}`}>
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
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                                ) : isDefault && trackRefs ? (
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
                                ) : isForced && trackRefs ? (
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
                                ) : (
                                  prop.format(map.propertyMap[prop.name], map.propertyMap)
                                )}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          );
        })}
      </Box>
    </Box>
  );
}

export default Merge;
