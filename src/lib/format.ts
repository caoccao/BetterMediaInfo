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

import * as Protocol from "../lib/protocol";

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

export function shrinkFileName(fileName: string, maxLength: number): string {
  if (fileName.length > maxLength) {
    return "..." + fileName.substring(fileName.length - maxLength + 3);
  }
  return fileName;
}

export function transformBitRate(value: string | undefined | null): string {
  if (value) {
    const bitRate = parseInt(value);
    if (bitRate > 1000000) {
      return `${trimFractionZeros((bitRate / 1000000.0).toFixed(2))}Mbps`;
    }
    if (bitRate > 1000) {
      return `${trimFractionZeros((bitRate / 1000.0).toFixed(2))}Kbps`;
    }
    return `${value}bps`;
  }
  return "";
}

export function transformDefault(value: string | undefined | null): string {
  return value ? value : "";
}

export function transformDuration(value: string | undefined | null): string {
  if (value) {
    const duration = parseInt(value);
    return trimFractionZeros((duration / 1000).toFixed(3));
  }
  return "";
}

export function transformFPS(value: string | undefined | null): string {
  if (value) {
    return trimFractionZeros(value);
  }
  return "";
}

export function transformResolution(
  _value: any,
  rowData: Record<string, string>,
  _rowIndex: number
) {
  if (rowData["Height"] && rowData["Width"]) {
    return `${rowData["Width"]}x${rowData["Height"]}`;
  }
  if (rowData["Video:Height"] && rowData["Video:Width"]) {
    return `${rowData["Video:Width"]}x${rowData["Video:Height"]}`;
  }
  return "";
}

export function transformSamplingRate(
  value: string | undefined | null
): string {
  if (value) {
    const rate = parseInt(value);
    return `${trimFractionZeros((rate / 1000).toFixed(3))}KHz`;
  }
  return "";
}

export function transformSize(value: string | undefined | null): string {
  if (value) {
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
  return "";
}

export function transformTime(
  _value: any,
  rowData: Record<string, string>,
  _rowIndex: number
): string {
  if (rowData["Duration"] || rowData["General:Duration"]) {
    const duration = parseInt(
      rowData["Duration"] ?? rowData["General:Duration"]
    );
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
    return time;
  }
  return "";
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
