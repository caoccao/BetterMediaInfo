# Development

## Build MediaInfoLib

* Clone the following projects to the same directory.

```sh
git clone https://github.com/caoccao/BetterMediaInfo.git
git clone https://github.com/caoccao/MediaInfoLib.git
git clone https://github.com/MediaArea/ZenLib.git
```

### Build MediaInfoLib for MacOS

* Install XCode.
* Install autoconf automake libtool pkg-config zlib wxwidgets.

```sh
brew install autoconf automake libtool pkg-config zlib wxwidgets
```

* Download zlib.

```sh
curl -o zlib.tar.gz https://www.zlib.net/zlib-1.3.1.tar.gz
tar -xzvf zlib.tar.gz
mv zlib-1.3.1 zlib
rm zlib.tar.gz
```

* Build zlib.

```sh
cd zlib
./configure --static
make -j`nproc`
```

* Build ZenLib.

```sh
cd ZenLib/Project/GNU/Library
./autogen.sh
./configure --enable-static
make -j`nproc`
```

* Build MediaInfoLib.

```sh
cd MediaInfoLib/Project/GNU/Library
./autogen.sh
./configure --enable-static
make -j`nproc`
```

### Build MediaInfoLib for Windows

* Download zlib.

```sh
curl -o zlib.zip https://www.zlib.net/zlib131.zip
7z x zlib.zip
move zlib-1.3.1 zlib
del zlib.zip
```

* Build zlib.

```sh
cd zlib
md build
cd build
cmake -A x64 ..\
cmake --build . --config Release
```

* Build MediaInfoLib in Visual Studio 2022.

```sh
cd MediaInfoLib\Project\MSVC2022
msbuild MediaInfoLib.sln -t:rebuild -verbosity:diag -property:Configuration=Release
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

* Copy the following files to `src-tauri`.

```sh
copy /y MediaInfoLib\Project\MSVC2022\x64\Release\MediaInfo.dll BetterMediaInfo\src-tauri\
copy /y %SystemRoot%\System32\msvp140.dll BetterMediaInfo\src-tauri\
copy /y %SystemRoot%\System32\vcruntime140.dll BetterMediaInfo\src-tauri\
copy /y %SystemRoot%\System32\vcruntime140_1.dll BetterMediaInfo\src-tauri\
```

* Append the following to `tauri.conf.json`.

```json
{
  "tauri": {
    "bundle": {
      "resources": [
        "MediaInfo.dll",
        "msvcp140.dll",
        "vcruntime140.dll",
        "vcruntime140_1.dll"
      ]
    }
  }
}
```

## UI

* [Svelte UX](https://svelte-ux.techniq.dev/)
* [tailwindcss](https://tailwindcss.com/)
* [Google Fonts](https://fonts.google.com/icons)
* [svhighlight](https://github.com/bennymi/svhighlight)
