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
  import { Card, Collapse, TextField } from "svelte-ux";
  import * as Protocol from "../lib/protocol";
  import { config } from "../lib/store";

  let audio_file_extensions: string = "";
  let image_file_extensions: string = "";
  let video_file_extensions: string = "";

  onMount(async () => {
    config.subscribe((value) => {
      if (value) {
        audio_file_extensions = value.settings.audio_file_extensions.join(", ");
        image_file_extensions = value.settings.image_file_extensions.join(", ");
        video_file_extensions = value.settings.video_file_extensions.join(", ");
      }
    });
  });
</script>

<div class="grid">
  <div class="p-2 text-lg font-bold">File Extensions</div>
  <Card classes={{ root: "divide-y" }}>
    <Collapse classes={{ root: "p-2" }}>
      <div slot="trigger" class="flex-1">Video File Extensions</div>
      <div>
        <TextField classes={{ root: "pt-2" }} bind:value={video_file_extensions} />
      </div>
    </Collapse>
    <Collapse classes={{ root: "p-2" }}>
      <div slot="trigger" class="flex-1">Image File Extensions</div>
      <div>
        <TextField classes={{ root: "pt-2" }} bind:value={image_file_extensions} />
      </div>
    </Collapse>
    <Collapse classes={{ root: "p-2" }}>
      <div slot="trigger" class="flex-1">Audio File Extensions</div>
      <div>
        <TextField classes={{ root: "pt-2" }} bind:value={audio_file_extensions} />
      </div>
    </Collapse>
  </Card>
</div>
