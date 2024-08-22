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
    dialogJsonCode,
    dialogNotification,
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
    transformSamplingRate,
    transformSize,
  } from "../lib/format";

  interface PropertyFormat {
    format:
      | ((
          value: any,
          rowData: Record<string, string>,
          rowIndex: number
        ) => string)
      | undefined;
    header: string | null;
    name: string;
    virtual: boolean;
  }

  function createFormat(
    name: string,
    format:
      | ((
          value: any,
          rowData: Record<string, string>,
          rowIndex: number
        ) => string)
      | undefined = undefined,
    header: string | null = null,
    virtual: boolean = false
  ): PropertyFormat {
    return { format, header, name, virtual };
  }

  function formatResolution(
    _value: any,
    rowData: Record<string, string>,
    _rowIndex: number
  ) {
    if (rowData["Height"] && rowData["Width"]) {
      return `${rowData["Width"]}x${rowData["Height"]}`;
    }
    return "";
  }

  const BUTTON_CLASSES_ALERT =
    "w-12 h-12 bg-white hover:bg-gray-200 text-gray-500 hover:text-red-500";
  const BUTTON_CLASSES_NORMAL =
    "w-12 h-12 bg-white hover:bg-gray-200 text-gray-500 hover:text-blue-500";
  const BUTTON_CLASSES_TOOLBAR =
    "w-12 h-12 bg-gray-400 hover:bg-gray-600 text-white hover:text-blue-200";

  const COMMON_PROPERTIES_GENERAL: Array<PropertyFormat> = [
    createFormat("Format", transformDefault),
    createFormat("FileSize", transformSize, "Size"),
    createFormat("Duration", transformDuration, "Duration"),
    createFormat("Title", transformDefault),
    createFormat("Encoded_Date", transformDefault, "Encoded Date"),
  ];

  const COMMON_PROPERTIES_VIDEO: Array<PropertyFormat> = [
    createFormat("ID", transformDefault),
    createFormat("Format", transformDefault),
    createFormat("Language", transformDefault),
    createFormat("Title", transformDefault),
    createFormat("Resolution", formatResolution, "Resolution", true),
    createFormat("HDR_Format_Compatibility", transformDefault, "HDR"),
    createFormat("ScanType", transformDefault, "Scan Type"),
    createFormat("Default", transformDefault, "D"),
    createFormat("Forced", transformDefault, "F"),
    createFormat("FrameRate", transformDefault, "FPS"),
    createFormat("BitRate", transformBitRate, "Bit Rate"),
    createFormat("StreamSize", transformSize, "Size"),
    createFormat("Width"),
    createFormat("Height"),
  ];

  const COMMON_PROPERTIES_AUDIO: Array<PropertyFormat> = [
    createFormat("ID", transformDefault),
    createFormat("Format_Commercial", transformDefault, "Format"),
    createFormat("Language", transformDefault),
    createFormat("Title", transformDefault),
    createFormat("Channel(s)", transformDefault, "CH"),
    createFormat("BitDepth", transformDefault, "Depth"),
    createFormat("SamplingRate", transformSamplingRate, "Sampling"),
    createFormat("Default", transformDefault, "D"),
    createFormat("Forced", transformDefault, "F"),
    createFormat("BitRate_Mode", transformDefault, "Mode"),
    createFormat("BitRate", transformBitRate, "Bit Rate"),
    createFormat("StreamSize", transformSize, "Size"),
  ];

  const COMMON_PROPERTIES_TEXT: Array<PropertyFormat> = [
    createFormat("ID", transformDefault),
    createFormat("Format", transformDefault),
    createFormat("Language", transformDefault),
    createFormat("Title", transformDefault),
    createFormat("Default", transformDefault, "D"),
    createFormat("Forced", transformDefault, "F"),
    createFormat("BitRate", transformBitRate, "Bit Rate"),
    createFormat("StreamSize", transformSize, "Size"),
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
      dialogNotification.set(null);
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
            dialogNotification.set({
              title: error as string,
              type: Protocol.DialogNotificationType.Error,
            });
            return;
          }
        }
        if (!fileToCommonPropertyMap.has(file)) {
          const properties = [...COMMON_PROPERTIES_MAP.entries()]
            .filter(
              ([stream, _propertyFormats]) =>
                (streamCountMap.get(stream)?.count ?? 0) > 0
            )
            .map(([stream, propertyFormats]) =>
              propertyFormats
                .filter((property) => !property.virtual)
                .map((property) => {
                  return {
                    stream: stream,
                    property: property.name,
                  };
                })
            )
            .flat();
          if (properties.length > 0) {
            try {
              const commonPropertyMap = await getPropertiesMap(
                file,
                properties
              );
              fileToCommonPropertyMap.set(file, commonPropertyMap);
              mediaFileToCommonPropertyMap.set(fileToCommonPropertyMap);
            } catch (error) {
              dialogNotification.set({
                title: error as string,
                type: Protocol.DialogNotificationType.Error,
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
          const lowerCasedQuery = query.toLowerCase();
          for (const map of maps) {
            for (const value of Object.values(map.propertyMap)) {
              if (value.toLowerCase().includes(lowerCasedQuery)) {
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

  function openDialogJsonCode(file: string) {
    dialogJsonCode.set({
      title: file,
      jsonCode: fileToCommonPropertyMap.get(file) ?? null,
    });
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
          dialogNotification.set(null);
        })
        .catch((error) => {
          dialogNotification.set({
            title: error as string,
            type: Protocol.DialogNotificationType.Error,
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
    {#if fileToPropertyMap.size == 0}
      <div class="grid place-content-center">
        <img src="images/empty.gif" alt="Not Found" />
      </div>
    {:else}
      {#each files as file}
        {#if fileToPropertyMap.has(file)}
          <Card>
            <Header
              title={file}
              subheading={formatStreamCount(fileToStreamCountMap.get(file))}
              slot="header"
            >
              <div slot="actions">
                <Tooltip title="Json" offset={6}>
                  <Button
                    classes={{ root: BUTTON_CLASSES_NORMAL }}
                    on:click={() => openDialogJsonCode(file)}
                  >
                    <span class="material-symbols-outlined text-3xl">
                      javascript
                    </span>
                  </Button>
                </Tooltip>
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
                      th: `border border-slate-600 px-1 bg-${Protocol.STREAM_KIND_TO_COLOR_MAP.get(commonPropertiesEntry[0])}-50`,
                      td: "border border-slate-700 px-1 font-mono whitespace-pre-wrap",
                    }}
                    data={fileToPropertyMap
                      .get(file)
                      ?.filter((map) => map.stream === commonPropertiesEntry[0])
                      ?.map((map) => map.propertyMap)}
                    columns={commonPropertiesEntry[1]
                      .filter((property) => property.format !== undefined)
                      .map((property) => {
                        return {
                          name: property.name,
                          header: property.header
                            ? property.header
                            : property.name,
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
  {/if}
</div>
