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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BrightnessAuto as AutoIcon,
  Clear as ClearIcon,
  ClosedCaption as SubtitleIcon,
  DarkMode as DarkIcon,
  Description as TemplatesIcon,
  Extension as IntegrationIcon,
  FolderOpen as FolderIcon,
  Image as ImageIcon,
  Info as GeneralIcon,
  LightMode as LightIcon,
  MenuBook as MenuStreamIcon,
  MoreHoriz as OtherIcon,
  MusicNote as AudioIcon,
  Notes as DetailViewIcon,
  Palette as AppearanceIcon,
  Tune as FormatIcon,
  Update as UpdateIcon,
  VideoFile as VideoIcon,
  ViewAgenda as CardViewIcon,
} from '@mui/icons-material';
import { open } from '@tauri-apps/plugin-dialog';
import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import * as Protocol from '../lib/protocol';
import {
  areExtensionsContextMenuRegistered,
  isBatchMkvExtractFound,
  isBDMasterFound,
  isMpcHcFound,
  isFolderContextMenuRegistered,
  isMkvtoolnixFound,
  registerExtensionsContextMenu,
  registerFolderContextMenu,
  setConfig as saveConfig,
  unregisterExtensionsContextMenu,
  unregisterFolderContextMenu,
} from '../lib/service';
import { useAppStore } from '../lib/store';
import { changeLanguage } from '../i18n';

enum ConfigTab {
  Appearance = 'Appearance',
  FileExtensions = 'FileExtensions',
  Formatting = 'Formatting',
  Integration = 'Integration',
  Templates = 'Templates',
  Update = 'Update',
}

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

const TEMPLATE_STREAM_KINDS: Protocol.StreamKind[] = [
  Protocol.StreamKind.General,
  Protocol.StreamKind.Video,
  Protocol.StreamKind.Audio,
  Protocol.StreamKind.Text,
  Protocol.StreamKind.Other,
  Protocol.StreamKind.Image,
  Protocol.StreamKind.Menu,
];

const STREAM_KIND_TO_TEMPLATE_KEY: Record<Protocol.StreamKind, keyof Protocol.ConfigTemplates | null> = {
  [Protocol.StreamKind.General]: 'general',
  [Protocol.StreamKind.Video]: 'video',
  [Protocol.StreamKind.Audio]: 'audio',
  [Protocol.StreamKind.Text]: 'text',
  [Protocol.StreamKind.Other]: 'other',
  [Protocol.StreamKind.Image]: 'image',
  [Protocol.StreamKind.Menu]: 'menu',
  [Protocol.StreamKind.Max]: null,
};

function emptyTemplates(): Protocol.ConfigTemplates {
  return {
    general: { properties: [] },
    video: { properties: [] },
    audio: { properties: [] },
    text: { properties: [] },
    other: { properties: [] },
    image: { properties: [] },
    menu: { properties: [] },
  };
}

const LEFT_CONTAINER_ID = 'templates-left-container';
const RIGHT_CONTAINER_ID = 'templates-right-container';

// Disable sortable's auto-shifting so the drop indicator is the sole visual cue.
const noShiftStrategy = () => null;

// Pointer-first detection: reflects what the user is actually pointing at,
// so dragging from left into the right pane reliably resolves to the right
// container droppable instead of being pulled back to a nearby left row by
// closestCenter's source-bias.
const templateCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  const rectHits = rectIntersection(args);
  if (rectHits.length > 0) return rectHits;
  return closestCenter(args);
};

function templateRowSx(isDragging: boolean) {
  return {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    cursor: 'grab',
    userSelect: 'none',
    opacity: isDragging ? 0.4 : 1,
    '&:hover': { bgcolor: 'action.hover' },
  } as const;
}

const templateCheckCellSx = {
  width: 40,
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const templatePropCellSx = {
  flex: '1 1 0',
  minWidth: 0,
  px: 1,
  py: 0.5,
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.8125rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

function DropIndicator({ position }: { position: 'top' | 'bottom' }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        [position]: -1,
        height: 2,
        bgcolor: 'primary.main',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    />
  );
}

function SortableLeftRow({
  property,
  checked,
  onCheck,
  isActive,
  showIndicator,
}: {
  property: string;
  checked: boolean;
  onCheck: (next: boolean) => void;
  isActive: boolean;
  showIndicator: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `L:${property}`,
  });
  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      sx={{ ...templateRowSx(isActive), position: 'relative' }}
    >
      {showIndicator && <DropIndicator position="top" />}
      <Box onPointerDown={(e) => e.stopPropagation()} sx={templateCheckCellSx}>
        <Checkbox size="small" checked={checked} onChange={(e) => onCheck(e.target.checked)} />
      </Box>
      <Box sx={templatePropCellSx}>{property}</Box>
    </Box>
  );
}

function DraggableRightRow({
  property,
  checked,
  onCheck,
  isActive,
}: {
  property: string;
  checked: boolean;
  onCheck: (next: boolean) => void;
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `R:${property}` });
  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={templateRowSx(isActive)}
    >
      <Box onPointerDown={(e) => e.stopPropagation()} sx={templateCheckCellSx}>
        <Checkbox size="small" checked={checked} onChange={(e) => onCheck(e.target.checked)} />
      </Box>
      <Box sx={templatePropCellSx}>{property}</Box>
    </Box>
  );
}

function TemplateTableHeader({
  label,
  checked,
  indeterminate,
  onToggle,
  disabled,
}: {
  label: string;
  checked: boolean;
  indeterminate: boolean;
  onToggle: (next: boolean) => void;
  disabled: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      <Box sx={templateCheckCellSx}>
        <Checkbox
          size="small"
          disabled={disabled}
          checked={checked}
          indeterminate={indeterminate}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </Box>
      <Box sx={{ ...templatePropCellSx, py: 0.75, fontWeight: 600 }}>{label}</Box>
    </Box>
  );
}

function LeftDropArea({
  leftProperties,
  leftSelection,
  onToggle,
  activeId,
  overId,
  dragSet,
}: {
  leftProperties: string[];
  leftSelection: Set<string>;
  onToggle: (property: string, next: boolean) => void;
  activeId: string | null;
  overId: string | null;
  dragSet: string[];
}) {
  const { setNodeRef } = useDroppable({ id: LEFT_CONTAINER_ID });
  const leftIds = useMemo(() => leftProperties.map((p) => `L:${p}`), [leftProperties]);
  const dragSetSet = useMemo(() => new Set(dragSet), [dragSet]);
  const showContainerIndicator =
    activeId !== null && overId === LEFT_CONTAINER_ID;
  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        minHeight: 80,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <SortableContext items={leftIds} strategy={noShiftStrategy}>
        {leftProperties.map((property) => (
          <SortableLeftRow
            key={property}
            property={property}
            checked={leftSelection.has(property)}
            onCheck={(next) => onToggle(property, next)}
            isActive={activeId === `L:${property}`}
            showIndicator={
              activeId !== null &&
              overId === `L:${property}` &&
              !dragSetSet.has(property)
            }
          />
        ))}
      {showContainerIndicator && (
        <Box sx={{ position: 'relative', height: 2 }}>
          <DropIndicator position="top" />
        </Box>
      )}
      </SortableContext>
    </Box>
  );
}

function TemplatesPanelBody({
  streamKind,
  group,
  onChange,
}: {
  streamKind: Protocol.StreamKind;
  group: Protocol.ConfigTemplateGroup;
  onChange: (group: Protocol.ConfigTemplateGroup) => void;
}) {
  const { t } = useTranslation();
  const mediaInfoParameters = useAppStore((state) => state.mediaInfoParameters);
  const initParameters = useAppStore((state) => state.initParameters);

  useEffect(() => {
    if (mediaInfoParameters.length === 0) {
      initParameters();
    }
  }, [mediaInfoParameters.length, initParameters]);

  const availableProperties = useMemo(
    () =>
      mediaInfoParameters
        .filter((p) => p.stream === streamKind)
        .map((p) => p.property)
        .sort((a, b) => a.localeCompare(b)),
    [mediaInfoParameters, streamKind],
  );

  const leftProperties = group.properties;

  const [filter, setFilter] = useState('');
  const [leftSelection, setLeftSelection] = useState<Set<string>>(() => new Set());
  const [rightSelection, setRightSelection] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragSetRef = useRef<string[]>([]);

  // Drop stale selections when underlying lists change.
  useEffect(() => {
    setLeftSelection((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set(leftProperties);
      const next = new Set<string>();
      let changed = false;
      prev.forEach((p) => {
        if (valid.has(p)) next.add(p);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [leftProperties]);

  useEffect(() => {
    setRightSelection((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set(availableProperties);
      const next = new Set<string>();
      let changed = false;
      prev.forEach((p) => {
        if (valid.has(p)) next.add(p);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [availableProperties]);

  const filteredRight = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return availableProperties;
    return availableProperties.filter((p) => p.toLowerCase().includes(f));
  }, [availableProperties, filter]);

  const handleToggleLeft = useCallback((property: string, next: boolean) => {
    setLeftSelection((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(property);
      else updated.delete(property);
      return updated;
    });
  }, []);

  const handleToggleRight = useCallback((property: string, next: boolean) => {
    setRightSelection((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(property);
      else updated.delete(property);
      return updated;
    });
  }, []);

  const handleToggleAllLeft = useCallback(
    (next: boolean) => {
      setLeftSelection((prev) => {
        const updated = new Set(prev);
        if (next) leftProperties.forEach((p) => updated.add(p));
        else leftProperties.forEach((p) => updated.delete(p));
        return updated;
      });
    },
    [leftProperties],
  );

  const handleToggleAllRight = useCallback(
    (next: boolean) => {
      setRightSelection((prev) => {
        const updated = new Set(prev);
        if (next) filteredRight.forEach((p) => updated.add(p));
        else filteredRight.forEach((p) => updated.delete(p));
        return updated;
      });
    },
    [filteredRight],
  );

  const handleAddAll = useCallback(() => {
    if (filteredRight.length === 0) return;
    const existing = new Set(leftProperties);
    const toAdd = filteredRight.filter((p) => !existing.has(p));
    if (toAdd.length === 0) return;
    onChange({ properties: [...leftProperties, ...toAdd] });
  }, [filteredRight, leftProperties, onChange]);

  const handleRemoveAll = useCallback(() => {
    if (leftProperties.length === 0) return;
    onChange({ properties: [] });
  }, [leftProperties, onChange]);

  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const { setNodeRef: setRightDropNode } = useDroppable({ id: RIGHT_CONTAINER_ID });
  const attachRightPaneRef = useCallback(
    (node: HTMLDivElement | null) => {
      rightPaneRef.current = node;
      setRightDropNode(node);
    },
    [setRightDropNode],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      const source = id.startsWith('L:') ? 'left' : 'right';
      const prop = id.slice(2);
      if (source === 'left') {
        if (leftSelection.size > 0 && leftSelection.has(prop)) {
          dragSetRef.current = leftProperties.filter((p) => leftSelection.has(p));
        } else {
          dragSetRef.current = [prop];
        }
      } else {
        if (rightSelection.size > 0 && rightSelection.has(prop)) {
          dragSetRef.current = availableProperties.filter((p) => rightSelection.has(p));
        } else {
          dragSetRef.current = [prop];
        }
      }
      setActiveId(id);
    },
    [leftSelection, rightSelection, leftProperties, availableProperties],
  );

  const resetDrag = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    dragSetRef.current = [];
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, activatorEvent, delta } = event;
      const activeIdStr = String(active.id);
      const source = activeIdStr.startsWith('L:') ? 'left' : 'right';
      const dragSet = dragSetRef.current.slice();
      const overId = over ? String(over.id) : null;
      const overInLeft = overId === LEFT_CONTAINER_ID || (overId?.startsWith('L:') ?? false);

      // Hit-test the pointer against the right pane's bounding rect directly.
      // dnd-kit's collision detection can be biased toward the source's side
      // when DragOverlay + a SortableContext are involved, so we don't rely
      // on overId alone to decide the "drop on right pane" case.
      let droppedOnRightPane = overId === RIGHT_CONTAINER_ID;
      if (!droppedOnRightPane && rightPaneRef.current) {
        const evt = activatorEvent as { clientX?: number; clientY?: number } | undefined;
        if (evt && typeof evt.clientX === 'number' && typeof evt.clientY === 'number') {
          const dropX = evt.clientX + delta.x;
          const dropY = evt.clientY + delta.y;
          const rect = rightPaneRef.current.getBoundingClientRect();
          droppedOnRightPane =
            dropX >= rect.left &&
            dropX <= rect.right &&
            dropY >= rect.top &&
            dropY <= rect.bottom;
        }
      }

      resetDrag();

      if (dragSet.length === 0) return;

      if (source === 'right') {
        if (!overInLeft || droppedOnRightPane) return;
        let targetIndex = leftProperties.length;
        if (overId && overId.startsWith('L:')) {
          const overProp = overId.slice(2);
          const idx = leftProperties.indexOf(overProp);
          targetIndex = idx >= 0 ? idx : leftProperties.length;
        }
        const existing = new Set(leftProperties);
        const toAdd = dragSet.filter((p) => !existing.has(p));
        if (toAdd.length === 0) return;
        const next = [
          ...leftProperties.slice(0, targetIndex),
          ...toAdd,
          ...leftProperties.slice(targetIndex),
        ];
        onChange({ properties: next });
        setRightSelection(new Set());
        return;
      }

      // source === 'left'
      if (droppedOnRightPane) {
        const remove = new Set(dragSet);
        const next = leftProperties.filter((p) => !remove.has(p));
        if (next.length === leftProperties.length) return;
        onChange({ properties: next });
        setLeftSelection(new Set());
        return;
      }
      if (!overInLeft) return;

      let targetIndex = leftProperties.length;
      if (overId && overId.startsWith('L:')) {
        const overProp = overId.slice(2);
        if (dragSet.includes(overProp)) return;
        const idx = leftProperties.indexOf(overProp);
        if (idx < 0) return;
        targetIndex = idx;
      }
      const dragSetMembers = new Set(dragSet);
      const remaining = leftProperties.filter((p) => !dragSetMembers.has(p));
      const removedBefore = leftProperties
        .slice(0, targetIndex)
        .reduce((acc, p) => (dragSetMembers.has(p) ? acc + 1 : acc), 0);
      const adjusted = targetIndex - removedBefore;
      const next = [
        ...remaining.slice(0, adjusted),
        ...dragSet,
        ...remaining.slice(adjusted),
      ];
      if (
        next.length === leftProperties.length &&
        next.every((p, i) => p === leftProperties[i])
      ) {
        return;
      }
      onChange({ properties: next });
    },
    [leftProperties, onChange, resetDrag],
  );

  const leftCheckedCount = useMemo(
    () => leftProperties.reduce((acc, p) => (leftSelection.has(p) ? acc + 1 : acc), 0),
    [leftProperties, leftSelection],
  );
  const leftAllChecked = leftProperties.length > 0 && leftCheckedCount === leftProperties.length;
  const leftSomeChecked = leftCheckedCount > 0 && leftCheckedCount < leftProperties.length;

  const filteredRightSize = filteredRight.length;
  const rightCheckedInFiltered = useMemo(
    () => filteredRight.reduce((acc, p) => (rightSelection.has(p) ? acc + 1 : acc), 0),
    [filteredRight, rightSelection],
  );
  const rightAllChecked = filteredRightSize > 0 && rightCheckedInFiltered === filteredRightSize;
  const rightSomeChecked = rightCheckedInFiltered > 0 && rightCheckedInFiltered < filteredRightSize;

  const overlayProperty = activeId ? activeId.slice(2) : null;
  const overlayCount = activeId ? dragSetRef.current.length : 0;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={t('config.filter')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              endAdornment: filter ? (
                <InputAdornment position="end">
                  <Tooltip title={t('config.clear')}>
                    <IconButton
                      size="small"
                      aria-label={t('config.clear')}
                      onClick={() => setFilter('')}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleAddAll}
          disabled={filteredRight.length === 0}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 36 }}
        >
          {t('config.addAll')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handleRemoveAll}
          disabled={leftProperties.length === 0}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap', height: 36 }}
        >
          {t('config.removeAll')}
        </Button>
      </Box>
      <DndContext
        sensors={sensors}
        collisionDetection={templateCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={resetDrag}
      >
        <Box sx={{ display: 'flex', gap: 1, flex: 1, minHeight: 0 }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <TemplateTableHeader
              label={t('config.property')}
              checked={leftAllChecked}
              indeterminate={leftSomeChecked}
              onToggle={handleToggleAllLeft}
              disabled={leftProperties.length === 0}
            />
            <LeftDropArea
              leftProperties={leftProperties}
              leftSelection={leftSelection}
              onToggle={handleToggleLeft}
              activeId={activeId}
              overId={overId}
              dragSet={dragSetRef.current}
            />
          </Box>
          <Box
            ref={attachRightPaneRef}
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor:
                activeId?.startsWith('L:') && overId === RIGHT_CONTAINER_ID
                  ? 'action.selected'
                  : undefined,
              transition: 'background-color 120ms',
            }}
          >
            <TemplateTableHeader
              label={t('config.availableProperty')}
              checked={rightAllChecked}
              indeterminate={rightSomeChecked}
              onToggle={handleToggleAllRight}
              disabled={filteredRightSize === 0}
            />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {filteredRight.map((property) => (
                <DraggableRightRow
                  key={property}
                  property={property}
                  checked={rightSelection.has(property)}
                  onCheck={(next) => handleToggleRight(property, next)}
                  isActive={activeId === `R:${property}`}
                />
              ))}
            </Box>
          </Box>
        </Box>
        <DragOverlay dropAnimation={null}>
          {overlayProperty ? (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
                boxShadow: 4,
                fontSize: '0.8125rem',
              }}
            >
              <span>{overlayProperty}</span>
              {overlayCount > 1 && (
                <Typography variant="caption" color="text.secondary">
                  +{overlayCount - 1}
                </Typography>
              )}
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: 'block', textAlign: 'center' }}
      >
        {t('config.templatesInstruction')}
      </Typography>
    </Box>
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
  const [mkvPriority, setMkvPriority] = useState<Protocol.MkvPriority>(Protocol.MkvPriority.Lowest);
  const [mkvtoolnixFound, setMkvtoolnixFound] = useState(false);
  const [batchMkvExtractPath, setBatchMkvExtractPath] = useState('');
  const [batchMkvExtractFound, setBatchMkvExtractFound] = useState(false);
  const [bdMasterPath, setBdMasterPath] = useState('');
  const [bdMasterFound, setBdMasterFound] = useState(false);
  const [mpcHcPath, setMpcHcPath] = useState('');
  const [mpcHcFound, setMpcHcFound] = useState(false);
  const [cardViewShowGeneral, setCardViewShowGeneral] = useState(true);
  const [cardViewShowVideo, setCardViewShowVideo] = useState(true);
  const [cardViewShowAudio, setCardViewShowAudio] = useState(true);
  const [cardViewShowSubtitle, setCardViewShowSubtitle] = useState(true);
  const [cardViewShowMenu, setCardViewShowMenu] = useState(false);
  const [detailViewShowGeneral, setDetailViewShowGeneral] = useState(true);
  const [detailViewShowVideo, setDetailViewShowVideo] = useState(true);
  const [detailViewShowAudio, setDetailViewShowAudio] = useState(true);
  const [detailViewShowSubtitle, setDetailViewShowSubtitle] = useState(true);
  const [detailViewShowMenu, setDetailViewShowMenu] = useState(true);
  const [videoContextMenuRegistered, setVideoContextMenuRegistered] = useState(false);
  const [audioContextMenuRegistered, setAudioContextMenuRegistered] = useState(false);
  const [imageContextMenuRegistered, setImageContextMenuRegistered] = useState(false);
  const [folderContextMenuRegistered, setFolderContextMenuRegistered] = useState(false);
  const isWindows = useMemo(() => typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent), []);
  const [updateCheckInterval, setUpdateCheckInterval] = useState<Protocol.UpdateCheckInterval>(Protocol.UpdateCheckInterval.Weekly);
  const [mainTab, setMainTab] = useState<ConfigTab>(ConfigTab.Appearance);
  const [formatTab, setFormatTab] = useState(0);
  const [fileExtensionsTab, setFileExtensionsTab] = useState(0);
  const [templatesTab, setTemplatesTab] = useState(0);
  const [templates, setTemplates] = useState<Protocol.ConfigTemplates>(() => emptyTemplates());
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mkvToolNixCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const batchMkvExtractCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bdMasterCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mpcHcCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
      setMkvPriority(config.mkv?.priority ?? Protocol.MkvPriority.Lowest);
      setBatchMkvExtractPath(config.batchMkvExtract?.path ?? '');
      setBdMasterPath(config.bdMaster?.path ?? '');
      setMpcHcPath(config.mpcHc?.path ?? '');
      setCardViewShowGeneral(config.view?.card?.showGeneral ?? true);
      setCardViewShowVideo(config.view?.card?.showVideo ?? true);
      setCardViewShowAudio(config.view?.card?.showAudio ?? true);
      setCardViewShowSubtitle(config.view?.card?.showSubtitle ?? true);
      setCardViewShowMenu(config.view?.card?.showMenu ?? false);
      setDetailViewShowGeneral(config.view?.detail?.showGeneral ?? true);
      setDetailViewShowVideo(config.view?.detail?.showVideo ?? true);
      setDetailViewShowAudio(config.view?.detail?.showAudio ?? true);
      setDetailViewShowSubtitle(config.view?.detail?.showSubtitle ?? true);
      setDetailViewShowMenu(config.view?.detail?.showMenu ?? true);
      setUpdateCheckInterval(config.update?.checkInterval ?? Protocol.UpdateCheckInterval.Weekly);
      setTemplates({
        general: { properties: config.templates?.general?.properties ?? [] },
        video: { properties: config.templates?.video?.properties ?? [] },
        audio: { properties: config.templates?.audio?.properties ?? [] },
        text: { properties: config.templates?.text?.properties ?? [] },
        other: { properties: config.templates?.other?.properties ?? [] },
        image: { properties: config.templates?.image?.properties ?? [] },
        menu: { properties: config.templates?.menu?.properties ?? [] },
      });
    }
  }, [config]);

  // Reset initialization flag when component unmounts so it reinitializes on next mount
  useEffect(() => {
    return () => {
      isInitializedRef.current = false;
    };
  }, []);

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
    mkv: { mkvToolNixPath, priority: mkvPriority },
    batchMkvExtract: { path: batchMkvExtractPath },
    bdMaster: { path: bdMasterPath },
    mpcHc: { path: mpcHcPath },
    view: {
      card: {
        showGeneral: cardViewShowGeneral,
        showVideo: cardViewShowVideo,
        showAudio: cardViewShowAudio,
        showSubtitle: cardViewShowSubtitle,
        showMenu: cardViewShowMenu,
      },
      detail: {
        showGeneral: detailViewShowGeneral,
        showVideo: detailViewShowVideo,
        showAudio: detailViewShowAudio,
        showSubtitle: detailViewShowSubtitle,
        showMenu: detailViewShowMenu,
      },
    },
    update: { checkInterval: updateCheckInterval, lastChecked: config?.update?.lastChecked ?? 0, lastVersion: config?.update?.lastVersion ?? '', ignoreVersion: config?.update?.ignoreVersion ?? '' },
    window: config?.window ?? { position: { x: -1, y: -1 }, size: { width: 1200, height: 900 } },
    templates,
  });

  const handleBrowseMkvToolNixPath = async () => {
    const directory = await open({
      directory: true,
      defaultPath: mkvToolNixPath.trim() || undefined,
    });
    if (typeof directory === 'string' && directory.length > 0) {
      setMkvToolNixPath(directory);
    }
  };

  // Load initial context menu registration state on Windows
  useEffect(() => {
    if (!isWindows) return;
    const videoExts = convertFileExtensions(fileExtensionsVideo);
    const audioExts = convertFileExtensions(fileExtensionsAudio);
    const imageExts = convertFileExtensions(fileExtensionsImage);
    areExtensionsContextMenuRegistered(videoExts).then(setVideoContextMenuRegistered).catch(() => {});
    areExtensionsContextMenuRegistered(audioExts).then(setAudioContextMenuRegistered).catch(() => {});
    areExtensionsContextMenuRegistered(imageExts).then(setImageContextMenuRegistered).catch(() => {});
    isFolderContextMenuRegistered().then(setFolderContextMenuRegistered).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWindows, fileExtensionsVideo, fileExtensionsAudio, fileExtensionsImage]);

  const handleRegisterExtensionsContextMenu = async (
    extensions: string[],
    setRegistered: (v: boolean) => void,
  ) => {
    try {
      await registerExtensionsContextMenu(extensions);
      setRegistered(true);
      setDialogNotification({
        title: t('config.contextMenuRegistered'),
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: error ? error.toString() : t('config.contextMenuFailed'),
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };

  const handleUnregisterExtensionsContextMenu = async (
    extensions: string[],
    setRegistered: (v: boolean) => void,
  ) => {
    try {
      await unregisterExtensionsContextMenu(extensions);
      setRegistered(false);
      setDialogNotification({
        title: t('config.contextMenuUnregistered'),
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: error ? error.toString() : t('config.contextMenuFailed'),
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };

  const handleRegisterFolderContextMenu = async () => {
    try {
      await registerFolderContextMenu();
      setFolderContextMenuRegistered(true);
      setDialogNotification({
        title: t('config.contextMenuRegistered'),
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: error ? error.toString() : t('config.contextMenuFailed'),
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };

  const handleUnregisterFolderContextMenu = async () => {
    try {
      await unregisterFolderContextMenu();
      setFolderContextMenuRegistered(false);
      setDialogNotification({
        title: t('config.contextMenuUnregistered'),
        type: Protocol.DialogNotificationType.Info,
      });
    } catch (error) {
      setDialogNotification({
        title: error ? error.toString() : t('config.contextMenuFailed'),
        type: Protocol.DialogNotificationType.Error,
      });
    }
  };


  const handleBrowseBatchMkvExtractPath = async () => {
    const directory = await open({
      directory: true,
      defaultPath: batchMkvExtractPath.trim() || undefined,
    });
    if (typeof directory === 'string' && directory.length > 0) {
      setBatchMkvExtractPath(directory);
    }
  };

  const handleDetectBatchMkvExtract = async () => {
    try {
      const status = await isBatchMkvExtractFound(batchMkvExtractPath.trim(), true);
      setBatchMkvExtractFound(status.found);
      if (status.found && status.path && status.path !== batchMkvExtractPath) {
        setBatchMkvExtractPath(status.path);
      }
    } catch {
      setBatchMkvExtractFound(false);
    }
  };

  const handleBrowseBdMasterPath = async () => {
    const directory = await open({
      directory: true,
      defaultPath: bdMasterPath.trim() || undefined,
    });
    if (typeof directory === 'string' && directory.length > 0) {
      setBdMasterPath(directory);
    }
  };

  const handleDetectBdMaster = async () => {
    try {
      const status = await isBDMasterFound(bdMasterPath.trim(), true);
      setBdMasterFound(status.found);
      if (status.found && status.path && status.path !== bdMasterPath) {
        setBdMasterPath(status.path);
      }
    } catch {
      setBdMasterFound(false);
    }
  };

  const handleBrowseMpcHcPath = async () => {
    const directory = await open({
      directory: true,
      defaultPath: mpcHcPath.trim() || undefined,
    });
    if (typeof directory === 'string' && directory.length > 0) {
      setMpcHcPath(directory);
    }
  };

  const handleDetectMpcHc = async () => {
    try {
      const status = await isMpcHcFound(mpcHcPath.trim(), true);
      setMpcHcFound(status.found);
      if (status.found && status.path && status.path !== mpcHcPath) {
        setMpcHcPath(status.path);
      }
    } catch {
      setMpcHcFound(false);
    }
  };

  const handleDetectMkvToolNix = async () => {
    try {
      const status = await isMkvtoolnixFound(mkvToolNixPath.trim(), true);
      setMkvtoolnixFound(status.found);
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
    } catch {
      setMkvtoolnixFound(false);
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
        const status = await isMkvtoolnixFound(mkvToolNixPath.trim());
        if (!isCancelled) {
          setMkvtoolnixFound(status.found);
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
          setMkvtoolnixFound(false);
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

  // Validate BatchMkvExtract path from backend.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (batchMkvExtractCheckDebounceRef.current) {
      clearTimeout(batchMkvExtractCheckDebounceRef.current);
    }
    let isCancelled = false;
    batchMkvExtractCheckDebounceRef.current = setTimeout(async () => {
      try {
        const status = await isBatchMkvExtractFound(batchMkvExtractPath.trim());
        if (!isCancelled) {
          setBatchMkvExtractFound(status.found);
        }
      } catch {
        if (!isCancelled) {
          setBatchMkvExtractFound(false);
        }
      }
    }, 250);
    return () => {
      isCancelled = true;
      if (batchMkvExtractCheckDebounceRef.current) {
        clearTimeout(batchMkvExtractCheckDebounceRef.current);
      }
    };
  }, [batchMkvExtractPath]);

  // Validate BDMaster path from backend.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (bdMasterCheckDebounceRef.current) {
      clearTimeout(bdMasterCheckDebounceRef.current);
    }
    let isCancelled = false;
    bdMasterCheckDebounceRef.current = setTimeout(async () => {
      try {
        const status = await isBDMasterFound(bdMasterPath.trim());
        if (!isCancelled) {
          setBdMasterFound(status.found);
        }
      } catch {
        if (!isCancelled) {
          setBdMasterFound(false);
        }
      }
    }, 250);
    return () => {
      isCancelled = true;
      if (bdMasterCheckDebounceRef.current) {
        clearTimeout(bdMasterCheckDebounceRef.current);
      }
    };
  }, [bdMasterPath]);

  // Validate MPC-HC path from backend.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (!isWindows) return;
    if (mpcHcCheckDebounceRef.current) {
      clearTimeout(mpcHcCheckDebounceRef.current);
    }
    let isCancelled = false;
    mpcHcCheckDebounceRef.current = setTimeout(async () => {
      try {
        const status = await isMpcHcFound(mpcHcPath.trim());
        if (!isCancelled) {
          setMpcHcFound(status.found);
        }
      } catch {
        if (!isCancelled) {
          setMpcHcFound(false);
        }
      }
    }, 250);
    return () => {
      isCancelled = true;
      if (mpcHcCheckDebounceRef.current) {
        clearTimeout(mpcHcCheckDebounceRef.current);
      }
    };
  }, [mpcHcPath, isWindows]);

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
  };

  // Auto-save: persist config to disk whenever any tracked value changes (debounced)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current);
    }
    autoSaveDebounceRef.current = setTimeout(async () => {
      try {
        const newConfig = await saveConfig(createConfig());
        setStoreConfig(newConfig);
      } catch (error) {
        setDialogNotification({
          title: error ? error.toString() : t('config.settingsSaveError'),
          type: Protocol.DialogNotificationType.Error,
        });
      }
    }, 500);
    return () => {
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appendOnFileDrop,
    displayMode,
    theme,
    language,
    directoryMode,
    fileExtensionsAudio,
    fileExtensionsImage,
    fileExtensionsVideo,
    videoFormat,
    audioFormat,
    subtitleFormat,
    mkvToolNixPath,
    mkvPriority,
    batchMkvExtractPath,
    bdMasterPath,
    mpcHcPath,
    cardViewShowGeneral,
    cardViewShowVideo,
    cardViewShowAudio,
    cardViewShowSubtitle,
    cardViewShowMenu,
    detailViewShowGeneral,
    detailViewShowVideo,
    detailViewShowAudio,
    detailViewShowSubtitle,
    detailViewShowMenu,
    updateCheckInterval,
    templates,
  ]);

  const getThemeDisplayLabel = (themeOption: Protocol.Theme): string => t(`config.theme${themeOption}`);

  const appearancePanel = (
    <Box>
      <SectionHeader icon={<AppearanceIcon fontSize="small" />} title={t('config.appearance')} />
      <SettingRow label={t('config.mode')}>
        <ToggleButtonGroup
          value={displayMode}
          exclusive
          onChange={(_e, value) => {
            if (value !== null) {
              setDisplayMode(value as Protocol.DisplayMode);
            }
          }}
          size="small"
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}
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
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, width: '100%' }}>
          <SectionHeader icon={<CardViewIcon fontSize="small" />} title={t('config.cardView')} />
          <Stack>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={cardViewShowGeneral}
                  onChange={(e) => setCardViewShowGeneral(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.general') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={cardViewShowVideo}
                  onChange={(e) => setCardViewShowVideo(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.video') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={cardViewShowAudio}
                  onChange={(e) => setCardViewShowAudio(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.audio') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={cardViewShowSubtitle}
                  onChange={(e) => setCardViewShowSubtitle(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.text') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={cardViewShowMenu}
                  onChange={(e) => setCardViewShowMenu(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.menu') })}
            />
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, width: '100%' }}>
          <SectionHeader icon={<DetailViewIcon fontSize="small" />} title={t('config.detailView')} />
          <Stack>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={detailViewShowGeneral}
                  onChange={(e) => setDetailViewShowGeneral(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.general') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={detailViewShowVideo}
                  onChange={(e) => setDetailViewShowVideo(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.video') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={detailViewShowAudio}
                  onChange={(e) => setDetailViewShowAudio(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.audio') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={detailViewShowSubtitle}
                  onChange={(e) => setDetailViewShowSubtitle(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.text') })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={detailViewShowMenu}
                  onChange={(e) => setDetailViewShowMenu(e.target.checked)}
                />
              }
              label={t('config.show', { name: t('config.menu') })}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );

  const fileExtensionsPanel = (
    <Box>
      <SectionHeader icon={<FolderIcon fontSize="small" />} title={t('config.fileExtensions')} />
      <SettingRow label={t('config.appendOnFileDrop')}>
        <Switch
          checked={appendOnFileDrop}
          onChange={(e) => {
            setAppendOnFileDrop(e.target.checked);
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
      <Tabs
        value={fileExtensionsTab}
        onChange={(_e, v) => setFileExtensionsTab(v)}
        sx={{ mt: 2, mb: 2, borderBottom: 1, borderColor: 'divider' }}
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
          icon={<AppearanceIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label={t('config.image')}
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
        {isWindows && (
          <Tab
            icon={<FolderIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={t('config.folder')}
            sx={{ minHeight: 36, textTransform: 'none' }}
          />
        )}
      </Tabs>
      {fileExtensionsTab === 0 && (
        <Stack spacing={1.5}>
          <TextField
            value={fileExtensionsVideo}
            onChange={(e) => setFileExtensionsVideo(e.target.value)}
            size="small"
            fullWidth
            placeholder="mp4, mkv, avi, mov..."
          />
          {isWindows && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                disabled={convertFileExtensions(fileExtensionsVideo).length === 0 || videoContextMenuRegistered}
                onClick={() => handleRegisterExtensionsContextMenu(
                  convertFileExtensions(fileExtensionsVideo),
                  setVideoContextMenuRegistered,
                )}
                sx={{ textTransform: 'none' }}
              >
                {t('config.registerContextMenu')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={!videoContextMenuRegistered}
                onClick={() => handleUnregisterExtensionsContextMenu(
                  convertFileExtensions(fileExtensionsVideo),
                  setVideoContextMenuRegistered,
                )}
                sx={{ textTransform: 'none' }}
              >
                {t('config.unregisterContextMenu')}
              </Button>
            </Box>
          )}
        </Stack>
      )}
      {fileExtensionsTab === 1 && (
        <Stack spacing={1.5}>
          <TextField
            value={fileExtensionsAudio}
            onChange={(e) => setFileExtensionsAudio(e.target.value)}
            size="small"
            fullWidth
            placeholder="mp3, flac, wav, aac..."
          />
          {isWindows && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                disabled={convertFileExtensions(fileExtensionsAudio).length === 0 || audioContextMenuRegistered}
                onClick={() => handleRegisterExtensionsContextMenu(
                  convertFileExtensions(fileExtensionsAudio),
                  setAudioContextMenuRegistered,
                )}
                sx={{ textTransform: 'none' }}
              >
                {t('config.registerContextMenu')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={!audioContextMenuRegistered}
                onClick={() => handleUnregisterExtensionsContextMenu(
                  convertFileExtensions(fileExtensionsAudio),
                  setAudioContextMenuRegistered,
                )}
                sx={{ textTransform: 'none' }}
              >
                {t('config.unregisterContextMenu')}
              </Button>
            </Box>
          )}
        </Stack>
      )}
      {fileExtensionsTab === 2 && (
        <Stack spacing={1.5}>
          <TextField
            value={fileExtensionsImage}
            onChange={(e) => setFileExtensionsImage(e.target.value)}
            size="small"
            fullWidth
            placeholder="jpg, png, gif, webp..."
          />
          {isWindows && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                disabled={convertFileExtensions(fileExtensionsImage).length === 0 || imageContextMenuRegistered}
                onClick={() => handleRegisterExtensionsContextMenu(
                  convertFileExtensions(fileExtensionsImage),
                  setImageContextMenuRegistered,
                )}
                sx={{ textTransform: 'none' }}
              >
                {t('config.registerContextMenu')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={!imageContextMenuRegistered}
                onClick={() => handleUnregisterExtensionsContextMenu(
                  convertFileExtensions(fileExtensionsImage),
                  setImageContextMenuRegistered,
                )}
                sx={{ textTransform: 'none' }}
              >
                {t('config.unregisterContextMenu')}
              </Button>
            </Box>
          )}
        </Stack>
      )}
      {fileExtensionsTab === 3 && isWindows && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            disabled={folderContextMenuRegistered}
            onClick={handleRegisterFolderContextMenu}
            sx={{ textTransform: 'none' }}
          >
            {t('config.registerFolderContextMenu')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={!folderContextMenuRegistered}
            onClick={handleUnregisterFolderContextMenu}
            sx={{ textTransform: 'none' }}
          >
            {t('config.unregisterFolderContextMenu')}
          </Button>
        </Box>
      )}
    </Box>
  );

  const formattingPanel = (
    <Box>
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
          label={t('config.text')}
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
    </Box>
  );

  const integrationPanel = (
    <Box>
      <SectionHeader icon={<IntegrationIcon fontSize="small" />} title={t('config.integration')} />
      <Stack spacing={2}>
      {isWindows && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader
            icon={
              <Box
                component="img"
                src="images/mpchc64.png"
                alt="MPC HC"
                sx={{ width: 20, height: 20, objectFit: 'contain' }}
              />
            }
            title={t('config.mpcHc')}
          />
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('config.mpcHcPath')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                value={mpcHcPath}
                onChange={(e) => {
                  setMpcHcPath(e.target.value);
                }}
                size="small"
                fullWidth
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleBrowseMpcHcPath}
                sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
              >
                {t('config.browse')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleDetectMpcHc}
                sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
              >
                {t('config.detect')}
              </Button>
            </Box>
            <Typography
              variant="caption"
              sx={{
                mt: 0.75,
                display: 'block',
                color: mpcHcFound ? 'success.main' : 'error.main',
              }}
            >
              {mpcHcFound ? t('config.mpcHcFound') : t('config.mpcHcNotFound')}
            </Typography>
          </Box>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <SectionHeader
          icon={
            <Box
              component="img"
              src="images/mkvmerge.png"
              alt="MKVToolNix"
              sx={{ width: 20, height: 20, objectFit: 'contain' }}
            />
          }
          title={t('config.mkv')}
        />
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('config.mkvToolNixPath')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              value={mkvToolNixPath}
              onChange={(e) => {
                setMkvToolNixPath(e.target.value);
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
            <Button
              variant="outlined"
              size="small"
              onClick={handleDetectMkvToolNix}
              sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
            >
              {t('config.detect')}
            </Button>
          </Box>
          <Typography
            variant="caption"
            sx={{
              mt: 0.75,
              display: 'block',
              color: mkvtoolnixFound ? 'success.main' : 'error.main',
            }}
          >
            {mkvtoolnixFound ? t('config.mkvtoolnixFound') : t('config.mkvtoolnixNotFound')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {t('config.priority')}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={mkvPriority}
                onChange={(e) => {
                  setMkvPriority(e.target.value as Protocol.MkvPriority);
                }}
              >
                <MenuItem value={Protocol.MkvPriority.Highest}>{t('config.priorityHighest')}</MenuItem>
                <MenuItem value={Protocol.MkvPriority.Higher}>{t('config.priorityHigher')}</MenuItem>
                <MenuItem value={Protocol.MkvPriority.Normal}>{t('config.priorityNormal')}</MenuItem>
                <MenuItem value={Protocol.MkvPriority.Lower}>{t('config.priorityLower')}</MenuItem>
                <MenuItem value={Protocol.MkvPriority.Lowest}>{t('config.priorityLowest')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <SectionHeader
          icon={
            <Box
              component="img"
              src="images/batchmkvextract.png"
              alt="BatchMkvExtract"
              sx={{ width: 20, height: 20, objectFit: 'contain' }}
            />
          }
          title={t('config.batchMkvExtract')}
        />
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('config.batchMkvExtractPath')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              value={batchMkvExtractPath}
              onChange={(e) => {
                setBatchMkvExtractPath(e.target.value);
              }}
              size="small"
              fullWidth
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleBrowseBatchMkvExtractPath}
              sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
            >
              {t('config.browse')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDetectBatchMkvExtract}
              sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
            >
              {t('config.detect')}
            </Button>
          </Box>
          <Typography
            variant="caption"
            sx={{
              mt: 0.75,
              display: 'block',
              color: batchMkvExtractFound ? 'success.main' : 'error.main',
            }}
          >
            {batchMkvExtractFound ? t('config.batchMkvExtractFound') : t('config.batchMkvExtractNotFound')}
          </Typography>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <SectionHeader
          icon={
            <Box
              component="img"
              src="images/bdmaster.png"
              alt="BDMaster"
              sx={{ width: 20, height: 20, objectFit: 'contain' }}
            />
          }
          title={t('config.bdMaster')}
        />
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('config.bdMasterPath')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              value={bdMasterPath}
              onChange={(e) => {
                setBdMasterPath(e.target.value);
              }}
              size="small"
              fullWidth
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleBrowseBdMasterPath}
              sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
            >
              {t('config.browse')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDetectBdMaster}
              sx={{ minWidth: 90, height: 36, textTransform: 'none' }}
            >
              {t('config.detect')}
            </Button>
          </Box>
          <Typography
            variant="caption"
            sx={{
              mt: 0.75,
              display: 'block',
              color: bdMasterFound ? 'success.main' : 'error.main',
            }}
          >
            {bdMasterFound ? t('config.bdMasterFound') : t('config.bdMasterNotFound')}
          </Typography>
        </Box>
      </Paper>
      </Stack>
    </Box>
  );

  const templatesPanel = (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <SectionHeader icon={<TemplatesIcon fontSize="small" />} title={t('config.templates')} />
      <Tabs
        value={templatesTab}
        onChange={(_e, v) => setTemplatesTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          icon={<GeneralIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label={t('config.general')}
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
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
          label={t('config.text')}
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
        <Tab
          icon={<OtherIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label={t('config.other')}
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
        <Tab
          icon={<ImageIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label={t('config.image')}
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
        <Tab
          icon={<MenuStreamIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label={t('config.menu')}
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
      </Tabs>
      {(() => {
        const activeStreamKind = TEMPLATE_STREAM_KINDS[templatesTab];
        const templatesKey = STREAM_KIND_TO_TEMPLATE_KEY[activeStreamKind];
        if (!templatesKey) return null;
        const activeGroup = templates[templatesKey];
        return (
          <TemplatesPanelBody
            key={activeStreamKind}
            streamKind={activeStreamKind}
            group={activeGroup}
            onChange={(nextGroup) =>
              setTemplates((prev) => ({ ...prev, [templatesKey]: nextGroup }))
            }
          />
        );
      })()}
    </Box>
  );

  const updatePanel = (
    <Box>
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
            }}
          >
            <MenuItem value={Protocol.UpdateCheckInterval.Daily}>{t('config.daily')}</MenuItem>
            <MenuItem value={Protocol.UpdateCheckInterval.Weekly}>{t('config.weekly')}</MenuItem>
            <MenuItem value={Protocol.UpdateCheckInterval.Monthly}>{t('config.monthly')}</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', py: 2, px: 1, display: 'flex', gap: 2, height: '100%', minHeight: 0 }}>
      <Tabs
        orientation="vertical"
        value={mainTab}
        onChange={(_e, v: ConfigTab) => setMainTab(v)}
        sx={{
          borderRight: 1,
          borderColor: 'divider',
          minWidth: 180,
          '& .MuiTab-root': {
            minHeight: 40,
            alignItems: 'center',
            justifyContent: 'flex-start',
            textAlign: 'left',
            textTransform: 'none',
          },
        }}
      >
        <Tab
          value={ConfigTab.Appearance}
          icon={<AppearanceIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('config.appearance')}
        />
        <Tab
          value={ConfigTab.FileExtensions}
          icon={<FolderIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('config.fileExtensions')}
        />
        <Tab
          value={ConfigTab.Formatting}
          icon={<FormatIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('config.formatting')}
        />
        <Tab
          value={ConfigTab.Integration}
          icon={<IntegrationIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('config.integration')}
        />
        <Tab
          value={ConfigTab.Templates}
          icon={<TemplatesIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('config.templates')}
        />
        <Tab
          value={ConfigTab.Update}
          icon={<UpdateIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('config.update')}
        />
      </Tabs>
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {mainTab === ConfigTab.Appearance && appearancePanel}
        {mainTab === ConfigTab.FileExtensions && fileExtensionsPanel}
        {mainTab === ConfigTab.Formatting && formattingPanel}
        {mainTab === ConfigTab.Integration && integrationPanel}
        {mainTab === ConfigTab.Templates && templatesPanel}
        {mainTab === ConfigTab.Update && updatePanel}
      </Box>
    </Box>
  );
}
