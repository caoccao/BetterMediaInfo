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

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Tooltip,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp, useGridApiRef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import JavascriptIcon from '@mui/icons-material/Javascript';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import NotesIcon from '@mui/icons-material/Notes';
import DeleteIcon from '@mui/icons-material/Delete';
import * as Protocol from '../lib/protocol';
import { useAppStore } from '../lib/store';
import { ViewType } from '../lib/types';
import { openDirectoryDialog, openFileDialog } from '../lib/dialog';
import { getLaunchArgs, getPropertiesMap, getStreamCountMap } from '../lib/service';
import { scanFiles } from '../lib/fs';
import { openExtractWindow } from '../lib/extract';
import {
  formatStreamCount,
  transformBitRate,
  transformDefault,
  transformDolbyVision,
  transformDuration,
  transformFPS,
  transformResolution,
  transformSamplingRate,
  transformSize,
  transformTime,
} from '../lib/format';

enum OrderByType {
  None,
  Number,
  String,
}

interface PropertyDefinition {
  align: 'left' | 'right' | 'center';
  format: (value: any, rowData: Record<string, string>) => string;
  header: string | null;
  inCardView: boolean;
  inListView: boolean;
  name: string;
  orderByType: OrderByType;
  virtual: boolean;
}

function createPropertyDef(
  name: string,
  format: (value: any, rowData: Record<string, string>) => string = transformDefault,
  header: string | null = null
): PropertyDefinition {
  return {
    align: 'left',
    format,
    header,
    inCardView: false,
    inListView: false,
    name,
    orderByType: OrderByType.String,
    virtual: false,
  };
}

type Formatter = (value: any, rowData: Record<string, string>) => string;

function createBitRateFormatter(streamFormat: Protocol.ConfigStreamFormat | undefined): Formatter {
  return (value, _rowData) => {
    const precision = streamFormat?.bitRate?.precision ?? Protocol.FormatPrecision.Two;
    const unit = streamFormat?.bitRate?.unit ?? Protocol.FormatUnit.KMGT;
    return transformBitRate(value, precision, unit);
  };
}

function createSizeFormatter(streamFormat: Protocol.ConfigStreamFormat | undefined): Formatter {
  return (value, _rowData) => {
    const precision = streamFormat?.size?.precision ?? Protocol.FormatPrecision.Two;
    const unit = streamFormat?.size?.unit ?? Protocol.FormatUnit.KMGT;
    return transformSize(value, precision, unit);
  };
}

function buildCommonPropertiesMap(
  config: Protocol.Config | null,
  t: TFunction,
): Map<Protocol.StreamKind, PropertyDefinition[]> {
  const videoBitRateFormatter = createBitRateFormatter(config?.video);
  const videoSizeFormatter = createSizeFormatter(config?.video);
  const audioBitRateFormatter = createBitRateFormatter(config?.audio);
  const audioSizeFormatter = createSizeFormatter(config?.audio);
  const subtitleBitRateFormatter = createBitRateFormatter(config?.subtitle);
  const subtitleSizeFormatter = createSizeFormatter(config?.subtitle);
  // General uses video format settings for file size
  const general: PropertyDefinition[] = [
    { ...createPropertyDef('CompleteName'), header: t('list.header.filePath'), inListView: true },
    { ...createPropertyDef('Format'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('FileSize', videoSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Duration', transformDuration, t('list.header.duration')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Time', transformTime, t('list.header.time')), orderByType: OrderByType.None, align: 'right', virtual: true, inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Encoded_Date'), header: t('list.header.encodedDate'), inCardView: true, inListView: true },
    { ...createPropertyDef('Video:Count'), orderByType: OrderByType.Number, header: t('list.header.videoCount'), inListView: true },
    { ...createPropertyDef('Audio:Count'), orderByType: OrderByType.Number, header: t('list.header.audioCount'), inListView: true },
    { ...createPropertyDef('Text:Count'), orderByType: OrderByType.Number, header: t('list.header.textCount'), inListView: true },
    { ...createPropertyDef('Image:Count'), orderByType: OrderByType.Number, header: t('list.header.imageCount'), inListView: true },
    { ...createPropertyDef('Menu:Count'), orderByType: OrderByType.Number, header: t('list.header.menuCount'), inListView: true },
  ];

  const video: PropertyDefinition[] = [
    { ...createPropertyDef('ID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Format'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('Language'), header: t('list.header.language'), inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Resolution', transformResolution, t('list.header.resolution')), orderByType: OrderByType.None, virtual: true, inCardView: true, inListView: true },
    { ...createPropertyDef('HDR_Format_Compatibility'), header: t('list.header.hdr'), inCardView: true, inListView: true },
    { ...createPropertyDef('HDR_Format', transformDolbyVision, t('list.header.dv')), inCardView: true, inListView: true },
    { ...createPropertyDef('ScanType'), header: t('list.header.scanType'), inCardView: true, inListView: true },
    { ...createPropertyDef('Default'), header: t('list.header.default'), inCardView: true },
    { ...createPropertyDef('Forced'), header: t('list.header.forced'), inCardView: true },
    { ...createPropertyDef('BitDepth'), orderByType: OrderByType.Number, align: 'right', header: t('list.header.depth'), inCardView: true, inListView: true },
    { ...createPropertyDef('FrameRate', transformFPS, t('list.header.fps')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('BitRate', videoBitRateFormatter, t('list.header.bitRate')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('StreamSize', videoSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Width') },
    { ...createPropertyDef('Height') },
  ];

  const audio: PropertyDefinition[] = [
    { ...createPropertyDef('ID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Format_Commercial'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('Language'), header: t('list.header.language'), inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Channel(s)'), orderByType: OrderByType.Number, align: 'right', header: t('list.header.channels'), inCardView: true, inListView: true },
    { ...createPropertyDef('BitDepth'), orderByType: OrderByType.Number, align: 'right', header: t('list.header.depth'), inCardView: true, inListView: true },
    { ...createPropertyDef('SamplingRate', transformSamplingRate, t('list.header.sampling')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Default'), header: t('list.header.default'), inCardView: true },
    { ...createPropertyDef('Forced'), header: t('list.header.forced'), inCardView: true },
    { ...createPropertyDef('BitRate_Mode'), header: t('list.header.mode'), inCardView: true, inListView: true },
    { ...createPropertyDef('BitRate', audioBitRateFormatter, t('list.header.bitRate')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('StreamSize', audioSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  ];

  const text: PropertyDefinition[] = [
    { ...createPropertyDef('ID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Format'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('Language'), header: t('list.header.language'), inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Default'), header: t('list.header.default'), inCardView: true },
    { ...createPropertyDef('Forced'), header: t('list.header.forced'), inCardView: true },
    { ...createPropertyDef('BitRate', subtitleBitRateFormatter, t('list.header.bitRate')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('StreamSize', subtitleSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  ];

  return new Map<Protocol.StreamKind, PropertyDefinition[]>([
    [Protocol.StreamKind.General, general],
    [Protocol.StreamKind.Video, video],
    [Protocol.StreamKind.Audio, audio],
    [Protocol.StreamKind.Text, text],
  ]);
}

const STREAM_KIND_COLORS: Record<Protocol.StreamKind, string> = {
  [Protocol.StreamKind.General]: '#84cc16',
  [Protocol.StreamKind.Video]: '#f97316',
  [Protocol.StreamKind.Audio]: '#f59e0b',
  [Protocol.StreamKind.Text]: '#10b981',
  [Protocol.StreamKind.Other]: '#a3a3a3',
  [Protocol.StreamKind.Image]: '#0ea5e9',
  [Protocol.StreamKind.Menu]: '#6366f1',
  [Protocol.StreamKind.Max]: '#84cc16',
};

export default function List() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autosizeDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const apiRef = useGridApiRef();

  const config = useAppStore((state) => state.config);
  const files = useAppStore((state) => state.mediaFiles);
  const viewType = useAppStore((state) => state.viewType);
  const mediaFileToCommonPropertyMap = useAppStore((state) => state.mediaFileToCommonPropertyMap);
  const mediaFileToStreamCountMap = useAppStore((state) => state.mediaFileToStreamCountMap);
  const setMediaFileStreamCount = useAppStore((state) => state.setMediaFileStreamCount);
  const setMediaFileCommonProperties = useAppStore((state) => state.setMediaFileCommonProperties);
  const setMediaFileAllProperties = useAppStore((state) => state.setMediaFileAllProperties);
  const deleteMediaFile = useAppStore((state) => state.deleteMediaFile);
  const addMediaDetailedFile = useAppStore((state) => state.addMediaDetailedFile);
  const setDialogJsonCode = useAppStore((state) => state.setDialogJsonCode);
  const setDialogNotification = useAppStore((state) => state.setDialogNotification);

  const commonPropertiesMap = useMemo(
    () => buildCommonPropertiesMap(config, t),
    [config, t]
  );

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Load file properties on mount and file changes
  useEffect(() => {
    const loadFileProperties = async (file: string) => {
      // Get stream count first
      let streamCountMap: Map<Protocol.StreamKind, Protocol.StreamCount>;
      const existingStreamCount = mediaFileToStreamCountMap.get(file);
      
      if (existingStreamCount) {
        streamCountMap = existingStreamCount;
      } else {
        try {
          streamCountMap = await getStreamCountMap(file);
          setMediaFileStreamCount(file, streamCountMap);
        } catch (error) {
          setDialogNotification({
            title: error as string,
            type: Protocol.DialogNotificationType.Error,
          });
          return;
        }
      }

      // Get common properties if not loaded
      if (!mediaFileToCommonPropertyMap.has(file)) {
        const properties = [...commonPropertiesMap.entries()]
          .filter(([stream]) => (streamCountMap.get(stream)?.count ?? 0) > 0)
          .flatMap(([stream, propertyFormats]) =>
            propertyFormats
              .filter((prop) => !prop.virtual)
              .map((prop) => ({ stream, property: prop.name }))
          );

        if (properties.length > 0) {
          try {
            const commonPropertyMap = await getPropertiesMap(file, properties);
            setMediaFileCommonProperties(file, commonPropertyMap);
          } catch (error) {
            setDialogNotification({
              title: error as string,
              type: Protocol.DialogNotificationType.Error,
            });
          }
        }
      }
    };

    files.forEach(loadFileProperties);
  }, [files, mediaFileToStreamCountMap, mediaFileToCommonPropertyMap, setMediaFileStreamCount, setMediaFileCommonProperties, setDialogNotification]);

  // Load CLI arguments
  useEffect(() => {
    getLaunchArgs()
      .then((args) => {
        if (args.length > 0) {
          scanFiles(args);
        }
      })
      .catch((error) => {
        console.warn('CLI args not available:', error);
      });
  }, []);

  const fileToPropertyMaps = useMemo(() => {
    const fileMap = new Map<string, Array<Protocol.StreamPropertyMap>>();
    files
      .filter((file) => mediaFileToStreamCountMap.has(file) && mediaFileToCommonPropertyMap.has(file))
      .forEach((file) => {
        const maps = mediaFileToCommonPropertyMap.get(file) as Array<Protocol.StreamPropertyMap>;
        let hit = false;
        if (debouncedQuery && debouncedQuery.length > 0) {
          const lowerCasedQuery = debouncedQuery.toLowerCase();
          for (const map of maps) {
            for (const value of Object.values(map.propertyMap)) {
              if (value.toLowerCase().includes(lowerCasedQuery)) {
                hit = true;
                break;
              }
            }
          }
        } else {
          hit = true;
        }
        if (hit) {
          fileMap.set(file, maps);
        }
      });
    return fileMap;
  }, [files, debouncedQuery, mediaFileToStreamCountMap, mediaFileToCommonPropertyMap]);

  const dataOfListView = useMemo((): Array<Record<string, string>> => {
    return [...fileToPropertyMaps.entries()].map(([file, propertyMaps]) => {
      const newPropertyMap: Record<string, string> = propertyMaps
        .filter((map) => map.num === 0)
        .map((map) => {
          const newProperty: Record<string, string> = {};
          Object.entries(map.propertyMap).forEach(([property, value]) => {
            newProperty[`${map.stream}:${property}`] = value;
          });
          return newProperty;
        })
        .reduce((acc, cur) => ({ ...acc, ...cur }), {} as Record<string, string>);

      mediaFileToStreamCountMap.get(file)?.forEach((streamCount, stream) => {
        newPropertyMap[`General:${stream}:Count`] = streamCount.count.toString();
      });

      return { file, ...newPropertyMap };
    });
  }, [fileToPropertyMaps, mediaFileToStreamCountMap]);

  const columnsOfDataGrid = useMemo((): GridColDef[] => {
    return [...commonPropertiesMap.entries()]
      .flatMap(([stream, commonProperties]) =>
        commonProperties
          .filter((prop) => prop.inListView)
          .map((prop): GridColDef => ({
            field: `${stream}:${prop.name}`,
            headerName: prop.header ?? prop.name,
            align: prop.align,
            headerAlign: 'center',
            flex: prop.name === 'CompleteName' ? 1 : undefined,
            minWidth: 10,
            sortable: prop.orderByType !== OrderByType.None,
            type: prop.orderByType === OrderByType.Number ? 'number' : 'string',
            valueGetter: (value: any) => value ?? '',
            valueFormatter: (value: any, row: any) => prop.format(value, row),
            headerClassName: `header-${stream}`,
          }))
      );
  }, [commonPropertiesMap]);

  const rowsOfDataGrid = useMemo((): GridRowsProp => {
    return dataOfListView.map((row) => ({
      id: row.file,
      ...row,
    }));
  }, [dataOfListView]);

  // Filter rows based on debounced query (searches across all columns)
  const filteredRows = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length === 0) {
      return rowsOfDataGrid;
    }
    const lowerCasedQuery = debouncedQuery.toLowerCase();
    return rowsOfDataGrid.filter((row) => {
      return Object.values(row).some((value) => {
        if (value && typeof value === 'string') {
          return value.toLowerCase().includes(lowerCasedQuery);
        }
        return false;
      });
    });
  }, [rowsOfDataGrid, debouncedQuery]);

  // Trigger auto-sizing when filtered rows change
  useEffect(() => {
    if (apiRef.current && filteredRows.length > 0) {
      if (autosizeDebounceRef.current) {
        clearTimeout(autosizeDebounceRef.current);
      }
      autosizeDebounceRef.current = setTimeout(() => {
        if (apiRef.current) {
          apiRef.current.autosizeColumns({
            includeHeaders: true,
            includeOutliers: true,
          });
        }
      }, 200);
    }
    return () => {
      if (autosizeDebounceRef.current) {
        clearTimeout(autosizeDebounceRef.current);
      }
    };
  }, [filteredRows, apiRef]);

  const openDialogJsonCode = useCallback(
    (file: string) => {
      setDialogJsonCode({
        title: `${file} (Common Properties)`,
        jsonCode: mediaFileToCommonPropertyMap.get(file) ?? null,
      });
    },
    [setDialogJsonCode, mediaFileToCommonPropertyMap]
  );

  const openDetails = useCallback(
    async (file: string) => {
      addMediaDetailedFile(file);
      const existingProps = useAppStore.getState().mediaFileToAllPropertiesMap.get(file);
      if (!existingProps) {
        try {
          const value = await getPropertiesMap(file, null);
          setMediaFileAllProperties(file, value);
        } catch (error) {
          setDialogNotification({
            title: error as string,
            type: Protocol.DialogNotificationType.Error,
          });
        }
      }
    },
    [addMediaDetailedFile, setMediaFileAllProperties, setDialogNotification]
  );

  const buttonSx = { width: 36, height: 36, borderRadius: 1 };

  if (files.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2">{t('list.emptyLine1')}</Typography>
        <Typography variant="body2">{t('list.emptyLine2')}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          <Tooltip title={t('list.addFiles')}>
            <IconButton sx={buttonSx} onClick={() => openFileDialog(false)}>
              <ArticleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('list.addFolder')}>
            <IconButton sx={buttonSx} onClick={() => openDirectoryDialog(false)}>
              <FolderIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1 }}>
      <TextField
        placeholder={t('list.filter')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size="small"
        fullWidth
        sx={{ flexShrink: 0 }}
      />

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {fileToPropertyMaps.size === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <img src="images/empty.png" alt={t('list.altNotMediaFiles')} />
        </Box>
      ) : viewType === ViewType.Card ? (
        files.map((file) =>
          fileToPropertyMaps.has(file) ? (
            <Card key={file} variant="outlined" sx={{ mt: 1 }}>
              <CardHeader
                title={<Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{file}</Typography>}
                subheader={
                  <Typography variant="caption" color="text.secondary">
                    {formatStreamCount(mediaFileToStreamCountMap.get(file))}
                  </Typography>
                }
                action={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={t('list.json')}>
                      <IconButton size="small" onClick={() => openDialogJsonCode(file)}>
                        <JavascriptIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {file.toLowerCase().endsWith('.mkv') && (
                      <Tooltip title={t('list.extract')}>
                        <IconButton size="small" onClick={() => openExtractWindow(file)}>
                          <ContentCutIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={t('list.details')}>
                      <IconButton size="small" onClick={() => openDetails(file)}>
                        <NotesIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('list.delete')}>
                      <IconButton size="small" color="error" onClick={() => deleteMediaFile(file)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ py: 0, '&.MuiCardContent-root:last-child': { pb: 2 } }}>
                {[...commonPropertiesMap.entries()].map(([stream, commonProperties]) => {
                  const streamMaps = fileToPropertyMaps.get(file)?.filter((map) => map.stream === stream);
                  if (!streamMaps || streamMaps.length === 0) return null;

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
                          {streamMaps.map((map, idx) => (
                            <TableRow key={idx}>
                              {commonProperties
                                .filter((prop) => prop.inCardView)
                                .map((prop) => (
                                  <TableCell 
                                    key={prop.name} 
                                    align={prop.align}
                                    sx={{
                                      borderTop: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                      borderBottom: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                      borderLeft: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                      borderRight: `1px solid ${STREAM_KIND_COLORS[stream]}`,
                                    }}
                                  >
                                    {prop.format(map.propertyMap[prop.name], map.propertyMap)}
                                  </TableCell>
                                ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card key={file} variant="outlined" sx={{ mt: 1, display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={20} />
            </Card>
          )
        )
      ) : (
        <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'auto' }}>
          <DataGrid
            apiRef={apiRef}
            rows={filteredRows}
            columns={columnsOfDataGrid}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autosizeOnMount
            autosizeOptions={{
              includeHeaders: true,
              includeOutliers: true,
            }}
            autoHeight
            sx={{
              width: '100%',
              maxWidth: '100%',
              '& .MuiDataGrid-columnHeader': {
                padding: 0,
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontSize: '0.875rem',
                fontWeight: 600,
              },
              '& .MuiDataGrid-cell': {
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                py: 0.5,
              },
              '& .MuiDataGrid-columnHeaders': {
                minHeight: '36px !important',
                maxHeight: '36px !important',
              },
              '& .MuiDataGrid-row': {
                minHeight: '32px !important',
              },
              '& .MuiDataGrid-virtualScroller': {
                maxWidth: '100%',
              },
              [`& .header-${Protocol.StreamKind.General}`]: {
                bgcolor: `${STREAM_KIND_COLORS[Protocol.StreamKind.General]}20`,
              },
              [`& .header-${Protocol.StreamKind.Video}`]: {
                bgcolor: `${STREAM_KIND_COLORS[Protocol.StreamKind.Video]}20`,
              },
              [`& .header-${Protocol.StreamKind.Audio}`]: {
                bgcolor: `${STREAM_KIND_COLORS[Protocol.StreamKind.Audio]}20`,
              },
              [`& .header-${Protocol.StreamKind.Text}`]: {
                bgcolor: `${STREAM_KIND_COLORS[Protocol.StreamKind.Text]}20`,
              },
              [`& .header-${Protocol.StreamKind.Image}`]: {
                bgcolor: `${STREAM_KIND_COLORS[Protocol.StreamKind.Image]}20`,
              },
              [`& .header-${Protocol.StreamKind.Menu}`]: {
                bgcolor: `${STREAM_KIND_COLORS[Protocol.StreamKind.Menu]}20`,
              },
            }}
          />
        </Box>
      )}
      </Box>
    </Box>
  );
}
