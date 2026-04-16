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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  Link,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow, type DragDropEvent } from '@tauri-apps/api/window';
import type { Event, UnlistenFn } from '@tauri-apps/api/event';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import Editor from '@monaco-editor/react';
import * as Protocol from '../lib/protocol';
import { useAppStore } from '../lib/store';
import { scanFiles } from '../lib/fs';
import { getUpdateResult, skipVersion, writeTextFile } from '../lib/service';
import { openSaveJsonCodeFileDialog } from '../lib/dialog';
import { shrinkFileName } from '../lib/format';
import List from './List';
import Details from './Details';
import Config from './Config';
import About from './About';

interface TabControl {
  type: Protocol.TabType;
  index: number;
  value: string | null;
}

export default function MainContent() {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [tabControls, setTabControls] = useState<TabControl[]>([
    { type: Protocol.TabType.List, index: 0, value: null },
  ]);

  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [skipChecked, setSkipChecked] = useState(false);
  const updatePollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const config = useAppStore((state) => state.config);
  const dialogJsonCode = useAppStore((state) => state.dialogJsonCode);
  const dialogNotification = useAppStore((state) => state.dialogNotification);
  const mediaDetailedFiles = useAppStore((state) => state.mediaDetailedFiles);
  const tabAboutStatus = useAppStore((state) => state.tabAboutStatus);
  const tabSettingsStatus = useAppStore((state) => state.tabSettingsStatus);
  const setDialogJsonCode = useAppStore((state) => state.setDialogJsonCode);
  const setDialogNotification = useAppStore((state) => state.setDialogNotification);
  const setTabAboutStatus = useAppStore((state) => state.setTabAboutStatus);
  const setTabSettingsStatus = useAppStore((state) => state.setTabSettingsStatus);
  const removeMediaDetailedFile = useAppStore((state) => state.removeMediaDetailedFile);

  const appendOnFileDrop = config?.appendOnFileDrop ?? true;
  const displayMode = config?.displayMode ?? Protocol.DisplayMode.Auto;

  const monacoTheme = useMemo(() => {
    if (displayMode === Protocol.DisplayMode.Dark) return 'vs-dark';
    if (displayMode === Protocol.DisplayMode.Light) return 'light';
    // Auto mode - detect from system
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'vs-dark';
    }
    return 'light';
  }, [displayMode]);

  const dialogJsonCodeString = useMemo(() => {
    return dialogJsonCode?.jsonCode ? JSON.stringify(dialogJsonCode.jsonCode, null, 2) : null;
  }, [dialogJsonCode]);

  // Update tab controls when status changes
  useEffect(() => {
    setTabControls((prev) => {
      let controls = [...prev];

      // Handle About tab
      const hasAboutTab = controls.some((c) => c.type === Protocol.TabType.About);
      if (tabAboutStatus !== Protocol.ControlStatus.Hidden && !hasAboutTab) {
        controls.push({ type: Protocol.TabType.About, index: 0, value: null });
      } else if (tabAboutStatus === Protocol.ControlStatus.Hidden && hasAboutTab) {
        controls = controls.filter((c) => c.type !== Protocol.TabType.About);
      }

      // Handle Config tab
      const hasConfigTab = controls.some((c) => c.type === Protocol.TabType.Config);
      if (tabSettingsStatus !== Protocol.ControlStatus.Hidden && !hasConfigTab) {
        controls.push({ type: Protocol.TabType.Config, index: 0, value: null });
      } else if (tabSettingsStatus === Protocol.ControlStatus.Hidden && hasConfigTab) {
        controls = controls.filter((c) => c.type !== Protocol.TabType.Config);
      }

      // Handle Details tabs
      const currentDetailFiles = new Set(
        controls.filter((c) => c.type === Protocol.TabType.Details).map((c) => c.value)
      );
      const newDetailFiles = new Set(mediaDetailedFiles);

      // Remove tabs for files no longer in mediaDetailedFiles
      controls = controls.filter(
        (c) => c.type !== Protocol.TabType.Details || (c.value !== null && newDetailFiles.has(c.value))
      );

      // Add tabs for new files
      mediaDetailedFiles.forEach((file) => {
        if (!currentDetailFiles.has(file)) {
          controls.push({ type: Protocol.TabType.Details, index: 0, value: file });
        }
      });

      // Update indices
      controls.forEach((control, index) => {
        control.index = index;
      });

      return controls;
    });
  }, [tabAboutStatus, tabSettingsStatus, mediaDetailedFiles]);

  // Handle tab selection for About and Settings
  useEffect(() => {
    if (tabAboutStatus === Protocol.ControlStatus.Selected) {
      const aboutTab = tabControls.find((c) => c.type === Protocol.TabType.About);
      if (aboutTab) {
        setTabIndex(aboutTab.index);
        setTabAboutStatus(Protocol.ControlStatus.Visible);
      }
    }
  }, [tabAboutStatus, tabControls, setTabAboutStatus]);

  useEffect(() => {
    if (tabSettingsStatus === Protocol.ControlStatus.Selected) {
      const settingsTab = tabControls.find((c) => c.type === Protocol.TabType.Config);
      if (settingsTab) {
        setTabIndex(settingsTab.index);
        setTabSettingsStatus(Protocol.ControlStatus.Visible);
      }
    }
  }, [tabSettingsStatus, tabControls, setTabSettingsStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (event.key >= '1' && event.key <= '9') {
          const newTabIndex = parseInt(event.key) - 1;
          if (newTabIndex >= 0 && newTabIndex < tabControls.length) {
            event.stopPropagation();
            setTabIndex(newTabIndex);
          }
        } else if (event.key === 'w') {
          event.stopPropagation();
          closeTab(tabIndex);
        } else if (event.key === 'Tab') {
          event.stopPropagation();
          setTabIndex((prev) => (prev >= tabControls.length - 1 ? 0 : prev + 1));
        }
      } else if (event.ctrlKey && !event.altKey && event.shiftKey) {
        if (event.key === 'Tab') {
          event.stopPropagation();
          setTabIndex((prev) => (prev > 0 ? prev - 1 : tabControls.length - 1));
        }
      } else if (!event.ctrlKey && event.altKey && !event.shiftKey) {
        if (event.key === 'x') {
          event.stopPropagation();
          getCurrentWindow().close();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F3') {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [tabIndex, tabControls.length]);

  // Poll for update check result
  useEffect(() => {
    updatePollRef.current = setInterval(async () => {
      try {
        const result = await getUpdateResult();
        if (result) {
          if (updatePollRef.current) {
            clearInterval(updatePollRef.current);
            updatePollRef.current = undefined;
          }
          if (result.hasUpdate && result.latestVersion) {
            setNewVersion(result.latestVersion);
          }
        }
      } catch {
        // Ignore errors
      }
    }, 1000);
    return () => {
      if (updatePollRef.current) {
        clearInterval(updatePollRef.current);
        updatePollRef.current = undefined;
      }
    };
  }, []);

  // File drop handling
  useEffect(() => {
    let cancelFileDrop: UnlistenFn | null = null;

    getCurrentWindow()
      .onDragDropEvent((event: Event<DragDropEvent>) => {
        if (event.payload.type === 'drop') {
          scanFiles(event.payload.paths, appendOnFileDrop);
        }
      })
      .then((value) => {
        cancelFileDrop = value;
      });

    return () => {
      if (cancelFileDrop) {
        cancelFileDrop();
      }
    };
  }, [appendOnFileDrop]);

  const closeTab = useCallback(
    (index: number) => {
      if (index >= 0 && index < tabControls.length) {
        const tabControl = tabControls[index];
        switch (tabControl.type) {
          case Protocol.TabType.About:
            setTabAboutStatus(Protocol.ControlStatus.Hidden);
            break;
          case Protocol.TabType.Config:
            setTabSettingsStatus(Protocol.ControlStatus.Hidden);
            break;
          case Protocol.TabType.Details:
            if (tabControl.value) {
              removeMediaDetailedFile(tabControl.value);
            }
            break;
        }
      }
    },
    [tabControls, setTabAboutStatus, setTabSettingsStatus, removeMediaDetailedFile]
  );

  const handleCopyJsonCode = async () => {
    if (dialogJsonCodeString) {
      try {
        await writeText(dialogJsonCodeString);
        setDialogNotification({
          title: t('dialog.jsonCopied'),
          type: Protocol.DialogNotificationType.Info,
        });
      } catch (error) {
        setDialogNotification({
          title: t('dialog.jsonCopyFailed', { error }),
          type: Protocol.DialogNotificationType.Error,
        });
      }
    }
  };

  const handleSaveJsonCode = async () => {
    if (dialogJsonCodeString) {
      const filePath = (await openSaveJsonCodeFileDialog()) as string | null;
      if (filePath) {
        try {
          await writeTextFile(filePath, dialogJsonCodeString);
          setDialogNotification({
            title: t('dialog.jsonSaved', { filePath }),
            type: Protocol.DialogNotificationType.Info,
          });
        } catch (error) {
          setDialogNotification({
            title: t('dialog.jsonSaveFailed', { filePath, error }),
            type: Protocol.DialogNotificationType.Error,
          });
        }
      }
    }
  };

  // Keep tabIndex within bounds
  useEffect(() => {
    if (tabIndex >= tabControls.length && tabControls.length > 0) {
      setTabIndex(tabControls.length - 1);
    }
  }, [tabIndex, tabControls.length]);

  const getTabLabel = (control: TabControl) => {
    switch (control.type) {
      case Protocol.TabType.About:
        return t('tabs.about');
      case Protocol.TabType.Config:
        return t('tabs.settings');
      case Protocol.TabType.List:
        return t('tabs.list');
      case Protocol.TabType.Details:
        return shrinkFileName(control.value ?? '', 30);
    }
  };

  const getTabTooltip = (control: TabControl) => {
    switch (control.type) {
      case Protocol.TabType.About:
        return t('tabs.about');
      case Protocol.TabType.Config:
        return t('tabs.settings');
      case Protocol.TabType.List:
        return t('tabs.fileList');
      case Protocol.TabType.Details:
        return control.value ?? '';
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {newVersion && (
        <Alert
          severity="info"
          onClose={async () => {
            if (skipChecked) {
              await skipVersion(newVersion);
            }
            setNewVersion(null);
            setSkipChecked(false);
          }}
          sx={{ flexShrink: 0, '& .MuiAlert-message': { flex: 1 } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => shellOpen('https://github.com/caoccao/BetterMediaInfo/releases')}
              sx={{ cursor: 'pointer' }}
            >
              {t('update.newVersionAvailable', { version: newVersion })}
            </Link>
            <Box sx={{ flex: 1 }} />
            <FormControlLabel
              control={<Checkbox size="small" sx={{ p: 0.5 }} checked={skipChecked} onChange={(e) => setSkipChecked(e.target.checked)} />}
              label={t('update.skipThisVersion')}
              slotProps={{ typography: { variant: 'body2' } }}
              sx={{ mr: 0 }}
            />
          </Box>
        </Alert>
      )}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, newValue) => setTabIndex(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 0, minHeight: '24px', '& .MuiTab-root': { textTransform: 'none' } }}
        >
          {tabControls.map((control) => (
            <Tab
              key={`${control.type}-${control.value}`}
              style={{ minHeight: '24px' }}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title={getTabTooltip(control)}>
                    <span>{getTabLabel(control)}</span>
                  </Tooltip>
                  {control.type !== Protocol.TabType.List && (
                    <Tooltip title={t('tabs.close')}>
                      <IconButton
                        size="small"
                        sx={{ ml: 0.5, p: 0.25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(control.index);
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              }
              sx={{ py: 0, my: 0 }}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 1, border: 1, borderColor: 'divider', borderTop: 0, borderRadius: '0 0 4px 4px', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tabControls.map((control) => {
          const isVisible = control.index === tabIndex;
          const ownsScroll = control.type === Protocol.TabType.Details || control.type === Protocol.TabType.List;
          return (
            <Box
              key={`content-${control.type}-${control.value}`}
              sx={{
                display: isVisible ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                ...(!ownsScroll && { overflow: 'auto' }),
              }}
            >
              {control.type === Protocol.TabType.About && <About />}
              {control.type === Protocol.TabType.Config && <Config />}
              {control.type === Protocol.TabType.List && <List />}
              {control.type === Protocol.TabType.Details && <Details file={control.value ?? ''} />}
            </Box>
          );
        })}
      </Box>

      {/* Notification Dialog */}
      <Dialog open={dialogNotification !== null} onClose={() => setDialogNotification(null)} maxWidth="md">
        <DialogTitle
          sx={{
            textAlign: 'center',
            wordBreak: 'break-word',
            color:
              dialogNotification?.type === Protocol.DialogNotificationType.Error
                ? 'error.main'
                : 'success.main',
          }}
        >
          {dialogNotification?.title}
        </DialogTitle>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => setDialogNotification(null)}>
            {t('dialog.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* JSON Code Dialog */}
      <Dialog
        open={dialogJsonCode !== null}
        onClose={() => setDialogJsonCode(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{dialogJsonCode?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ height: 'calc(80vh - 150px)', border: 1, borderColor: 'divider' }}>
            <Editor
              height="100%"
              language="json"
              value={dialogJsonCodeString ?? ''}
              theme={monacoTheme}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1 }}>
          <Button variant="contained" color="primary" onClick={handleCopyJsonCode}>
            {t('dialog.copy')}
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveJsonCode}>
            {t('dialog.save')}
          </Button>
          <Button variant="outlined" onClick={() => setDialogJsonCode(null)}>
            {t('dialog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
