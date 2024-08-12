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
  import { Button, Dialog, Tab, Tabs } from "svelte-ux";
  import About from "./about.svelte";
  import List from "./list.svelte";
  import Config from "./config.svelte";
  import * as Protocol from "../lib/protocol";
  import { dialog, tabAboutStatus, tabSettingsStatus } from "../lib/store";
  import { scanFiles } from "../lib/fs";

  let dialogOpen = false;
  let dialogTitle: string | null = null;
  let dialogType: Protocol.DialogType | null = null;
  let statusTabAbout: Protocol.ControlStatus = Protocol.ControlStatus.Hidden;
  let statusTabSettings: Protocol.ControlStatus = Protocol.ControlStatus.Hidden;
  let tabIndex = 0;

  afterUpdate(() => {
    if (tabControls && tabIndex >= tabControls.length) {
      tabIndex = tabControls.length - 1;
    }
    if (statusTabAbout === Protocol.ControlStatus.Selected) {
      tabAboutStatus.set(Protocol.ControlStatus.Visible);
    }
    if (statusTabSettings === Protocol.ControlStatus.Selected) {
      tabSettingsStatus.set(Protocol.ControlStatus.Visible);
    }
  });

  onMount(() => {
    let cancelFileDrop: UnlistenFn | null = null;
    appWindow
      .onFileDropEvent((event: Event<FileDropEvent>) => {
        if (event.payload.type === "drop") {
          scanFiles(event.payload.paths, true);
        }
      })
      .then((value) => {
        cancelFileDrop = value;
      });

    dialog.subscribe((value) => {
      dialogOpen = value !== null;
      dialogTitle = value?.title ?? null;
      dialogType = value?.type ?? null;
    });

    tabAboutStatus.subscribe((value) => {
      statusTabAbout = value;
    });

    tabSettingsStatus.subscribe((value) => {
      statusTabSettings = value;
    });

    return () => {
      if (cancelFileDrop) {
        cancelFileDrop();
      }
    };
  });

  $: dialogTitleClasses = getDialogTitleClasses(dialogType);

  $: tabControls = getTabControls(statusTabAbout, statusTabSettings);

  function getDialogTitleClasses(
    dialogType: Protocol.DialogType | null
  ): string {
    let classes: Array<string> = [];
    if (dialogType) {
      classes.push("justify-self-center");
      switch (dialogType) {
        case Protocol.DialogType.Error:
          classes.push("text-red-600");
          break;
        default:
          classes.push("text-green-600");
          break;
      }
    }
    return classes.join(" ");
  }

  function getTabControls(
    statusOfTabAbout: Protocol.ControlStatus,
    statusOfTabSettings: Protocol.ControlStatus
  ): Array<Protocol.TabControl> {
    let controls = tabControls
      ? [...tabControls]
      : [{ type: Protocol.TabType.List, index: 0 }];
    const controlTabAbout = controls.find(
      (control) => control.type === Protocol.TabType.About
    );
    if (
      statusOfTabAbout !== Protocol.ControlStatus.Hidden &&
      !controlTabAbout
    ) {
      controls.push({
        type: Protocol.TabType.About,
        index: 0,
      });
    } else if (
      statusOfTabAbout === Protocol.ControlStatus.Hidden &&
      controlTabAbout
    ) {
      controls = controls.filter(
        (control) => control.type !== Protocol.TabType.About
      );
    }
    const controlTabSettings = controls.find(
      (control) => control.type === Protocol.TabType.Config
    );
    if (
      statusOfTabSettings !== Protocol.ControlStatus.Hidden &&
      !controlTabSettings
    ) {
      controls.push({
        type: Protocol.TabType.Config,
        index: 0,
      });
    } else if (
      statusOfTabSettings === Protocol.ControlStatus.Hidden &&
      controlTabSettings
    ) {
      controls = controls.filter(
        (control) => control.type !== Protocol.TabType.Config
      );
    }
    controls.forEach((control, index) => {
      control.index = index;
    });
    if (statusOfTabAbout === Protocol.ControlStatus.Selected) {
      controls
        .filter((control) => control.type === Protocol.TabType.About)
        .forEach((control) => {
          tabIndex = control.index;
        });
    } else if (statusOfTabSettings === Protocol.ControlStatus.Selected) {
      controls
        .filter((control) => control.type === Protocol.TabType.Config)
        .forEach((control) => {
          tabIndex = control.index;
        });
    }
    return controls;
  }

  function onClickCloseTabAbout(event: MouseEvent) {
    event.stopPropagation();
    tabAboutStatus.set(Protocol.ControlStatus.Hidden);
  }

  function onClickCloseTabSettings(event: MouseEvent) {
    event.stopPropagation();
    tabSettingsStatus.set(Protocol.ControlStatus.Hidden);
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
    {:else if tabControl.type === Protocol.TabType.Config}
      <Tab
        classes={{
          root: "rounded-t",
        }}
        on:click={() => (tabIndex = tabControl.index)}
        selected={tabIndex === tabControl.index}
      >
        Settings
        <Button
          classes={{ root: "w-2 h-4 m-0 p-2" }}
          on:click={onClickCloseTabSettings}
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
        {:else if tabControl.type === Protocol.TabType.Config}
          <Config />
        {:else if tabControl.type === Protocol.TabType.List}
          <List />
        {/if}
      {/if}
    {/each}
  </svelte:fragment>
</Tabs>
<Dialog
  bind:open={dialogOpen}
  classes={{
    root: "rounded-lg border-gray-200 drop-shadow-lg",
    title: dialogTitleClasses,
  }}
>
  <div slot="title">{dialogTitle}</div>
  <div slot="actions">
    <Button
      variant="fill-light"
      color="primary"
      classes={{ root: "w-24 justify-self-center" }}
    >
      close
    </Button>
  </div>
</Dialog>
