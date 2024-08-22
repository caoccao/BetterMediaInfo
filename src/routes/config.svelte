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

  import { onDestroy, onMount } from "svelte";
  import {
    Button,
    MenuField,
    Radio,
    TableOfContents,
    TextField,
  } from "svelte-ux";
  import * as Protocol from "../lib/protocol";
  import { setConfig } from "../lib/service";
  import { config, dialogNotification, isConfigDirty } from "../lib/store";

  const CSS_CLASS_H1 = "text-lg font-bold py-2 border-b-2 border-b-lime-400";
  const CSS_CLASS_H2 = "text-base font-medium py-2 border-b border-b-lime-300";
  const CSS_CLASS_H3 = "text-sm";

  let appendOnFileDrop: boolean = true;
  let directoryMode: Protocol.ConfigDirectoryMode =
    Protocol.ConfigDirectoryMode.All;
  let fileExtensionsAudio: string = "";
  let fileExtensionsImage: string = "";
  let fileExtensionsVideo: string = "";
  let generalStreams: string[] = [];
  let isDirty = false;

  onDestroy(() => {
    try {
      let newConfig = createConfig();
      config.set(newConfig);
    } catch (error) {
      console.error(error);
    }
  });

  onMount(() => {
    config.subscribe((value) => {
      if (value) {
        appendOnFileDrop = value.appendOnFileDrop;
        directoryMode = value.directoryMode;
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
      appendOnFileDrop: appendOnFileDrop,
      directoryMode: directoryMode,
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
    isConfigDirty.set(true);
  }

  function onChangeAppendOnFileDrop() {
    isConfigDirty.set(true);
  }

  async function onClickSave(event: MouseEvent) {
    event.stopPropagation();
    try {
      config.set(await setConfig(createConfig()));
      dialogNotification.set({
        title: "Settings saved.",
        type: Protocol.DialogNotificationType.Notification,
      });
    } catch (error) {
      dialogNotification.set({
        title: error ? error.toString() : "Failed to save with unknown error.",
        type: Protocol.DialogNotificationType.Error,
      });
    }
  }
</script>

<div class="grid gap-2">
  <div class="grid grid-flow-col grid-cols-[auto,1fr] gap-2">
    <TableOfContents element="#config" />
    <div id="config" class="grid gap-2">
      <h1 class={CSS_CLASS_H1}>Settings</h1>
      <h2 class={CSS_CLASS_H2}>Append on File Drop</h2>
      <div class="flex gap-4">
        <Radio
          name="appendOnFileDrop"
          bind:group={appendOnFileDrop}
          value={true}
          on:change={onChangeAppendOnFileDrop}
        >
          Append
        </Radio>
        <Radio
          name="appendOnFileDrop"
          bind:group={appendOnFileDrop}
          value={false}
          on:change={onChangeAppendOnFileDrop}
        >
          Do not append
        </Radio>
      </div>
      <h2 class={CSS_CLASS_H2}>Directory Mode</h2>
      <MenuField
        classes={{
          root: "min-w-32 max-w-32",
        }}
        options={Protocol.getConfigDirectoryModes().map((mode) => ({
          label: mode,
          value: mode,
        }))}
        bind:value={directoryMode}
        on:change={onChange}
      ></MenuField>
      <h2 class={CSS_CLASS_H2}>File Extensions</h2>
      <h3 class={CSS_CLASS_H3}>Audio File Extensions</h3>
      <TextField bind:value={fileExtensionsAudio} on:change={onChange} />
      <h3 class={CSS_CLASS_H3}>Image File Extensions</h3>
      <TextField bind:value={fileExtensionsImage} on:change={onChange} />
      <h3 class={CSS_CLASS_H3}>Video File Extensions</h3>
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
