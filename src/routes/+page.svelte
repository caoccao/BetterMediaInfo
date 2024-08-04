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
  import { appWindow } from "@tauri-apps/api/window";
  import type { Event, UnlistenFn } from "@tauri-apps/api/event";
  import type { FileDropEvent } from "@tauri-apps/api/window";
  import { afterUpdate, onMount } from "svelte";
  import { Button, Tab, Tabs } from "svelte-ux";
  import About from "./about.svelte";
  import List from "./list.svelte";
  import * as Protocol from "../lib/protocol";
  import { mediaFiles, tabAbout } from "../lib/store";

  let tabIndex = 0;
  let enableTabAbout = false;
  let selectTabAbout = false;

  tabAbout.subscribe((value) => {
    enableTabAbout = value;
    selectTabAbout = value;
  });

  afterUpdate(() => {
    selectTab();
  });

  onMount(() => {
    let cancelFileDrop: UnlistenFn | null = null;
    appWindow
      .onFileDropEvent((event: Event<FileDropEvent>) => {
        if (event.payload.type === "drop") {
          mediaFiles.set(event.payload.paths);
        }
      })
      .then((value) => {
        cancelFileDrop = value;
      });

    return () => {
      if (cancelFileDrop) {
        cancelFileDrop();
      }
    };
  });

  $: tabControls = getTabControls(tabIndex, enableTabAbout);

  function getTabControls(
    tabIndex: number,
    tabAboutVisible: boolean
  ): Array<Protocol.TabControl> {
    let controls = [{ type: Protocol.TabType.List, index: 0, selected: false }];
    if (tabAboutVisible) {
      controls.push({
        type: Protocol.TabType.About,
        index: 0,
        selected: false,
      });
    }
    controls.map((control, index) => (control.index = index));
    let control = controls.find((control) => control.index === tabIndex);
    if (control) {
      control.selected = true;
    }
    return controls;
  }

  function selectTab() {
    if (tabControls) {
      if (selectTabAbout) {
        let control = tabControls.find(
          (control) => control.type === Protocol.TabType.About
        );
        if (control) {
          tabIndex = control.index;
        }
        selectTabAbout = false;
      }
      if (tabIndex >= tabControls.length) {
        tabIndex = tabControls.length - 1;
      }
    }
  }

  function onClickCloseTabAbout(event: MouseEvent) {
    event.stopPropagation();
    tabAbout.set(false);
  }
</script>

<Tabs
  bind:value={tabIndex}
  classes={{
    content: "border p-2 rounded-b rounded-tr",
    tab: { root: "rounded-t" },
  }}
>
  {#each tabControls as tabControl}
    {#if tabControl.type === Protocol.TabType.About}
      <Tab
        classes={{
          root: "rounded-t",
        }}
        on:click={() => (tabIndex = tabControl.index)}
        selected={tabIndex === tabControl.index}
      >
        About
        <Button
          classes={{ root: "w-2 h-4 m-0 p-2" }}
          on:click={onClickCloseTabAbout}
        >
          <span class="material-symbols-outlined text-xs">close</span>
        </Button>
      </Tab>
    {:else if tabControl.type === Protocol.TabType.List}
      <Tab
        classes={{
          root: "rounded-t",
        }}
        on:click={() => (tabIndex = tabControl.index)}
        selected={tabIndex === tabControl.index}>List</Tab
      >
    {/if}
  {/each}
  <svelte:fragment slot="content" let:value={tabIndex}>
    {#each tabControls as tabControl}
      {#if tabControl.index === tabIndex}
        {#if tabControl.type === Protocol.TabType.About}
          <About />
        {:else if tabControl.type === Protocol.TabType.List}
          <List />
        {/if}
      {/if}
    {/each}
  </svelte:fragment>
</Tabs>
