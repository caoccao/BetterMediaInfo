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
  import {
    Button,
    Card,
    Checkbox,
    Header,
    Table,
    TextField,
    Tooltip,
  } from "svelte-ux";
  import * as Protocol from "../lib/protocol";
  import {
    dialogJsonCode,
    mediaFileToAllPropertiesMap,
    mediaFileToStreamCountMap,
  } from "../lib/store";

  export let file: string;

  const BUTTON_CLASSES_NORMAL =
    "w-12 h-12 bg-white hover:bg-gray-200 text-gray-500 hover:text-blue-500";

  let allProperties: Array<Protocol.StreamPropertyMap> = [];

  let fileToAllPropertiesMap: Map<
    string,
    Array<Protocol.StreamPropertyMap>
  > = new Map();

  let fileToStreamCountMap: Map<
    string,
    Map<Protocol.StreamKind, Protocol.StreamCount>
  > = new Map();

  let query: string | null = null;

  let streamGroup: Protocol.StreamKind[] = [];
  let streamCountMap: Map<Protocol.StreamKind, Protocol.StreamCount> =
    new Map();

  $: filteredAllProperties = allProperties
    .map((properties) => {
      let newProperties = properties;
      if (query && query.length > 0) {
        const lowerCasedQuery = query.toLowerCase();
        const propertyMap: Record<string, string> = {};
        Object.entries(properties.propertyMap).forEach(([key, value]) => {
          if (
            key.toLowerCase().includes(lowerCasedQuery) ||
            value.toLowerCase().includes(lowerCasedQuery)
          ) {
            propertyMap[key] = value;
          }
        });
        newProperties = {
          stream: properties.stream,
          num: properties.num,
          propertyMap: propertyMap,
        };
      }
      return newProperties;
    })
    .filter((properties) => Object.keys(properties.propertyMap).length > 0);

  onMount(() => {
    mediaFileToAllPropertiesMap.subscribe((value) => {
      fileToAllPropertiesMap = value;
      allProperties = fileToAllPropertiesMap.get(file) ?? [];
    });
    mediaFileToStreamCountMap.subscribe((value) => {
      fileToStreamCountMap = value;
      streamCountMap = fileToStreamCountMap.get(file) ?? new Map();
      onClickSelectAll();
    });
  });

  function onClickSelectAll() {
    streamGroup = [...streamCountMap.keys()];
  }

  function onClickSelectNone() {
    streamGroup = [];
  }

  function openDialogJsonCode(file: string) {
    dialogJsonCode.set({
      title: `${file} (All Properties)`,
      jsonCode: allProperties ?? null,
    });
  }
</script>

<div class="grid gap-2">
  <Card>
    <Header title={file} slot="header">
      <div slot="actions">
        <Tooltip title="Json" offset={6}>
          <Button
            classes={{ root: BUTTON_CLASSES_NORMAL }}
            on:click={() => openDialogJsonCode(file)}
            disabled={allProperties.length === 0}
          >
            <span class="material-symbols-outlined text-3xl"> javascript </span>
          </Button>
        </Tooltip>
      </div>
    </Header>
    <div slot="actions">
      <div class="grid gap-2 px-2 pb-2">
        <div class="flex flex-wrap gap-2">
          <Tooltip title="Select All" offset={6}>
            <Button
              classes={{ root: "w-4 h-8" }}
              on:click={onClickSelectAll}
              disabled={streamCountMap.size === streamGroup.length}
            >
              <span class="material-symbols-outlined">done_all</span>
            </Button>
          </Tooltip>
          <Tooltip title="Select None" offset={6}>
            <Button
              classes={{ root: "w-4 h-8" }}
              on:click={onClickSelectNone}
              disabled={streamGroup.length === 0}
            >
              <span class="material-symbols-outlined">remove_done</span>
            </Button>
          </Tooltip>
          <div class="flex flex-wrap gap-4 pl-4">
            {#each Protocol.STREAM_KINDS as streamKind}
              {#if (streamCountMap.get(streamKind)?.count ?? 0) > 0}
                <Checkbox bind:group={streamGroup} value={streamKind}>
                  <div class="flex gap-2">
                    <div>{streamKind}</div>
                    <div
                      class="w-5 h-5 rounded-full border flex items-center justify-center text-center"
                    >
                      {streamCountMap.get(streamKind)?.count ?? 0}
                    </div>
                  </div>
                </Checkbox>
              {/if}
            {/each}
          </div>
        </div>
        <TextField placeholder="Filter" bind:value={query} clearable />
      </div>
    </div>
  </Card>
  {#if allProperties.length == 0}
    <div class="loader"></div>
  {:else if filteredAllProperties.length == 0}
    <div class="grid place-content-center">
      <img src="images/empty.gif" alt="Not Found" />
    </div>
  {:else}
    {#each filteredAllProperties as properties}
      {#if streamGroup.includes(properties.stream)}
        <Card>
          <Header
            title={`${properties.stream} (${properties.num + 1})`}
            slot="header"
          />
          <div slot="contents">
            <Table
              data={Object.entries(properties.propertyMap)
                .map(([key, value]) => {
                  return { property: key, value: value };
                })
                .toSorted((a, b) => a.property.localeCompare(b.property))}
              classes={{
                table: "border-collapse border border-slate-500 mb-4",
                th: `border border-slate-600 px-1 bg-${Protocol.STREAM_KIND_TO_COLOR_MAP.get(properties.stream)}-50`,
                td: "border border-slate-700 px-1 font-mono whitespace-pre-wrap",
              }}
              columns={[
                {
                  name: "property",
                  header: "Property",
                  align: "left",
                },
                {
                  name: "value",
                  header: "Value",
                  align: "left",
                },
              ]}
            />
          </div>
        </Card>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .loader {
    font-weight: bold;
    font-family: monospace;
    display: inline-grid;
    font-size: 30px;
    text-align: center;
  }
  .loader:before,
  .loader:after {
    content: "Loading...";
    grid-area: 1/1;
    -webkit-mask-size:
      2ch 100%,
      100% 100%;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: l37 3s infinite;
  }
  .loader:before {
    -webkit-mask-image: linear-gradient(#000 0 0), linear-gradient(#000 0 0);
  }
  .loader:after {
    -webkit-mask-image: linear-gradient(#000 0 0);
    transform: scaleY(0.5);
  }

  @keyframes l37 {
    0% {
      -webkit-mask-position:
        1ch 0,
        0 0;
    }
    12.5% {
      -webkit-mask-position:
        100% 0,
        0 0;
    }
    25% {
      -webkit-mask-position:
        4ch 0,
        0 0;
    }
    37.5% {
      -webkit-mask-position:
        8ch 0,
        0 0;
    }
    50% {
      -webkit-mask-position:
        2ch 0,
        0 0;
    }
    62.5% {
      -webkit-mask-position:
        100% 0,
        0 0;
    }
    75% {
      -webkit-mask-position:
        0ch 0,
        0 0;
    }
    87.5% {
      -webkit-mask-position:
        6ch 0,
        0 0;
    }
    100% {
      -webkit-mask-position:
        3ch 0,
        0 0;
    }
  }
</style>
