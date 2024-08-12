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
  import { Button, Card, Header, TextField, Tooltip } from "svelte-ux";
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
    transformSize,
  } from "../lib/format";

  const COMMON_PROPERTIES_GENERAL: Record<string, string> = {
    "General - Format": "newsmode",
    "General - FileSize": "hard_drive",
    "General - Duration": "schedule",
    "General - Title": "title",
    "General - Encoded_Date": "calendar_month",
  };

  const COMMON_PROPERTIES_VIDEO: Record<string, string> = {
    "Video - Format": "wallpaper",
    "Video - Language": "language",
    "Video - Resolution": "movie",
    "Video - FrameRate": "acute",
    "Video - BitRate": "health_metrics",
    "Video - StreamSize": "hard_drive",
    "Video - ScanType": "satellite",
  };

  const COMMON_PROPERTIES_AUDIO: Record<string, string> = {
    "Audio - Format": "volume_up",
    "Audio - Language": "language",
    "Audio - BitRate_Mode": "newsmode",
    "Audio - BitRate": "health_metrics",
    "Audio - StreamSize": "hard_drive",
  };

  const COMMON_PROPERTIES_TEXT: Record<string, string> = {
    "Text - Format": "subtitles",
    "Text - Language": "language",
    "Text - BitRate": "health_metrics",
    "Text - StreamSize": "hard_drive",
  };

  const COMMON_PROPERTIES_GROUP = [
    COMMON_PROPERTIES_GENERAL,
    COMMON_PROPERTIES_VIDEO,
    COMMON_PROPERTIES_AUDIO,
    COMMON_PROPERTIES_TEXT,
  ];

  let files: string[] = [];
  let query: string | null = null;

  let commonPropertyMap: Map<
    string,
    Map<string, Protocol.StreamPropertyValue>
  > = new Map();
  let streamCountMap: Map<
    string,
    Map<Protocol.StreamKind, Protocol.StreamCount>
  > = new Map();

  $: fileToPropertyMap = generateFileToPropertyMap(
    query,
    files,
    streamCountMap,
    commonPropertyMap
  );

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
              const map = new Map<Protocol.StreamKind, Protocol.StreamCount>();
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
                let generalStreamCount =
                  streamCountMap.get(file)?.get(Protocol.StreamKind.General)
                    ?.count ?? 0;
                let videoStreamCount =
                  streamCountMap.get(file)?.get(Protocol.StreamKind.Video)
                    ?.count ?? 0;
                let audioStreamCount =
                  streamCountMap.get(file)?.get(Protocol.StreamKind.Audio)
                    ?.count ?? 0;
                let textStreamCount =
                  streamCountMap.get(file)?.get(Protocol.StreamKind.Text)
                    ?.count ?? 0;
                let properties: Array<Protocol.StreamProperty> = [];
                pushProperties(
                  properties,
                  Protocol.StreamKind.General,
                  generalStreamCount,
                  ["Duration", "Format", "FileSize", "Title", "Encoded_Date"]
                );
                pushProperties(
                  properties,
                  Protocol.StreamKind.Video,
                  videoStreamCount,
                  [
                    "BitRate",
                    "Format",
                    "FrameRate",
                    "Height",
                    "Language",
                    "ScanType",
                    "StreamSize",
                    "Width",
                  ]
                );
                pushProperties(
                  properties,
                  Protocol.StreamKind.Audio,
                  audioStreamCount,
                  [
                    "BitRate",
                    "BitRate_Mode",
                    "Format",
                    "Language",
                    "StreamSize",
                  ]
                );
                pushProperties(
                  properties,
                  Protocol.StreamKind.Text,
                  textStreamCount,
                  ["BitRate", "Format", "Language", "StreamSize"]
                );
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

  function generateFileToPropertyMap(
    query: string | null,
    files: string[],
    streamCountMap: Map<string, Map<Protocol.StreamKind, Protocol.StreamCount>>,
    commonPropertyMap: Map<string, Map<string, Protocol.StreamPropertyValue>>
  ): Map<string, Map<string, string>> {
    const fileMap = new Map<string, Map<string, string>>();
    files
      .filter((file) => streamCountMap.has(file) && commonPropertyMap.has(file))
      .forEach((file) => {
        const map = new Map<string, string>();
        const countMap = streamCountMap.get(file) as Map<
          Protocol.StreamKind,
          Protocol.StreamCount
        >;
        const propertyMap = commonPropertyMap.get(file) as Map<
          string,
          Protocol.StreamPropertyValue
        >;
        const generalStreamCount =
          countMap.get(Protocol.StreamKind.General)?.count ?? 0;
        const videoStreamCount =
          countMap.get(Protocol.StreamKind.Video)?.count ?? 0;
        const audioStreamCount =
          countMap.get(Protocol.StreamKind.Audio)?.count ?? 0;
        const textStreamCount =
          countMap.get(Protocol.StreamKind.Text)?.count ?? 0;
        if (generalStreamCount > 0) {
          if (propertyMap.has("General/0/Duration")) {
            map.set(
              "General - Duration",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.General,
                  generalStreamCount,
                  "Duration",
                  transformDuration
                )
              )
            );
          }
          if (propertyMap.has("General/0/FileSize")) {
            map.set(
              "General - FileSize",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.General,
                  generalStreamCount,
                  "FileSize",
                  transformSize
                )
              )
            );
          }
          ["Format", "Title", "Encoded_Date"].forEach((property) => {
            if (propertyMap.has(`General/0/${property}`)) {
              map.set(
                `General - ${property}`,
                propertiesToString(
                  formatProperty(
                    propertyMap,
                    Protocol.StreamKind.General,
                    generalStreamCount,
                    property
                  )
                )
              );
            }
          });
        }
        if (videoStreamCount > 0) {
          if (propertyMap.has("Video/0/Width")) {
            map.set(
              "Video - Resolution",
              propertiesToString(
                formatResolution(propertyMap, videoStreamCount)
              )
            );
          }
          if (propertyMap.has("Video/0/BitRate")) {
            map.set(
              "Video - BitRate",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.Video,
                  videoStreamCount,
                  "BitRate",
                  transformBitRate
                )
              )
            );
          }
          if (propertyMap.has("Video/0/StreamSize")) {
            map.set(
              "Video - StreamSize",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.Video,
                  videoStreamCount,
                  "StreamSize",
                  transformSize
                )
              )
            );
          }
          ["Format", "FrameRate", "Language", "ScanType"].forEach(
            (property) => {
              if (propertyMap.has(`Video/0/${property}`)) {
                map.set(
                  `Video - ${property}`,
                  propertiesToString(
                    formatProperty(
                      propertyMap,
                      Protocol.StreamKind.Video,
                      videoStreamCount,
                      property
                    )
                  )
                );
              }
            }
          );
        }
        if (audioStreamCount > 0) {
          if (propertyMap.has("Audio/0/BitRate")) {
            map.set(
              "Audio - BitRate",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.Audio,
                  audioStreamCount,
                  "BitRate",
                  transformBitRate
                )
              )
            );
          }
          if (propertyMap.has("Audio/0/StreamSize")) {
            map.set(
              "Audio - StreamSize",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.Audio,
                  audioStreamCount,
                  "StreamSize",
                  transformSize
                )
              )
            );
          }
          ["Format", "BitRate_Mode", "Language"].forEach((property) => {
            if (propertyMap.has(`Audio/0/${property}`)) {
              map.set(
                `Audio - ${property}`,
                propertiesToString(
                  formatProperty(
                    propertyMap,
                    Protocol.StreamKind.Audio,
                    audioStreamCount,
                    property
                  )
                )
              );
            }
          });
        }
        if (textStreamCount > 0) {
          if (propertyMap.has("Text/0/BitRate")) {
            map.set(
              "Text - BitRate",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.Text,
                  textStreamCount,
                  "BitRate",
                  transformBitRate
                )
              )
            );
          }
          if (propertyMap.has("Text/0/StreamSize")) {
            map.set(
              "Text - StreamSize",
              propertiesToString(
                formatProperty(
                  propertyMap,
                  Protocol.StreamKind.Text,
                  textStreamCount,
                  "StreamSize",
                  transformSize
                )
              )
            );
          }
          ["Format", "Language"].forEach((property) => {
            if (propertyMap.has(`Text/0/${property}`)) {
              map.set(
                `Text - ${property}`,
                propertiesToString(
                  formatProperty(
                    propertyMap,
                    Protocol.StreamKind.Text,
                    textStreamCount,
                    property
                  )
                )
              );
            }
          });
        }
        let hit = false;
        if (query && query.length > 0) {
          for (const value of map.values()) {
            if (value.toLowerCase().includes(query.toLowerCase())) {
              hit = true;
              break;
            }
          }
        } else {
          hit = true;
        }
        if (hit) {
          fileMap.set(file, map);
        }
      });
    return fileMap;
  }

  function isStreamAvailable(
    properties: Record<string, string>,
    file: string
  ): boolean {
    if (
      properties === COMMON_PROPERTIES_GENERAL &&
      (streamCountMap.get(file)?.get(Protocol.StreamKind.General)?.count ?? 0) >
        0
    ) {
      return true;
    }
    if (
      properties === COMMON_PROPERTIES_VIDEO &&
      (streamCountMap.get(file)?.get(Protocol.StreamKind.Video)?.count ?? 0) > 0
    ) {
      return true;
    }
    if (
      properties === COMMON_PROPERTIES_AUDIO &&
      (streamCountMap.get(file)?.get(Protocol.StreamKind.Audio)?.count ?? 0) > 0
    ) {
      return true;
    }
    if (
      properties === COMMON_PROPERTIES_TEXT &&
      (streamCountMap.get(file)?.get(Protocol.StreamKind.Text)?.count ?? 0) > 0
    ) {
      return true;
    }
    return false;
  }

  function propertiesToString(properties: string[]): string {
    return properties.join(" | ");
  }

  function pushProperties(
    properties: Array<Protocol.StreamProperty>,
    stream: Protocol.StreamKind,
    streamCount: number,
    keys: string[]
  ) {
    if (streamCount > 0) {
      for (let i = 0; i < streamCount; i++) {
        keys.forEach((key) => {
          properties.push({
            stream: stream,
            num: i,
            property: key,
          });
        });
      }
    }
  }
</script>

<div class="grid gap-2">
  {#if files.length == 0}
    <div class="my-3 text-center">Please select some files or a directory.</div>
    <div class="my-3 grid grid-flow-col justify-center gap-2">
      <Tooltip title="Add Files" offset={6}>
        <Button
          classes={{
            root: "w-12 h-12 bg-gray-400 hover:bg-gray-600 text-white",
          }}
          on:click={() => openFileDialog(false)}
        >
          <span class="material-symbols-outlined text-3xl">article</span>
        </Button>
      </Tooltip>
      <Tooltip title="Add Folder" offset={6}>
        <Button
          classes={{
            root: "w-12 h-12 bg-gray-400 hover:bg-gray-600 text-white",
          }}
          on:click={() => openDirectoryDialog(false)}
        >
          <span class="material-symbols-outlined text-3xl">folder</span>
        </Button>
      </Tooltip>
    </div>
  {:else}
    <TextField placeholder="Filter" bind:value={query} clearable />
    {#each files as file}
      {#if fileToPropertyMap.has(file)}
        <Card>
          <Header
            title={file}
            subheading={formatStreamCount(streamCountMap.get(file))}
            slot="header"
          >
            <div slot="actions">
              <Button class="w-12 h-12">
                <span class="material-symbols-outlined text-3xl"
                  >note_stack</span
                >
              </Button>
            </div>
          </Header>
          <div slot="contents">
            {#each COMMON_PROPERTIES_GROUP as commonProperties}
              {#if isStreamAvailable(commonProperties, file)}
                <div class="flex flex-wrap pb-2">
                  {#each Object.entries(commonProperties) as commonProperty}
                    {#if fileToPropertyMap.get(file)?.has(commonProperty[0])}
                      <Tooltip title={commonProperty[0]} offset={6}>
                        <div class="flex">
                          <div class="material-symbols-outlined h6">
                            {commonProperty[1]}
                          </div>
                          <div class="h-6 px-2">
                            {fileToPropertyMap
                              .get(file)
                              ?.get(commonProperty[0])}
                          </div>
                        </div>
                      </Tooltip>
                    {/if}
                  {/each}
                </div>
              {/if}
            {/each}
            <div class="pb-2"></div>
          </div>
        </Card>
      {/if}
    {/each}
  {/if}
</div>
