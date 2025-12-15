/*
 *   Copyright (c) 2024-2025. caoccao.com Sam Cao
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
  TableSortLabel,
  Typography,
  ButtonGroup,
  CircularProgress,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import JavascriptIcon from '@mui/icons-material/Javascript';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ViewListIcon from '@mui/icons-material/ViewList';
import NotesIcon from '@mui/icons-material/Notes';
import DeleteIcon from '@mui/icons-material/Delete';
import { getMatches } from '@tauri-apps/plugin-cli';
import * as Protocol from '../lib/protocol';
import { useAppStore } from '../lib/store';
import { openDirectoryDialog, openFileDialog } from '../lib/dialog';
import { getPropertiesMap, getStreamCountMap } from '../lib/service';
import { scanFiles } from '../lib/fs';
import {
  formatStreamCount,
  transformBitRate,
  transformDefault,
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

enum ViewType {
  Card,
  List,
}

interface PropertyDefinition {
  align: 'left' | 'right' | 'center';
  format: (value: any, rowData: Record<string, string>, rowIndex: number) => string;
  header: string | null;
  inCardView: boolean;
  inListView: boolean;
  name: string;
  orderByType: OrderByType;
  virtual: boolean;
}

function createPropertyDef(
  name: string,
  format: (value: any, rowData: Record<string, string>, rowIndex: number) => string = transformDefault,
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

const COMMON_PROPERTIES_GENERAL: PropertyDefinition[] = [
  { ...createPropertyDef('CompleteName'), header: 'File Path', inListView: true },
  { ...createPropertyDef('Format'), inCardView: true, inListView: true },
  { ...createPropertyDef('FileSize', transformSize, 'Size'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  { ...createPropertyDef('Duration', transformDuration), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  { ...createPropertyDef('Time', transformTime), orderByType: OrderByType.None, align: 'right', virtual: true, inCardView: true, inListView: true },
  { ...createPropertyDef('Title'), inCardView: true, inListView: true },
  { ...createPropertyDef('Encoded_Date'), header: 'Encoded Date', inCardView: true, inListView: true },
  { ...createPropertyDef('Video:Count'), orderByType: OrderByType.Number, header: 'V', inListView: true },
  { ...createPropertyDef('Audio:Count'), orderByType: OrderByType.Number, header: 'A', inListView: true },
  { ...createPropertyDef('Text:Count'), orderByType: OrderByType.Number, header: 'T', inListView: true },
  { ...createPropertyDef('Image:Count'), orderByType: OrderByType.Number, header: 'I', inListView: true },
  { ...createPropertyDef('Menu:Count'), orderByType: OrderByType.Number, header: 'M', inListView: true },
];

const COMMON_PROPERTIES_VIDEO: PropertyDefinition[] = [
  { ...createPropertyDef('ID'), inCardView: true },
  { ...createPropertyDef('Format'), inCardView: true, inListView: true },
  { ...createPropertyDef('Language'), inCardView: true, inListView: true },
  { ...createPropertyDef('Title'), inCardView: true, inListView: true },
  { ...createPropertyDef('Resolution', transformResolution), orderByType: OrderByType.None, virtual: true, inCardView: true, inListView: true },
  { ...createPropertyDef('HDR_Format_Compatibility'), header: 'HDR', inCardView: true, inListView: true },
  { ...createPropertyDef('ScanType'), header: 'Scan Type', inCardView: true, inListView: true },
  { ...createPropertyDef('Default'), header: 'D', inCardView: true },
  { ...createPropertyDef('Forced'), header: 'F', inCardView: true },
  { ...createPropertyDef('BitDepth'), orderByType: OrderByType.Number, align: 'right', header: 'Depth', inCardView: true, inListView: true },
  { ...createPropertyDef('FrameRate', transformFPS), orderByType: OrderByType.Number, align: 'right', header: 'FPS', inCardView: true, inListView: true },
  { ...createPropertyDef('BitRate', transformBitRate, 'Bit Rate'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  { ...createPropertyDef('StreamSize', transformSize, 'Size'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  { ...createPropertyDef('Width') },
  { ...createPropertyDef('Height') },
];

const COMMON_PROPERTIES_AUDIO: PropertyDefinition[] = [
  { ...createPropertyDef('ID'), inCardView: true },
  { ...createPropertyDef('Format_Commercial'), header: 'Format', inCardView: true, inListView: true },
  { ...createPropertyDef('Language'), inCardView: true, inListView: true },
  { ...createPropertyDef('Title'), inCardView: true, inListView: true },
  { ...createPropertyDef('Channel(s)'), orderByType: OrderByType.Number, align: 'right', header: 'CH', inCardView: true, inListView: true },
  { ...createPropertyDef('BitDepth'), orderByType: OrderByType.Number, align: 'right', header: 'Depth', inCardView: true, inListView: true },
  { ...createPropertyDef('SamplingRate', transformSamplingRate, 'Sampling'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  { ...createPropertyDef('Default'), header: 'D', inCardView: true },
  { ...createPropertyDef('Forced'), header: 'F', inCardView: true },
  { ...createPropertyDef('BitRate_Mode'), header: 'Mode', inCardView: true, inListView: true },
  { ...createPropertyDef('BitRate', transformBitRate, 'Bit Rate'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  { ...createPropertyDef('StreamSize', transformSize, 'Size'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
];

const COMMON_PROPERTIES_TEXT: PropertyDefinition[] = [
  { ...createPropertyDef('ID'), inCardView: true },
  { ...createPropertyDef('Format'), inCardView: true, inListView: true },
  { ...createPropertyDef('Language'), inCardView: true, inListView: true },
  { ...createPropertyDef('Title'), inCardView: true, inListView: true },
  { ...createPropertyDef('Default'), header: 'D', inCardView: true },
  { ...createPropertyDef('Forced'), header: 'F', inCardView: true },
  { ...createPropertyDef('BitRate', transformBitRate, 'Bit Rate'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  { ...createPropertyDef('StreamSize', transformSize, 'Size'), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
];

const COMMON_PROPERTIES_MAP = new Map<Protocol.StreamKind, PropertyDefinition[]>([
  [Protocol.StreamKind.General, COMMON_PROPERTIES_GENERAL],
  [Protocol.StreamKind.Video, COMMON_PROPERTIES_VIDEO],
  [Protocol.StreamKind.Audio, COMMON_PROPERTIES_AUDIO],
  [Protocol.StreamKind.Text, COMMON_PROPERTIES_TEXT],
]);

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
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewType, setViewType] = useState<ViewType>(ViewType.Card);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const files = useAppStore((state) => state.mediaFiles);
  const mediaFileToCommonPropertyMap = useAppStore((state) => state.mediaFileToCommonPropertyMap);
  const mediaFileToStreamCountMap = useAppStore((state) => state.mediaFileToStreamCountMap);
  const setMediaFileStreamCount = useAppStore((state) => state.setMediaFileStreamCount);
  const setMediaFileCommonProperties = useAppStore((state) => state.setMediaFileCommonProperties);
  const setMediaFileAllProperties = useAppStore((state) => state.setMediaFileAllProperties);
  const deleteMediaFile = useAppStore((state) => state.deleteMediaFile);
  const addMediaDetailedFile = useAppStore((state) => state.addMediaDetailedFile);
  const setDialogJsonCode = useAppStore((state) => state.setDialogJsonCode);
  const setDialogNotification = useAppStore((state) => state.setDialogNotification);

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
        const properties = [...COMMON_PROPERTIES_MAP.entries()]
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
    getMatches()
      .then((matches) => {
        const argMatch = matches.args['fileOrDirectory'];
        if (argMatch) {
          const fileOrDirectory = argMatch.value;
          if (fileOrDirectory && typeof fileOrDirectory === 'string') {
            scanFiles([fileOrDirectory as string]);
          }
        }
      })
      .catch((error) => {
        console.warn('CLI matches not available:', error);
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

  const columnsOfListView = useMemo(() => {
    return [...COMMON_PROPERTIES_MAP.entries()]
      .flatMap(([stream, commonProperties]) =>
        commonProperties
          .filter((prop) => prop.inListView)
          .map((prop) => ({
            stream,
            property: prop,
            columnId: `${stream}:${prop.name}`,
          }))
      );
  }, []);

  const sortedDataOfListView = useMemo(() => {
    if (!sortColumn) return dataOfListView;

    const column = columnsOfListView.find((c) => c.columnId === sortColumn);
    if (!column) return dataOfListView;

    return [...dataOfListView].sort((a, b) => {
      const aVal = a[sortColumn] ?? '';
      const bVal = b[sortColumn] ?? '';

      if (column.property.orderByType === OrderByType.Number) {
        const aNum = parseFloat(aVal) || 0;
        const bNum = parseFloat(bVal) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [dataOfListView, sortColumn, sortDirection, columnsOfListView]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

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

  const buttonSx = { width: 36, height: 36 };
  const activeButtonSx = { ...buttonSx, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } };

  if (files.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2">Please select some files or a directory,</Typography>
        <Typography variant="body2">or drag and drop some files or directories here.</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          <Tooltip title="Add Files">
            <IconButton sx={buttonSx} onClick={() => openFileDialog(false)}>
              <ArticleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Folder">
            <IconButton sx={buttonSx} onClick={() => openDirectoryDialog(false)}>
              <FolderIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <ButtonGroup size="small">
          <Tooltip title="Card View">
            <IconButton
              sx={viewType === ViewType.Card ? activeButtonSx : buttonSx}
              onClick={() => setViewType(ViewType.Card)}
            >
              <ViewAgendaIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="List View">
            <IconButton
              sx={viewType === ViewType.List ? activeButtonSx : buttonSx}
              onClick={() => setViewType(ViewType.List)}
            >
              <ViewListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Box>

      <TextField
        placeholder="Filter"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size="small"
        fullWidth
      />

      {fileToPropertyMaps.size === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <img src="images/empty.gif" alt="Not Found" />
        </Box>
      ) : viewType === ViewType.Card ? (
        files.map((file) =>
          fileToPropertyMaps.has(file) ? (
            <Card key={file} variant="outlined" sx={{ mb: 1 }}>
              <CardHeader
                title={<Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{file}</Typography>}
                subheader={
                  <Typography variant="caption" color="text.secondary">
                    {formatStreamCount(mediaFileToStreamCountMap.get(file))}
                  </Typography>
                }
                action={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Json">
                      <IconButton size="small" onClick={() => openDialogJsonCode(file)}>
                        <JavascriptIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Details">
                      <IconButton size="small" onClick={() => openDetails(file)}>
                        <NotesIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => deleteMediaFile(file)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ pt: 1 }}>
                {[...COMMON_PROPERTIES_MAP.entries()].map(([stream, commonProperties]) => {
                  const streamMaps = fileToPropertyMaps.get(file)?.filter((map) => map.stream === stream);
                  if (!streamMaps || streamMaps.length === 0) return null;

                  return (
                    <TableContainer key={stream} sx={{ mb: 1 }}>
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
                                    borderColor: STREAM_KIND_COLORS[stream],
                                    fontWeight: 'bold',
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
                                  <TableCell key={prop.name} align={prop.align}>
                                    {prop.format(map.propertyMap[prop.name], map.propertyMap, idx)}
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
            <Card key={file} variant="outlined" sx={{ mb: 1, display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={20} />
            </Card>
          )
        )
      ) : (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columnsOfListView.map((col) => (
                  <TableCell
                    key={col.columnId}
                    align={col.property.align}
                    sx={{
                      bgcolor: `${STREAM_KIND_COLORS[col.stream]}20`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.property.orderByType !== OrderByType.None ? (
                      <TableSortLabel
                        active={sortColumn === col.columnId}
                        direction={sortColumn === col.columnId ? sortDirection : 'asc'}
                        onClick={() => handleSort(col.columnId)}
                      >
                        {col.property.header ?? col.property.name}
                      </TableSortLabel>
                    ) : (
                      col.property.header ?? col.property.name
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedDataOfListView.map((row, rowIdx) => (
                <TableRow key={row.file}>
                  {columnsOfListView.map((col) => (
                    <TableCell key={col.columnId} align={col.property.align} sx={{ whiteSpace: 'nowrap' }}>
                      {col.property.format(row[col.columnId], row as Record<string, string>, rowIdx)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
