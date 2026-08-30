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

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { sep as getSep } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useTranslation } from 'react-i18next';
import * as Protocol from '../lib/protocol';
import {
  MKV_STATISTICS_ADD_FILE_EVENT,
  MKV_STATISTICS_READY_EVENT,
} from '../lib/fixStatistics';
import { runMkvpropedit } from '../lib/service';

interface FixStatisticsProps {
  file: string;
}

type JobStatus = 'queued' | 'running' | 'success' | 'error';

interface StatisticsJob {
  file: string;
  queueKey: string;
  progress: number;
  status: JobStatus;
  startedAt: number | null;
  endedAt: number | null;
  error: string;
}

const IS_WINDOWS = getSep() === '\\';
const TICK_INTERVAL_MS = 200;

/**
 * Return the scheduling key for a path. Windows jobs are serialized per drive
 * or UNC share; other platforms share one global queue.
 */
function getProbeQueueKey(file: string): string {
  if (!IS_WINDOWS) return 'all';

  const normalized = file.replace(/\//g, '\\');
  const extendedUncMatch = /^\\\\\?\\UNC\\([^\\]+)\\([^\\]+)/i.exec(normalized);
  if (extendedUncMatch) {
    return `unc:${extendedUncMatch[1].toLowerCase()}\\${extendedUncMatch[2].toLowerCase()}`;
  }
  const uncMatch = /^\\\\([^\\]+)\\([^\\]+)/.exec(normalized);
  if (uncMatch) {
    return `unc:${uncMatch[1].toLowerCase()}\\${uncMatch[2].toLowerCase()}`;
  }
  const driveMatch = /^(?:\\\\\?\\)?([a-z]:)/i.exec(normalized);
  if (driveMatch) {
    return `drive:${driveMatch[1].toLowerCase()}`;
  }
  return 'windows-default';
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatClockTime(milliseconds: number | null): string {
  if (milliseconds === null) return '--:--:--';
  const date = new Date(milliseconds);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function elapsed(job: StatisticsJob, now: number): string {
  if (job.startedAt === null) return '--:--:--';
  return formatDuration((job.endedAt ?? now) - job.startedAt);
}

function eta(job: StatisticsJob, now: number): string {
  if (job.status !== 'running' || job.startedAt === null || job.progress <= 0 || job.progress >= 100) {
    return '--:--:--';
  }
  const elapsedMilliseconds = now - job.startedAt;
  return formatDuration((elapsedMilliseconds * (100 - job.progress)) / job.progress);
}

function statusColor(status: JobStatus): string {
  switch (status) {
    case 'running':
    case 'success':
      return 'success.main';
    case 'error':
      return 'error.main';
    default:
      return 'text.primary';
  }
}

function formatWindowsQueueLabel(queueKey: string, defaultLabel: string): string {
  if (queueKey.startsWith('drive:')) return queueKey.slice('drive:'.length).toUpperCase();
  if (queueKey.startsWith('unc:')) return `\\\\${queueKey.slice('unc:'.length)}`;
  return defaultLabel;
}

function FixStatistics({ file: initialFile }: FixStatisticsProps) {
  const { t, i18n } = useTranslation();
  const [jobs, setJobs] = useState<StatisticsJob[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const knownFilesRef = useRef(new Set<string>());
  const queuedFilesRef = useRef<string[]>([]);
  const activeFilesRef = useRef(new Set<string>());
  const activeQueueKeysRef = useRef(new Set<string>());
  const scheduleRef = useRef<() => void>(() => {});

  const updateJob = useCallback((file: string, update: Partial<StatisticsJob>) => {
    setJobs((current) => current.map((job) => job.file === file ? { ...job, ...update } : job));
  }, []);

  const formatError = useCallback((message: string): string => {
    const markerDetails = (marker: string) => message.startsWith(marker) ? message.slice(marker.length) : null;
    const notAvailable = markerDetails('MKVPROPEDIT_NOT_AVAILABLE:');
    if (notAvailable !== null) {
      return t('fixStatistics.error.notAvailable', { detail: notAvailable });
    }
    const invalidInput = markerDetails('MKVPROPEDIT_INVALID_INPUT:');
    if (invalidInput !== null) {
      return t('fixStatistics.error.invalidInput', { file: invalidInput });
    }
    if (message === 'MKVPROPEDIT_CAPTURE_OUTPUT_FAILED') {
      return t('fixStatistics.error.captureOutput');
    }
    const exitCode = markerDetails('MKVPROPEDIT_EXIT_CODE:');
    if (exitCode !== null) {
      return t('fixStatistics.error.exitCode', { code: exitCode });
    }
    const waitFailed = markerDetails('MKVPROPEDIT_WAIT_FAILED:');
    if (waitFailed !== null) {
      return t('fixStatistics.error.waitFailed', { detail: waitFailed });
    }
    const taskFailed = markerDetails('MKVPROPEDIT_TASK_FAILED:');
    if (taskFailed !== null) {
      return t('fixStatistics.error.taskFailed', { detail: taskFailed });
    }
    return t('fixStatistics.error.failed', { detail: message });
  }, [t]);

  const finishJob = useCallback((file: string, error: string | null) => {
    if (!activeFilesRef.current.delete(file)) return;
    activeQueueKeysRef.current.delete(getProbeQueueKey(file));
    updateJob(file, {
      progress: 100,
      status: error ? 'error' : 'success',
      endedAt: Date.now(),
      error: error ? formatError(error) : '',
    });
    scheduleRef.current();
  }, [formatError, updateJob]);

  const scheduleJobs = useCallback(() => {
    for (let index = 0; index < queuedFilesRef.current.length;) {
      const file = queuedFilesRef.current[index];
      const queueKey = getProbeQueueKey(file);
      if (activeQueueKeysRef.current.has(queueKey)) {
        index += 1;
        continue;
      }

      queuedFilesRef.current.splice(index, 1);
      activeFilesRef.current.add(file);
      activeQueueKeysRef.current.add(queueKey);
      updateJob(file, { status: 'running', progress: 0, startedAt: Date.now(), endedAt: null });
      runMkvpropedit(file)
        // The terminal progress event normally completes the job. The invoke
        // result is a fallback so a dropped event cannot stall this queue.
        .then(() => finishJob(file, null))
        .catch((reason) => finishJob(file, String(reason)));

      // All non-Windows paths use the same queue key, so the next iteration
      // naturally leaves the remaining files queued. Windows continues and
      // starts one process for each other available drive/share.
    }
  }, [finishJob, updateJob]);
  scheduleRef.current = scheduleJobs;

  const addJob = useCallback((file: string) => {
    if (knownFilesRef.current.has(file)) return;
    knownFilesRef.current.add(file);
    queuedFilesRef.current.push(file);
    setJobs((current) => [
      ...current,
      {
        file,
        queueKey: getProbeQueueKey(file),
        progress: 0,
        status: 'queued',
        startedAt: null,
        endedAt: null,
        error: '',
      },
    ]);
    queueMicrotask(() => scheduleRef.current());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void getCurrentWindow().setTitle(t('fixStatistics.title'));
  }, [i18n.resolvedLanguage, t]);

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];
    const webview = getCurrentWebviewWindow();

    Promise.all([
      webview.listen<Protocol.MkvpropeditProgress>('mkvpropedit-progress', (event) => {
        const { file, percent, done, error } = event.payload;
        if (done) {
          finishJob(file, error);
        } else {
          updateJob(file, { progress: percent });
        }
      }),
      webview.listen<{ file: string }>(MKV_STATISTICS_ADD_FILE_EVENT, (event) => {
        addJob(event.payload.file);
      }),
    ]).then((listeners) => {
      if (cancelled) {
        listeners.forEach((unlisten) => unlisten());
        return;
      }
      unlisteners.push(...listeners);
      addJob(initialFile);
      void webview.emit(MKV_STATISTICS_READY_EVENT);
    });

    return () => {
      cancelled = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [addJob, finishJob, initialFile, updateJob]);

  useEffect(() => {
    if (jobs.length === 0 || jobs.some((job) => job.status === 'queued' || job.status === 'running')) return;

    const closeTimer = setTimeout(() => {
      void getCurrentWindow().destroy();
    }, 500);
    return () => clearTimeout(closeTimer);
  }, [jobs]);

  const groups = Array.from(
    jobs.reduce((result, job) => {
      const group = result.get(job.queueKey) ?? [];
      group.push(job);
      result.set(job.queueKey, group);
      return result;
    }, new Map<string, StatisticsJob[]>()),
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 1, gap: 1 }}>
      <Typography variant="h6">{t('fixStatistics.title')}</Typography>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Stack spacing={2}>
          {groups.map(([queueKey, groupJobs]) => (
            <Card variant="outlined" key={queueKey}>
              {IS_WINDOWS && (
                <CardHeader
                  title={formatWindowsQueueLabel(queueKey, t('fixStatistics.defaultQueue'))}
                  slotProps={{ title: { variant: 'subtitle2' } }}
                  sx={{ pb: 0 }}
                />
              )}
              <CardContent sx={{ pt: IS_WINDOWS ? 0 : 2, '&.MuiCardContent-root:last-child': { pb: 2 } }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('fixStatistics.header.filePath')}</TableCell>
                        <TableCell>{t('fixStatistics.header.status')}</TableCell>
                        <TableCell>{t('fixStatistics.header.start')}</TableCell>
                        <TableCell>{t('fixStatistics.header.end')}</TableCell>
                        <TableCell>{t('fixStatistics.header.elapsed')}</TableCell>
                        <TableCell>{t('fixStatistics.header.eta')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groupJobs.map((job) => (
                        <TableRow key={job.file}>
                          <TableCell sx={{ wordBreak: 'break-all' }}>
                            {job.file}
                            {job.error && <Alert severity="error" sx={{ mt: 1 }}>{job.error}</Alert>}
                          </TableCell>
                          <TableCell sx={{ color: statusColor(job.status), whiteSpace: 'nowrap' }}>
                            {t(`fixStatistics.jobStatus.${job.status}`)}
                            {job.status === 'running' ? ` ${job.progress}%` : ''}
                          </TableCell>
                          <TableCell>{formatClockTime(job.startedAt)}</TableCell>
                          <TableCell>{formatClockTime(job.endedAt)}</TableCell>
                          <TableCell>{elapsed(job, now)}</TableCell>
                          <TableCell>{eta(job, now)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export default FixStatistics;
