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

import { create } from 'zustand';
import * as Protocol from './protocol';
import { ViewType } from './types';
import { getAbout, getConfig, getParameters } from './service';

interface DialogJsonCode {
  title: string;
  jsonCode: Array<Protocol.StreamPropertyMap> | null;
}

interface DialogNotification {
  title: string;
  type: Protocol.DialogNotificationType;
}

interface AppState {
  // Config
  config: Protocol.Config | null;
  isConfigDirty: boolean;

  // Dialogs
  dialogJsonCode: DialogJsonCode | null;
  dialogNotification: DialogNotification | null;

  // Media files
  mediaFiles: string[];
  mediaDetailedFiles: string[];
  mediaFileToAllPropertiesMap: Map<string, Array<Protocol.StreamPropertyMap>>;
  mediaFileToCommonPropertyMap: Map<string, Array<Protocol.StreamPropertyMap>>;
  mediaFileToStreamCountMap: Map<string, Map<Protocol.StreamKind, Protocol.StreamCount>>;

  // MediaInfo
  mediaInfoAbout: Protocol.About | null;
  mediaInfoParameters: Array<Protocol.Parameter>;

  // Tab status
  tabAboutStatus: Protocol.ControlStatus;
  tabSettingsStatus: Protocol.ControlStatus;

  // View type
  viewType: ViewType;

  // Actions
  initConfig: () => Promise<void>;
  initAbout: () => Promise<void>;
  initParameters: () => Promise<void>;

  setConfig: (config: Protocol.Config | null) => void;
  setConfigDirty: (isDirty: boolean) => void;
  setDialogJsonCode: (dialog: DialogJsonCode | null) => void;
  setDialogNotification: (dialog: DialogNotification | null) => void;
  setMediaFiles: (files: string[]) => void;
  addMediaFiles: (files: string[]) => void;
  setMediaDetailedFiles: (files: string[]) => void;
  addMediaDetailedFile: (file: string) => void;
  removeMediaDetailedFile: (file: string) => void;
  deleteMediaFile: (file: string) => void;
  setMediaFileAllProperties: (file: string, properties: Array<Protocol.StreamPropertyMap>) => void;
  setMediaFileCommonProperties: (file: string, properties: Array<Protocol.StreamPropertyMap>) => void;
  setMediaFileStreamCount: (file: string, streamCountMap: Map<Protocol.StreamKind, Protocol.StreamCount>) => void;
  setTabAboutStatus: (status: Protocol.ControlStatus) => void;
  setTabSettingsStatus: (status: Protocol.ControlStatus) => void;
  setViewType: (viewType: ViewType) => void;
  clearMediaFiles: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  config: null,
  isConfigDirty: false,
  dialogJsonCode: null,
  dialogNotification: null,
  mediaFiles: [],
  mediaDetailedFiles: [],
  mediaFileToAllPropertiesMap: new Map(),
  mediaFileToCommonPropertyMap: new Map(),
  mediaFileToStreamCountMap: new Map(),
  mediaInfoAbout: null,
  mediaInfoParameters: [],
  tabAboutStatus: Protocol.ControlStatus.Hidden,
  tabSettingsStatus: Protocol.ControlStatus.Hidden,
  viewType: ViewType.Card,

  // Actions
  initConfig: async () => {
    try {
      const config = await getConfig();
      set({ config });
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },

  initAbout: async () => {
    try {
      const about = await getAbout();
      set({ mediaInfoAbout: about });
    } catch (error) {
      console.error('Failed to load about:', error);
    }
  },

  initParameters: async () => {
    try {
      const parameters = await getParameters();
      set({ mediaInfoParameters: parameters });
    } catch (error) {
      console.error('Failed to load parameters:', error);
    }
  },

  setConfig: (config) => set({ config }),
  setConfigDirty: (isConfigDirty) => set({ isConfigDirty }),
  setDialogJsonCode: (dialogJsonCode) => set({ dialogJsonCode }),
  setDialogNotification: (dialogNotification) => set({ dialogNotification }),

  setMediaFiles: (files) => set({ mediaFiles: files }),
  addMediaFiles: (files) => {
    const { mediaFiles } = get();
    const uniqueFiles = [...new Set([...mediaFiles, ...files])];
    set({ mediaFiles: uniqueFiles });
  },

  setMediaDetailedFiles: (files) => set({ mediaDetailedFiles: files }),
  addMediaDetailedFile: (file) => {
    const { mediaDetailedFiles } = get();
    if (!mediaDetailedFiles.includes(file)) {
      set({ mediaDetailedFiles: [...mediaDetailedFiles, file] });
    }
  },
  removeMediaDetailedFile: (file) => {
    const { mediaDetailedFiles } = get();
    set({ mediaDetailedFiles: mediaDetailedFiles.filter((f) => f !== file) });
  },

  deleteMediaFile: (file) => {
    const state = get();
    const newAllPropertiesMap = new Map(state.mediaFileToAllPropertiesMap);
    const newCommonPropertyMap = new Map(state.mediaFileToCommonPropertyMap);
    const newStreamCountMap = new Map(state.mediaFileToStreamCountMap);
    
    newAllPropertiesMap.delete(file);
    newCommonPropertyMap.delete(file);
    newStreamCountMap.delete(file);

    set({
      mediaFiles: state.mediaFiles.filter((f) => f !== file),
      mediaDetailedFiles: state.mediaDetailedFiles.filter((f) => f !== file),
      mediaFileToAllPropertiesMap: newAllPropertiesMap,
      mediaFileToCommonPropertyMap: newCommonPropertyMap,
      mediaFileToStreamCountMap: newStreamCountMap,
    });
  },

  setMediaFileAllProperties: (file, properties) => {
    const { mediaFileToAllPropertiesMap } = get();
    const newMap = new Map(mediaFileToAllPropertiesMap);
    newMap.set(file, properties);
    set({ mediaFileToAllPropertiesMap: newMap });
  },

  setMediaFileCommonProperties: (file, properties) => {
    const { mediaFileToCommonPropertyMap } = get();
    const newMap = new Map(mediaFileToCommonPropertyMap);
    newMap.set(file, properties);
    set({ mediaFileToCommonPropertyMap: newMap });
  },

  setMediaFileStreamCount: (file, streamCountMap) => {
    const { mediaFileToStreamCountMap } = get();
    const newMap = new Map(mediaFileToStreamCountMap);
    newMap.set(file, streamCountMap);
    set({ mediaFileToStreamCountMap: newMap });
  },

  setTabAboutStatus: (tabAboutStatus) => set({ tabAboutStatus }),
  setTabSettingsStatus: (tabSettingsStatus) => set({ tabSettingsStatus }),
  setViewType: (viewType) => set({ viewType }),

  clearMediaFiles: () => set({
    mediaFiles: [],
    mediaDetailedFiles: [],
    mediaFileToAllPropertiesMap: new Map(),
    mediaFileToCommonPropertyMap: new Map(),
    mediaFileToStreamCountMap: new Map(),
  }),
}));
