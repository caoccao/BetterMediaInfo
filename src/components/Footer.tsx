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

import { Box, Link, Typography } from '@mui/material';
import { open } from '@tauri-apps/plugin-shell';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <Box sx={{ my: 1.5, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="caption" component="div">
        <Link
          component="button"
          onClick={() => open('https://paypal.me/caoccao?locale.x=en_US')}
        >
          {t('footer.donate')}
        </Link>
      </Typography>
      <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
        {t('footer.copyright')}{' '}
        <Link component="button" onClick={() => open('https://github.com/caoccao')}>
          Sam Cao
        </Link>{' '}
        <Link component="button" onClick={() => open('https://www.caoccao.com/')}>
          caoccao.com
        </Link>
      </Typography>
    </Box>
  );
}
