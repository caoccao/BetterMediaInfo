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

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
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
import { getCurrentWindow, type DragDropEvent } from '@tauri-apps/api/window';
import type { Event, UnlistenFn } from '@tauri-apps/api/event';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import Editor from '@monaco-editor/react';
import * as Protocol from '../lib/protocol';
import { useAppStore } from '../lib/store';
import { scanFiles } from '../lib/fs';
import { writeTextFile } from '../lib/service';
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
  const [tabIndex, setTabIndex] = useState(0);
  const [tabControls, setTabControls] = useState<TabControl[]>([
    { type: Protocol.TabType.List, index: 0, value: null },
  ]);

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

    document.addEventListener('keyup', handleKeyUp);
    return () => document.removeEventListener('keyup', handleKeyUp);
  }, [tabIndex, tabControls.length]);

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
          title: 'Json code is copied to clipboard.',
          type: Protocol.DialogNotificationType.Info,
        });
      } catch (error) {
        setDialogNotification({
          title: `Failed to copy to clipboard with error: ${error}.`,
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
            title: `Json code is saved to ${filePath}.`,
            type: Protocol.DialogNotificationType.Info,
          });
        } catch (error) {
          setDialogNotification({
            title: `Failed to save to ${filePath} with error: ${error}.`,
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
        return 'About';
      case Protocol.TabType.Config:
        return 'Settings';
      case Protocol.TabType.List:
        return 'List';
      case Protocol.TabType.Details:
        return shrinkFileName(control.value ?? '', 30);
    }
  };

  const getTabTooltip = (control: TabControl) => {
    switch (control.type) {
      case Protocol.TabType.About:
        return 'About';
      case Protocol.TabType.Config:
        return 'Settings';
      case Protocol.TabType.List:
        return 'File List';
      case Protocol.TabType.Details:
        return control.value ?? '';
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                    <Tooltip title="Close (Ctrl + W)">
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

      <Box sx={{ p: 1, border: 1, borderColor: 'divider', borderTop: 0, borderRadius: '0 0 4px 4px', width: '100%', overflowX: 'auto', flex: 1, minHeight: 0 }}>
        {tabControls.map((control) => (
          <Box
            key={`content-${control.type}-${control.value}`}
            sx={{ display: control.index === tabIndex ? 'block' : 'none' }}
          >
            {control.type === Protocol.TabType.About && <About />}
            {control.type === Protocol.TabType.Config && <Config />}
            {control.type === Protocol.TabType.List && <List />}
            {control.type === Protocol.TabType.Details && <Details file={control.value ?? ''} />}
          </Box>
        ))}
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
            Close
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
            Copy
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveJsonCode}>
            Save
          </Button>
          <Button variant="outlined" onClick={() => setDialogJsonCode(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
