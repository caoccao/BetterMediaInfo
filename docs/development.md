# Development

## Build MediaInfoLib

* Clone the following projects to the same directory.

```sh
git clone https://github.com/caoccao/BetterMediaInfo.git
git clone https://github.com/MediaArea/MediaInfoLib.git
git clone https://github.com/MediaArea/ZenLib.git
```

### Build MediaInfoLib for Windows

* Download zlib.

```sh
curl -o zlib.zip https://www.zlib.net/zlib131.zip
7z x zlib.zip
move zlib-1.3.1 ZLib
del zlib.zip
```

* Open `MediaInfoLib\Project\MSVC2022\MediaInfoLib.sln` in Visual Studio 2022 and build the release version.
* The release version is at `MediaInfoLib\Project\MSVC2022\x64\Release\MediaInfo.dll`.

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
pnpm run tauri dev
pnpm run tauri build
```

## UI

* [Svelte UX](https://svelte-ux.techniq.dev/)
* [tailwindcss](https://tailwindcss.com/)
