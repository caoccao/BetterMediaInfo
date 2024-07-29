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
  import { Tab, Tabs } from "svelte-ux";
  import About from "./about.svelte";

  let tabIndex = 0;
</script>

<Tabs
  bind:value={tabIndex}
  classes={{
    content: "border p-2 rounded-b rounded-tr",
    tab: { root: "rounded-t" },
  }}
>
  <Tab
    classes={{
      root: "rounded-t",
    }}
    on:click={() => (tabIndex = 0)}
    selected={tabIndex === 0}>About</Tab
  >
  <Tab
    classes={{
      root: "rounded-t",
    }}
    on:click={() => (tabIndex = 1)}
    selected={tabIndex === 1}>TODO</Tab
  >
  <svelte:fragment slot="content" let:value={tabIndex}>
    {#if tabIndex === 0}
      <About />
    {:else if tabIndex === 1}
      <div>TODO</div>
    {/if}
  </svelte:fragment>
</Tabs>
