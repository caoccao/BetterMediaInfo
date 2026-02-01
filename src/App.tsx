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

import { useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { useAppStore } from './lib/store';
import * as Protocol from './lib/protocol';
import Layout from './components/Layout';

function App() {
  const displayMode = useAppStore((state) => state.config?.displayMode ?? Protocol.DisplayMode.Auto);
  const initConfig = useAppStore((state) => state.initConfig);

  useEffect(() => {
    initConfig();
  }, [initConfig]);

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
          mode,
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
    [mode]
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
        <Layout />
      </Box>
    </ThemeProvider>
  );
}

export default App;
