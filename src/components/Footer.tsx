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
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <Box sx={{ my: 1.5, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="caption" component="div">
        <Link
          href="https://paypal.me/caoccao?locale.x=en_US"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('footer.donate')}
        </Link>
      </Typography>
      <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
        {t('footer.copyright')}{' '}
        <Link href="https://github.com/caoccao" target="_blank" rel="noopener noreferrer">
          Sam Cao
        </Link>{' '}
        <Link href="https://www.caoccao.com/" target="_blank" rel="noopener noreferrer">
          caoccao.com
        </Link>
      </Typography>
    </Box>
  );
}
