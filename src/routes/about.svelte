<svelte:options runes={true} />

<script lang="ts">
  /*
 	 *   Copyright (c) 2024-2025. caoccao.com Sam Cao
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
  import { MenuField, Paginate, Pagination, Table, TextField } from "svelte-ux";
  import type { MenuOption } from "svelte-ux";
  import * as Protocol from "../lib/protocol";
  import { mediaInfoAbout, mediaInfoParameters } from "../lib/store";

  const APP_NAME = "BetterMediaInfo";
  let about = $state({ appVersion: "", mediaInfoVersion: "" });
  let parameters = $state<Array<Protocol.Parameter>>([]);
  let propertyFilter = $state<string | null>(null);
  let streamFilter = $state<string | null>(null);

  let filteredParameters = $derived(() => {
    const propertyFilterLowerCased = propertyFilter
      ? propertyFilter.toLowerCase()
      : null;
    return parameters.filter((parameter) => {
      let hit = true;
      if (streamFilter !== null) {
        hit = parameter.stream === streamFilter;
      }
      if (hit && propertyFilter) {
        hit = parameter.property
          .toLocaleLowerCase()
          .includes(propertyFilterLowerCased as string);
      }
      return hit;
    });
  });

  let streams = $derived(() => {
    return [
      ...new Set(parameters.map((parameter) => parameter.stream)).values(),
    ].map((stream) => ({ label: stream, value: stream }));
  });

  onMount(async () => {
    mediaInfoAbout.subscribe((value) => {
      if (value) {
        about = value;
      }
    });
    mediaInfoParameters.subscribe((value) => {
      parameters = value;
    });
  });
</script>

<div class="grid">
  <div class="grid grid-cols-[auto,1fr] gap-2">
    <div class="text-right">{APP_NAME}</div>
    <div>v{about.appVersion}</div>
    <div class="text-right">MediaInfoLib</div>
    <div>v{about.mediaInfoVersion.replaceAll(/[^0-9\.]+/g, "")}</div>
    <div class="text-right">Author</div>
    <div>
      <a
        href="https://github.com/caoccao"
        target="_blank"
        class="text-blue-600 visited:text-purple-600 underline underline-offset-auto"
      >
        Sam Cao
      </a>
    </div>
    <div class="text-right">Github</div>
    <div>
      <a
        href="https://github.com/caoccao/BetterMediaInfo"
        target="_blank"
        class="text-blue-600 visited:text-purple-600 underline underline-offset-auto"
      >
        https://github.com/caoccao/BetterMediaInfo
      </a>
    </div>
  </div>
  <div class="my-3 grid grid-flow-col grid-cols-[auto,1fr] gap-2">
    <MenuField
      classes={{
        root: "min-w-32 max-w-32",
      }}
      options={[{ label: "All Streams", value: null }, ...streams()]}
      bind:value={streamFilter}
    />
    <TextField placeholder="Property" bind:value={propertyFilter} />
  </div>
  <Paginate
    data={filteredParameters()}
    perPage={10}
    let:pageData={pagedParameters}
    let:pagination={paginator}
  >
    <Table
      data={pagedParameters}
      classes={{
        table: "border-collapse border border-slate-500",
        th: "border border-slate-600 p-1 bg-lime-50",
        td: "border border-slate-700 p-1",
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
      pagination={paginator}
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
<div class="bg-lime-50"></div>
<div class="bg-orange-50"></div>
<div class="bg-amber-50"></div>
<div class="bg-emerald-50"></div>
<div class="bg-neutral-50"></div>
<div class="bg-sky-50"></div>
<div class="bg-indigo-50"></div>
<div class="bg-lime-50"></div>
<div class="text-green-600 text-wrap break-words justify-self-center"></div>
<div class="text-red-600"></div>
