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

  import { getMatches } from "@tauri-apps/api/cli";
  import { onMount } from "svelte";
  import {
    Button,
    ButtonGroup,
    Card,
    type ColumnDef,
    Header,
    Table,
    tableOrderStore,
    TextField,
    Tooltip,
  } from "svelte-ux";
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
  import { scanFiles } from "../lib/fs";
  import { getPropertiesMap, getStreamCountMap } from "../lib/service";
  import {
    formatStreamCount,
    transformBitRate,
    transformDefault,
    transformDuration,
    transformFilePath,
    transformResolution,
    transformSamplingRate,
    transformSize,
    transformTime,
  } from "../lib/format";

  enum ViewType {
    Card,
    List,
  }

  class PropertyDefinition {
    format: (
      value: any,
      rowData: Record<string, string>,
      rowIndex: number
    ) => string;
    headerForCardView: string | null;
    headerForListView: string | null;
    name: string;
    virtual: boolean;
    inCardView: boolean;
    inListView: boolean;

    constructor(
      name: string,
      format: (
        value: any,
        rowData: Record<string, string>,
        rowIndex: number
      ) => string = transformDefault,
      headerForCardView: string | null = null,
      headerForListView: string | null = null,
      virtual: boolean = false,
      inCardView: boolean = false,
      inListView: boolean = false
    ) {
      this.format = format;
      this.headerForCardView = headerForCardView;
      this.headerForListView = headerForListView;
      this.name = name;
      this.inCardView = inCardView;
      this.inListView = inListView;
      this.virtual = virtual;
    }

    getHeaderForCardView(): string {
      return this.headerForCardView ?? this.name;
    }

    getHeaderForListView(): string {
      return this.headerForListView ?? this.name;
    }

    setHeaderForCardView(header: string | null): PropertyDefinition {
      this.headerForCardView = header;
      return this;
    }

    setHeaderForListView(header: string | null): PropertyDefinition {
      this.headerForListView = header;
      return this;
    }

    setInCardView(inCardView: boolean = true): PropertyDefinition {
      this.inCardView = inCardView;
      return this;
    }

    setInListView(inListView: boolean = true): PropertyDefinition {
      this.inListView = inListView;
      return this;
    }

    setVirtual(virtual: boolean = true): PropertyDefinition {
      this.virtual = virtual;
      return this;
    }
  }

  const BUTTON_CLASSES_SIDE_ALERT =
    "w-12 h-12 bg-white hover:bg-gray-200 text-gray-500 hover:text-red-500";
  const BUTTON_CLASSES_SIDE_NORMAL =
    "w-12 h-12 bg-white hover:bg-gray-200 text-gray-500 hover:text-blue-500";
  const BUTTON_CLASSES_TOOLBAR_ACTIVE =
    "w-4 h-8 bg-cyan-400 hover:bg-cyan-600 text-white hover:text-blue-200";
  const BUTTON_CLASSES_TOOLBAR_NORMAL =
    "w-4 h-8 bg-gray-400 hover:bg-gray-600 text-white hover:text-blue-200";
  const BUTTON_CLASSES_TOOLBAR_LARGE =
    "w-12 h-12 bg-gray-400 hover:bg-gray-600 text-white hover:text-blue-200";

  const COMMON_PROPERTIES_GENERAL: Array<PropertyDefinition> = [
    new PropertyDefinition("Format")
      .setHeaderForListView("File Format")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("FileSize", transformSize, "Size", "File Size")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Duration", transformDuration)
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Time", transformTime)
      .setVirtual()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Title")
      .setHeaderForListView("File Title")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Encoded_Date")
      .setHeaderForCardView("Encoded Date")
      .setHeaderForListView("Encoded Date")
      .setInCardView()
      .setInListView(),
  ];

  const COMMON_PROPERTIES_VIDEO: Array<PropertyDefinition> = [
    new PropertyDefinition("ID").setInCardView(),
    new PropertyDefinition("Format")
      .setHeaderForListView("Video Format")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Language")
      .setHeaderForListView("Video Language")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Title")
      .setHeaderForListView("Video Title")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Resolution", transformResolution)
      .setVirtual()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("HDR_Format_Compatibility")
      .setHeaderForCardView("HDR")
      .setHeaderForListView("HDR")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("ScanType")
      .setHeaderForCardView("Scan Type")
      .setHeaderForListView("Scan Type")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Default").setHeaderForCardView("D"),
    new PropertyDefinition("Forced").setHeaderForCardView("F"),
    new PropertyDefinition("BitDepth")
      .setHeaderForCardView("Depth")
      .setHeaderForListView("Video Bit Depth")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("FrameRate")
      .setHeaderForCardView("FPS")
      .setHeaderForListView("FPS")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition(
      "BitRate",
      transformBitRate,
      "Bit Rate",
      "Video Bit Rate"
    )
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("StreamSize", transformSize, "Size", "Video Size")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Width"),
    new PropertyDefinition("Height"),
  ];

  const COMMON_PROPERTIES_AUDIO: Array<PropertyDefinition> = [
    new PropertyDefinition("ID").setInCardView(),
    new PropertyDefinition("Format_Commercial")
      .setHeaderForCardView("Format")
      .setHeaderForListView("Audio Format")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Language")
      .setHeaderForListView("Audio Language")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Title")
      .setHeaderForListView("Audio Title")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Channel(s)")
      .setHeaderForCardView("CH")
      .setHeaderForListView("CH")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("BitDepth")
      .setHeaderForCardView("Depth")
      .setHeaderForListView("Audio Bit Depth")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition(
      "SamplingRate",
      transformSamplingRate,
      "Sampling",
      "Audio Sampling Rate"
    )
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Default").setHeaderForCardView("D").setInCardView(),
    new PropertyDefinition("Forced").setHeaderForCardView("F").setInCardView(),
    new PropertyDefinition("BitRate_Mode")
      .setHeaderForCardView("Mode")
      .setHeaderForListView("Audio Bit Rate Mode")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition(
      "BitRate",
      transformBitRate,
      "Bit Rate",
      "Audio Bit Rate"
    )
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("StreamSize", transformSize, "Size", "Audio Size")
      .setInCardView()
      .setInListView(),
  ];

  const COMMON_PROPERTIES_TEXT: Array<PropertyDefinition> = [
    new PropertyDefinition("ID").setInCardView(),
    new PropertyDefinition("Format")
      .setHeaderForListView("Text Format")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Language")
      .setHeaderForListView("Text Language")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Title")
      .setHeaderForListView("Text Title")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Default").setHeaderForCardView("D").setInCardView(),
    new PropertyDefinition("Forced").setHeaderForCardView("F").setInCardView(),
    new PropertyDefinition(
      "BitRate",
      transformBitRate,
      "Bit Rate",
      "Text Bit Rate"
    )
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("StreamSize", transformSize, "Size", "Text Size")
      .setInCardView()
      .setInListView(),
  ];

  const COMMON_PROPERTIES_MAP = new Map<
    Protocol.StreamKind,
    Array<PropertyDefinition>
  >([
    [Protocol.StreamKind.General, COMMON_PROPERTIES_GENERAL],
    [Protocol.StreamKind.Video, COMMON_PROPERTIES_VIDEO],
    [Protocol.StreamKind.Audio, COMMON_PROPERTIES_AUDIO],
    [Protocol.StreamKind.Text, COMMON_PROPERTIES_TEXT],
  ]);

  const tableOrderStoreForListView = tableOrderStore();

  let files: string[] = [];
  let query: string | null = null;
  let viewType: ViewType = ViewType.Card;

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

  $: buttonCardViewClass =
    viewType == ViewType.Card
      ? BUTTON_CLASSES_TOOLBAR_ACTIVE
      : BUTTON_CLASSES_TOOLBAR_NORMAL;

  $: buttonListViewClass =
    viewType == ViewType.List
      ? BUTTON_CLASSES_TOOLBAR_ACTIVE
      : BUTTON_CLASSES_TOOLBAR_NORMAL;

  $: fileToPropertyMaps = generateFileToPropertyMaps(
    query,
    files,
    fileToStreamCountMap,
    fileToCommonPropertyMap
  );

  $: dataOfListView = [...fileToPropertyMaps.entries()].map(
    ([file, propertyMaps]) =>
      propertyMaps
        .filter((map) => map.num == 0)
        .map((map) => {
          const newProperty: Record<string, string> = {};
          Object.entries(map.propertyMap).map(([property, value]) => {
            newProperty[`${map.stream}:${property}`] = value;
          });
          return newProperty;
        })
        .reduce((acc, cur) => ({ ...acc, ...cur }), { FilePath: file })
  );

  $: columnsOfListView = [
    {
      name: "FilePath",
      header: "File Path",
      align: "left",
      format: transformFilePath,
    } as ColumnDef<Record<string, string>>,
  ].concat(
    [...COMMON_PROPERTIES_MAP.entries()]
      .map(([stream, commonProperties]) =>
        commonProperties.map((propertyDefinition) => {
          return { stream, propertyDefinition };
        })
      )
      .flatMap((streamAndPropertyDefinition) => streamAndPropertyDefinition)
      .filter(({ stream, propertyDefinition }) => propertyDefinition.inListView)
      .map(({ stream, propertyDefinition }) => {
        return {
          name: `${stream}:${propertyDefinition.name}`,
          header: propertyDefinition.getHeaderForListView(),
          align: "left",
          format: propertyDefinition.format,
        } as ColumnDef<Record<string, string>>;
      })
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
    getMatches().then((matches) => {
      const argMatch = matches.args["fileOrDirectory"];
      if (argMatch) {
        const fileOrDirectory = argMatch.value;
        if (fileOrDirectory && typeof fileOrDirectory === "string") {
          scanFiles([fileOrDirectory as string]);
        }
      }
    });
  });

  function generateFileToPropertyMaps(
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
      title: `${file} (Common Properties)`,
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
          classes={{ root: BUTTON_CLASSES_TOOLBAR_LARGE }}
          on:click={() => openFileDialog(false)}
        >
          <span class="material-symbols-outlined text-3xl">article</span>
        </Button>
      </Tooltip>
      <Tooltip title="Add Folder" offset={6}>
        <Button
          classes={{ root: BUTTON_CLASSES_TOOLBAR_LARGE }}
          on:click={() => openDirectoryDialog(false)}
        >
          <span class="material-symbols-outlined text-3xl">folder</span>
        </Button>
      </Tooltip>
    </div>
  {:else}
    <div class="grid grid-flow-col justify-start gap-2">
      <ButtonGroup variant="outline" color="default">
        <Tooltip title="Card View" offset={6}>
          <Button
            classes={{ root: buttonCardViewClass }}
            on:click={() => {
              viewType = ViewType.Card;
            }}
          >
            <span class="material-symbols-outlined">view_agenda</span>
          </Button>
        </Tooltip>
        <Tooltip title="List View" offset={6}>
          <Button
            classes={{ root: buttonListViewClass }}
            on:click={() => {
              viewType = ViewType.List;
            }}
          >
            <span class="material-symbols-outlined">list</span>
          </Button>
        </Tooltip>
      </ButtonGroup>
    </div>
    <TextField placeholder="Filter" bind:value={query} clearable />
    {#if fileToPropertyMaps.size == 0}
      <div class="grid place-content-center">
        <img src="images/empty.gif" alt="Not Found" />
      </div>
    {:else if viewType == ViewType.Card}
      {#each files as file}
        {#if fileToPropertyMaps.has(file)}
          <Card>
            <Header
              title={file}
              subheading={formatStreamCount(fileToStreamCountMap.get(file))}
              slot="header"
            >
              <div slot="actions">
                <Tooltip title="Json" offset={6}>
                  <Button
                    classes={{ root: BUTTON_CLASSES_SIDE_NORMAL }}
                    on:click={() => openDialogJsonCode(file)}
                  >
                    <span class="material-symbols-outlined text-3xl">
                      javascript
                    </span>
                  </Button>
                </Tooltip>
                <Tooltip title="Details" offset={6}>
                  <Button
                    classes={{ root: BUTTON_CLASSES_SIDE_NORMAL }}
                    on:click={() => openDetails(file)}
                  >
                    <span class="material-symbols-outlined text-3xl">
                      note_stack
                    </span>
                  </Button>
                </Tooltip>
                <Tooltip title="Delete" offset={6}>
                  <Button
                    classes={{ root: BUTTON_CLASSES_SIDE_ALERT }}
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
                {#if fileToPropertyMaps
                  .get(file)
                  ?.some((map) => map.stream === commonPropertiesEntry[0])}
                  <Table
                    classes={{
                      table: "border-collapse border border-slate-500 mb-1",
                      th: `border border-slate-600 px-1 bg-${Protocol.STREAM_KIND_TO_COLOR_MAP.get(commonPropertiesEntry[0])}-50`,
                      td: "border border-slate-700 px-1",
                    }}
                    data={fileToPropertyMaps
                      .get(file)
                      ?.filter((map) => map.stream === commonPropertiesEntry[0])
                      ?.map((map) => map.propertyMap)}
                    columns={commonPropertiesEntry[1]
                      .filter((property) => property.inCardView)
                      .map((property) => {
                        return {
                          name: property.name,
                          header: property.getHeaderForCardView(),
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
    {:else if viewType == ViewType.List}
      <Table
        classes={{
          table: "border-collapse border border-slate-500 mb-1",
          th: "border border-slate-600 p-1 bg-lime-50",
          td: "border border-slate-700 px-1 text-nowrap",
        }}
        data={dataOfListView.sort($tableOrderStoreForListView.handler)}
        columns={columnsOfListView}
        order={tableOrderStoreForListView}
      />
    {/if}
  {/if}
</div>
