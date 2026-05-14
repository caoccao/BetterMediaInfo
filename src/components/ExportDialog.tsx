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

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useTranslation } from 'react-i18next';

import * as Protocol from '../lib/protocol';
import { APP_NAME } from '../lib/constants';
import { getExportFormatExtension, openSaveExportFileDialog } from '../lib/dialog';
import type { ExportFormat, ExportStream } from '../lib/export';
import { renderText } from '../lib/exportText';
import { writeTextFile } from '../lib/service';
import { useAppStore } from '../lib/store';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  file: string;
  streams: ExportStream[];
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export default function ExportDialog({ open, onClose, file, streams }: ExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('text');
  const setDialogNotification = useAppStore((state) => state.setDialogNotification);
  const mediaInfoAbout = useAppStore((state) => state.mediaInfoAbout);
  const appVersion = mediaInfoAbout?.appVersion ?? '';

  const previewContent = useMemo(() => {
    switch (format) {
      case 'text':
        return renderText({ file, appName: APP_NAME, appVersion, streams });
      default:
        return '';
    }
  }, [format, file, appVersion, streams]);

  const handleFormatChange = (_e: React.MouseEvent<HTMLElement>, value: ExportFormat | null) => {
    if (value !== null) {
      setFormat(value);
    }
  };

  const handleCopy = async () => {
    try {
      await writeText(previewContent);
      setDialogNotification({
        title: t('dialog.exportCopied'),
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: t('dialog.exportCopyFailed', { error }),
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };

  const handleSave = async () => {
    const defaultPath = `${basename(file)}.${getExportFormatExtension(format)}`;
    const filePath = (await openSaveExportFileDialog(format, defaultPath)) as string | null;
    if (!filePath) return;
    try {
      await writeTextFile(filePath, previewContent);
      setDialogNotification({
        title: t('dialog.exportSaved', { filePath }),
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: t('dialog.exportSaveFailed', { filePath, error }),
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: '90vw',
            height: '90vh',
            maxWidth: 'none',
            maxHeight: 'none',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, wordBreak: 'break-all', textAlign: 'center' }}
        >
          {file}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          value={format}
          exclusive
          onChange={handleFormatChange}
          size="small"
        >
          <ToggleButton value="text" sx={{ textTransform: 'none' }}>
            {t('export.formatText')}
          </ToggleButton>
          <ToggleButton value="markdown" sx={{ textTransform: 'none' }}>
            {t('export.formatMarkdown')}
          </ToggleButton>
          <ToggleButton value="html" sx={{ textTransform: 'none' }}>
            {t('export.formatHtml')}
          </ToggleButton>
          <ToggleButton value="png" sx={{ textTransform: 'none' }}>
            {t('export.formatPng')}
          </ToggleButton>
        </ToggleButtonGroup>
        <Button variant="contained" size="small" onClick={handleCopy} sx={{ textTransform: 'none' }}>
          {t('dialog.copy')}
        </Button>
        <Button variant="contained" size="small" onClick={handleSave} sx={{ textTransform: 'none' }}>
          {t('dialog.save')}
        </Button>
        <Button variant="outlined" size="small" onClick={onClose} sx={{ textTransform: 'none' }}>
          {t('dialog.close')}
        </Button>
      </Box>
      <Box
        component="pre"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          m: 0,
          px: 2,
          py: 1,
          bgcolor: 'background.default',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: '0.8125rem',
          whiteSpace: 'pre',
        }}
      >
        {previewContent}
      </Box>
    </Dialog>
  );
}
