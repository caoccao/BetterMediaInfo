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
  import { Badge, Button, Card, Checkbox, Header, Tooltip } from "svelte-ux";
  import * as Protocol from "../lib/protocol";
  import { dialog, mediaFileToStreamCountMap } from "../lib/store";
  import {
    formatProperty,
    formatResolution,
    transformBitRate,
    transformDuration,
    transformSize,
  } from "../lib/format";

  export let file: string;

  let fileToStreamCountMap: Map<
    string,
    Map<Protocol.StreamKind, Protocol.StreamCount>
  > = new Map();

  let streamGroup: Protocol.StreamKind[] = [];
  let streamCountMap: Map<Protocol.StreamKind, Protocol.StreamCount> =
    new Map();

  onMount(() => {
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
</script>

<div class="grid gap-2">
  <Card>
    <Header title={file} slot="header" />
    <div slot="actions">
      <div class="flex flex-wrap gap-2 px-2 pb-2">
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
          {#each Protocol.getStreamKinds() as streamKind}
            {#if (streamCountMap.get(streamKind)?.count ?? 0) > 0}
              <Checkbox bind:group={streamGroup} value={streamKind}>
                <div class="flex gap-2">
                  <div>{streamKind}</div>
                  <div class="w-5 h-5 rounded-full border flex items-center justify-center text-center">
                    {streamCountMap.get(streamKind)?.count ?? 0}
                  </div>
                </div>
              </Checkbox>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  </Card>
</div>
