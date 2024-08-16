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

import * as Store from "svelte/store";
import * as Protocol from "./protocol";
import { getAbout, getConfig, getParameters } from "./service";

export const config = Store.writable<Protocol.Config | null>(null, (set) => {
  getConfig()
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

export function deleteMediaFile(file: string) {
  mediaFiles.update((existingFiles) => {
    return existingFiles.filter((value) => value !== file);
  });
  mediaDetailedFiles.update((existingFiles) => {
    return existingFiles.filter((value) => value !== file);
  });
  mediaFileToAllPropertiesMap.update((value) => {
    value.delete(file);
    return value;
  });
  mediaFileToCommonPropertyMap.update((value) => {
    value.delete(file);
    return value;
  });
  mediaFileToStreamCountMap.update((value) => {
    value.delete(file);
    return value;
  });
}

export const dialog = Store.writable<Protocol.Dialog | null>(null, (set) => {
  set(null);
  return () => {
    set(null);
  };
});

export const isConfigDirty = Store.writable<boolean>(false, (set) => {
  set(false);
  return () => {
    set(false);
  };
});

export const mediaDetailedFiles = Store.writable<string[]>([], (set) => {
  set([]);
  return () => {
    set([]);
  };
});

export const mediaFiles = Store.writable<string[]>([], (set) => {
  set([]);
  return () => {
    set([]);
  };
});

export const mediaFileToAllPropertiesMap = Store.writable<
  Map<string, Array<Protocol.StreamPropertyMap>>
>(new Map(), (set) => {
  set(new Map());
  return () => {
    set(new Map());
  };
});

export const mediaFileToCommonPropertyMap = Store.writable<
  Map<string, Map<string, Protocol.StreamPropertyValue>>
>(new Map(), (set) => {
  set(new Map());
  return () => {
    set(new Map());
  };
});

export const mediaFileToStreamCountMap = Store.writable<
  Map<string, Map<Protocol.StreamKind, Protocol.StreamCount>>
>(new Map(), (set) => {
  set(new Map());
  return () => {
    set(new Map());
  };
});

export const mediaInfoAbout = Store.readable<Protocol.About | null>(
  null,
  (set) => {
    getAbout()
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
    getParameters()
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
