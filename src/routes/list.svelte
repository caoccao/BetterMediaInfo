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

  import { getMatches } from "@tauri-apps/plugin-cli";
  import { onMount } from "svelte";
  import {
    Button,
    ButtonGroup,
    Card,
    type ColumnDef,
    Header,
    Overflow,
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
    transformFPS,
    transformResolution,
    transformSamplingRate,
    transformSize,
    transformTime,
  } from "../lib/format";

  enum OrderByType {
    None,
    Number,
    String,
  }

  enum ViewType {
    Card,
    List,
  }

  class PropertyDefinition {
    align: "left" | "right" | "center" | "justify";
    format: (
      value: any,
      rowData: Record<string, string>,
      rowIndex: number
    ) => string;
    header: string | null;
    inCardView: boolean;
    inListView: boolean;
    name: string;
    orderByType: OrderByType;
    virtual: boolean;

    constructor(
      name: string,
      format: (
        value: any,
        rowData: Record<string, string>,
        rowIndex: number
      ) => string = transformDefault,
      headerForCardView: string | null = null
    ) {
      this.align = "left";
      this.format = format;
      this.header = headerForCardView;
      this.inCardView = false;
      this.inListView = false;
      this.name = name;
      this.orderByType = OrderByType.String;
      this.virtual = false;
    }

    getHeader(): string {
      return this.header ?? this.name;
    }

    getOrderBy(
      property: string
    ):
      | ((a: Record<string, string>, b: Record<string, string>) => number)
      | boolean {
      switch (this.orderByType) {
        case OrderByType.Number:
          return (a: Record<string, string>, b: Record<string, string>) => {
            const v1 = a[property] ? parseFloat(a[property]) : 0;
            const v2 = b[property] ? parseFloat(b[property]) : 0;
            return sortDirection === "asc" ? v1 - v2 : v2 - v1;
          };
        case OrderByType.String:
          return (a: Record<string, string>, b: Record<string, string>) => {
            const v1 = a[property] ?? "";
            const v2 = b[property] ?? "";
            return sortDirection === "asc"
              ? v1.localeCompare(v2)
              : v2.localeCompare(v1);
          };
        default:
          return false;
      }
    }

    setAlignCenter(): PropertyDefinition {
      this.align = "center";
      return this;
    }

    setAlignLeft(): PropertyDefinition {
      this.align = "left";
      return this;
    }

    setAlignRight(): PropertyDefinition {
      this.align = "right";
      return this;
    }

    setHeader(header: string | null): PropertyDefinition {
      this.header = header;
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

    setOrderByNone(): PropertyDefinition {
      this.orderByType = OrderByType.None;
      return this;
    }

    setOrderByNumber(): PropertyDefinition {
      this.orderByType = OrderByType.Number;
      return this;
    }

    setOrderByString(): PropertyDefinition {
      this.orderByType = OrderByType.String;
      return this;
    }

    setVirtual(virtual: boolean = true): PropertyDefinition {
      this.virtual = virtual;
      return this;
    }

    toColumnsOfCardView(): ColumnDef<Record<string, string>> {
      return {
        name: this.name,
        header: this.getHeader(),
        align: this.align,
        format: this.format,
      };
    }

    toColumnsOfListView(
      stream: Protocol.StreamKind
    ): ColumnDef<Record<string, string>> {
      const name = `${stream}:${this.name}`;
      return {
        name,
        header: this.getHeader(),
        align: this.align,
        format: this.format,
        orderBy: this.getOrderBy(name),
        classes: {
          th: `border border-slate-600 p-1 bg-${Protocol.STREAM_KIND_TO_COLOR_MAP.get(stream)}-50`,
        },
      };
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
    new PropertyDefinition("CompleteName")
      .setHeader("File Path")
      .setInListView(),
    new PropertyDefinition("Format").setInCardView().setInListView(),
    new PropertyDefinition("FileSize", transformSize, "Size")
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Duration", transformDuration)
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Time", transformTime)
      .setOrderByNone()
      .setAlignRight()
      .setVirtual()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Title").setInCardView().setInListView(),
    new PropertyDefinition("Encoded_Date")
      .setHeader("Encoded Date")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Video:Count")
      .setOrderByNumber()
      .setHeader("V")
      .setInListView(),
    new PropertyDefinition("Audio:Count")
      .setOrderByNumber()
      .setHeader("A")
      .setInListView(),
    new PropertyDefinition("Text:Count")
      .setOrderByNumber()
      .setHeader("T")
      .setInListView(),
    new PropertyDefinition("Image:Count")
      .setOrderByNumber()
      .setHeader("I")
      .setInListView(),
    new PropertyDefinition("Menu:Count")
      .setOrderByNumber()
      .setHeader("M")
      .setInListView(),
  ];

  const COMMON_PROPERTIES_VIDEO: Array<PropertyDefinition> = [
    new PropertyDefinition("ID").setInCardView(),
    new PropertyDefinition("Format").setInCardView().setInListView(),
    new PropertyDefinition("Language").setInCardView().setInListView(),
    new PropertyDefinition("Title").setInCardView().setInListView(),
    new PropertyDefinition("Resolution", transformResolution)
      .setOrderByNone()
      .setVirtual()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("HDR_Format_Compatibility")
      .setHeader("HDR")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("ScanType")
      .setHeader("Scan Type")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Default").setHeader("D").setInCardView(),
    new PropertyDefinition("Forced").setHeader("F").setInCardView(),
    new PropertyDefinition("BitDepth")
      .setOrderByNumber()
      .setAlignRight()
      .setHeader("Depth")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("FrameRate", transformFPS)
      .setOrderByNumber()
      .setAlignRight()
      .setHeader("FPS")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("BitRate", transformBitRate, "Bit Rate")
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("StreamSize", transformSize, "Size")
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Width"),
    new PropertyDefinition("Height"),
  ];

  const COMMON_PROPERTIES_AUDIO: Array<PropertyDefinition> = [
    new PropertyDefinition("ID").setInCardView(),
    new PropertyDefinition("Format_Commercial")
      .setHeader("Format")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Language").setInCardView().setInListView(),
    new PropertyDefinition("Title").setInCardView().setInListView(),
    new PropertyDefinition("Channel(s)")
      .setOrderByNumber()
      .setAlignRight()
      .setHeader("CH")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("BitDepth")
      .setOrderByNumber()
      .setAlignRight()
      .setHeader("Depth")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("SamplingRate", transformSamplingRate, "Sampling")
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("Default").setHeader("D").setInCardView(),
    new PropertyDefinition("Forced").setHeader("F").setInCardView(),
    new PropertyDefinition("BitRate_Mode")
      .setHeader("Mode")
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("BitRate", transformBitRate, "Bit Rate")
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("StreamSize", transformSize, "Size")
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
  ];

  const COMMON_PROPERTIES_TEXT: Array<PropertyDefinition> = [
    new PropertyDefinition("ID").setInCardView(),
    new PropertyDefinition("Format").setInCardView().setInListView(),
    new PropertyDefinition("Language").setInCardView().setInListView(),
    new PropertyDefinition("Title").setInCardView().setInListView(),
    new PropertyDefinition("Default").setHeader("D").setInCardView(),
    new PropertyDefinition("Forced").setHeader("F").setInCardView(),
    new PropertyDefinition("BitRate", transformBitRate, "Bit Rate")
      .setOrderByNumber()
      .setAlignRight()
      .setInCardView()
      .setInListView(),
    new PropertyDefinition("StreamSize", transformSize, "Size")
      .setOrderByNumber()
      .setAlignRight()
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
  let sortDirection: "asc" | "desc" = "asc";
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
    ([file, propertyMaps]) => {
      const newPropertyMap = propertyMaps
        .filter((map) => map.num == 0)
        .map((map) => {
          const newProperty: Record<string, string> = {};
          Object.entries(map.propertyMap).map(([property, value]) => {
            newProperty[`${map.stream}:${property}`] = value;
          });
          return newProperty;
        })
        .reduce((acc, cur) => ({ ...acc, ...cur }), {});
      fileToStreamCountMap.get(file)?.forEach((streamCount, stream) => {
        newPropertyMap[`General:${stream}:Count`] =
          streamCount.count.toString();
      });
      return newPropertyMap;
    }
  );

  $: columnsOfListView = [...COMMON_PROPERTIES_MAP.entries()]
    .map(([stream, commonProperties]) =>
      commonProperties.map((propertyDefinition) => {
        return { stream, propertyDefinition };
      })
    )
    .flatMap((streamAndPropertyDefinition) => streamAndPropertyDefinition)
    .filter(({ stream, propertyDefinition }) => propertyDefinition.inListView)
    .map(({ stream, propertyDefinition }) =>
      propertyDefinition.toColumnsOfListView(stream)
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
    tableOrderStoreForListView.subscribe((value) => {
      sortDirection = value.direction;
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
              {#each [...COMMON_PROPERTIES_MAP.entries()] as [stream, commonProperties]}
                {#if fileToPropertyMaps
                  .get(file)
                  ?.some((map) => map.stream === stream)}
                  <Table
                    classes={{
                      table: "border-collapse border border-slate-500 mb-1",
                      th: `border border-slate-600 px-1 bg-${Protocol.STREAM_KIND_TO_COLOR_MAP.get(stream)}-50`,
                      td: "border border-slate-700 px-1",
                    }}
                    data={fileToPropertyMaps
                      .get(file)
                      ?.filter((map) => map.stream === stream)
                      ?.map((map) => map.propertyMap)}
                    columns={commonProperties
                      .filter((property) => property.inCardView)
                      .map((property) => property.toColumnsOfCardView())}
                  />
                {/if}
              {/each}
              <div class="pb-3"></div>
            </div>
          </Card>
        {/if}
      {/each}
    {:else if viewType == ViewType.List}
      <Overflow class="pb-2 overflow-auto">
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
      </Overflow>
    {/if}
  {/if}
</div>
