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

  import { Button } from "svelte-ux";
  import { openDirectoryDialog, openFileDialog } from "../lib/dialog";
</script>

<div class="grid">
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
</div>
