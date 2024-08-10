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

export function formatDuration(value: string): string {
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
  items.push(`${duration / 1000.0}s`);
  items.push(time);
  return items.join(", ");
}

export function formatProperty(
  propertyMap: Map<string, Protocol.StreamPropertyValue> | undefined,
  streamCountMap: Map<string, Protocol.StreamCount> | undefined,
  stream: Protocol.StreamKind,
  key: string,
  formatter: ((value: string) => string) | undefined = undefined
): string[] {
  let results: Array<string> = [];
  if (propertyMap && streamCountMap) {
    const streamCount = streamCountMap.get(stream);
    if (streamCount && streamCount.count > 0) {
      for (let i = 0; i < streamCount.count; i++) {
        const property = propertyMap.get(`${stream}/${i}/${key}`);
        if (property) {
          let value = property.value;
          if (formatter) {
            value = formatter(value);
          }
          results.push(value);
        }
      }
    }
  }
  return results;
}

export function formatResolution(
  propertyMap: Map<string, Protocol.StreamPropertyValue> | undefined,
  streamCountMap: Map<string, Protocol.StreamCount> | undefined
): string[] {
  const widths = formatProperty(
    propertyMap,
    streamCountMap,
    Protocol.StreamKind.Video,
    "Width"
  );
  const heights = formatProperty(
    propertyMap,
    streamCountMap,
    Protocol.StreamKind.Video,
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
