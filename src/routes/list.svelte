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
  import { Button } from "svelte-ux";
  import { openDirectoryDialog, openFileDialog } from "../lib/dialog";
  import { mediaFiles } from "../lib/store";
  import { error } from "@sveltejs/kit";

  let files: string[] = [];
  let errorMessage: string | null = null;

  onMount(() => {
    mediaFiles.subscribe((value) => {
      files = value;
      if (files.length > 0) {
        invoke<void>("get_file_infos", { files: files })
          .then(() => {
            errorMessage = null;
          })
          .catch((error) => {
            errorMessage = error;
          });
      }
    });
  });
</script>

<div class="grid">
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
      <div>{file}</div>
    {/each}
  {/if}
  {#if errorMessage !== null}
    <div class="my-3 text-red-600 justify-self-center">
      {errorMessage}
    </div>
  {/if}
</div>
