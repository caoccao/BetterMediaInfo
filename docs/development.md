# Development

## Build MediaInfoLib

* Clone the following projects to the same directory.

```sh
git clone https://github.com/caoccao/BetterMediaInfo.git
git clone https://github.com/MediaArea/MediaInfoLib.git
git clone https://github.com/MediaArea/ZenLib.git
```

### Build MediaInfoLib for Linux

* Upgrade Ubuntu 24.04.

```sh
sudo apt-get update
sudo apt-get install -y libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libwebkit2gtk-4.1-dev
```

* Download zlib.

```sh
curl -o zlib.tar.gz https://www.zlib.net/zlib-1.3.2.tar.gz
tar -xzvf zlib.tar.gz
mv zlib-1.3.2 zlib
rm zlib.tar.gz
```

* Build zlib.

```sh
cd zlib
./configure --static
make -j `nproc`
```

* Build ZenLib.

```sh
cd ZenLib/Project/GNU/Library
./autogen.sh
./configure --enable-static
make -j `nproc`
```

* Build MediaInfoLib.

```sh
cd MediaInfoLib/Project/GNU/Library
./autogen.sh
./configure --enable-static
make -j `nproc`
```

### Build MediaInfoLib for MacOS

* Install XCode.
* Install autoconf automake libtool pkg-config zlib wxwidgets.

```sh
brew install autoconf automake libtool pkg-config zlib wxwidgets
```

* Download zlib.

```sh
curl -o zlib.tar.gz https://www.zlib.net/zlib-1.3.2.tar.gz
tar -xzvf zlib.tar.gz
mv zlib-1.3.2 zlib
rm zlib.tar.gz
```

* Build zlib.

```sh
cd zlib
./configure --static
make -j `nproc`
```

* Build ZenLib.

```sh
cd ZenLib/Project/GNU/Library
./autogen.sh
./configure --enable-static
make -j `nproc`
```

* Build MediaInfoLib.

```sh
cd MediaInfoLib/Project/GNU/Library
./autogen.sh
./configure --enable-static
make -j `nproc`
```

### Build MediaInfoLib for Windows

* Download zlib.

```sh
curl -o zlib.zip https://zlib.net/zlib132.zip
7z x zlib.zip
move zlib-1.3.2 zlib
del zlib.zip
```

* Build zlib.

```sh
cd zlib
cmake -G "Visual Studio 17 2022" -A x64 -S . -B contrib/vstudio/vc17
cmake --build contrib/vstudio/vc17 --config Release
```

* Patch MediaInfoLib to work with cmake-built zlib.

```sh
cd scripts/ts
deno task patch
```

* Build MediaInfoLib in Visual Studio 2022.

```sh
cd MediaInfoLib\Project\MSVC2022
msbuild MediaInfoLib.sln -t:rebuild -verbosity:diag -property:Configuration=Release -property:Platform=x64
```

## Generate bindings.rs on Windows

This step is optional because the generated `bindings.rs` is broken. `bindings.rs` is for reference only.

* Install `bindgen-cli`.

```sh
cargo install bindgen-cli
```

* Generate `bindings.rs`.

```sh
cd BetterMediaInfo
set LIBCLANG_PATH=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Tools\Llvm\x64\bin\libclang.dll
bindgen ^
  --allowlist-item "MediaInfo\w+" ^
  -o src-tauri\src\bindings.rs ^
  ..\MediaInfoLib\Source\MediaInfoDLL\MediaInfoDLL.h
```

* Add the following code to the top of `bindings.rs` to mute the warnings.

```rust
#![allow(non_camel_case_types, non_upper_case_globals, nonstandard_style, dead_code, unused_imports)]
```

## Logging

### Turn on Debug Log on Windows

```sh
set RUST_LOG=debug
```

## Build Tauri

```sh
pnpm install
pnpm tauri dev
pnpm tauri build
```

## Build Installers

### Build NSIS Installer

* Run the commands as follows.

```sh
node BetterMediaInfo\src-tauri\scripts\copy_dlls.cjs
node BetterMediaInfo\src-tauri\scripts\patch_tauri_conf.cjs
```

## Config File Location

The config file `BetterMediaInfo.json` is resolved at runtime based on the platform and how the app is launched:

* **Linux**: `$XDG_CONFIG_HOME/BetterMediaInfo/BetterMediaInfo.json` if `XDG_CONFIG_HOME` is set; otherwise `$HOME/.config/BetterMediaInfo/BetterMediaInfo.json`.
* **macOS**: `$HOME/Library/Application Support/BetterMediaInfo/BetterMediaInfo.json`.
* **Windows**:
  * If the executable lives under `%LOCALAPPDATA%`, `%ProgramFiles%`, or `%ProgramFiles(x86)%` (i.e. the app is installed), the config is stored in `%APPDATA%\BetterMediaInfo\BetterMediaInfo.json`.
  * Otherwise (development mode), the config is stored next to the executable (current behavior).

The config directory is created automatically on first launch if it doesn't exist.

## UI

* [React 19](https://react.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Material-UI (MUI) v7](https://mui.com/)
* [MUI X Data Grid](https://mui.com/x/react-data-grid/)
* [Emotion](https://emotion.sh/)
* [Monaco Editor](https://microsoft.github.io/monaco-editor/)
* [Zustand](https://zustand.docs.pmnd.rs/)
* [react-i18next](https://react.i18next.com/)
* [Vite](https://vite.dev/)
* [Tauri v2](https://tauri.app/)
