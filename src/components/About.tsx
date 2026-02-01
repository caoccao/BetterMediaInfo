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

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  FormControl,
  Link,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TablePagination,
} from '@mui/material';

import { useAppStore } from '../lib/store';

const APP_NAME = 'BetterMediaInfo';

export default function About() {
  const [propertyFilter, setPropertyFilter] = useState('');
  const [debouncedPropertyFilter, setDebouncedPropertyFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mediaInfoAbout = useAppStore((state) => state.mediaInfoAbout);
  const mediaInfoParameters = useAppStore((state) => state.mediaInfoParameters);
  const initAbout = useAppStore((state) => state.initAbout);
  const initParameters = useAppStore((state) => state.initParameters);

  useEffect(() => {
    initAbout();
    initParameters();
  }, [initAbout, initParameters]);

  // Debounce property filter
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedPropertyFilter(propertyFilter);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [propertyFilter]);

  const streams = useMemo(() => {
    return [...new Set(mediaInfoParameters.map((parameter) => parameter.stream))];
  }, [mediaInfoParameters]);

  const filteredParameters = useMemo(() => {
    const propertyFilterLowerCased = debouncedPropertyFilter ? debouncedPropertyFilter.toLowerCase() : null;
    return mediaInfoParameters.filter((parameter) => {
      let hit = true;
      if (streamFilter !== null) {
        hit = parameter.stream === streamFilter;
      }
      if (hit && propertyFilterLowerCased) {
        hit = parameter.property.toLowerCase().includes(propertyFilterLowerCased);
      }
      return hit;
    });
  }, [mediaInfoParameters, streamFilter, debouncedPropertyFilter]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedPropertyFilter, streamFilter]);

  const paginatedParameters = useMemo(() => {
    return filteredParameters.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredParameters, page, rowsPerPage]);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ textAlign: 'right' }}>
          {APP_NAME}
        </Typography>
        <Typography variant="body2">v{mediaInfoAbout?.appVersion ?? ''}</Typography>

        <Typography variant="body2" sx={{ textAlign: 'right' }}>
          MediaInfoLib
        </Typography>
        <Typography variant="body2">
          v{mediaInfoAbout?.mediaInfoVersion.replace(/[^0-9.]+/g, '') ?? ''}
        </Typography>

        <Typography variant="body2" sx={{ textAlign: 'right' }}>
          Author
        </Typography>
        <Typography variant="body2">
          <Link href="https://github.com/caoccao" target="_blank" rel="noopener noreferrer">
            Sam Cao
          </Link>
        </Typography>

        <Typography variant="body2" sx={{ textAlign: 'right' }}>
          Github
        </Typography>
        <Typography variant="body2">
          <Link href="https://github.com/caoccao/BetterMediaInfo" target="_blank" rel="noopener noreferrer">
            https://github.com/caoccao/BetterMediaInfo
          </Link>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={streamFilter ?? ''}
            onChange={(e) => setStreamFilter(e.target.value || null)}
            displayEmpty
          >
            <MenuItem value="">All Streams</MenuItem>
            {streams.map((stream) => (
              <MenuItem key={stream} value={stream}>
                {stream}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          placeholder="Property"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 'bold' }}>
                ID
              </TableCell>
              <TableCell sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 'bold' }}>
                Stream
              </TableCell>
              <TableCell sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 'bold' }}>
                Property
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedParameters.map((parameter) => (
              <TableRow key={parameter.id}>
                <TableCell>{parameter.id}</TableCell>
                <TableCell>{parameter.stream}</TableCell>
                <TableCell>{parameter.property}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredParameters.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 15, 20]}
        size="small"
      />
    </Box>
  );
}
