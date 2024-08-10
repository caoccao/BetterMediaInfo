<script lang="ts">
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

  import { invoke } from "@tauri-apps/api/tauri";
  import { onMount } from "svelte";
  import { Button, Card, Header, Tooltip } from "svelte-ux";
  import { openDirectoryDialog, openFileDialog } from "../lib/dialog";
  import {
    dialog,
    mediaFiles,
    mediaCommonPropertyMap,
    mediaStreamCountMap,
  } from "../lib/store";
  import * as Protocol from "../lib/protocol";
  import {
    formatProperty,
    formatResolution,
    formatStreamCount,
    transformBitRate,
    transformDuration,
  } from "../lib/format";

  let files: string[] = [];
  let streamCountMap: Map<
    string,
    Map<string, Protocol.StreamCount>
  > = new Map();
  let commonPropertyMap: Map<
    string,
    Map<string, Protocol.StreamPropertyValue>
  > = new Map();

  onMount(() => {
    mediaStreamCountMap.subscribe((value) => {
      streamCountMap = value;
    });
    mediaCommonPropertyMap.subscribe((value) => {
      commonPropertyMap = value;
    });
    mediaFiles.subscribe((value) => {
      dialog.set(null);
      files = value;
      files
        .filter((file) => !streamCountMap.has(file))
        .forEach((file) => {
          invoke<Protocol.StreamCount[]>("get_stream_count", { file: file })
            .then((value) => {
              const map = new Map<string, Protocol.StreamCount>();
              value.forEach((streamCount) => {
                map.set(streamCount.stream, streamCount);
              });
              streamCountMap.set(file, map);
              mediaStreamCountMap.set(streamCountMap);
            })
            .catch((error) => {
              dialog.set({ title: error, type: Protocol.DialogType.Error });
            })
            .then(() => {
              if (streamCountMap.has(file) && !commonPropertyMap.has(file)) {
                let generalStreamCount = streamCountMap
                  .get(file)
                  ?.get(Protocol.StreamKind.General)?.count;
                let videoStreamCount = streamCountMap
                  .get(file)
                  ?.get(Protocol.StreamKind.Video)?.count;
                let properties: Array<Protocol.StreamProperty> = [];
                if (generalStreamCount && generalStreamCount > 0) {
                  properties.push({
                    stream: Protocol.StreamKind.General,
                    num: 0,
                    property: "Duration",
                  });
                }
                if (videoStreamCount && videoStreamCount > 0) {
                  for (let i = 0; i < videoStreamCount; i++) {
                    [
                      "Width",
                      "Height",
                      "ScanType",
                      "FrameRate",
                      "Format",
                      "BitRate",
                    ].forEach((property) => {
                      properties.push({
                        stream: Protocol.StreamKind.Video,
                        num: i,
                        property: property,
                      });
                    });
                  }
                }
                if (properties.length > 0) {
                  invoke<Protocol.StreamPropertyValue[]>("get_properties", {
                    file: file,
                    properties: properties,
                  })
                    .then((value) => {
                      const map = new Map<
                        string,
                        Protocol.StreamPropertyValue
                      >();
                      value.forEach((property) => {
                        map.set(
                          `${property.stream}/${property.num}/${property.property}`,
                          property
                        );
                      });
                      commonPropertyMap.set(file, map);
                      mediaCommonPropertyMap.set(commonPropertyMap);
                    })
                    .catch((error) => {
                      dialog.set({
                        title: error,
                        type: Protocol.DialogType.Error,
                      });
                    });
                }
              }
            });
        });
    });
  });

  function convertProperties(
    properties: Protocol.StreamPropertyValue[] | undefined
  ): Array<Record<string, string>> {
    const result: Record<string, string> = {};
    if (properties) {
      properties.forEach((property) => {
        result[property.property] = property.value;
      });
    }
    return [result];
  }
</script>

<div class="grid gap-2">
  {#if files.length == 0}
    <div class="my-3 text-center">Please select some files or a directory.</div>
    <div class="my-3 grid grid-flow-col justify-center gap-2">
      <Button
        classes={{ root: "w-12 h-12 bg-gray-400 hover:bg-gray-600 text-white" }}
        on:click={openFileDialog}
      >
        <span class="material-symbols-outlined text-3xl">movie</span>
      </Button>
      <Button
        classes={{ root: "w-12 h-12 bg-gray-400 hover:bg-gray-600 text-white" }}
        on:click={openDirectoryDialog}
      >
        <span class="material-symbols-outlined text-3xl">folder_open</span>
      </Button>
    </div>
  {:else}
    {#each files as file}
      <Card>
        <Header
          title={file}
          subheading={formatStreamCount(streamCountMap.get(file))}
          slot="header"
        >
          <div slot="actions">
            <Button class="w-12 h-12">
              <span class="material-symbols-outlined">note_stack</span>
            </Button>
          </div>
        </Header>
        <div slot="contents">
          {#if commonPropertyMap.has(file)}
            <div class="flex flex-wrap">
              {#if commonPropertyMap.get(file)?.has("Video/0/Format")}
                <div class="material-symbols-outlined h6">movie_info</div>
                <Tooltip title={`Video - Format`} offset={6}>
                  <div class="h-6 px-2">
                    {formatProperty(
                      commonPropertyMap.get(file),
                      streamCountMap.get(file),
                      Protocol.StreamKind.Video,
                      "Format"
                    ).join("| ")}
                  </div>
                </Tooltip>
              {/if}
              {#if commonPropertyMap.get(file)?.has("Video/0/Width")}
                <div class="material-symbols-outlined h6">movie</div>
                <Tooltip title={`Video - Resolution`} offset={6}>
                  <div class="h-6 px-2">
                    {formatResolution(
                      commonPropertyMap.get(file),
                      streamCountMap.get(file)
                    ).join("| ")}
                  </div>
                </Tooltip>
              {/if}
              {#if commonPropertyMap.get(file)?.has("Video/0/FrameRate")}
                <div class="material-symbols-outlined h6">acute</div>
                <Tooltip title={`Video - FrameRate`} offset={6}>
                  <div class="h-6 px-2">
                    {formatProperty(
                      commonPropertyMap.get(file),
                      streamCountMap.get(file),
                      Protocol.StreamKind.Video,
                      "FrameRate"
                    ).join("| ")}
                  </div>
                </Tooltip>
              {/if}
              {#if commonPropertyMap.get(file)?.has("Video/0/BitRate")}
                <div class="material-symbols-outlined h6">health_metrics</div>
                <Tooltip title={`Video - BitRate`} offset={6}>
                  <div class="h-6 px-2">
                    {formatProperty(
                      commonPropertyMap.get(file),
                      streamCountMap.get(file),
                      Protocol.StreamKind.Video,
                      "BitRate",
                      transformBitRate
                    ).join("| ")}
                  </div>
                </Tooltip>
              {/if}
              {#if commonPropertyMap.get(file)?.has("Video/0/ScanType")}
                <div class="material-symbols-outlined h6">document_scanner</div>
                <Tooltip title={`Video - ScanType`} offset={6}>
                  <div class="h-6 px-2">
                    {formatProperty(
                      commonPropertyMap.get(file),
                      streamCountMap.get(file),
                      Protocol.StreamKind.Video,
                      "ScanType"
                    ).join("| ")}
                  </div>
                </Tooltip>
              {/if}
              {#if commonPropertyMap.get(file)?.has("General/0/Duration")}
                <div class="material-symbols-outlined h-6">schedule</div>
                <Tooltip title="General - Duration" offset={6}>
                  <div class="h-6 px-2">
                    {formatProperty(
                      commonPropertyMap.get(file),
                      streamCountMap.get(file),
                      Protocol.StreamKind.General,
                      "Duration",
                      transformDuration
                    ).join("| ")}
                  </div>
                </Tooltip>
              {/if}
            </div>
            <div class="p-2"></div>
          {/if}
        </div>
      </Card>
    {/each}
  {/if}
</div>
