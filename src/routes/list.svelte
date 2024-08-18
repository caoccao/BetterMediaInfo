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

  import { onMount } from "svelte";
  import { Button, Card, Header, Table, TextField, Tooltip } from "svelte-ux";
  import { openDirectoryDialog, openFileDialog } from "../lib/dialog";
  import {
    deleteMediaFile,
    dialog,
    mediaFileToAllPropertiesMap,
    mediaDetailedFiles,
    mediaFiles,
    mediaFileToCommonPropertyMap,
    mediaFileToStreamCountMap,
  } from "../lib/store";
  import * as Protocol from "../lib/protocol";
  import { getPropertiesMap, getStreamCountMap } from "../lib/service";
  import {
    formatStreamCount,
    transformBitRate,
    transformDefault,
    transformDuration,
    transformSize,
  } from "../lib/format";

  interface PropertyFormat {
    format: (value: any, rowData: string, rowIndex: number) => string;
    header: string | null;
    name: string;
  }

  const BUTTON_CLASSES_ALERT =
    "w-12 h-12 bg-white hover:bg-gray-200 text-gray-500 hover:text-red-500";
  const BUTTON_CLASSES_NORMAL =
    "w-12 h-12 bg-white hover:bg-gray-200 text-gray-500 hover:text-blue-500";
  const BUTTON_CLASSES_TOOLBAR =
    "w-12 h-12 bg-gray-400 hover:bg-gray-600 text-white hover:text-blue-200";

  const COMMON_PROPERTIES_GENERAL: Array<PropertyFormat> = [
    { format: transformDefault, header: "🆔", name: "@id" },
    { format: transformDefault, header: "🖺️ Format", name: "Format" },
    { format: transformSize, header: "🗃️ File Size", name: "FileSize" },
    { format: transformDuration, header: "⏱️ Duration", name: "Duration" },
    { format: transformDefault, header: "📖 Title", name: "Title" },
    { format: transformDefault, header: "Encoded Date", name: "Encoded_Date" },
  ];

  const COMMON_PROPERTIES_VIDEO: Array<PropertyFormat> = [
    { format: transformDefault, header: "🆔", name: "@id" },
    { format: transformDefault, header: "🎞️ Format", name: "Format" },
    { format: transformDefault, header: "🌐 Language", name: "Language" },
    { format: transformDefault, header: "📖 Title", name: "Title" },
    { format: transformDefault, header: "🖥️ Resolution", name: "Resolution" },
    { format: transformDefault, header: "Frame Rate", name: "FrameRate" },
    { format: transformBitRate, header: "Bit Rate", name: "BitRate" },
    { format: transformSize, header: "💽 Stream Size", name: "StreamSize" },
    { format: transformDefault, header: "Scan Type", name: "ScanType" },
  ];

  const COMMON_PROPERTIES_AUDIO: Array<PropertyFormat> = [
    { format: transformDefault, header: "🆔", name: "@id" },
    { format: transformDefault, header: "🎵 Format", name: "Format" },
    { format: transformDefault, header: "🌐 Language", name: "Language" },
    { format: transformDefault, header: "📖 Title", name: "Title" },
    { format: transformDefault, header: "Bit Rate Mode", name: "BitRate_Mode" },
    { format: transformBitRate, header: "Bit Rate", name: "BitRate" },
    { format: transformSize, header: "💽 Stream Size", name: "StreamSize" },
  ];

  const COMMON_PROPERTIES_TEXT: Array<PropertyFormat> = [
    { format: transformDefault, header: "🆔", name: "@id" },
    { format: transformDefault, header: "🖹 Format", name: "Format" },
    { format: transformDefault, header: "🌐 Language", name: "Language" },
    { format: transformDefault, header: "📖 Title", name: "Title" },
    { format: transformBitRate, header: "Bit Rate", name: "BitRate" },
    { format: transformSize, header: "💽 Stream Size", name: "StreamSize" },
  ];

  const COMMON_PROPERTIES_MAP = new Map<
    Protocol.StreamKind,
    Array<PropertyFormat>
  >([
    [Protocol.StreamKind.General, COMMON_PROPERTIES_GENERAL],
    [Protocol.StreamKind.Video, COMMON_PROPERTIES_VIDEO],
    [Protocol.StreamKind.Audio, COMMON_PROPERTIES_AUDIO],
    [Protocol.StreamKind.Text, COMMON_PROPERTIES_TEXT],
  ]);

  let files: string[] = [];
  let query: string | null = null;

  let fileToAllPropertiesMap: Map<
    string,
    Array<Protocol.StreamPropertyMap>
  > = new Map();

  let fileToCommonPropertyMap: Map<
    string,
    Array<Protocol.StreamPropertyMap>
  > = new Map();
  let fileToStreamCountMap: Map<
    string,
    Map<Protocol.StreamKind, Protocol.StreamCount>
  > = new Map();

  $: fileToPropertyMap = generateFileToPropertyMap(
    query,
    files,
    fileToStreamCountMap,
    fileToCommonPropertyMap
  );

  onMount(() => {
    mediaFileToAllPropertiesMap.subscribe((value) => {
      fileToAllPropertiesMap = value;
    });
    mediaFileToStreamCountMap.subscribe((value) => {
      fileToStreamCountMap = value;
    });
    mediaFileToCommonPropertyMap.subscribe((value) => {
      fileToCommonPropertyMap = value;
    });
    mediaFiles.subscribe((value) => {
      dialog.set(null);
      files = value;
      files.forEach(async (file) => {
        let streamCountMap: Map<Protocol.StreamKind, Protocol.StreamCount>;
        if (fileToStreamCountMap.has(file)) {
          streamCountMap = fileToStreamCountMap.get(file)!;
        } else {
          try {
            streamCountMap = await getStreamCountMap(file);
            fileToStreamCountMap.set(file, streamCountMap);
            mediaFileToStreamCountMap.set(fileToStreamCountMap);
          } catch (error) {
            dialog.set({
              title: error as string,
              type: Protocol.DialogType.Error,
            });
            return;
          }
        }
        if (!fileToCommonPropertyMap.has(file)) {
          const properties = [...COMMON_PROPERTIES_MAP.entries()]
            .filter(
              ([stream, _propertyFormat]) =>
                (streamCountMap.get(stream)?.count ?? 0) > 0
            )
            .map(([stream, propertyFormat]) =>
              propertyFormat.map((property) => {
                return {
                  stream: stream,
                  property: property.name,
                };
              })
            )
            .flat();
          if (properties.length > 0) {
            try {
              if (
                (streamCountMap.get(Protocol.StreamKind.Video)?.count ?? 0) > 0
              ) {
                properties.push(
                  {
                    stream: Protocol.StreamKind.Video,
                    property: "Width",
                  },
                  {
                    stream: Protocol.StreamKind.Video,
                    property: "Height",
                  }
                );
              }
              const commonPropertyMap = await getPropertiesMap(
                file,
                properties
              );
              commonPropertyMap
                .filter((map) => map.stream === Protocol.StreamKind.Video)
                .forEach((map) => {
                  console.log(map);
                  if (map.propertyMap["Height"] && map.propertyMap["Width"]) {
                    map.propertyMap["Resolution"] =
                      `${map.propertyMap["Width"]}x${map.propertyMap["Height"]}`;
                  }
                });
              fileToCommonPropertyMap.set(file, commonPropertyMap);
              mediaFileToCommonPropertyMap.set(fileToCommonPropertyMap);
            } catch (error) {
              dialog.set({
                title: error as string,
                type: Protocol.DialogType.Error,
              });
              return;
            }
          }
        }
      });
    });
  });

  function generateFileToPropertyMap(
    query: string | null,
    files: string[],
    streamCountMap: Map<string, Map<Protocol.StreamKind, Protocol.StreamCount>>,
    commonPropertyMap: Map<string, Array<Protocol.StreamPropertyMap>>
  ): Map<string, Array<Protocol.StreamPropertyMap>> {
    const fileMap = new Map<string, Array<Protocol.StreamPropertyMap>>();
    files
      .filter((file) => streamCountMap.has(file) && commonPropertyMap.has(file))
      .forEach((file) => {
        const maps = commonPropertyMap.get(
          file
        ) as Array<Protocol.StreamPropertyMap>;
        let hit = false;
        if (query && query.length > 0) {
          for (const map of maps) {
            for (const value of Object.values(map.propertyMap)) {
              if (value.toLowerCase().includes(query.toLowerCase())) {
                hit = true;
                break;
              }
            }
          }
        } else {
          hit = true;
        }
        if (hit) {
          fileMap.set(file, maps);
        }
      });
    return fileMap;
  }

  function openDetails(file: string) {
    mediaDetailedFiles.update((detailedFiles) => {
      if (detailedFiles.includes(file)) {
        return detailedFiles;
      } else {
        return [...detailedFiles, file];
      }
    });
    if (!fileToAllPropertiesMap.has(file)) {
      getPropertiesMap(file, null)
        .then((value) => {
          mediaFileToAllPropertiesMap.update((map) => {
            map.set(file, value);
            return map;
          });
          dialog.set(null);
        })
        .catch((error) => {
          dialog.set({
            title: error as string,
            type: Protocol.DialogType.Error,
          });
        });
    }
  }
</script>

<div class="grid gap-2">
  {#if files.length == 0}
    <div class="mt-3 text-center">Please select some files or a directory,</div>
    <div class="text-center">
      or drag and drop some files or directories here.
    </div>
    <div class="my-3 grid grid-flow-col justify-center gap-2">
      <Tooltip title="Add Files" offset={6}>
        <Button
          classes={{ root: BUTTON_CLASSES_TOOLBAR }}
          on:click={() => openFileDialog(false)}
        >
          <span class="material-symbols-outlined text-3xl">article</span>
        </Button>
      </Tooltip>
      <Tooltip title="Add Folder" offset={6}>
        <Button
          classes={{ root: BUTTON_CLASSES_TOOLBAR }}
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
            subheading={formatStreamCount(fileToStreamCountMap.get(file))}
            slot="header"
          >
            <div slot="actions">
              <Tooltip title="Details" offset={6}>
                <Button
                  classes={{ root: BUTTON_CLASSES_NORMAL }}
                  on:click={() => openDetails(file)}
                >
                  <span class="material-symbols-outlined text-3xl">
                    note_stack
                  </span>
                </Button>
              </Tooltip>
              <Tooltip title="Delete" offset={6}>
                <Button
                  classes={{ root: BUTTON_CLASSES_ALERT }}
                  on:click={() => deleteMediaFile(file)}
                >
                  <span class="material-symbols-outlined text-3xl">
                    delete
                  </span>
                </Button>
              </Tooltip>
            </div>
          </Header>
          <div slot="contents">
            {#each [...COMMON_PROPERTIES_MAP.entries()] as commonPropertiesEntry}
              {#if fileToPropertyMap
                .get(file)
                ?.some((map) => map.stream === commonPropertiesEntry[0])}
                <Table
                  classes={{
                    table: "border-collapse border border-slate-500 mb-1",
                    th: "border border-slate-600 px-1 bg-lime-50",
                    td: "border border-slate-700 px-1 font-mono whitespace-pre-wrap",
                  }}
                  data={fileToPropertyMap
                    .get(file)
                    ?.filter((map) => map.stream === commonPropertiesEntry[0])
                    ?.map((map) => map.propertyMap)
                    ?.map((map, index) => {
                      map["@id"] = `${index + 1}`;
                      return map;
                    })}
                  columns={commonPropertiesEntry[1].map((property) => {
                    return {
                      name: property.name,
                      header: property.header ? property.header : property.name,
                      align: "left",
                      format: property.format,
                    };
                  })}
                />
              {/if}
            {/each}
            <div class="pb-3"></div>
          </div>
        </Card>
      {/if}
    {/each}
  {/if}
</div>
