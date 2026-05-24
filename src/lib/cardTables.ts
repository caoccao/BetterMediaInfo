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

import type { TFunction } from 'i18next';
import * as Protocol from './protocol';
import {
  transformBitRate,
  transformDefault,
  transformDolbyVision,
  transformDuration,
  transformFPS,
  transformResolution,
  transformSamplingRate,
  transformSize,
  transformTime,
} from './format';

export enum OrderByType {
  None,
  Number,
  String,
}

export interface PropertyDefinition {
  align: 'left' | 'right' | 'center';
  format: (value: any, rowData: Record<string, string>) => string;
  header: string | null;
  inCardView: boolean;
  inListView: boolean;
  name: string;
  orderByType: OrderByType;
  virtual: boolean;
}

export function createPropertyDef(
  name: string,
  format: (value: any, rowData: Record<string, string>) => string = transformDefault,
  header: string | null = null
): PropertyDefinition {
  return {
    align: 'left',
    format,
    header,
    inCardView: false,
    inListView: false,
    name,
    orderByType: OrderByType.String,
    virtual: false,
  };
}

type Formatter = (value: any, rowData: Record<string, string>) => string;

function createBitRateFormatter(streamFormat: Protocol.ConfigStreamFormat | undefined): Formatter {
  return (value, _rowData) => {
    const precision = streamFormat?.bitRate?.precision ?? Protocol.FormatPrecision.Two;
    const unit = streamFormat?.bitRate?.unit ?? Protocol.FormatUnit.KMGT;
    return transformBitRate(value, precision, unit);
  };
}

function createSizeFormatter(streamFormat: Protocol.ConfigStreamFormat | undefined): Formatter {
  return (value, _rowData) => {
    const precision = streamFormat?.size?.precision ?? Protocol.FormatPrecision.Two;
    const unit = streamFormat?.size?.unit ?? Protocol.FormatUnit.KMGT;
    return transformSize(value, precision, unit);
  };
}

export function buildCommonPropertiesMap(
  config: Protocol.Config | null,
  t: TFunction,
): Map<Protocol.StreamKind, PropertyDefinition[]> {
  const videoBitRateFormatter = createBitRateFormatter(config?.video);
  const videoSizeFormatter = createSizeFormatter(config?.video);
  const audioBitRateFormatter = createBitRateFormatter(config?.audio);
  const audioSizeFormatter = createSizeFormatter(config?.audio);
  const subtitleBitRateFormatter = createBitRateFormatter(config?.subtitle);
  const subtitleSizeFormatter = createSizeFormatter(config?.subtitle);
  const imageSizeFormatter = createSizeFormatter(undefined);
  // General uses video format settings for file size
  const general: PropertyDefinition[] = [
    { ...createPropertyDef('CompleteName'), header: t('list.header.filePath'), inListView: true },
    { ...createPropertyDef('Format'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('FileSize', videoSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Duration', transformDuration, t('list.header.duration')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Time', transformTime, t('list.header.time')), orderByType: OrderByType.None, align: 'right', virtual: true, inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Encoded_Date'), header: t('list.header.encodedDate'), inCardView: true, inListView: true },
    { ...createPropertyDef('Video:Count'), orderByType: OrderByType.Number, header: t('list.header.videoCount'), inListView: true },
    { ...createPropertyDef('Audio:Count'), orderByType: OrderByType.Number, header: t('list.header.audioCount'), inListView: true },
    { ...createPropertyDef('Text:Count'), orderByType: OrderByType.Number, header: t('list.header.textCount'), inListView: true },
    { ...createPropertyDef('Image:Count'), orderByType: OrderByType.Number, header: t('list.header.imageCount'), inListView: true },
    { ...createPropertyDef('Menu:Count'), orderByType: OrderByType.Number, header: t('list.header.menuCount'), inListView: true },
  ];

  const video: PropertyDefinition[] = [
    { ...createPropertyDef('ID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Format'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('Language'), header: t('list.header.language'), inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Resolution', transformResolution, t('list.header.resolution')), orderByType: OrderByType.None, virtual: true, inCardView: true, inListView: true },
    { ...createPropertyDef('HDR_Format_Compatibility'), header: t('list.header.hdr'), inCardView: true, inListView: true },
    { ...createPropertyDef('HDR_Format', transformDolbyVision, t('list.header.dv')), inCardView: true, inListView: true },
    { ...createPropertyDef('ScanType'), header: t('list.header.scanType'), inCardView: true, inListView: true },
    { ...createPropertyDef('Default'), header: t('list.header.default'), inCardView: true },
    { ...createPropertyDef('Forced'), header: t('list.header.forced'), inCardView: true },
    { ...createPropertyDef('BitDepth'), orderByType: OrderByType.Number, align: 'right', header: t('list.header.depth'), inCardView: true, inListView: true },
    { ...createPropertyDef('FrameRate', transformFPS, t('list.header.fps')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('BitRate', videoBitRateFormatter, t('list.header.bitRate')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('StreamSize', videoSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Width') },
    { ...createPropertyDef('Height') },
  ];

  const audio: PropertyDefinition[] = [
    { ...createPropertyDef('ID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Format_Commercial'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('Language'), header: t('list.header.language'), inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Channel(s)'), orderByType: OrderByType.Number, align: 'right', header: t('list.header.channels'), inCardView: true, inListView: true },
    { ...createPropertyDef('BitDepth'), orderByType: OrderByType.Number, align: 'right', header: t('list.header.depth'), inCardView: true, inListView: true },
    { ...createPropertyDef('SamplingRate', transformSamplingRate, t('list.header.sampling')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('Default'), header: t('list.header.default'), inCardView: true },
    { ...createPropertyDef('Forced'), header: t('list.header.forced'), inCardView: true },
    { ...createPropertyDef('BitRate_Mode'), header: t('list.header.mode'), inCardView: true, inListView: true },
    { ...createPropertyDef('BitRate', audioBitRateFormatter, t('list.header.bitRate')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('StreamSize', audioSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  ];

  const text: PropertyDefinition[] = [
    { ...createPropertyDef('ID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Format'), header: t('list.header.format'), inCardView: true, inListView: true },
    { ...createPropertyDef('Language'), header: t('list.header.language'), inCardView: true, inListView: true },
    { ...createPropertyDef('Title'), header: t('list.header.title'), inCardView: true, inListView: true },
    { ...createPropertyDef('Default'), header: t('list.header.default'), inCardView: true },
    { ...createPropertyDef('Forced'), header: t('list.header.forced'), inCardView: true },
    { ...createPropertyDef('BitRate', subtitleBitRateFormatter, t('list.header.bitRate')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
    { ...createPropertyDef('StreamSize', subtitleSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true, inListView: true },
  ];

  const image: PropertyDefinition[] = [
    { ...createPropertyDef('StreamKindID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Format'), header: t('list.header.format'), inCardView: true },
    { ...createPropertyDef('Type'), header: t('list.header.type'), inCardView: true },
    { ...createPropertyDef('Resolution', transformResolution, t('list.header.resolution')), orderByType: OrderByType.None, virtual: true, inCardView: true },
    { ...createPropertyDef('ColorSpace'), header: t('list.header.colorSpace'), inCardView: true },
    { ...createPropertyDef('StreamSize', imageSizeFormatter, t('list.header.size')), orderByType: OrderByType.Number, align: 'right', inCardView: true },
    { ...createPropertyDef('Width') },
    { ...createPropertyDef('Height') },
  ];

  const menu: PropertyDefinition[] = [
    { ...createPropertyDef('StreamKindID'), header: t('list.header.id'), inCardView: true },
    { ...createPropertyDef('Inform'), header: t('list.header.menu'), inCardView: true },
  ];

  return new Map<Protocol.StreamKind, PropertyDefinition[]>([
    [Protocol.StreamKind.General, general],
    [Protocol.StreamKind.Video, video],
    [Protocol.StreamKind.Audio, audio],
    [Protocol.StreamKind.Text, text],
    [Protocol.StreamKind.Image, image],
    [Protocol.StreamKind.Menu, menu],
  ]);
}

export const STREAM_KIND_COLORS: Record<Protocol.StreamKind, string> = {
  [Protocol.StreamKind.General]: '#84cc16',
  [Protocol.StreamKind.Video]: '#f97316',
  [Protocol.StreamKind.Audio]: '#f59e0b',
  [Protocol.StreamKind.Text]: '#10b981',
  [Protocol.StreamKind.Other]: '#a3a3a3',
  [Protocol.StreamKind.Image]: '#0ea5e9',
  [Protocol.StreamKind.Menu]: '#6366f1',
  [Protocol.StreamKind.Max]: '#84cc16',
};
