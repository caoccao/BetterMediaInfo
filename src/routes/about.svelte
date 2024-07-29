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

  // let aboutColor = theme.colors.primary;
  let aboutText = "Better Media Info";
  // let parametersColor = theme.colors.primary;
  let parametersText = "";

  onMount(async () => {
    invoke<string>("get_about")
      .then((text) => {
        aboutText = text;
        // aboutColor = theme.colors.primary;
      })
      .catch((error) => {
        aboutText = error;
        // aboutColor = theme.colors.error;
      });
    invoke<string>("get_parameters")
      .then((text) => {
        parametersText = text;
        // parametersColor = theme.colors.primary;
      })
      .catch((error) => {
        parametersText = error;
        // parametersColor = theme.colors.error;
      });
  });
</script>

<div class="grid justify-start">
  <div>{aboutText}</div>
  <div>{parametersText}</div>
</div>
