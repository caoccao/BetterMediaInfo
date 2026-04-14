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

import { useMemo, useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { emit, listen } from '@tauri-apps/api/event';
import { useAppStore } from './lib/store';
import * as Protocol from './lib/protocol';
import { changeLanguage } from './i18n';
import Layout from './components/Layout';
import Extract from './components/Extract';

function getPaletteByTheme(theme: Protocol.Theme, mode: 'light' | 'dark') {
  switch (theme) {
    case Protocol.Theme.Ocean:
      return {
        mode,
        primary: { main: '#0288d1' },
        secondary: { main: '#26c6da' },
      };
    case Protocol.Theme.Aqua:
      return {
        mode,
        primary: { main: '#00acc1' },
        secondary: { main: '#4dd0e1' },
      };
    case Protocol.Theme.Sky:
      return {
        mode,
        primary: { main: '#42a5f5' },
        secondary: { main: '#90caf9' },
      };
    case Protocol.Theme.Arctic:
      return {
        mode,
        primary: { main: '#4fc3f7' },
        secondary: { main: '#b3e5fc' },
      };
    case Protocol.Theme.Glacier:
      return {
        mode,
        primary: { main: '#5c6bc0' },
        secondary: { main: '#9fa8da' },
      };
    case Protocol.Theme.Mist:
      return {
        mode,
        primary: { main: '#90a4ae' },
        secondary: { main: '#cfd8dc' },
      };
    case Protocol.Theme.Slate:
      return {
        mode,
        primary: { main: '#546e7a' },
        secondary: { main: '#78909c' },
      };
    case Protocol.Theme.Charcoal:
      return {
        mode,
        primary: { main: '#37474f' },
        secondary: { main: '#607d8b' },
      };
    case Protocol.Theme.Midnight:
      return {
        mode,
        primary: { main: '#1a237e' },
        secondary: { main: '#3949ab' },
      };
    case Protocol.Theme.Indigo:
      return {
        mode,
        primary: { main: '#3f51b5' },
        secondary: { main: '#7986cb' },
      };
    case Protocol.Theme.Violet:
      return {
        mode,
        primary: { main: '#7e57c2' },
        secondary: { main: '#b39ddb' },
      };
    case Protocol.Theme.Lavender:
      return {
        mode,
        primary: { main: '#9575cd' },
        secondary: { main: '#d1c4e9' },
      };
    case Protocol.Theme.Rose:
      return {
        mode,
        primary: { main: '#c2185b' },
        secondary: { main: '#f06292' },
      };
    case Protocol.Theme.Blush:
      return {
        mode,
        primary: { main: '#ec407a' },
        secondary: { main: '#f48fb1' },
      };
    case Protocol.Theme.Coral:
      return {
        mode,
        primary: { main: '#ff7043' },
        secondary: { main: '#ffab91' },
      };
    case Protocol.Theme.Forest:
      return {
        mode,
        primary: { main: '#2e7d32' },
        secondary: { main: '#66bb6a' },
      };
    case Protocol.Theme.Sunset:
      return {
        mode,
        primary: { main: '#ef6c00' },
        secondary: { main: '#ff8a65' },
      };
    case Protocol.Theme.Amber:
      return {
        mode,
        primary: { main: '#ff8f00' },
        secondary: { main: '#ffca28' },
      };
    case Protocol.Theme.Sand:
      return {
        mode,
        primary: { main: '#bcaaa4' },
        secondary: { main: '#d7ccc8' },
      };
    case Protocol.Theme.Emerald:
      return {
        mode,
        primary: { main: '#00897b' },
        secondary: { main: '#4db6ac' },
      };
    default:
      return {
        mode,
        primary: { main: '#0288d1' },
        secondary: { main: '#26c6da' },
      };
  }
}

function getExtractParams(): { file: string; displayMode: Protocol.DisplayMode; theme: Protocol.Theme; language: Protocol.Language } | null {
  const params = new URLSearchParams(window.location.search);
  const file = params.get('extract');
  if (!file) return null;
  return {
    file,
    displayMode: (params.get('displayMode') as Protocol.DisplayMode) ?? Protocol.DisplayMode.Auto,
    theme: (params.get('theme') as Protocol.Theme) ?? Protocol.Theme.Ocean,
    language: (params.get('language') as Protocol.Language) ?? Protocol.Language.EnUS,
  };
}

const CONFIG_CHANGE_EVENT = 'config-change';

interface ConfigChangeEvent {
  displayMode: Protocol.DisplayMode;
  theme: Protocol.Theme;
  language: Protocol.Language;
}

function App() {
  const extractParams = useMemo(() => getExtractParams(), []);
  const storeDisplayMode = useAppStore((state) => state.config?.displayMode ?? Protocol.DisplayMode.Auto);
  const storeTheme = useAppStore((state) => state.config?.theme ?? Protocol.Theme.Ocean);
  const storeLanguage = useAppStore((state) => state.config?.language ?? Protocol.Language.EnUS);
  const initConfig = useAppStore((state) => state.initConfig);

  const [extractDisplayMode, setExtractDisplayMode] = useState<Protocol.DisplayMode>(
    extractParams?.displayMode ?? Protocol.DisplayMode.Auto
  );
  const [extractTheme, setExtractTheme] = useState<Protocol.Theme>(
    extractParams?.theme ?? Protocol.Theme.Ocean
  );

  const displayMode = extractParams ? extractDisplayMode : storeDisplayMode;
  const selectedTheme = extractParams ? extractTheme : storeTheme;

  useEffect(() => {
    if (!extractParams) {
      initConfig();
    }
  }, [initConfig, extractParams]);

  // Extract window: apply initial language from URL params
  useEffect(() => {
    if (extractParams) {
      changeLanguage(extractParams.language);
    }
  }, [extractParams]);

  // Main window: emit appearance changes to extract windows
  useEffect(() => {
    if (!extractParams) {
      emit(CONFIG_CHANGE_EVENT, {
        displayMode: storeDisplayMode,
        theme: storeTheme,
        language: storeLanguage,
      } as ConfigChangeEvent);
    }
  }, [storeDisplayMode, storeTheme, storeLanguage, extractParams]);

  // Extract window: listen for appearance changes from main window
  useEffect(() => {
    if (!extractParams) return;
    const unlisten = listen<ConfigChangeEvent>(CONFIG_CHANGE_EVENT, (event) => {
      setExtractDisplayMode(event.payload.displayMode);
      setExtractTheme(event.payload.theme);
      changeLanguage(event.payload.language);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [extractParams]);

  const prefersDarkMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, []);

  const mode = useMemo(() => {
    if (displayMode === Protocol.DisplayMode.Auto) {
      return prefersDarkMode ? 'dark' : 'light';
    }
    return displayMode === Protocol.DisplayMode.Dark ? 'dark' : 'light';
  }, [displayMode, prefersDarkMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          ...getPaletteByTheme(selectedTheme, mode),
        },
        typography: {
          fontSize: 12,
        },
        components: {
          MuiButton: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiButtonGroup: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiTextField: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiSelect: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiFormControl: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiCheckbox: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiRadio: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiIconButton: {
            defaultProps: {
              size: 'small',
            },
          },
          MuiTab: {
            defaultProps: {
              sx: { minHeight: 36, py: 0.5 },
            },
          },
          MuiTabs: {
            defaultProps: {
              sx: { minHeight: 36 },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                padding: '4px 8px',
                fontSize: '0.75rem',
              },
            },
          },
        },
      }),
    [mode, selectedTheme]
  );

  // Listen for system theme changes
  useEffect(() => {
    if (displayMode === Protocol.DisplayMode.Auto) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Force re-render when system theme changes
        window.dispatchEvent(new Event('themechange'));
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [displayMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        {extractParams ? <Extract file={extractParams.file} /> : <Layout />}
      </Box>
    </ThemeProvider>
  );
}

export default App;
