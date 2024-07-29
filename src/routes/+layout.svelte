<script>
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
  import "../app.css";
  import { AppLayout } from "svelte-ux";
  import Footer from "./footer.svelte";
  import Toolbar from "./toolbar.svelte";
</script>

<div class="grid">
  <nav class="sticky top-0 bg-white"><Toolbar /></nav>
  <main><slot></slot></main>
  <footer><Footer /></footer>
</div>
