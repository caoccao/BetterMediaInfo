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

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import PersonIcon from '@mui/icons-material/Person';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from 'react-i18next';

import appIconUrl from '../../src-tauri/icons/icon.png';
import { APP_NAME, AUTHOR_NAME, AUTHOR_URL, GITHUB_URL } from '../lib/constants';
import { useAppStore } from '../lib/store';

const GRADIENT = 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)';

export default function About() {
  const { t } = useTranslation();
  const [propertyFilter, setPropertyFilter] = useState('');
  const [debouncedPropertyFilter, setDebouncedPropertyFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mediaInfoAbout = useAppStore((state) => state.mediaInfoAbout);
  const mediaInfoParameters = useAppStore((state) => state.mediaInfoParameters);
  const initAbout = useAppStore((state) => state.initAbout);
  const initParameters = useAppStore((state) => state.initParameters);

  useEffect(() => {
    initAbout();
    initParameters();
  }, [initAbout, initParameters]);

  // Debounce property filter
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedPropertyFilter(propertyFilter);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [propertyFilter]);

  const streams = useMemo(() => {
    return [...new Set(mediaInfoParameters.map((parameter) => parameter.stream))];
  }, [mediaInfoParameters]);

  const filteredParameters = useMemo(() => {
    const propertyFilterLowerCased = debouncedPropertyFilter ? debouncedPropertyFilter.toLowerCase() : null;
    return mediaInfoParameters.filter((parameter) => {
      let hit = true;
      if (streamFilter !== null) {
        hit = parameter.stream === streamFilter;
      }
      if (hit && propertyFilterLowerCased) {
        hit = parameter.property.toLowerCase().includes(propertyFilterLowerCased);
      }
      return hit;
    });
  }, [mediaInfoParameters, streamFilter, debouncedPropertyFilter]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedPropertyFilter, streamFilter]);

  const paginatedParameters = useMemo(() => {
    return filteredParameters.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredParameters, page, rowsPerPage]);

  const appVersion = mediaInfoAbout?.appVersion ?? '';
  const mediaInfoVersion = mediaInfoAbout?.mediaInfoVersion?.replace(/[^0-9.]+/g, '') ?? '';

  const infoCardSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 3,
    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.18)',
      borderColor: 'primary.main',
    },
  };

  const labelSx = {
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    fontWeight: 600,
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, py: 3, width: '100%' }}>
        <Stack spacing={4} sx={{ alignItems: 'center' }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                position: 'relative',
                width: 96,
                height: 96,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: -16,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(236, 72, 153, 0.15) 50%, transparent 75%)',
                  zIndex: 0,
                },
              }}
            >
              <Box
                component="img"
                src={appIconUrl}
                alt={APP_NAME}
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  width: 96,
                  height: 96,
                  filter: 'drop-shadow(0 8px 20px rgba(99, 102, 241, 0.35))',
                }}
              />
            </Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                backgroundImage: GRADIENT,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textAlign: 'center',
              }}
            >
              {APP_NAME}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              {appVersion && (
                <Chip
                  label={`v${appVersion}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                />
              )}
              {mediaInfoVersion && (
                <Chip
                  label={`${t('about.mediaInfoLib')} v${mediaInfoVersion}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('about.tagline')}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            sx={{ width: '100%', alignItems: 'stretch' }}
          >
            <Card elevation={0} sx={{ ...infoCardSx, flexShrink: 0 }}>
              <CardActionArea onClick={() => openUrl(AUTHOR_URL)} sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ background: GRADIENT, width: 48, height: 48 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      {t('about.author')}
                    </Typography>
                    <Typography variant="h6" sx={{ lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                      {AUTHOR_NAME}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>

            <Card elevation={0} sx={{ ...infoCardSx, flex: 1, minWidth: 0 }}>
              <CardActionArea onClick={() => openUrl(GITHUB_URL)} sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#24292f', width: 48, height: 48 }}>
                    <GitHubIcon sx={{ color: '#fff' }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      {t('about.github')}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {GITHUB_URL}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={streamFilter ?? ''}
            onChange={(e) => setStreamFilter(e.target.value || null)}
            displayEmpty
          >
            <MenuItem value="">{t('about.allStreams')}</MenuItem>
            {streams.map((stream) => (
              <MenuItem key={stream} value={stream}>
                {stream}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          placeholder={t('about.property')}
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 'bold' }}>
                {t('about.id')}
              </TableCell>
              <TableCell sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 'bold' }}>
                {t('about.stream')}
              </TableCell>
              <TableCell sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 'bold' }}>
                {t('about.property')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedParameters.map((parameter) => (
              <TableRow key={parameter.id}>
                <TableCell>{parameter.id}</TableCell>
                <TableCell>{parameter.stream}</TableCell>
                <TableCell>{parameter.property}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredParameters.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 15, 20]}
        size="small"
      />
    </Box>
  );
}
