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
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  BrightnessAuto as AutoIcon,
  ClosedCaption as SubtitleIcon,
  ContentCut as MkvIcon,
  DarkMode as DarkIcon,
  FolderOpen as FolderIcon,
  LightMode as LightIcon,
  MusicNote as AudioIcon,
  Palette as AppearanceIcon,
  Save as SaveIcon,
  Tune as FormatIcon,
  Update as UpdateIcon,
  VideoFile as VideoIcon,
} from '@mui/icons-material';
import { open } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import * as Protocol from '../lib/protocol';
import { isMkvmergeFound, setConfig as saveConfig } from '../lib/service';
import { useAppStore } from '../lib/store';
import { changeLanguage } from '../i18n';

interface StreamFormatState {
  bitRatePrecision: Protocol.FormatPrecision;
  bitRateUnit: Protocol.FormatUnit;
  sizePrecision: Protocol.FormatPrecision;
  sizeUnit: Protocol.FormatUnit;
}

const defaultStreamFormat: StreamFormatState = {
  bitRatePrecision: Protocol.FormatPrecision.Two,
  bitRateUnit: Protocol.FormatUnit.KMGT,
  sizePrecision: Protocol.FormatPrecision.Two,
  sizeUnit: Protocol.FormatUnit.KMGT,
};

function initStreamFormat(sf: Protocol.ConfigStreamFormat | undefined): StreamFormatState {
  return {
    bitRatePrecision: sf?.bitRate?.precision ?? Protocol.FormatPrecision.Two,
    bitRateUnit: sf?.bitRate?.unit ?? Protocol.FormatUnit.KMGT,
    sizePrecision: sf?.size?.precision ?? Protocol.FormatPrecision.Two,
    sizeUnit: sf?.size?.unit ?? Protocol.FormatUnit.KMGT,
  };
}

function toConfigStreamFormat(s: StreamFormatState): Protocol.ConfigStreamFormat {
  return {
    bitRate: { precision: s.bitRatePrecision, unit: s.bitRateUnit },
    size: { precision: s.sizePrecision, unit: s.sizeUnit },
  };
}

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

function StreamFormatPanel({
  state,
  onChange,
  bitRateLabel,
  sizeLabel,
  precisionLabel,
  unitLabel,
}: {
  state: StreamFormatState;
  onChange: (next: StreamFormatState) => void;
  bitRateLabel: string;
  sizeLabel: string;
  precisionLabel: string;
  unitLabel: string;
}) {
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>{bitRateLabel}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">{precisionLabel}</Typography>
            <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
              <Select
                value={state.bitRatePrecision}
                onChange={(e) => onChange({ ...state, bitRatePrecision: e.target.value as Protocol.FormatPrecision })}
              >
                {Protocol.getFormatPrecisions().map((p) => (
                  <MenuItem key={p} value={p}>{Protocol.getFormatPrecisionLabel(p)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">{unitLabel}</Typography>
            <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
              <Select
                value={state.bitRateUnit}
                onChange={(e) => onChange({ ...state, bitRateUnit: e.target.value as Protocol.FormatUnit })}
              >
                {Protocol.getFormatUnits().map((u) => (
                  <MenuItem key={u} value={u}>{Protocol.getFormatUnitLabel(u)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>{sizeLabel}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">{precisionLabel}</Typography>
            <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
              <Select
                value={state.sizePrecision}
                onChange={(e) => onChange({ ...state, sizePrecision: e.target.value as Protocol.FormatPrecision })}
              >
                {Protocol.getFormatPrecisions().map((p) => (
                  <MenuItem key={p} value={p}>{Protocol.getFormatPrecisionLabel(p)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">{unitLabel}</Typography>
            <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
              <Select
                value={state.sizeUnit}
                onChange={(e) => onChange({ ...state, sizeUnit: e.target.value as Protocol.FormatUnit })}
              >
                {Protocol.getFormatUnits().map((u) => (
                  <MenuItem key={u} value={u}>{Protocol.getFormatUnitLabel(u)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}

export default function Config() {
  const { t } = useTranslation();
  const [appendOnFileDrop, setAppendOnFileDrop] = useState(true);
  const [displayMode, setDisplayMode] = useState<Protocol.DisplayMode>(Protocol.DisplayMode.Auto);
  const [theme, setTheme] = useState<Protocol.Theme>(Protocol.Theme.Ocean);
  const [language, setLanguage] = useState<Protocol.Language>(Protocol.Language.EnUS);
  const [directoryMode, setDirectoryMode] = useState<Protocol.ConfigDirectoryMode>(
    Protocol.ConfigDirectoryMode.All
  );
  const [fileExtensionsAudio, setFileExtensionsAudio] = useState('');
  const [fileExtensionsImage, setFileExtensionsImage] = useState('');
  const [fileExtensionsVideo, setFileExtensionsVideo] = useState('');
  const [videoFormat, setVideoFormat] = useState<StreamFormatState>({ ...defaultStreamFormat });
  const [audioFormat, setAudioFormat] = useState<StreamFormatState>({ ...defaultStreamFormat });
  const [subtitleFormat, setSubtitleFormat] = useState<StreamFormatState>({ ...defaultStreamFormat });
  const [mkvToolNixPath, setMkvToolNixPath] = useState('');
  const [mkvmergeFound, setMkvmergeFound] = useState(false);
  const [updateCheckInterval, setUpdateCheckInterval] = useState<Protocol.UpdateCheckInterval>(Protocol.UpdateCheckInterval.Weekly);
  const [formatTab, setFormatTab] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mkvToolNixCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isInitializedRef = useRef(false);

  const config = useAppStore((state) => state.config);
  const setStoreConfig = useAppStore((state) => state.setConfig);
  const setDialogNotification = useAppStore((state) => state.setDialogNotification);

  // Initialize from config only once
  useEffect(() => {
    if (config && config.fileExtensions && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setAppendOnFileDrop(config.appendOnFileDrop);
      setDisplayMode(config.displayMode);
      setTheme(config.theme ?? Protocol.Theme.Ocean);
      setLanguage(config.language ?? Protocol.Language.EnUS);
      setDirectoryMode(config.directoryMode);
      setFileExtensionsAudio(config.fileExtensions.audio?.join(', ') ?? '');
      setFileExtensionsImage(config.fileExtensions.image?.join(', ') ?? '');
      setFileExtensionsVideo(config.fileExtensions.video?.join(', ') ?? '');
      setVideoFormat(initStreamFormat(config.video));
      setAudioFormat(initStreamFormat(config.audio));
      setSubtitleFormat(initStreamFormat(config.subtitle));
      setMkvToolNixPath(config.mkv?.mkvToolNixPath ?? '');
      setUpdateCheckInterval(config.update?.checkInterval ?? Protocol.UpdateCheckInterval.Weekly);
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
    displayMode,
    theme,
    directoryMode,
    fileExtensions: {
      audio: convertFileExtensions(fileExtensionsAudio),
      image: convertFileExtensions(fileExtensionsImage),
      video: convertFileExtensions(fileExtensionsVideo),
    },
    language,
    video: toConfigStreamFormat(videoFormat),
    audio: toConfigStreamFormat(audioFormat),
    subtitle: toConfigStreamFormat(subtitleFormat),
    mkv: { mkvToolNixPath },
    update: { checkInterval: updateCheckInterval, lastChecked: config?.update?.lastChecked ?? 0, lastVersion: config?.update?.lastVersion ?? '', ignoreVersion: config?.update?.ignoreVersion ?? '' },
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

  const handleBrowseMkvToolNixPath = async () => {
    const directory = await open({
      directory: true,
      defaultPath: mkvToolNixPath.trim() || undefined,
    });
    if (typeof directory === 'string' && directory.length > 0) {
      setMkvToolNixPath(directory);
      handleChange();
    }
  };

  // Update store immediately when appearance/language changes
  useEffect(() => {
    if (!isInitializedRef.current || !config) return;
    const currentTheme = config.theme ?? Protocol.Theme.Ocean;
    const hasChanges =
      displayMode !== config.displayMode ||
      theme !== currentTheme ||
      language !== config.language;
    if (hasChanges) {
      setStoreConfig({ ...config, displayMode, theme, language });
    }
  }, [displayMode, theme, language, config, setStoreConfig]);

  // Apply i18n language immediately
  useEffect(() => {
    if (!isInitializedRef.current) return;
    changeLanguage(language);
  }, [language]);

  // Validate MKVToolNix path from backend and show mkvmerge availability.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (mkvToolNixCheckDebounceRef.current) {
      clearTimeout(mkvToolNixCheckDebounceRef.current);
    }
    let isCancelled = false;
    mkvToolNixCheckDebounceRef.current = setTimeout(async () => {
      try {
        const status = await isMkvmergeFound(mkvToolNixPath.trim());
        if (!isCancelled) {
          setMkvmergeFound(status.found);
          if (status.found && status.mkvToolNixPath && status.mkvToolNixPath !== mkvToolNixPath) {
            setMkvToolNixPath(status.mkvToolNixPath);
            if (config && config.mkv?.mkvToolNixPath !== status.mkvToolNixPath) {
              setStoreConfig({
                ...config,
                mkv: {
                  ...(config.mkv ?? { mkvToolNixPath: status.mkvToolNixPath }),
                  mkvToolNixPath: status.mkvToolNixPath,
                },
              });
            }
          }
        }
      } catch {
        if (!isCancelled) {
          setMkvmergeFound(false);
        }
      }
    }, 250);
    return () => {
      isCancelled = true;
      if (mkvToolNixCheckDebounceRef.current) {
        clearTimeout(mkvToolNixCheckDebounceRef.current);
      }
    };
  }, [mkvToolNixPath, config, setStoreConfig]);

  // Update store immediately when stream format changes
  useEffect(() => {
    if (!config || !isInitializedRef.current) return;
    const videoChanged =
      videoFormat.bitRatePrecision !== config.video?.bitRate?.precision ||
      videoFormat.bitRateUnit !== config.video?.bitRate?.unit ||
      videoFormat.sizePrecision !== config.video?.size?.precision ||
      videoFormat.sizeUnit !== config.video?.size?.unit;
    const audioChanged =
      audioFormat.bitRatePrecision !== config.audio?.bitRate?.precision ||
      audioFormat.bitRateUnit !== config.audio?.bitRate?.unit ||
      audioFormat.sizePrecision !== config.audio?.size?.precision ||
      audioFormat.sizeUnit !== config.audio?.size?.unit;
    const subtitleChanged =
      subtitleFormat.bitRatePrecision !== config.subtitle?.bitRate?.precision ||
      subtitleFormat.bitRateUnit !== config.subtitle?.bitRate?.unit ||
      subtitleFormat.sizePrecision !== config.subtitle?.size?.precision ||
      subtitleFormat.sizeUnit !== config.subtitle?.size?.unit;
    if (videoChanged || audioChanged || subtitleChanged) {
      setStoreConfig({
        ...config,
        video: toConfigStreamFormat(videoFormat),
        audio: toConfigStreamFormat(audioFormat),
        subtitle: toConfigStreamFormat(subtitleFormat),
      });
    }
  }, [videoFormat, audioFormat, subtitleFormat, config, setStoreConfig]);

  const handleStreamFormatChange = (
    setter: React.Dispatch<React.SetStateAction<StreamFormatState>>
  ) => (next: StreamFormatState) => {
    setter(next);
    handleChange();
  };

  const getThemeDisplayLabel = (themeOption: Protocol.Theme): string => t(`config.theme${themeOption}`);

  return (
    <Box sx={{ width: '100%', maxWidth: 640, mx: 'auto', py: 2, px: 1 }}>
      <Stack spacing={2}>
        {/* Appearance Section */}
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
          <SettingRow label={t('config.theme')}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value as Protocol.Theme);
                  handleChange();
                }}
              >
                {Protocol.getThemes().map((themeOption) => (
                  <MenuItem key={themeOption} value={themeOption}>
                    {getThemeDisplayLabel(themeOption)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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

        {/* Formatting Section - Tabbed by stream type */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader icon={<FormatIcon fontSize="small" />} title={t('config.formatting')} />
          <Tabs
            value={formatTab}
            onChange={(_e, v) => setFormatTab(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<VideoIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={t('config.video')}
              sx={{ minHeight: 36, textTransform: 'none' }}
            />
            <Tab
              icon={<AudioIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={t('config.audio')}
              sx={{ minHeight: 36, textTransform: 'none' }}
            />
            <Tab
              icon={<SubtitleIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label={t('config.subtitle')}
              sx={{ minHeight: 36, textTransform: 'none' }}
            />
          </Tabs>
          {formatTab === 0 && (
            <StreamFormatPanel
              state={videoFormat}
              onChange={handleStreamFormatChange(setVideoFormat)}
              bitRateLabel={t('config.bitRate')}
              sizeLabel={t('config.size')}
              precisionLabel={t('config.precision')}
              unitLabel={t('config.unit')}
            />
          )}
          {formatTab === 1 && (
            <StreamFormatPanel
              state={audioFormat}
              onChange={handleStreamFormatChange(setAudioFormat)}
              bitRateLabel={t('config.bitRate')}
              sizeLabel={t('config.size')}
              precisionLabel={t('config.precision')}
              unitLabel={t('config.unit')}
            />
          )}
          {formatTab === 2 && (
            <StreamFormatPanel
              state={subtitleFormat}
              onChange={handleStreamFormatChange(setSubtitleFormat)}
              bitRateLabel={t('config.bitRate')}
              sizeLabel={t('config.size')}
              precisionLabel={t('config.precision')}
              unitLabel={t('config.unit')}
            />
          )}
        </Paper>

        {/* MKV Section */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader icon={<MkvIcon fontSize="small" />} title={t('config.mkv')} />
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('config.mkvToolNixPath')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                value={mkvToolNixPath}
                onChange={(e) => {
                  setMkvToolNixPath(e.target.value);
                  handleChange();
                }}
                size="small"
                fullWidth
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleBrowseMkvToolNixPath}
                sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
              >
                {t('config.browse')}
              </Button>
            </Box>
            <Typography
              variant="caption"
              sx={{
                mt: 0.75,
                display: 'block',
                color: mkvmergeFound ? 'success.main' : 'error.main',
              }}
            >
              {mkvmergeFound ? t('config.mkvmergeFound') : t('config.mkvmergeNotFound')}
            </Typography>
          </Box>
        </Paper>

        {/* Update Section */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader icon={<UpdateIcon fontSize="small" />} title={t('config.update')} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('config.checkNewVersion')}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={updateCheckInterval}
                onChange={(e) => {
                  setUpdateCheckInterval(e.target.value as Protocol.UpdateCheckInterval);
                  handleChange();
                }}
              >
                <MenuItem value={Protocol.UpdateCheckInterval.Daily}>{t('config.daily')}</MenuItem>
                <MenuItem value={Protocol.UpdateCheckInterval.Weekly}>{t('config.weekly')}</MenuItem>
                <MenuItem value={Protocol.UpdateCheckInterval.Monthly}>{t('config.monthly')}</MenuItem>
              </Select>
            </FormControl>
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
