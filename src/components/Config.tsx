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

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  BrightnessAuto as AutoIcon,
  DarkMode as DarkIcon,
  FolderOpen as FolderIcon,
  LightMode as LightIcon,
  MusicNote as AudioIcon,
  Palette as AppearanceIcon,
  Save as SaveIcon,
  Speed as BitRateIcon,
  Storage as SizeIcon,
  VideoFile as VideoIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import * as Protocol from '../lib/protocol';
import { setConfig as saveConfig } from '../lib/service';
import { useAppStore } from '../lib/store';
import { changeLanguage } from '../i18n';

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
    </Box>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1,
        '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider' },
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

export default function Config() {
  const { t } = useTranslation();
  const [appendOnFileDrop, setAppendOnFileDrop] = useState(true);
  const [bitRatePrecision, setBitRatePrecision] = useState<Protocol.FormatPrecision>(
    Protocol.FormatPrecision.Two
  );
  const [bitRateUnit, setBitRateUnit] = useState<Protocol.FormatUnit>(
    Protocol.FormatUnit.KMGT
  );
  const [sizePrecision, setSizePrecision] = useState<Protocol.FormatPrecision>(
    Protocol.FormatPrecision.Two
  );
  const [sizeUnit, setSizeUnit] = useState<Protocol.FormatUnit>(
    Protocol.FormatUnit.KMGT
  );
  const [displayMode, setDisplayMode] = useState<Protocol.DisplayMode>(Protocol.DisplayMode.Auto);
  const [language, setLanguage] = useState<Protocol.Language>(Protocol.Language.EnUS);
  const [directoryMode, setDirectoryMode] = useState<Protocol.ConfigDirectoryMode>(
    Protocol.ConfigDirectoryMode.All
  );
  const [fileExtensionsAudio, setFileExtensionsAudio] = useState('');
  const [fileExtensionsImage, setFileExtensionsImage] = useState('');
  const [fileExtensionsVideo, setFileExtensionsVideo] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isInitializedRef = useRef(false);

  const config = useAppStore((state) => state.config);
  const setStoreConfig = useAppStore((state) => state.setConfig);
  const setDialogNotification = useAppStore((state) => state.setDialogNotification);

  // Initialize from config only once
  useEffect(() => {
    if (config && config.fileExtensions && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setAppendOnFileDrop(config.appendOnFileDrop);
      setBitRatePrecision(config.bitRate?.precision ?? Protocol.FormatPrecision.Two);
      setBitRateUnit(config.bitRate?.unit ?? Protocol.FormatUnit.KMGT);
      setSizePrecision(config.size?.precision ?? Protocol.FormatPrecision.Two);
      setSizeUnit(config.size?.unit ?? Protocol.FormatUnit.KMGT);
      setDisplayMode(config.displayMode);
      setLanguage(config.language ?? Protocol.Language.EnUS);
      setDirectoryMode(config.directoryMode);
      setFileExtensionsAudio(config.fileExtensions.audio?.join(', ') ?? '');
      setFileExtensionsImage(config.fileExtensions.image?.join(', ') ?? '');
      setFileExtensionsVideo(config.fileExtensions.video?.join(', ') ?? '');
    }
  }, [config]);

  // Reset initialization flag when component unmounts so it reinitializes on next mount
  useEffect(() => {
    return () => {
      isInitializedRef.current = false;
    };
  }, []);

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
    bitRate: {
      precision: bitRatePrecision,
      unit: bitRateUnit,
    },
    displayMode,
    directoryMode,
    fileExtensions: {
      audio: convertFileExtensions(fileExtensionsAudio),
      image: convertFileExtensions(fileExtensionsImage),
      video: convertFileExtensions(fileExtensionsVideo),
    },
    language,
    size: {
      precision: sizePrecision,
      unit: sizeUnit,
    },
  });

  const handleSave = async () => {
    try {
      const newConfig = await saveConfig(createConfig());
      setStoreConfig(newConfig);
      setIsDirty(false);
      setDialogNotification({
        title: t('config.settingsSaved'),
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: error ? error.toString() : t('config.settingsSaveError'),
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };

  // Update store immediately when displayMode changes (for instant theme switching)
  useEffect(() => {
    if (config && isInitializedRef.current && displayMode !== config.displayMode) {
      setStoreConfig({ ...config, displayMode });
    }
  }, [displayMode, config, setStoreConfig]);

  // Update store immediately when language changes
  useEffect(() => {
    if (config && isInitializedRef.current && language !== config.language) {
      changeLanguage(language);
      setStoreConfig({ ...config, language });
    }
  }, [language, config, setStoreConfig]);

  // Update store immediately when bitRate changes
  useEffect(() => {
    if (config && isInitializedRef.current &&
      (bitRatePrecision !== config.bitRate?.precision || bitRateUnit !== config.bitRate?.unit)) {
      setStoreConfig({ ...config, bitRate: { precision: bitRatePrecision, unit: bitRateUnit } });
    }
  }, [bitRatePrecision, bitRateUnit, config, setStoreConfig]);

  // Update store immediately when size changes
  useEffect(() => {
    if (config && isInitializedRef.current &&
      (sizePrecision !== config.size?.precision || sizeUnit !== config.size?.unit)) {
      setStoreConfig({ ...config, size: { precision: sizePrecision, unit: sizeUnit } });
    }
  }, [sizePrecision, sizeUnit, config, setStoreConfig]);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 2, px: 1 }}>
      <Stack spacing={2}>
        {/* General Section */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader icon={<AppearanceIcon fontSize="small" />} title={t('config.appearance')} />
          <SettingRow label={t('config.appearance')}>
            <ToggleButtonGroup
              value={displayMode}
              exclusive
              onChange={(_e, value) => {
                if (value !== null) {
                  setDisplayMode(value as Protocol.DisplayMode);
                  handleChange();
                }
              }}
              size="small"
            >
              <ToggleButton value={Protocol.DisplayMode.Auto} sx={{ px: 1.5, gap: 0.5 }}>
                <AutoIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{t('config.autoMode')}</Typography>
              </ToggleButton>
              <ToggleButton value={Protocol.DisplayMode.Light} sx={{ px: 1.5, gap: 0.5 }}>
                <LightIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{t('config.lightMode')}</Typography>
              </ToggleButton>
              <ToggleButton value={Protocol.DisplayMode.Dark} sx={{ px: 1.5, gap: 0.5 }}>
                <DarkIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{t('config.darkMode')}</Typography>
              </ToggleButton>
            </ToggleButtonGroup>
          </SettingRow>
          <SettingRow label={t('config.language')}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as Protocol.Language);
                  handleChange();
                }}
              >
                {Protocol.getLanguages().map((lang) => (
                  <MenuItem key={lang} value={lang}>
                    {Protocol.getLanguageLabel(lang)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </SettingRow>
        </Paper>

        {/* File Handling Section */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader icon={<FolderIcon fontSize="small" />} title={t('config.fileExtensions')} />
          <SettingRow label={t('config.appendOnFileDrop')}>
            <Switch
              checked={appendOnFileDrop}
              onChange={(e) => {
                setAppendOnFileDrop(e.target.checked);
                handleChange();
              }}
              size="small"
            />
          </SettingRow>
          <SettingRow label={t('config.directoryMode')}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
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
          </SettingRow>
          <Box sx={{ mt: 2 }}>
            <Stack spacing={1.5}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <AudioIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('config.audioFileExtensions')}
                  </Typography>
                </Box>
                <TextField
                  value={fileExtensionsAudio}
                  onChange={(e) => handleFileExtensionChange(setFileExtensionsAudio, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="mp3, flac, wav, aac..."
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <VideoIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('config.videoFileExtensions')}
                  </Typography>
                </Box>
                <TextField
                  value={fileExtensionsVideo}
                  onChange={(e) => handleFileExtensionChange(setFileExtensionsVideo, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="mp4, mkv, avi, mov..."
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <AppearanceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('config.imageFileExtensions')}
                  </Typography>
                </Box>
                <TextField
                  value={fileExtensionsImage}
                  onChange={(e) => handleFileExtensionChange(setFileExtensionsImage, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="jpg, png, gif, webp..."
                />
              </Box>
            </Stack>
          </Box>
        </Paper>

        {/* Formatting Section */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader icon={<BitRateIcon fontSize="small" />} title={t('config.bitRate')} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('config.precision')}
              </Typography>
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={bitRatePrecision}
                  onChange={(e) => {
                    setBitRatePrecision(e.target.value as Protocol.FormatPrecision);
                    handleChange();
                  }}
                >
                  {Protocol.getFormatPrecisions().map((p) => (
                    <MenuItem key={p} value={p}>
                      {Protocol.getFormatPrecisionLabel(p)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('config.unit')}
              </Typography>
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={bitRateUnit}
                  onChange={(e) => {
                    setBitRateUnit(e.target.value as Protocol.FormatUnit);
                    handleChange();
                  }}
                >
                  {Protocol.getFormatUnits().map((u) => (
                    <MenuItem key={u} value={u}>
                      {Protocol.getFormatUnitLabel(u)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader icon={<SizeIcon fontSize="small" />} title={t('config.size')} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('config.precision')}
              </Typography>
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={sizePrecision}
                  onChange={(e) => {
                    setSizePrecision(e.target.value as Protocol.FormatPrecision);
                    handleChange();
                  }}
                >
                  {Protocol.getFormatPrecisions().map((p) => (
                    <MenuItem key={p} value={p}>
                      {Protocol.getFormatPrecisionLabel(p)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('config.unit')}
              </Typography>
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={sizeUnit}
                  onChange={(e) => {
                    setSizeUnit(e.target.value as Protocol.FormatUnit);
                    handleChange();
                  }}
                >
                  {Protocol.getFormatUnits().map((u) => (
                    <MenuItem key={u} value={u}>
                      {Protocol.getFormatUnitLabel(u)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={!isDirty}
            onClick={handleSave}
            startIcon={<SaveIcon />}
            sx={{ minWidth: 180, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {t('config.save')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
