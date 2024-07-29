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
  import { table, Table } from "svelte-ux";

  const DEFAULT_ABOUT_TEXT = "Better Media Info";
  let aboutText = DEFAULT_ABOUT_TEXT;
  let aboutErrorText = "";
  let propertiesErrorText = "";
  let properties: Array<{ id: number; Stream: string; Property: string }> = [];

  onMount(async () => {
    invoke<string>("get_about")
      .then((text) => {
        aboutText = text;
        aboutErrorText = "";
      })
      .catch((error) => {
        aboutText = "";
        aboutErrorText = error;
      });
    invoke<Array<Array<string>>>("get_parameters")
      .then((parameters) => {
        properties = parameters.map(
          (parameter: Array<string>, index: number) => {
            return {
              id: index,
              Stream: parameter[0],
              Property: parameter[1],
            };
          }
        );
        propertiesErrorText = "";
      })
      .catch((error) => {
        properties = [];
        propertiesErrorText = error;
      });
  });
</script>

<div class="grid">
  <div class="my-3">{aboutText}</div>
  {#if aboutErrorText !== ""}
    <div class="text-red-600 my-3">{aboutErrorText}</div>
  {/if}
  {#if propertiesErrorText !== ""}
    <div class="text-red-600 my-3">{propertiesErrorText}</div>
  {/if}
  <Table
    data={properties}
    classes={{
      table: "border-collapse border border-slate-500",
      th: "border border-slate-600 p-2 bg-lime-50",
      td: "border border-slate-700 p-2",
    }}
    columns={[
      {
        name: "id",
        align: "left",
        format: "integer",
      },
      {
        name: "Stream",
        align: "left",
      },
      {
        name: "Property",
        align: "left",
      },
    ]}
  />
</div>
