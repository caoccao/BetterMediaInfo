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

import { Box } from '@mui/material';
import Toolbar from './Toolbar';
import MainContent from './MainContent';
import Footer from './Footer';

export default function Layout() {
  return (
    <Box sx={{ display: 'grid', px: 1, minHeight: '100vh', gridTemplateRows: 'auto 1fr auto' }}>
      <Box
        component="nav"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
      </Box>
      <main>
        <MainContent />
      </main>
      <footer>
        <Footer />
      </footer>
    </Box>
  );
}
