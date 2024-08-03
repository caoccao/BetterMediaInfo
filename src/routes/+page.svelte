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
  import { afterUpdate } from "svelte";
  import { Tab, Tabs } from "svelte-ux";
  import About from "./about.svelte";
  import * as Protocol from "../lib/protocol";
  import { tabAbout } from "../lib/store";

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

  $: tabControls = getTabControls(tabIndex, enableTabAbout);

  function getTabControls(
    tabIndex: number,
    tabAboutVisible: boolean
  ): Array<Protocol.TabControl> {
    let controls = [{ type: Protocol.TabType.TODO, index: 0, selected: false }];
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
        selected={tabIndex === tabControl.index}>About</Tab
      >
    {:else if tabControl.type === Protocol.TabType.TODO}
      <Tab
        classes={{
          root: "rounded-t",
        }}
        on:click={() => (tabIndex = tabControl.index)}
        selected={tabIndex === tabControl.index}>TODO</Tab
      >
    {/if}
  {/each}
  <svelte:fragment slot="content" let:value={tabIndex}>
    {#each tabControls as tabControl}
      {#if tabControl.index === tabIndex}
        {#if tabControl.type === Protocol.TabType.About}
          <About />
        {:else if tabControl.type === Protocol.TabType.TODO}
          <div>TODO</div>
        {/if}
      {/if}
    {/each}
  </svelte:fragment>
</Tabs>
