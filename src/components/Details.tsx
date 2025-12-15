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

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Checkbox,
  IconButton,
  Tooltip,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  FormControlLabel,
  Chip,
  CircularProgress,
} from '@mui/material';
import JavascriptIcon from '@mui/icons-material/Javascript';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RemoveDoneIcon from '@mui/icons-material/RemoveDone';
import * as Protocol from '../lib/protocol';
import { useAppStore } from '../lib/store';

interface DetailsProps {
  file: string;
}

const STREAM_KIND_COLORS: Record<Protocol.StreamKind, string> = {
  [Protocol.StreamKind.General]: '#84cc16',
  [Protocol.StreamKind.Video]: '#f97316',
  [Protocol.StreamKind.Audio]: '#f59e0b',
  [Protocol.StreamKind.Text]: '#10b981',
  [Protocol.StreamKind.Other]: '#a3a3a3',
  [Protocol.StreamKind.Image]: '#0ea5e9',
  [Protocol.StreamKind.Menu]: '#6366f1',
  [Protocol.StreamKind.Max]: '#84cc16',
};

export default function Details({ file }: DetailsProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [streamGroup, setStreamGroup] = useState<Protocol.StreamKind[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mediaFileToAllPropertiesMap = useAppStore((state) => state.mediaFileToAllPropertiesMap);
  const mediaFileToStreamCountMap = useAppStore((state) => state.mediaFileToStreamCountMap);
  const setDialogJsonCode = useAppStore((state) => state.setDialogJsonCode);

  const allProperties = useMemo(() => {
    return mediaFileToAllPropertiesMap.get(file) ?? [];
  }, [mediaFileToAllPropertiesMap, file]);

  const streamCountMap = useMemo(() => {
    return mediaFileToStreamCountMap.get(file) ?? new Map();
  }, [mediaFileToStreamCountMap, file]);

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Initialize stream group when streamCountMap changes
  useEffect(() => {
    setStreamGroup([...streamCountMap.keys()]);
  }, [streamCountMap]);

  const filteredAllProperties = useMemo(() => {
    return allProperties
      .map((properties) => {
        let newProperties = properties;
        if (debouncedQuery && debouncedQuery.length > 0) {
          const lowerCasedQuery = debouncedQuery.toLowerCase();
          const propertyMap: Record<string, string> = {};
          Object.entries(properties.propertyMap).forEach(([key, value]) => {
            if (
              key.toLowerCase().includes(lowerCasedQuery) ||
              value.toLowerCase().includes(lowerCasedQuery)
            ) {
              propertyMap[key] = value;
            }
          });
          newProperties = {
            stream: properties.stream,
            num: properties.num,
            propertyMap: propertyMap,
          };
        }
        return newProperties;
      })
      .filter((properties) => Object.keys(properties.propertyMap).length > 0);
  }, [allProperties, debouncedQuery]);

  const handleSelectAll = () => {
    setStreamGroup([...streamCountMap.keys()]);
  };

  const handleSelectNone = () => {
    setStreamGroup([]);
  };

  const handleStreamToggle = (stream: Protocol.StreamKind) => {
    setStreamGroup((prev) =>
      prev.includes(stream) ? prev.filter((s) => s !== stream) : [...prev, stream]
    );
  };

  const openDialogJsonCode = () => {
    setDialogJsonCode({
      title: `${file} (All Properties)`,
      jsonCode: allProperties ?? null,
    });
  };

  const buttonSx = { width: 28, height: 28 };

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Card variant="outlined">
        <CardHeader
          title={<Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{file}</Typography>}
          action={
            <Tooltip title="Json">
              <span>
                <IconButton size="small" onClick={openDialogJsonCode} disabled={allProperties.length === 0}>
                  <JavascriptIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          }
          sx={{ pb: 0 }}
        />
        <CardContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
            <Tooltip title="Select All">
              <span>
                <IconButton
                  size="small"
                  sx={buttonSx}
                  onClick={handleSelectAll}
                  disabled={streamCountMap.size === streamGroup.length}
                >
                  <DoneAllIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Select None">
              <span>
                <IconButton
                  size="small"
                  sx={buttonSx}
                  onClick={handleSelectNone}
                  disabled={streamGroup.length === 0}
                >
                  <RemoveDoneIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ml: 1 }}>
              {Protocol.STREAM_KINDS.map((streamKind) => {
                const count = streamCountMap.get(streamKind)?.count ?? 0;
                if (count === 0) return null;
                return (
                  <FormControlLabel
                    key={streamKind}
                    control={
                      <Checkbox
                        size="small"
                        checked={streamGroup.includes(streamKind)}
                        onChange={() => handleStreamToggle(streamKind)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption">{streamKind}</Typography>
                        <Chip label={count} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                      </Box>
                    }
                  />
                );
              })}
            </Box>
          </Box>
          <TextField
            placeholder="Filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
          />
        </CardContent>
      </Card>

      {allProperties.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={30} />
        </Box>
      ) : filteredAllProperties.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <img src="images/empty.gif" alt="Not Found" />
        </Box>
      ) : (
        filteredAllProperties.map((properties) =>
          streamGroup.includes(properties.stream) ? (
            <Card key={`${properties.stream}-${properties.num}`} variant="outlined">
              <CardHeader
                title={
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {properties.stream} ({properties.num + 1})
                  </Typography>
                }
                sx={{ pb: 0, pt: 1 }}
              />
              <CardContent sx={{ pt: 0.5 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            bgcolor: `${STREAM_KIND_COLORS[properties.stream]}20`,
                            fontWeight: 'bold',
                          }}
                        >
                          Property
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: `${STREAM_KIND_COLORS[properties.stream]}20`,
                            fontWeight: 'bold',
                          }}
                        >
                          Value
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(properties.propertyMap)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([property, value]) => (
                          <TableRow key={property}>
                            <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {property}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {value}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ) : null
        )
      )}
    </Box>
  );
}
