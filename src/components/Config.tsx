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

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import * as Protocol from '../lib/protocol';
import { setConfig as saveConfig } from '../lib/service';
import { useAppStore } from '../lib/store';

export default function Config() {
  const [appendOnFileDrop, setAppendOnFileDrop] = useState(true);
  const [displayMode, setDisplayMode] = useState<Protocol.DisplayMode>(Protocol.DisplayMode.Auto);
  const [directoryMode, setDirectoryMode] = useState<Protocol.ConfigDirectoryMode>(
    Protocol.ConfigDirectoryMode.All
  );
  const [fileExtensionsAudio, setFileExtensionsAudio] = useState('');
  const [fileExtensionsImage, setFileExtensionsImage] = useState('');
  const [fileExtensionsVideo, setFileExtensionsVideo] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const config = useAppStore((state) => state.config);
  const setStoreConfig = useAppStore((state) => state.setConfig);
  const setDialogNotification = useAppStore((state) => state.setDialogNotification);

  // Initialize from config
  useEffect(() => {
    if (config) {
      setAppendOnFileDrop(config.appendOnFileDrop);
      setDisplayMode(config.displayMode);
      setDirectoryMode(config.directoryMode);
      setFileExtensionsAudio(config.fileExtensions.audio.join(', '));
      setFileExtensionsImage(config.fileExtensions.image.join(', '));
      setFileExtensionsVideo(config.fileExtensions.video.join(', '));
    }
  }, [config]);

  // Debounced file extension changes with 200ms delay
  const handleFileExtensionChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setIsDirty(true);
    }, 200);
  };

  const handleChange = () => {
    setIsDirty(true);
  };

  const convertFileExtensions = (fileExtensions: string): string[] => {
    return fileExtensions
      .split(/[, .]+/g)
      .filter((extension) => extension.length > 0);
  };

  const createConfig = (): Protocol.Config => ({
    appendOnFileDrop,
    displayMode,
    directoryMode,
    fileExtensions: {
      audio: convertFileExtensions(fileExtensionsAudio),
      image: convertFileExtensions(fileExtensionsImage),
      video: convertFileExtensions(fileExtensionsVideo),
    },
  });

  const handleSave = async () => {
    try {
      const newConfig = await saveConfig(createConfig());
      setStoreConfig(newConfig);
      setIsDirty(false);
      setDialogNotification({
        title: 'Settings saved.',
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: error ? error.toString() : 'Failed to save settings with unknown error.',
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };

  // Save config to store when component unmounts (but don't persist to disk)
  useEffect(() => {
    return () => {
      try {
        const newConfig = createConfig();
        setStoreConfig(newConfig);
      } catch (error) {
        console.error(error);
      }
    };
  }, [appendOnFileDrop, displayMode, directoryMode, fileExtensionsAudio, fileExtensionsImage, fileExtensionsVideo]);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', pb: 1, borderBottom: 2, borderColor: 'success.main' }}>
          Settings
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'medium', pb: 1, borderBottom: 1, borderColor: 'success.light' }}>
          Appearance
        </Typography>
        <FormControl sx={{ mt: 1 }}>
          <RadioGroup
            row
            value={displayMode}
            onChange={(e) => {
              setDisplayMode(e.target.value as Protocol.DisplayMode);
              handleChange();
            }}
          >
            <FormControlLabel
              value={Protocol.DisplayMode.Auto}
              control={<Radio size="small" />}
              label={<Typography variant="body2">Auto Mode</Typography>}
            />
            <FormControlLabel
              value={Protocol.DisplayMode.Light}
              control={<Radio size="small" />}
              label={<Typography variant="body2">Light Mode</Typography>}
            />
            <FormControlLabel
              value={Protocol.DisplayMode.Dark}
              control={<Radio size="small" />}
              label={<Typography variant="body2">Dark Mode</Typography>}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'medium', pb: 1, borderBottom: 1, borderColor: 'success.light' }}>
          Append on File Drop
        </Typography>
        <FormControl sx={{ mt: 1 }}>
          <RadioGroup
            row
            value={appendOnFileDrop.toString()}
            onChange={(e) => {
              setAppendOnFileDrop(e.target.value === 'true');
              handleChange();
            }}
          >
            <FormControlLabel
              value="true"
              control={<Radio size="small" />}
              label={<Typography variant="body2">Append</Typography>}
            />
            <FormControlLabel
              value="false"
              control={<Radio size="small" />}
              label={<Typography variant="body2">Do not append</Typography>}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'medium', pb: 1, borderBottom: 1, borderColor: 'success.light' }}>
          Directory Mode
        </Typography>
        <FormControl size="small" sx={{ mt: 1, minWidth: 120 }}>
          <Select
            value={directoryMode}
            onChange={(e) => {
              setDirectoryMode(e.target.value as Protocol.ConfigDirectoryMode);
              handleChange();
            }}
          >
            {Protocol.getConfigDirectoryModes().map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 'medium', pb: 1, borderBottom: 1, borderColor: 'success.light' }}>
          File Extensions
        </Typography>
        <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Audio File Extensions
            </Typography>
            <TextField
              value={fileExtensionsAudio}
              onChange={(e) => handleFileExtensionChange(setFileExtensionsAudio, e.target.value)}
              size="small"
              fullWidth
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Image File Extensions
            </Typography>
            <TextField
              value={fileExtensionsImage}
              onChange={(e) => handleFileExtensionChange(setFileExtensionsImage, e.target.value)}
              size="small"
              fullWidth
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Video File Extensions
            </Typography>
            <TextField
              value={fileExtensionsVideo}
              onChange={(e) => handleFileExtensionChange(setFileExtensionsVideo, e.target.value)}
              size="small"
              fullWidth
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <Button variant="contained" color="primary" disabled={!isDirty} onClick={handleSave} sx={{ minWidth: 150 }}>
          Save
        </Button>
      </Box>
    </Box>
  );
}
