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

import { useEffect, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ImageIcon from '@mui/icons-material/Image';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SmartButtonIcon from '@mui/icons-material/SmartButton';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { basename, dirname, extname, join, sep as getSep } from '@tauri-apps/api/path';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import * as Protocol from '../lib/protocol';
import { getMkvTracks, runMkvextract, cancelMkvextract } from '../lib/service';

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

function getTrackExtension(codecId: string, trackType: string): string {
  // Video codecs
  if (codecId.startsWith('V_')) {
    switch (codecId) {
      case 'V_MPEGH/ISO/HEVC': return 'h265';
      case 'V_MPEG4/ISO/AVC': return 'h264';
      case 'V_MPEG1': return 'mpg';
      case 'V_MPEG2': return 'mpg';
      case 'V_MPEG4/ISO/SP':
      case 'V_MPEG4/ISO/ASP':
      case 'V_MPEG4/ISO/AP':
      case 'V_MPEG4/MS/V3': return 'mpeg4';
      case 'V_MS/VFW/FOURCC': return 'avi';
      case 'V_VP8': return 'ivf';
      case 'V_VP9': return 'ivf';
      case 'V_AV1': return 'ivf';
      case 'V_THEORA': return 'ogg';
      case 'V_PRORES': return 'prores';
      case 'V_FFV1': return 'ffv1';
    }
    if (codecId.startsWith('V_REAL/')) return 'rm';
    return 'bin';
  }

  // Audio codecs
  if (codecId.startsWith('A_')) {
    if (codecId === 'A_AC3' || codecId === 'A_AC3/BSID9' || codecId === 'A_AC3/BSID10') return 'ac3';
    if (codecId === 'A_EAC3') return 'eac3';
    if (codecId === 'A_TRUEHD') return 'thd';
    if (codecId === 'A_MLP') return 'mlp';
    if (codecId === 'A_MPEG/L1') return 'mp1';
    if (codecId === 'A_MPEG/L2') return 'mp2';
    if (codecId === 'A_MPEG/L3') return 'mp3';
    if (codecId === 'A_FLAC') return 'flac';
    if (codecId === 'A_VORBIS') return 'ogg';
    if (codecId === 'A_OPUS') return 'opus';
    if (codecId.startsWith('A_PCM/')) return 'wav';
    if (codecId === 'A_WAVPACK4') return 'wv';
    if (codecId === 'A_TTA1') return 'tta';
    if (codecId === 'A_ALAC') return 'caf';
    if (codecId.startsWith('A_AAC')) return 'aac';
    if (codecId.startsWith('A_DTS')) return 'dts';
    if (codecId.startsWith('A_REAL/')) return 'rm';
    return 'bin';
  }

  // Subtitle codecs
  if (codecId.startsWith('S_')) {
    if (codecId === 'S_TEXT/UTF8' || codecId === 'S_TEXT/ASCII') return 'srt';
    if (codecId === 'S_TEXT/ASS' || codecId === 'S_ASS') return 'ass';
    if (codecId === 'S_TEXT/SSA' || codecId === 'S_SSA') return 'ssa';
    if (codecId === 'S_TEXT/WEBVTT') return 'vtt';
    if (codecId === 'S_TEXT/USF') return 'usf';
    if (codecId === 'S_VOBSUB') return 'sub';
    if (codecId === 'S_HDMV/PGS') return 'sup';
    if (codecId === 'S_HDMV/TEXTST') return 'textst';
    if (codecId === 'S_KATE') return 'ogg';
    return 'bin';
  }

  // Fallback by track type
  switch (trackType) {
    case 'video': return 'bin';
    case 'audio': return 'bin';
    case 'subtitles': return 'srt';
    default: return 'bin';
  }
}

async function getFileNameWithoutExt(filePath: string): Promise<string> {
  const ext = await extname(filePath);
  return await basename(filePath, ext ? `.${ext}` : undefined);
}

function buildOutputFileName(fileNameWithoutExt: string, track: Protocol.MkvTrack): string {
  const ext = getTrackExtension(track.codecId, track.type);
  return `${fileNameWithoutExt}_${track.number}_${track.language}.${ext}`;
}

async function buildExtractArgs(file: string, tracks: Protocol.MkvTrack[]): Promise<string[]> {
  const dir = await dirname(file);
  const fileNameWithoutExt = await getFileNameWithoutExt(file);
  const results: string[] = [];
  for (const track of tracks) {
    const outFile = await join(dir, buildOutputFileName(fileNameWithoutExt, track));
    results.push(`${track.id}:${outFile}`);
  }
  return results;
}

async function buildCommandString(file: string, mkvToolNixPath: string, tracks: Protocol.MkvTrack[]): Promise<string> {
  const sep = getSep();
  const mkvextractPath = `${mkvToolNixPath}${sep}mkvextract`;
  const dir = await dirname(file);
  const fileNameWithoutExt = await getFileNameWithoutExt(file);
  const args: string[] = [];
  for (const track of tracks) {
    const outFile = await join(dir, buildOutputFileName(fileNameWithoutExt, track));
    args.push(`${track.id}:"${outFile}"`);
  }
  return `"${mkvextractPath}" "${file}" tracks ${args.join(' ')}`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface ExtractProps {
  file: string;
  mkvToolNixPath: string;
}

function Extract({ file, mkvToolNixPath }: ExtractProps) {
  const { t } = useTranslation();
  const [tracks, setTracks] = useState<Protocol.MkvTrack[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMkvTracks(file)
      .then((result) => {
        setTracks(result);
        setLoading(false);
      })
      .catch((err) => {
        const msg = String(err);
        if (msg.includes('MKVMERGE_NOT_AVAILABLE:')) {
          const detail = msg.split('MKVMERGE_NOT_AVAILABLE:')[1];
          setError(t('extract.error.mkvmergeNotAvailable', { detail }));
        } else if (msg.includes('MKVMERGE_FAILED:')) {
          const detail = msg.split('MKVMERGE_FAILED:')[1];
          setError(t('extract.error.mkvmergeFailed', { detail }));
        } else if (msg.includes('MKVMERGE_PARSE_ERROR:')) {
          const detail = msg.split('MKVMERGE_PARSE_ERROR:')[1];
          setError(t('extract.error.parseError', { detail }));
        } else {
          setError(msg);
        }
        setLoading(false);
      });
  }, [file, t]);

  // Listen for mkvextract progress events
  useEffect(() => {
    const unlisten = listen<Protocol.MkvextractProgress>('mkvextract-progress', (event) => {
      const { percent, done, cancelled, error: progressError } = event.payload;
      setProgress(percent);
      if (done) {
        setDialogOpen(false);
        setExtracting(false);
        if (!cancelled && progressError) {
          setError(t('extract.error.mkvextractFailed', { detail: progressError }));
        }
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [t]);

  // Timer for elapsed / ETA
  useEffect(() => {
    if (dialogOpen) {
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
  }, [dialogOpen]);

  // Recompute ETA when progress or elapsed changes
  useEffect(() => {
    if (progress > 0 && progress < 100 && elapsed > 0) {
      const totalEstimated = elapsed / (progress / 100);
      setEta(totalEstimated - elapsed);
    }
  }, [progress, elapsed]);

  const selectedTracks = tracks.filter((track) => selectedIds.has(track.id));
  const hasSelection = selectedTracks.length > 0;

  const handleCopyCommand = async () => {
    if (!hasSelection) return;
    const command = await buildCommandString(file, mkvToolNixPath, selectedTracks);
    await writeText(command);
  };

  const handleExtract = async () => {
    if (!hasSelection || extracting) return;
    setExtracting(true);
    setProgress(0);
    setError(null);
    setDialogOpen(true);
    try {
      const args = await buildExtractArgs(file, selectedTracks);
      await runMkvextract(file, args);
    } catch (err) {
      const msg = String(err);
      setDialogOpen(false);
      setExtracting(false);
      if (msg.includes('MKVEXTRACT_NOT_AVAILABLE:')) {
        const detail = msg.split('MKVEXTRACT_NOT_AVAILABLE:')[1];
        setError(t('extract.error.mkvextractNotAvailable', { detail }));
      } else {
        setError(msg);
      }
    }
  };

  const handleCancel = async () => {
    await cancelMkvextract();
  };

  // Cancel extraction when window closes
  useEffect(() => {
    return () => { cancelMkvextract(); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || e.key === 'F3') {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleCopyCommand();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleExtract();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasSelection, extracting, file, mkvToolNixPath, selectedTracks]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar variant="dense">
          <Box sx={{ flex: 1 }} />
          <Tooltip title="F2">
            <span>
              <Button variant="contained" color="success" size="small" disabled={!hasSelection} onClick={handleCopyCommand} startIcon={<ContentCopyIcon />} sx={{ textTransform: 'none' }}>
                {t('extract.copyCommand')}
              </Button>
            </span>
          </Tooltip>
          <Box sx={{ width: 8 }} />
          <Tooltip title="F3">
            <span>
              <Button variant="contained" color="success" size="small" disabled={!hasSelection || extracting} onClick={handleExtract} startIcon={<ContentCutIcon />} sx={{ textTransform: 'none' }}>
                {t('extract.extract')}
              </Button>
            </span>
          </Tooltip>
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
            {t('extract.noTracks')}
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={tracks.length > 0 && selectedIds.size === tracks.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < tracks.length}
                      onChange={(e) => {
                        setSelectedIds(e.target.checked ? new Set(tracks.map((t) => t.id)) : new Set());
                      }}
                    />
                  </TableCell>
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(track.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              next.add(track.id);
                            } else {
                              next.delete(track.id);
                            }
                            return next;
                          });
                        }}
                      />
                    </TableCell>
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
      <Dialog open={dialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>{t('extract.extracting')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <LinearProgress variant="determinate" value={progress} sx={{ flex: 1 }} />
            <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
              {progress}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('extract.elapsed')}: {formatTime(elapsed)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('extract.eta')}: {progress > 0 && progress < 100 ? formatTime(eta) : '--:--:--'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="error" onClick={handleCancel}>{t('extract.cancel')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Extract;
