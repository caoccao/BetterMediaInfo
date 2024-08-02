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
  import { Paginate, Pagination, Table } from "svelte-ux";

  interface About {
    appVersion: string;
    mediaInfoVersion: string;
  }

  interface Parameter {
    id: number;
    stream: string;
    property: string;
  }

  const APP_NAME = "Better Media Info";
  let about = { appVersion: "", mediaInfoVersion: "" };
  let aboutErrorText = "";
  let parameters: Array<Parameter> = [];
  let parametersErrorText = "";

  onMount(async () => {
    invoke<About>("get_about")
      .then((result) => {
        about = result;
        aboutErrorText = "";
      })
      .catch((error) => {
        about = { appVersion: "", mediaInfoVersion: "" };
        aboutErrorText = error;
      });
    invoke<Array<Parameter>>("get_parameters")
      .then((result) => {
        parameters = result;
        parametersErrorText = "";
      })
      .catch((error) => {
        parameters = [];
        parametersErrorText = error;
      });
  });
</script>

<div class="grid">
  <div class="my-3">
    <p>{APP_NAME} - v{about.appVersion}</p>
    <p>{about.mediaInfoVersion}</p>
    <p>
      Author -
      <a
        href="https://github.com/caoccao"
        target="_blank"
        class="text-blue-600 visited:text-purple-600 underline underline-offset-auto"
        >Sam Cao</a
      >
    </p>
  </div>
  {#if aboutErrorText !== ""}
    <div class="text-red-600 my-3">{aboutErrorText}</div>
  {/if}
  {#if parametersErrorText !== ""}
    <div class="text-red-600 my-3">{parametersErrorText}</div>
  {/if}
  <Paginate
    data={parameters}
    perPage={10}
    let:pageData={pagedParameters}
    let:pagination
  >
    <Table
      data={pagedParameters}
      classes={{
        table: "border-collapse border border-slate-500",
        th: "border border-slate-600 p-2 bg-lime-50",
        td: "border border-slate-700 p-2",
      }}
      columns={[
        {
          name: "id",
          header: "ID",
          align: "left",
          format: "integer",
        },
        {
          name: "stream",
          header: "Stream",
          align: "left",
        },
        {
          name: "property",
          header: "Property",
          align: "left",
        },
      ]}
    />
    <Pagination
      {pagination}
      perPageOptions={[10, 15, 20]}
      show={[
        "perPage",
        "pagination",
        "firstPage",
        "prevPage",
        "nextPage",
        "lastPage",
      ]}
      classes={{
        root: "border-t py-1 mt-2",
        perPage: "flex-1 text-right",
        pagination: "px-8",
      }}
    />
  </Paginate>
</div>
