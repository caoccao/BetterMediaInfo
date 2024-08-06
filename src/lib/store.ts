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
import * as Store from "svelte/store";
import * as Protocol from "./protocol";

export const config = Store.writable<Protocol.Config | null>(null, (set) => {
  invoke<Protocol.Config>("get_config")
    .then((result) => {
      set(result);
    })
    .catch((error) => {
      console.error(error);
    });
  return () => {
    set(null);
  };
});

export const mediaFiles = Store.writable<string[]>([], (set) => {
  set([]);
  return () => {
    set([]);
  };
});

export const mediaInfoAbout = Store.readable<Protocol.About | null>(
  null,
  (set) => {
    invoke<Protocol.About>("get_about")
      .then((result) => {
        set(result);
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      set(null);
    };
  }
);

export const mediaInfoParameters = Store.readable<Array<Protocol.Parameter>>(
  [],
  (set) => {
    invoke<Array<Protocol.Parameter>>("get_parameters")
      .then((result) => {
        set(result);
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      set([]);
    };
  }
);

export const tabAboutStatus = Store.writable<Protocol.ControlStatus>(
  Protocol.ControlStatus.Hidden,
  (set) => {
    set(Protocol.ControlStatus.Hidden);
    return () => {
      set(Protocol.ControlStatus.Hidden);
    };
  }
);

export const tabSettingsStatus = Store.writable<Protocol.ControlStatus>(
  Protocol.ControlStatus.Hidden,
  (set) => {
    set(Protocol.ControlStatus.Hidden);
    return () => {
      set(Protocol.ControlStatus.Hidden);
    };
  }
);
