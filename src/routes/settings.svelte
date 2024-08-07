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
  import { TableOfContents, TextField } from "svelte-ux";
  import { config } from "../lib/store";

  let settingsAudioFileExtensions: string = "";
  let settingsImageFileExtensions: string = "";
  let settingsVideoFileExtensions: string = "";

  onMount(async () => {
    config.subscribe((value) => {
      if (value) {
        settingsAudioFileExtensions =
          value.settings.audioFileExtensions.join(", ");
        settingsImageFileExtensions =
          value.settings.imageFileExtensions.join(", ");
        settingsVideoFileExtensions =
          value.settings.videoFileExtensions.join(", ");
      }
    });
  });
</script>

<div class="grid grid-flow-col grid-cols-[auto,1fr] gap-2">
  <TableOfContents element="#config" />
  <div id="config">
    <h1 class="text-lg font-bold py-2">Settings</h1>
    <h2 class="text-base font-medium py-1">File Extensions</h2>
    <h3 class="text-sm py-1">Audio File Extensions</h3>
    <TextField
      classes={{ root: "pt-2" }}
      bind:value={settingsAudioFileExtensions}
    />
    <h3 class="text-sm py-1">Image File Extensions</h3>
    <TextField
      classes={{ root: "pt-2" }}
      bind:value={settingsImageFileExtensions}
    />
    <h3 class="text-sm py-1">Video File Extensions</h3>
    <TextField
      classes={{ root: "pt-2" }}
      bind:value={settingsVideoFileExtensions}
    />
  </div>
</div>
