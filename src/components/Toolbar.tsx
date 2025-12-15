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

import { useEffect, useCallback } from 'react';
import { Box, ButtonGroup, IconButton, Tooltip } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import PostAddIcon from '@mui/icons-material/PostAdd';
import FolderIcon from '@mui/icons-material/Folder';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import { useAppStore } from '../lib/store';
import * as Protocol from '../lib/protocol';
import { openDirectoryDialog, openFileDialog } from '../lib/dialog';

export default function Toolbar() {
  const files = useAppStore((state) => state.mediaFiles);
  const tabAboutStatus = useAppStore((state) => state.tabAboutStatus);
  const tabSettingsStatus = useAppStore((state) => state.tabSettingsStatus);
  const setTabAboutStatus = useAppStore((state) => state.setTabAboutStatus);
  const setTabSettingsStatus = useAppStore((state) => state.setTabSettingsStatus);
  const clearMediaFiles = useAppStore((state) => state.clearMediaFiles);

  const handleClearFiles = useCallback(() => {
    clearMediaFiles();
  }, [clearMediaFiles]);

  const handleSelectTabSettings = useCallback(() => {
    setTabSettingsStatus(Protocol.ControlStatus.Selected);
  }, [setTabSettingsStatus]);

  const handleSelectTabAbout = useCallback(() => {
    setTabAboutStatus(Protocol.ControlStatus.Selected);
  }, [setTabAboutStatus]);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.altKey && !event.ctrlKey && !event.shiftKey) {
        if (event.key === 'F10') {
          event.stopPropagation();
          handleSelectTabSettings();
        }
      } else if (event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (event.key === 'q') {
          event.stopPropagation();
          handleClearFiles();
        }
      }
    };

    document.addEventListener('keyup', handleKeyUp);
    return () => document.removeEventListener('keyup', handleKeyUp);
  }, [handleClearFiles, handleSelectTabSettings]);

  const buttonSx = {
    width: 32,
    height: 32,
    borderRadius: 1,
  };

  const activeButtonSx = {
    ...buttonSx,
    bgcolor: 'primary.main',
    color: 'white',
    '&:hover': {
      bgcolor: 'primary.dark',
    },
  };

  return (
    <Box sx={{ mx: 1, my: 0, display: 'flex', gap: 1 }}>
      <ButtonGroup variant="outlined" size="small">
        <Tooltip title="Add Files">
          <IconButton sx={buttonSx} onClick={() => openFileDialog(false)}>
            <ArticleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Append Files">
          <IconButton sx={buttonSx} onClick={() => openFileDialog(true)}>
            <PostAddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add Folder">
          <IconButton sx={buttonSx} onClick={() => openDirectoryDialog(false)}>
            <FolderIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Append Folder">
          <IconButton sx={buttonSx} onClick={() => openDirectoryDialog(true)}>
            <CreateNewFolderIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup variant="outlined" size="small">
        <Tooltip title="Clear (Ctrl + Q)">
          <span>
            <IconButton sx={buttonSx} onClick={handleClearFiles} disabled={files.length === 0}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup variant="outlined" size="small">
        <Tooltip title="Settings (F10)">
          <IconButton
            sx={tabSettingsStatus !== Protocol.ControlStatus.Hidden ? activeButtonSx : buttonSx}
            onClick={handleSelectTabSettings}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="About">
          <IconButton
            sx={tabAboutStatus !== Protocol.ControlStatus.Hidden ? activeButtonSx : buttonSx}
            onClick={handleSelectTabAbout}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </ButtonGroup>
    </Box>
  );
}
