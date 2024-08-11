/*
 *   Copyright (c) 2024. caoccao.com Sam Cao
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

import * as Protocol from "../lib/protocol";

export function formatProperty(
  propertyMap: Map<string, Protocol.StreamPropertyValue>,
  stream: Protocol.StreamKind,
  streamCount: number,
  key: string,
  transformer: ((value: string) => string) | undefined = undefined
): string[] {
  let results: Array<string> = [];
  for (let i = 0; i < streamCount; i++) {
    const name = `${stream}/${i}/${key}`;
    const property = propertyMap.get(name);
    if (property) {
      let value = property.value;
      if (transformer) {
        value = transformer(value);
      }
      results.push(value);
    }
  }
  return results;
}

export function formatResolution(
  propertyMap: Map<string, Protocol.StreamPropertyValue>,
  streamCount: number
): string[] {
  const widths = formatProperty(
    propertyMap,
    Protocol.StreamKind.Video,
    streamCount,
    "Width"
  );
  const heights = formatProperty(
    propertyMap,
    Protocol.StreamKind.Video,
    streamCount,
    "Height"
  );
  let results: Array<string> = [];
  const length = Math.max(widths.length, heights.length);
  for (let i = 0; i < length; ++i) {
    const width = i < widths.length ? widths[i] : "0";
    const height = i < heights.length ? heights[i] : "0";
    results.push(`${width}x${height}`);
  }
  return results;
}

export function formatStreamCount(
  streamCountMap: Map<string, Protocol.StreamCount> | undefined
): string {
  let result = "";
  if (streamCountMap) {
    result = [...streamCountMap.values()]
      .filter((streamCount) => streamCount.count > 0)
      .map((streamCount) => `${streamCount.stream}: ${streamCount.count}`)
      .join(", ");
  }
  return result;
}

export function transformBitRate(value: string): string {
  const bitRate = parseInt(value);
  if (bitRate > 1000000) {
    return `${trimFractionZeros((bitRate / 1000000.0).toFixed(2))}Mbps`;
  }
  if (bitRate > 1000) {
    return `${trimFractionZeros((bitRate / 1000.0).toFixed(2))}Kbps`;
  }
  return `${value}bps`;
}

export function transformDuration(value: string): string {
  const items: Array<string> = [];
  const duration = parseInt(value);
  const totalSeconds = Math.floor(duration / 1000.0);
  const totalMinutes = Math.floor(totalSeconds / 60.0);
  const totalHours = Math.floor(totalMinutes / 60.0);
  const totalDays = Math.floor(totalHours / 24.0);
  const milliseconds = duration % 1000;
  const seconds = totalSeconds % 60;
  const minutes = totalMinutes % 60;
  const hours = totalHours % 24;
  let time = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
  if (totalDays > 0) {
    time = `${totalDays}d ${time}`;
  }
  items.push(`${trimFractionZeros((duration / 1000).toFixed(3))}s`);
  items.push(time);
  return items.join(", ");
}

export function transformSize(value: string): string {
  const size = parseInt(value);
  if (size > 1 << 30) {
    return `${trimFractionZeros((size / (1 << 30)).toFixed(2))}GB`;
  }
  if (size > 1 << 20) {
    return `${trimFractionZeros((size / (1 << 20)).toFixed(2))}MB`;
  }
  if (size > 1 << 10) {
    return `${trimFractionZeros((size / (1 << 10)).toFixed(2))}KB`;
  }
  return `${value}B`;
}

function trimFractionZeros(value: string): string {
  const index = value.lastIndexOf(".");
  if (index > 0) {
    while (value.endsWith("0")) {
      value = value.substring(0, value.length - 1);
    }
  }
  if (value.endsWith(".")) {
    value = value.substring(0, value.length - 1);
  }
  return value;
}
