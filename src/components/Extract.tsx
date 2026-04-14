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

import { useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ImageIcon from '@mui/icons-material/Image';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SmartButtonIcon from '@mui/icons-material/SmartButton';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useTranslation } from 'react-i18next';
import * as Protocol from '../lib/protocol';

function TrackTypeIcon({ type }: { type: string }) {
  const sx = { fontSize: 18 };
  switch (type) {
    case 'video':
      return <Tooltip title="video"><VideocamIcon sx={sx} /></Tooltip>;
    case 'audio':
      return <Tooltip title="audio"><MusicNoteIcon sx={sx} /></Tooltip>;
    case 'subtitles':
      return <Tooltip title="subtitles"><ClosedCaptionIcon sx={sx} /></Tooltip>;
    case 'buttons':
      return <Tooltip title="buttons"><SmartButtonIcon sx={sx} /></Tooltip>;
    case 'images':
      return <Tooltip title="images"><ImageIcon sx={sx} /></Tooltip>;
    default:
      return <Tooltip title={type}><HelpOutlineIcon sx={sx} /></Tooltip>;
  }
}
import { getMkvTracks } from '../lib/service';

interface ExtractProps {
  file: string;
}

function Extract({ file }: ExtractProps) {
  const { t } = useTranslation();
  const [tracks, setTracks] = useState<Protocol.MkvTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMkvTracks(file)
      .then((result) => {
        setTracks(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [file]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {file}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : tracks.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No tracks found.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('extract.header.id')}</TableCell>
                  <TableCell>{t('extract.header.number')}</TableCell>
                  <TableCell>{t('extract.header.type')}</TableCell>
                  <TableCell>{t('extract.header.codec')}</TableCell>
                  <TableCell>{t('extract.header.trackName')}</TableCell>
                  <TableCell>{t('extract.header.language')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tracks.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell>{track.id}</TableCell>
                    <TableCell>{track.number}</TableCell>
                    <TableCell><TrackTypeIcon type={track.type} /></TableCell>
                    <TableCell>{track.codec}</TableCell>
                    <TableCell>{track.trackName}</TableCell>
                    <TableCell>{track.language}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}

export default Extract;
