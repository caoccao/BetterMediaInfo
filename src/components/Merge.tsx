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

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
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
import { getConfig, getPropertiesMap, suggestMergeOutputPath } from '../lib/service';

/**
 * Holds every user-editable field in the merge window. Stream property maps
 * coming from media info are read-only, so any edits the user makes (titles,
 * destination path, ...) are tracked here. This is the structure that will
 * later be turned into the mkvmerge command-line arguments.
 */
interface MergeEdits {
  destinationFile: string;
  titles: Record<string, string>;
}

function titleKey(stream: Protocol.StreamKind, num: number): string {
  return `${stream}:${num}`;
}

function buildMergeCommand(mkvToolNixPath: string, sourceFile: string, destinationFile: string): string {
  const sep = getSep();
  const mkvmergePath = `${mkvToolNixPath}${sep}mkvmerge`;
  return `"${mkvmergePath}" -o "${destinationFile}" "${sourceFile}"`;
}

interface MergeProps {
  file: string;
  mkvToolNixPath: string;
}

function Merge({ file, mkvToolNixPath }: MergeProps) {
  const { t } = useTranslation();
  const [edits, setEdits] = useState<MergeEdits>({ destinationFile: '', titles: {} });
  const [config, setConfig] = useState<Protocol.Config | null>(null);
  const [propertyMaps, setPropertyMaps] = useState<Array<Protocol.StreamPropertyMap>>([]);

  const commonPropertiesMap = useMemo(
    () => buildCommonPropertiesMap(config, t),
    [config, t]
  );

  const setDestinationFile = useCallback((value: string) => {
    setEdits((prev) => ({ ...prev, destinationFile: value }));
  }, []);

  const setTitle = useCallback((stream: Protocol.StreamKind, num: number, value: string) => {
    setEdits((prev) => ({
      ...prev,
      titles: { ...prev.titles, [titleKey(stream, num)]: value },
    }));
  }, []);

  useEffect(() => {
    suggestMergeOutputPath(file).then(setDestinationFile);
  }, [file, setDestinationFile]);

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
        const titles: Record<string, string> = {};
        for (const map of maps) {
          const value = map.propertyMap['Title'];
          if (value !== undefined) {
            titles[titleKey(map.stream, map.num)] = value;
          }
        }
        setEdits((prev) => ({ ...prev, titles }));
      })
      .catch(() => {
        setPropertyMaps([]);
        setEdits((prev) => ({ ...prev, titles: {} }));
      });
  }, [file, commonPropertiesMap]);

  const handleCopyCommand = async () => {
    if (!edits.destinationFile) { return; }
    const command = buildMergeCommand(mkvToolNixPath, file, edits.destinationFile);
    await writeText(command);
  };

  const handleMerge = async () => {
    // TODO: implement merge action — will consume `edits`
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
            value={edits.destinationFile}
            onChange={(e) => setDestinationFile(e.target.value)}
            sx={{ flex: 1, '& .MuiInputBase-root': { height: 32 } }}
            slotProps={{
              input: {
                endAdornment: edits.destinationFile ? (
                  <InputAdornment position="end">
                    <Tooltip title={t('merge.clearDestinationFile')}>
                      <IconButton
                        size="small"
                        aria-label={t('merge.clearDestinationFile')}
                        onClick={() => setDestinationFile('')}
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
          <Button variant="outlined" size="small" disabled={!edits.destinationFile} onClick={handleCopyCommand} startIcon={<ContentCopyIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
            {t('merge.copyCommand')}
          </Button>
          <Button variant="outlined" size="small" disabled={!edits.destinationFile} onClick={handleMerge} startIcon={<TransformIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 32 }}>
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
                  {streamMaps.map((map) => (
                    <TableRow key={`${map.stream}:${map.num}`}>
                      {commonProperties
                        .filter((prop) => prop.inCardView)
                        .map((prop) => {
                          const isEditableTitle = prop.name === 'Title';
                          const titleValue = edits.titles[titleKey(map.stream, map.num)] ?? '';
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
                              {isEditableTitle ? (
                                <TextField
                                  size="small"
                                  value={titleValue}
                                  onChange={(e) => setTitle(map.stream, map.num, e.target.value)}
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
                                              onClick={() => setTitle(map.stream, map.num, '')}
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
                              ) : (
                                prop.format(map.propertyMap[prop.name], map.propertyMap)
                              )}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  ))}
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
