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
  import { Button, ButtonGroup, Tooltip } from "svelte-ux";
  import { openDirectoryDialog, openFileDialog } from "../lib/dialog";
  import {
    mediaCommonPropertyMap,
    mediaFiles,
    mediaStreamCountMap,
    tabAboutStatus,
    tabSettingsStatus,
  } from "../lib/store";
  import * as Protocol from "../lib/protocol";

  const BUTTON_CLASSES_NORMAL =
    "w-4 h-8 bg-gray-400 hover:bg-gray-600 text-white hover:text-blue-200";
  const BUTTON_CLASSES_VISIBLE =
    "w-4 h-8 bg-cyan-400 hover:bg-cyan-600 text-white hover:text-blue-200";

  let buttonAboutClasses = BUTTON_CLASSES_NORMAL;
  let buttonSettingsClasses = BUTTON_CLASSES_NORMAL;

  let files: string[] = [];

  onMount(() => {
    mediaFiles.subscribe((value) => {
      files = value;
    });
    tabAboutStatus.subscribe((value) => {
      buttonAboutClasses =
        value === Protocol.ControlStatus.Hidden
          ? BUTTON_CLASSES_NORMAL
          : BUTTON_CLASSES_VISIBLE;
    });
    tabSettingsStatus.subscribe((value) => {
      buttonSettingsClasses =
        value === Protocol.ControlStatus.Hidden
          ? BUTTON_CLASSES_NORMAL
          : BUTTON_CLASSES_VISIBLE;
    });
  });

  function clearFiles() {
    mediaFiles.set([]);
    mediaCommonPropertyMap.set(new Map());
    mediaStreamCountMap.set(new Map());
  }

  function selectTabAbout() {
    tabAboutStatus.set(Protocol.ControlStatus.Selected);
  }

  function selectTabSettings() {
    tabSettingsStatus.set(Protocol.ControlStatus.Selected);
  }
</script>

<div class="mt-1 mb-3 grid grid-flow-col justify-start gap-2">
  <ButtonGroup variant="outline" color="default">
    <Tooltip title="Add Files" offset={6}>
      <Button
        classes={{ root: BUTTON_CLASSES_NORMAL }}
        on:click={() => openFileDialog(false)}
      >
        <span class="material-symbols-outlined">article</span>
      </Button>
    </Tooltip>
    <Tooltip title="Append Files" offset={6}>
      <Button
        classes={{ root: BUTTON_CLASSES_NORMAL }}
        on:click={() => openFileDialog(true)}
      >
        <span class="material-symbols-outlined">post_add</span>
      </Button>
    </Tooltip>
    <Tooltip title="Add Folder" offset={6}>
      <Button
        classes={{ root: BUTTON_CLASSES_NORMAL }}
        on:click={() => openDirectoryDialog(false)}
      >
        <span class="material-symbols-outlined">folder</span>
      </Button>
    </Tooltip>
    <Tooltip title="Append Folder" offset={6}>
      <Button
        classes={{ root: BUTTON_CLASSES_NORMAL }}
        on:click={() => openDirectoryDialog(true)}
      >
        <span class="material-symbols-outlined">create_new_folder</span>
      </Button>
    </Tooltip>
  </ButtonGroup>
  <ButtonGroup variant="outline" color="default">
    <Tooltip title="Clear" offset={6}>
      <Button
        classes={{ root: BUTTON_CLASSES_NORMAL }}
        on:click={clearFiles}
        disabled={files.length == 0}
      >
        <span class="material-symbols-outlined">contract_delete</span>
      </Button>
    </Tooltip>
  </ButtonGroup>
  <ButtonGroup variant="outline" color="default">
    <Tooltip title="Settings" offset={6}>
      <Button
        classes={{ root: buttonSettingsClasses }}
        on:click={selectTabSettings}
      >
        <span class="material-symbols-outlined">settings</span>
      </Button>
    </Tooltip>
    <Tooltip title="About" offset={6}>
      <Button classes={{ root: buttonAboutClasses }} on:click={selectTabAbout}>
        <span class="material-symbols-outlined">info</span>
      </Button>
    </Tooltip>
  </ButtonGroup>
</div>
