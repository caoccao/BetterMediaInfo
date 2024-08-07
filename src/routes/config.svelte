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
  import { onDestroy, onMount } from "svelte";
  import { Button, Overlay, TableOfContents, TextField } from "svelte-ux";
  import * as Protocol from "../lib/protocol";
  import { config, isConfigDirty } from "../lib/store";

  let errorMessageForSave: string | null = null;
  let fileExtensionsAudio: string = "";
  let fileExtensionsImage: string = "";
  let fileExtensionsVideo: string = "";
  let generalStreams: string[] = [];
  let isDirty = false;
  let showNotification = false;

  onDestroy(() => {
    try {
      let newConfig = createConfig();
      config.update((_value) => {
        return newConfig;
      });
    } catch (error) {
      console.error(error);
    }
  });

  onMount(() => {
    config.subscribe((value) => {
      if (value) {
        fileExtensionsAudio = value.fileExtensions.audio.join(", ");
        fileExtensionsImage = value.fileExtensions.image.join(", ");
        fileExtensionsVideo = value.fileExtensions.video.join(", ");
        generalStreams = [...value.streams.general];
      }
    });
    isConfigDirty.subscribe((value) => {
      isDirty = value;
    });
  });

  function createConfig(): Protocol.Config {
    return {
      fileExtensions: {
        audio: convertFileExtensions(fileExtensionsAudio),
        image: convertFileExtensions(fileExtensionsImage),
        video: convertFileExtensions(fileExtensionsVideo),
      },
      streams: {
        general: [...generalStreams],
      },
    };
  }

  function convertFileExtensions(fileExtensions: string): string[] {
    return fileExtensions
      .split(/[, \.]+/g)
      .filter((extension) => extension.length > 0);
  }

  function onChange(_value: CustomEvent<any>) {
    isConfigDirty.update((_value) => true);
  }

  function onClickCloseNotification(event: MouseEvent) {
    event.stopPropagation();
    errorMessageForSave = null;
    showNotification = false;
  }

  function onClickSave(event: MouseEvent) {
    event.stopPropagation();
    try {
      invoke<void>("set_config", { config: createConfig() })
        .then(() => {
          isConfigDirty.update((_value) => false);
          showNotification = true;
        })
        .catch((error) => {
          errorMessageForSave = error;
          showNotification = true;
        });
    } catch (error) {
      errorMessageForSave = error
        ? error.toString()
        : "Failed to save with unknown error.";
      showNotification = true;
    }
  }
</script>

<div class="grid gap-2">
  <div class="grid grid-flow-col grid-cols-[auto,1fr] gap-2">
    <TableOfContents element="#config" />
    <div id="config" class="grid gap-2">
      <h1 class="text-lg font-bold">Settings</h1>
      <h2 class="text-base font-medium">File Extensions</h2>
      <h3 class="text-sm">Audio File Extensions</h3>
      <TextField bind:value={fileExtensionsAudio} on:change={onChange} />
      <h3 class="text-sm">Image File Extensions</h3>
      <TextField bind:value={fileExtensionsImage} on:change={onChange} />
      <h3 class="text-sm">Video File Extensions</h3>
      <TextField bind:value={fileExtensionsVideo} on:change={onChange} />
    </div>
  </div>
  <Button
    variant="fill-light"
    color="primary"
    classes={{ root: "w-48 justify-self-center" }}
    disabled={!isDirty}
    on:click={onClickSave}
  >
    Save
  </Button>
</div>
{#if showNotification}
  <Overlay center>
    <div
      class="w-[400px] grid gap-4 text-xl font-bold bg-gray-100 p-3 border-1 rounded-lg border-gray-200 drop-shadow-lg"
    >
      {#if errorMessageForSave}
        <div class="text-red-600 justify-self-center">
          {errorMessageForSave}
        </div>
      {:else}
        <div class="text-green-600 justify-self-center">
          Successfully Saved!
        </div>
      {/if}
      <Button
        variant="fill-light"
        color="primary"
        classes={{ root: "w-24 justify-self-center" }}
        on:click={onClickCloseNotification}>Close</Button
      >
    </div>
  </Overlay>
{/if}
