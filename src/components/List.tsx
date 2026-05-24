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
  Button,
  Card,
  CardHeader,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
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
import { openUrl } from '@tauri-apps/plugin-opener';
import { DataGrid, GridColDef, GridRowsProp, useGridApiRef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import JavascriptIcon from '@mui/icons-material/Javascript';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import TransformIcon from '@mui/icons-material/Transform';
import NotesIcon from '@mui/icons-material/Notes';
import DeleteIcon from '@mui/icons-material/Delete';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonIcon from '@mui/icons-material/Person';
import ClearIcon from '@mui/icons-material/Clear';
import * as Protocol from '../lib/protocol';
import { AUTHOR_NAME, AUTHOR_URL, GITHUB_URL } from '../lib/constants';
import { useAppStore } from '../lib/store';
import { ViewType } from '../lib/types';
import { openDirectoryDialog, openFileDialog } from '../lib/dialog';
import { getLaunchArgs, getPropertiesMap, getStreamCountMap, isBatchMkvExtractFound, isBDMasterFound, isMkvtoolnixFound, isMpcHcFound, openBatchMkvExtract, openBDMaster, openMkvtoolnixGui, openMpcHc } from '../lib/service';
import { scanFiles } from '../lib/fs';
import { openExtractWindow } from '../lib/extract';
import { openMergeWindow } from '../lib/merge';
import { formatStreamCount } from '../lib/format';
import {
  buildCommonPropertiesMap,
  OrderByType,
  STREAM_KIND_COLORS,
} from '../lib/cardTables';

const BATCH_MKV_EXTRACT_URL = 'https://github.com/caoccao/BatchMkvExtract';
const BD_MASTER_URL = 'https://github.com/caoccao/BDMaster';

interface AppCardProps {
  logo: string;
  title: string;
  intro: string;
  githubUrl: string;
  isPrimary?: boolean;
}

function AppCard({ logo, title, intro, githubUrl, isPrimary }: AppCardProps) {
  const { t } = useTranslation();
  return (
    <Box
      sx={(theme) => ({
        flex: 1,
        minWidth: 260,
        p: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.35)' : 'rgba(37,99,235,0.25)',
        background: isPrimary
          ? (theme.palette.mode === 'dark'
              ? 'linear-gradient(140deg, rgba(37,99,235,0.32) 0%, rgba(14,165,233,0.18) 100%)'
              : 'linear-gradient(140deg, rgba(59,130,246,0.16) 0%, rgba(14,165,233,0.10) 100%)')
          : (theme.palette.mode === 'dark'
              ? 'linear-gradient(140deg, rgba(30,58,138,0.28) 0%, rgba(15,23,42,0.40) 100%)'
              : 'linear-gradient(140deg, rgba(219,234,254,0.85) 0%, rgba(241,245,249,0.85) 100%)'),
        boxShadow: theme.palette.mode === 'dark'
          ? '0 10px 30px rgba(2,6,23,0.45)'
          : '0 10px 30px rgba(37,99,235,0.10)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 14px 36px rgba(2,6,23,0.55)'
            : '0 14px 36px rgba(37,99,235,0.18)',
        },
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          component="img"
          src={logo}
          alt={title}
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            objectFit: 'contain',
            backgroundColor: 'rgba(255,255,255,0.6)',
            p: 0.5,
            boxShadow: '0 4px 12px rgba(15,23,42,0.12)',
          }}
        />
        <Typography
          variant="h6"
          sx={(theme) => ({
            fontWeight: 700,
            color: theme.palette.mode === 'dark' ? '#bfdbfe' : '#1d4ed8',
          })}
        >
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {intro}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Box>
        <Button
          size="small"
          startIcon={<GitHubIcon />}
          onClick={() => openUrl(githubUrl)}
          sx={(theme) => ({
            textTransform: 'none',
            color: theme.palette.mode === 'dark' ? '#93c5fd' : '#1d4ed8',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(59,130,246,0.16)'
                : 'rgba(37,99,235,0.08)',
            },
          })}
        >
          {t('list.viewOnGithub')}
        </Button>
      </Box>
    </Box>
  );
}

function EmptyWelcome() {
  const { t } = useTranslation();
  return (
    <Box
      sx={(theme) => ({
        flex: 1,
        minHeight: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        py: 4,
        px: 2,
        background: theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 20% 0%, rgba(30,64,175,0.20), transparent 60%), radial-gradient(circle at 80% 100%, rgba(14,165,233,0.16), transparent 55%)'
          : 'radial-gradient(circle at 20% 0%, rgba(191,219,254,0.55), transparent 60%), radial-gradient(circle at 80% 100%, rgba(186,230,253,0.45), transparent 55%)',
        borderRadius: 2,
        overflow: 'auto',
      })}
    >
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 880 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={(theme) => ({
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(90deg, #60a5fa 0%, #38bdf8 100%)'
                : 'linear-gradient(90deg, #1d4ed8 0%, #0284c7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            })}
          >
            {t('list.welcomeTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('list.welcomeSubtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <AppCard
            logo="images/bettermediainfo.png"
            title="BetterMediaInfo"
            intro={t('list.introBetterMediaInfo')}
            githubUrl={GITHUB_URL}
            isPrimary
          />
          <AppCard
            logo="images/batchmkvextract.png"
            title="BatchMkvExtract"
            intro={t('list.introBatchMkvExtract')}
            githubUrl={BATCH_MKV_EXTRACT_URL}
          />
          <AppCard
            logo="images/bdmaster.png"
            title="BDMaster"
            intro={t('list.introBDMaster')}
            githubUrl={BD_MASTER_URL}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<ArticleIcon />}
            onClick={() => openFileDialog(false)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              backgroundColor: '#2563eb',
              boxShadow: '0 6px 16px rgba(37,99,235,0.32)',
              '&:hover': { backgroundColor: '#1d4ed8' },
            }}
          >
            {t('list.addFiles')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={() => openDirectoryDialog(false)}
            sx={(theme) => ({
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              borderColor: theme.palette.mode === 'dark' ? '#60a5fa' : '#2563eb',
              color: theme.palette.mode === 'dark' ? '#93c5fd' : '#1d4ed8',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' ? '#93c5fd' : '#1d4ed8',
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(59,130,246,0.12)'
                  : 'rgba(37,99,235,0.06)',
              },
            })}
          >
            {t('list.addFolder')}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {t('list.emptyHint')}
        </Typography>

        <Box
          sx={(theme) => ({
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            pt: 1,
            borderTop: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.20)' : 'rgba(148,163,184,0.30)',
          })}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {t('about.author')}:
            </Typography>
            <Link
              component="button"
              onClick={() => openUrl(AUTHOR_URL)}
              underline="hover"
              sx={(theme) => ({
                fontSize: '0.75rem',
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? '#93c5fd' : '#1d4ed8',
              })}
            >
              {AUTHOR_NAME}
            </Link>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <GitHubIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Link
              component="button"
              onClick={() => openUrl(GITHUB_URL)}
              underline="hover"
              sx={(theme) => ({
                fontSize: '0.75rem',
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? '#93c5fd' : '#1d4ed8',
              })}
            >
              {GITHUB_URL.replace('https://', '')}
            </Link>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

export default function List() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [batchMkvExtractAvailable, setBatchMkvExtractAvailable] = useState(false);
  const [bdMasterAvailable, setBdMasterAvailable] = useState(false);
  const [mkvtoolnixGuiAvailable, setMkvtoolnixGuiAvailable] = useState(false);
  const [mpcHcAvailable, setMpcHcAvailable] = useState(false);
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
  const setSelectedDetailFile = useAppStore((state) => state.setSelectedDetailFile);
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

  // Track whether BatchMkvExtract is reachable so the per-card icon can show.
  useEffect(() => {
    const path = config?.batchMkvExtract?.path?.trim() ?? '';
    if (!path) {
      setBatchMkvExtractAvailable(false);
      return;
    }
    let cancelled = false;
    isBatchMkvExtractFound(path)
      .then((status) => {
        if (!cancelled) setBatchMkvExtractAvailable(status.found);
      })
      .catch(() => {
        if (!cancelled) setBatchMkvExtractAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config?.batchMkvExtract?.path]);

  // Track whether BDMaster is reachable so the per-card icon can show.
  useEffect(() => {
    const path = config?.bdMaster?.path?.trim() ?? '';
    if (!path) {
      setBdMasterAvailable(false);
      return;
    }
    let cancelled = false;
    isBDMasterFound(path)
      .then((status) => {
        if (!cancelled) setBdMasterAvailable(status.found);
      })
      .catch(() => {
        if (!cancelled) setBdMasterAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config?.bdMaster?.path]);

  // Track whether MkvToolNix GUI is reachable so the per-card icon can show.
  useEffect(() => {
    const path = config?.mkv?.mkvToolNixPath?.trim() ?? '';
    if (!path) {
      setMkvtoolnixGuiAvailable(false);
      return;
    }
    let cancelled = false;
    isMkvtoolnixFound(path)
      .then((status) => {
        if (!cancelled) setMkvtoolnixGuiAvailable(status.found);
      })
      .catch(() => {
        if (!cancelled) setMkvtoolnixGuiAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config?.mkv?.mkvToolNixPath]);

  // Track whether MPC HC is reachable so the per-card icon can show.
  useEffect(() => {
    const path = config?.mpcHc?.path?.trim() ?? '';
    if (!path) {
      setMpcHcAvailable(false);
      return;
    }
    let cancelled = false;
    isMpcHcFound(path)
      .then((status) => {
        if (!cancelled) setMpcHcAvailable(status.found);
      })
      .catch(() => {
        if (!cancelled) setMpcHcAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config?.mpcHc?.path]);

  const videoExtensionSet = useMemo(() => {
    const exts = config?.fileExtensions?.video ?? [];
    return new Set(exts.map((ext) => ext.toLowerCase().replace(/^\./, '')));
  }, [config?.fileExtensions?.video]);

  const isVideoFile = useCallback(
    (file: string) => {
      const dot = file.lastIndexOf('.');
      if (dot < 0) return false;
      return videoExtensionSet.has(file.slice(dot + 1).toLowerCase());
    },
    [videoExtensionSet]
  );

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
      setSelectedDetailFile(file);
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
    [addMediaDetailedFile, setSelectedDetailFile, setMediaFileAllProperties, setDialogNotification]
  );

  const handleOpenBatchMkvExtract = useCallback(
    async (file: string) => {
      try {
        await openBatchMkvExtract(file);
      } catch (error) {
        setDialogNotification({
          title: error as string,
          type: Protocol.DialogNotificationType.Error,
        });
      }
    },
    [setDialogNotification]
  );

  const handleOpenBDMaster = useCallback(
    async (file: string) => {
      try {
        await openBDMaster(file);
      } catch (error) {
        setDialogNotification({
          title: error as string,
          type: Protocol.DialogNotificationType.Error,
        });
      }
    },
    [setDialogNotification]
  );

  const handleOpenMkvtoolnixGui = useCallback(
    async (file: string) => {
      try {
        await openMkvtoolnixGui(file);
      } catch (error) {
        setDialogNotification({
          title: error as string,
          type: Protocol.DialogNotificationType.Error,
        });
      }
    },
    [setDialogNotification]
  );

  const handleOpenMpcHc = useCallback(
    async (file: string) => {
      try {
        await openMpcHc(file);
      } catch (error) {
        setDialogNotification({
          title: error as string,
          type: Protocol.DialogNotificationType.Error,
        });
      }
    },
    [setDialogNotification]
  );

  if (files.length === 0) {
    return <EmptyWelcome />;
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
        slotProps={{
          input: {
            endAdornment: query ? (
              <InputAdornment position="end">
                <Tooltip title={t('list.clear')}>
                  <IconButton
                    size="small"
                    aria-label={t('list.clear')}
                    onClick={() => setQuery('')}
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

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {fileToPropertyMaps.size === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <img src="images/bettermediainfo.png" alt={t('list.altNotMediaFiles')} />
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
                action={(() => {
                  const isMkv = file.toLowerCase().endsWith('.mkv');
                  const isIso = file.toLowerCase().endsWith('.iso');
                  const showExtract = isMkv;
                  const videoTrackCount = mediaFileToStreamCountMap.get(file)?.get(Protocol.StreamKind.Video)?.count ?? 0;
                  const showMerge = mkvtoolnixGuiAvailable && videoTrackCount > 0;
                  const showBatchMkvExtract = isMkv && batchMkvExtractAvailable;
                  const showBDMaster = isIso && bdMasterAvailable;
                  const showMkvToolNixGui = isVideoFile(file) && mkvtoolnixGuiAvailable;
                  const showMpcHc = isVideoFile(file) && mpcHcAvailable;
                  const externalToolCount =
                    (showBatchMkvExtract ? 1 : 0) +
                    (showBDMaster ? 1 : 0) +
                    (showMkvToolNixGui ? 1 : 0) +
                    (showMpcHc ? 1 : 0);
                  const internalToolCount =
                    (showMerge ? 1 : 0) +
                    (showExtract ? 1 : 0);
                  return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {showBDMaster && (
                      <Tooltip title={t('list.openInBDMaster')}>
                        <IconButton size="small" onClick={() => handleOpenBDMaster(file)}>
                          <Box
                            component="img"
                            src="images/bdmaster.png"
                            alt="BDMaster"
                            sx={{ width: 18, height: 18, objectFit: 'contain' }}
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                    {showBatchMkvExtract && (
                      <Tooltip title={t('list.openInBatchMkvExtract')}>
                        <IconButton size="small" onClick={() => handleOpenBatchMkvExtract(file)}>
                          <Box
                            component="img"
                            src="images/batchmkvextract.png"
                            alt="BatchMkvExtract"
                            sx={{ width: 18, height: 18, objectFit: 'contain' }}
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                    {showMkvToolNixGui && (
                      <Tooltip title={t('list.openInMkvToolNixGui')}>
                        <IconButton size="small" onClick={() => handleOpenMkvtoolnixGui(file)}>
                          <Box
                            component="img"
                            src="images/mkvmerge.png"
                            alt="MkvToolNix GUI"
                            sx={{ width: 18, height: 18, objectFit: 'contain' }}
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                    {showMpcHc && (
                      <Tooltip title={t('list.openInMpcHc')}>
                        <IconButton size="small" onClick={() => handleOpenMpcHc(file)}>
                          <Box
                            component="img"
                            src="images/mpchc64.png"
                            alt="MPC HC"
                            sx={{ width: 18, height: 18, objectFit: 'contain' }}
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                    {externalToolCount > 0 && (
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    )}
                    {showMerge && (
                      <Tooltip title={t('list.merge')}>
                        <IconButton size="small" onClick={() => openMergeWindow(file)}>
                          <TransformIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {showExtract && (
                      <Tooltip title={t('list.extract')}>
                        <IconButton size="small" onClick={() => openExtractWindow(file)}>
                          <ContentCutIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {internalToolCount > 0 && (
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    )}
                    <Tooltip title={t('list.json')}>
                      <IconButton size="small" onClick={() => openDialogJsonCode(file)}>
                        <JavascriptIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('list.details')}>
                      <IconButton size="small" onClick={() => openDetails(file)}>
                        <NotesIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <Tooltip title={t('list.delete')}>
                      <IconButton size="small" color="error" onClick={() => deleteMediaFile(file)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  );
                })()}
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ py: 0, '&.MuiCardContent-root:last-child': { pb: 2 } }}>
                {[...commonPropertiesMap.entries()].map(([stream, commonProperties]) => {
                  const streamMaps = fileToPropertyMaps.get(file)?.filter((map) => map.stream === stream);
                  if (!streamMaps || streamMaps.length === 0) return null;
                  const cardCfg = config?.view?.card;
                  if (stream === Protocol.StreamKind.General && cardCfg?.showGeneral === false) return null;
                  if (stream === Protocol.StreamKind.Video && cardCfg?.showVideo === false) return null;
                  if (stream === Protocol.StreamKind.Audio && cardCfg?.showAudio === false) return null;
                  if (stream === Protocol.StreamKind.Text && cardCfg?.showSubtitle === false) return null;
                  if (stream === Protocol.StreamKind.Image && cardCfg?.showImage === false) return null;
                  if (stream === Protocol.StreamKind.Menu && cardCfg?.showMenu === false) return null;

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
                                      whiteSpace: 'pre-line',
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
