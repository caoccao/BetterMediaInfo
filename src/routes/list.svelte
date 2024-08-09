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
  import { Button, Card, Header, Table } from "svelte-ux";
  import { openDirectoryDialog, openFileDialog } from "../lib/dialog";
  import { dialog, mediaFiles, mediaStreamCountMap } from "../lib/store";
  import * as Protocol from "../lib/protocol";

  let files: string[] = [];
  let streamCountMap: Map<string, Protocol.StreamCount[]> = new Map();
  let commonPropertyMap: Map<string, Protocol.StreamPropertyValue[]> =
    new Map();

  onMount(() => {
    mediaStreamCountMap.subscribe((value) => {
      streamCountMap = value;
    });
    mediaFiles.subscribe((value) => {
      dialog.set(null);
      files = value;
      files
        .filter((file) => !streamCountMap.has(file))
        .forEach((file) => {
          invoke<Protocol.StreamCount[]>("get_stream_count", { file: file })
            .then((value) => {
              streamCountMap.set(file, value);
              streamCountMap = streamCountMap;
            })
            .catch((error) => {
              dialog.set({ title: error, type: Protocol.DialogType.Error });
            })
            .then(() => {
              if (streamCountMap.has(file)) {
                let generalStreamCount = streamCountMap
                  .get(file)
                  ?.find(
                    (streamCount) =>
                      streamCount.stream === Protocol.StreamKind.General
                  )?.count;
                if (generalStreamCount && generalStreamCount > 0) {
                  invoke<Protocol.StreamPropertyValue[]>("get_properties", {
                    file: file,
                    properties: [
                      {
                        stream: Protocol.StreamKind.General,
                        num: 0,
                        property: "Duration",
                      },
                    ],
                  })
                    .then((value) => {
                      commonPropertyMap.set(file, value);
                      commonPropertyMap = commonPropertyMap;
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
    console.log(properties);
    const result: Record<string, string> = {};
    if (properties) {
      properties.forEach((property) => {
        result[property.property] = property.value;
      });
    }
    console.log(result);
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
          subheading={streamCountMap
            .get(file)
            ?.map(
              (streamCount) => `${streamCount.stream}: ${streamCount.count}`
            )
            .join(", ")}
          slot="header"
        >
          <div slot="actions">
            <Button class="w-12 h-12">
              <span class="material-symbols-outlined">note_stack</span>
            </Button>
          </div>
        </Header>
        <div slot="contents">
          <Table
            data={convertProperties(commonPropertyMap.get(file))}
            columns={[
              {
                name: "Duration",
                header: "Duration",
              },
            ]}
          />
        </div>
      </Card>
    {/each}
  {/if}
</div>
