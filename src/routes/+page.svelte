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
  import { writeText } from "@tauri-apps/api/clipboard";
  import { afterUpdate, onDestroy, onMount } from "svelte";
  import { Button, Dialog, Tab, Tabs, Tooltip } from "svelte-ux";
  import { CodeBlock } from "svhighlight";
  import "highlight.js/styles/intellij-light.css";
  import About from "./about.svelte";
  import List from "./list.svelte";
  import Config from "./config.svelte";
  import Details from "./details.svelte";
  import * as Protocol from "../lib/protocol";
  import {
    config,
    dialogJsonCode,
    dialogNotification,
    mediaDetailedFiles,
    tabAboutStatus,
    tabSettingsStatus,
  } from "../lib/store";
  import { writeTextFile } from "../lib/service";
  import { openSaveJsonCodeFileDialog } from "../lib/dialog";
  import { scanFiles } from "../lib/fs";
  import { shrinkFileName } from "../lib/format";

  let appendOnFileDrop: boolean = true;
  let dialogJsonCodeOpen = false;
  let dialogJsonCodeString: string | null;
  let dialogJsonCodeTitle: string | null = null;
  let dialogNotificationOpen = false;
  let dialogNotificationTitle: string | null = null;
  let dialogNotificationType: Protocol.DialogNotificationType | null = null;
  let detailedFiles: string[] = [];
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

  onDestroy(() => {
    document.removeEventListener("keyup", onKeyUp);
  });

  onMount(() => {
    let cancelFileDrop: UnlistenFn | null = null;
    appWindow
      .onFileDropEvent((event: Event<FileDropEvent>) => {
        if (event.payload.type === "drop") {
          scanFiles(event.payload.paths, appendOnFileDrop);
        }
      })
      .then((value) => {
        cancelFileDrop = value;
      });

    config.subscribe((value) => {
      if (value) {
        appendOnFileDrop = value.appendOnFileDrop;
      }
    });

    dialogJsonCode.subscribe((value) => {
      dialogJsonCodeOpen = value !== null;
      dialogJsonCodeTitle = value?.title ?? null;
      dialogJsonCodeString = value?.jsonCode
        ? JSON.stringify(value?.jsonCode, null, 2)
        : null;
    });

    dialogNotification.subscribe((value) => {
      dialogNotificationOpen = value !== null;
      dialogNotificationTitle = value?.title ?? null;
      dialogNotificationType = value?.type ?? null;
    });

    mediaDetailedFiles.subscribe((value) => {
      detailedFiles = value;
    });

    tabAboutStatus.subscribe((value) => {
      statusTabAbout = value;
    });

    tabSettingsStatus.subscribe((value) => {
      statusTabSettings = value;
    });

    document.addEventListener("keyup", onKeyUp);

    return () => {
      if (cancelFileDrop) {
        cancelFileDrop();
      }
    };
  });

  $: dialogTitleClasses = getDialogTitleClasses(dialogNotificationType);

  $: tabControls = getTabControls(
    statusTabAbout,
    statusTabSettings,
    detailedFiles
  );

  function getDialogTitleClasses(
    dialogType: Protocol.DialogNotificationType | null
  ): string {
    let classes: Array<string> = [];
    if (dialogType) {
      classes.push("justify-self-center");
      classes.push("break-words");
      classes.push("text-wrap");
      switch (dialogType) {
        case Protocol.DialogNotificationType.Error:
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
    statusTabAbout: Protocol.ControlStatus,
    statusTabSettings: Protocol.ControlStatus,
    detailedFiles: string[]
  ): Array<Protocol.TabControl> {
    let controls = tabControls
      ? [...tabControls]
      : [{ type: Protocol.TabType.List, index: 0, value: null }];
    const controlTabAbout = controls.find(
      (control) => control.type === Protocol.TabType.About
    );
    if (statusTabAbout !== Protocol.ControlStatus.Hidden && !controlTabAbout) {
      controls.push({
        type: Protocol.TabType.About,
        index: 0,
        value: null,
      });
    } else if (
      statusTabAbout === Protocol.ControlStatus.Hidden &&
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
      statusTabSettings !== Protocol.ControlStatus.Hidden &&
      !controlTabSettings
    ) {
      controls.push({
        type: Protocol.TabType.Config,
        index: 0,
        value: null,
      });
    } else if (
      statusTabSettings === Protocol.ControlStatus.Hidden &&
      controlTabSettings
    ) {
      controls = controls.filter(
        (control) => control.type !== Protocol.TabType.Config
      );
    }
    const toBeAddedDetailedFileSet = new Set(detailedFiles);
    const toBeDeletedDetailedFileSet: Set<string> = new Set();
    controls
      .filter((control) => control.type === Protocol.TabType.Details)
      .forEach((control) => {
        if (control.value) {
          if (toBeAddedDetailedFileSet.has(control.value)) {
            toBeAddedDetailedFileSet.delete(control.value);
          } else {
            toBeDeletedDetailedFileSet.add(control.value);
          }
        }
      });
    controls = controls.filter(
      (control) =>
        control.type !== Protocol.TabType.Details ||
        (control.type === Protocol.TabType.Details &&
          !toBeDeletedDetailedFileSet.has(control.value ?? ""))
    );
    toBeAddedDetailedFileSet.forEach((detailedFile) => {
      controls.push({
        type: Protocol.TabType.Details,
        index: 0,
        value: detailedFile,
      });
    });
    controls.forEach((control, index) => {
      control.index = index;
    });
    if (statusTabAbout === Protocol.ControlStatus.Selected) {
      controls
        .filter((control) => control.type === Protocol.TabType.About)
        .forEach((control) => {
          tabIndex = control.index;
        });
    } else if (statusTabSettings === Protocol.ControlStatus.Selected) {
      controls
        .filter((control) => control.type === Protocol.TabType.Config)
        .forEach((control) => {
          tabIndex = control.index;
        });
    }
    return controls;
  }

  function closeTab(index: number) {
    if (index >= 0 && index < tabControls.length) {
      const tabControl = tabControls[index];
      switch (tabControl.type) {
        case Protocol.TabType.About:
          tabAboutStatus.set(Protocol.ControlStatus.Hidden);
          break;
        case Protocol.TabType.Config:
          tabSettingsStatus.set(Protocol.ControlStatus.Hidden);
          break;
        case Protocol.TabType.Details:
          const file = tabControl.value ?? "";
          mediaDetailedFiles.update((detailedFiles) => {
            return detailedFiles.filter(
              (detailedFile) => detailedFile !== file
            );
          });
          break;
      }
    }
  }

  async function onClickCopyJsonCode(event: MouseEvent) {
    event.stopPropagation();
    if (dialogJsonCodeString) {
      try {
        await writeText(dialogJsonCodeString);
        dialogNotification.set({
          title: `Json code is copied to clipboard.`,
          type: Protocol.DialogNotificationType.Info,
        });
      } catch (error) {
        dialogNotification.set({
          title: `Failed to copy to clipboard with error: ${error}.`,
          type: Protocol.DialogNotificationType.Error,
        });
      }
    }
  }

  async function onClickSaveJsonCode(event: MouseEvent) {
    event.stopPropagation();
    if (dialogJsonCodeString) {
      const filePath = (await openSaveJsonCodeFileDialog()) as string | null;
      if (filePath) {
        try {
          await writeTextFile(filePath, dialogJsonCodeString);
          dialogNotification.set({
            title: `Json code is saved to ${filePath}.`,
            type: Protocol.DialogNotificationType.Info,
          });
        } catch (error) {
          dialogNotification.set({
            title: `Failed to save to ${filePath} with error: ${error}.`,
            type: Protocol.DialogNotificationType.Error,
          });
        }
      }
    }
  }

  function onCloseDialogJsonCode() {
    dialogJsonCode.set(null);
  }

  function onCloseDialogNotification() {
    dialogNotification.set(null);
  }

  function onKeyUp(event: KeyboardEvent) {
    if (event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (event.key >= "1" && event.key <= "9") {
        const newTabIndex = parseInt(event.key) - 1;
        if (newTabIndex >= 0 && newTabIndex < tabControls.length) {
          event.stopPropagation();
          tabIndex = newTabIndex;
        }
      } else if (event.key === "w") {
        event.stopPropagation();
        closeTab(tabIndex);
      } else if (event.key === "Tab") {
        event.stopPropagation();
        tabIndex = tabIndex >= tabControls.length - 1 ? 0 : tabIndex + 1;
      }
    } else if (event.ctrlKey && !event.altKey && event.shiftKey) {
      if (event.key === "Tab") {
        event.stopPropagation();
        tabIndex = tabIndex > 0 ? tabIndex - 1 : tabControls.length - 1;
      }
    } else if (!event.ctrlKey && event.altKey && !event.shiftKey) {
      if (event.key === "x") {
        event.stopPropagation();
        appWindow.close();
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
    <Tab
      classes={{
        root: "rounded-t",
      }}
      on:click={(event) => {
        event.stopPropagation();
        tabIndex = tabControl.index;
      }}
      selected={tabIndex === tabControl.index}
    >
      {#if tabControl.type === Protocol.TabType.About}
        <Tooltip title="About" offset={6}>About</Tooltip>
      {:else if tabControl.type === Protocol.TabType.Config}
        <Tooltip title="Settings" offset={6}>Settings</Tooltip>
      {:else if tabControl.type === Protocol.TabType.List}
        <Tooltip title="File List" offset={6}>List</Tooltip>
      {:else if tabControl.type === Protocol.TabType.Details}
        <Tooltip title={tabControl.value ?? ""} offset={6}>
          {shrinkFileName(tabControl.value ?? "", 30)}
        </Tooltip>
      {/if}
      {#if tabControl.type !== Protocol.TabType.List}
        <Tooltip title="Close (Ctrl + W)" offset={6}>
          <Button
            classes={{ root: "w-2 h-4 m-0 p-2" }}
            on:click={(event) => {
              event.stopPropagation();
              closeTab(tabControl.index);
            }}
          >
            <span class="material-symbols-outlined text-xs">close</span>
          </Button>
        </Tooltip>
      {/if}
    </Tab>
  {/each}
  <svelte:fragment slot="content" let:value={tabIndex}>
    {#each tabControls as tabControl}
      <div class={tabControl.index === tabIndex ? "block" : "hidden"}>
        {#if tabControl.type === Protocol.TabType.About}
          <About />
        {:else if tabControl.type === Protocol.TabType.Config}
          <Config />
        {:else if tabControl.type === Protocol.TabType.List}
          <List />
        {:else if tabControl.type === Protocol.TabType.Details}
          <Details file={tabControl.value ?? ""} />
        {/if}
      </div>
    {/each}
  </svelte:fragment>
</Tabs>
<Dialog
  bind:open={dialogNotificationOpen}
  on:close={onCloseDialogNotification}
  classes={{
    root: "rounded-lg border-gray-200 drop-shadow-lg",
    dialog: "max-w-screen-lg",
    title: dialogTitleClasses,
    actions: "justify-center",
  }}
>
  <div slot="title">{dialogNotificationTitle}</div>
  <div slot="actions">
    <Button variant="fill-light" color="default" classes={{ root: "w-24" }}>
      Close
    </Button>
  </div>
</Dialog>
<Dialog
  bind:open={dialogJsonCodeOpen}
  on:close={onCloseDialogJsonCode}
  classes={{
    root: "rounded-lg border-gray-200 drop-shadow-lg",
    dialog: "w-4/5",
    actions: "justify-center",
  }}
>
  <div slot="title">{dialogJsonCodeTitle}</div>
  <div slot="default">
    <CodeBlock
      language="json"
      code={dialogJsonCodeString ?? ""}
      codeTextClasses="text-neutral-800 bg-white overflow-auto w-full h-[calc(80vh-100px)]"
      lineNumberTextClasses="text-neutral-800"
      showHeader={false}
      showLineNumbers={true}
    />
  </div>
  <div slot="actions">
    <div class="grid grid-flow-col gap-2">
      <Button
        variant="fill-light"
        color="primary"
        classes={{ root: "w-24" }}
        on:click={onClickCopyJsonCode}
      >
        Copy
      </Button>
      <Button
        variant="fill-light"
        color="primary"
        classes={{ root: "w-24" }}
        on:click={onClickSaveJsonCode}
      >
        Save
      </Button>
      <Button variant="fill-light" color="default" classes={{ root: "w-24" }}>
        Close
      </Button>
    </div>
  </div>
</Dialog>
