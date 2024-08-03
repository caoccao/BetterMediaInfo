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

  import { Button, ButtonGroup } from "svelte-ux";
  import { openDirectoryDialog, openFileDialog } from "../lib/dialog";
  import { tabAbout } from "../lib/store";

  const BUTTON_CLASSES = "w-4 h-8 bg-gray-400 hover:bg-gray-600 text-white";
  const MATERIAL_SYMBOLS_OUTLINED = "material-symbols-outlined";

  function toggleTabAbout() {
    tabAbout.update((value) => !value);
  }
</script>

<div class="my-3 grid grid-flow-col justify-start gap-2">
  <ButtonGroup variant="outline" color="default">
    <Button classes={{ root: BUTTON_CLASSES }} on:click={openFileDialog}>
      <span class={MATERIAL_SYMBOLS_OUTLINED}>movie</span>
    </Button>
    <Button classes={{ root: BUTTON_CLASSES }} on:click={openDirectoryDialog}>
      <span class={MATERIAL_SYMBOLS_OUTLINED}>folder_open</span>
    </Button>
  </ButtonGroup>
  <ButtonGroup variant="outline" color="default">
    <Button classes={{ root: BUTTON_CLASSES }}>
      <span class={MATERIAL_SYMBOLS_OUTLINED}>settings</span>
    </Button>
    <Button classes={{ root: BUTTON_CLASSES }} on:click={toggleTabAbout}>
      <span class={MATERIAL_SYMBOLS_OUTLINED}>info</span>
    </Button>
  </ButtonGroup>
</div>
