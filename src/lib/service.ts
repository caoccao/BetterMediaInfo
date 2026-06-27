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

import { invoke } from "@tauri-apps/api/core";
import * as Protocol from "./protocol";

export async function getAbout(): Promise<Protocol.About> {
  return await invoke<Protocol.About>("get_about");
}

export async function getUpdateResult(): Promise<Protocol.UpdateCheckResult | null> {
  return await invoke<Protocol.UpdateCheckResult | null>("get_update_result");
}

export async function getLaunchArgs(): Promise<string[]> {
  return await invoke<string[]>("get_launch_args");
}

export async function registerExtensionsContextMenu(extensions: string[]): Promise<void> {
  return await invoke<void>("register_extensions_context_menu", { extensions });
}

export async function unregisterExtensionsContextMenu(extensions: string[]): Promise<void> {
  return await invoke<void>("unregister_extensions_context_menu", { extensions });
}

export async function areExtensionsContextMenuRegistered(extensions: string[]): Promise<boolean> {
  return await invoke<boolean>("are_extensions_context_menu_registered", { extensions });
}

export async function registerFolderContextMenu(): Promise<void> {
  return await invoke<void>("register_folder_context_menu");
}

export async function unregisterFolderContextMenu(): Promise<void> {
  return await invoke<void>("unregister_folder_context_menu");
}

export async function isFolderContextMenuRegistered(): Promise<boolean> {
  return await invoke<boolean>("is_folder_context_menu_registered");
}

export async function skipVersion(version: string): Promise<void> {
  return await invoke<void>("skip_version", { version });
}

export async function getConfig(): Promise<Protocol.Config> {
  return await invoke<Protocol.Config>("get_config");
}

export async function getMkvTracks(file: string): Promise<Array<Protocol.MkvTrack>> {
  return await invoke<Array<Protocol.MkvTrack>>("get_mkv_tracks", { file });
}

export async function getMkvtoolnixStatus(path: string, checkRunning: boolean = false): Promise<Protocol.MkvToolNixStatus> {
  return await invoke<Protocol.MkvToolNixStatus>("get_mkvtoolnix_status", { path, checkRunning });
}

export async function getBatchMkvExtractStatus(path: string, checkRunning: boolean = false): Promise<Protocol.BatchMkvExtractStatus> {
  return await invoke<Protocol.BatchMkvExtractStatus>("get_batchmkvextract_status", { path, checkRunning });
}

export async function getBDMasterStatus(path: string, checkRunning: boolean = false): Promise<Protocol.BDMasterStatus> {
  return await invoke<Protocol.BDMasterStatus>("get_bdmaster_status", { path, checkRunning });
}

export async function getMpcHcStatus(path: string, checkRunning: boolean = false): Promise<Protocol.MpcHcStatus> {
  return await invoke<Protocol.MpcHcStatus>("get_mpchc_status", { path, checkRunning });
}

export async function getFfmpegStatus(path: string): Promise<Protocol.FfmpegStatus> {
  return await invoke<Protocol.FfmpegStatus>("get_ffmpeg_status", { path });
}

export async function openMpcHc(file: string): Promise<void> {
  return await invoke<void>("open_mpchc", { file });
}

export async function getBDStatus(path: string): Promise<Protocol.BDStatus> {
  return await invoke<Protocol.BDStatus>("get_bd_status", { path });
}

export async function openBatchMkvExtract(file: string): Promise<void> {
  return await invoke<void>("open_batchmkvextract", { file });
}

export async function openBDMaster(file: string): Promise<void> {
  return await invoke<void>("open_bdmaster", { file });
}

export async function openMkvtoolnixGui(file: string): Promise<void> {
  return await invoke<void>("open_mkvtoolnix_gui", { file });
}

export async function runMkvextract(file: string, args: string[]): Promise<void> {
  return await invoke<void>("run_mkvextract", { file, args });
}

export async function cancelMkvextract(): Promise<void> {
  return await invoke<void>("cancel_mkvextract");
}

export async function runMkvmerge(args: string[]): Promise<void> {
  return await invoke<void>("run_mkvmerge", { args });
}

export async function cancelMkvmerge(): Promise<void> {
  return await invoke<void>("cancel_mkvmerge");
}

export async function suggestMergeOutputPath(sourceFile: string): Promise<string> {
  return await invoke<string>("suggest_merge_output_path", { sourceFile });
}

export async function captureFfmpegFrame(file: string, positionSeconds: number, maxWidth: number): Promise<number[]> {
  return await invoke<number[]>("capture_ffmpeg_frame", { file, positionSeconds, maxWidth });
}

export async function runFfmpegCapture(
  args: string[],
  outputDir: string,
  durationSeconds: number,
  trim: Protocol.FfmpegTrimOptions | null = null,
  previewWidth: number = 0
): Promise<void> {
  return await invoke<void>("run_ffmpeg_capture", { args, outputDir, durationSeconds, trim, previewWidth });
}

export async function cancelFfmpegCapture(): Promise<void> {
  return await invoke<void>("cancel_ffmpeg_capture");
}

export async function getFiles(files: string[]): Promise<string[]> {
  return await invoke<string[]>("get_files", { files });
}

export async function getParameters(): Promise<Array<Protocol.Parameter>> {
  return await invoke<Array<Protocol.Parameter>>("get_parameters");
}

export async function getPropertiesMap(
  file: string,
  properties: Array<Protocol.StreamProperty> | null
): Promise<Array<Protocol.StreamPropertyMap>> {
  return await invoke<Array<Protocol.StreamPropertyMap>>("get_properties", {
    file,
    properties,
  });
}

export async function getStreamCountMap(
  file: string
): Promise<Map<Protocol.StreamKind, Protocol.StreamCount>> {
  const streamCountMap = new Map<Protocol.StreamKind, Protocol.StreamCount>();
  const streamCounts = await invoke<Protocol.StreamCount[]>(
    "get_stream_count",
    { file }
  );
  streamCounts.forEach((streamCount) => {
    streamCountMap.set(streamCount.stream, streamCount);
  });
  return streamCountMap;
}

export async function setConfig(
  config: Protocol.Config
): Promise<Protocol.Config> {
  return await invoke<Protocol.Config>("set_config", { config });
}

export async function writeTextFile(file: string, text: string): Promise<void> {
  return await invoke<void>("write_text_file", { file, text });
}

export async function writeBinaryFile(file: string, bytes: Uint8Array): Promise<void> {
  return await invoke<void>("write_binary_file", { file: file, bytes: Array.from(bytes) });
}
