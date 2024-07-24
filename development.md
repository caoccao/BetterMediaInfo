# Development

## Build MediaInfoLib

### Build MediaInfoLib for Windows

* Clone MediaInfoLib, ZenLib, and zlib.

```sh
git clone https://github.com/MediaArea/MediaInfoLib.git
git clone https://github.com/MediaArea/ZenLib.git
curl -o zlib.zip https://www.zlib.net/zlib131.zip
7z x zlib.zip
move zlib-1.3.1 ZLib
del zlib.zip
```

* Open `MediaInfoLib\Project\MSVC2022\MediaInfoLib.sln` in Visual Studio 2022 and build the release version.
* The release version is at `MediaInfoLib\Project\MSVC2022\x64\Release\MediaInfo.dll`.

## Generate bindings.rs on Windows

* Install `bindgen-cli`.

```sh
cargo install bindgen-cli
```

* Generate `bindings.rs`.

```sh
set LIBCLANG_PATH=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Tools\Llvm\x64\bin\libclang.dll
bindgen ..\MediaInfoLib\Source\MediaInfoDLL\MediaInfoDLL.h ^
  --allowlist-type "MEDIAINFOLIST_Close" ^
  --allowlist-type "MEDIAINFOLIST_Count_Get" ^
  --allowlist-type "MEDIAINFOLIST_Count_Get_Files" ^
  --allowlist-type "MEDIAINFOLIST_Delete" ^
  --allowlist-type "MEDIAINFOLIST_Get" ^
  --allowlist-type "MEDIAINFOLIST_GetI" ^
  --allowlist-type "MEDIAINFOLIST_Inform" ^
  --allowlist-type "MEDIAINFOLIST_New" ^
  --allowlist-type "MEDIAINFOLIST_Open" ^
  --allowlist-type "MEDIAINFOLIST_Option" ^
  --allowlist-type "MEDIAINFOLIST_State_Get" ^
  --allowlist-type "MEDIAINFO_Close" ^
  --allowlist-type "MEDIAINFO_Count_Get" ^
  --allowlist-type "MEDIAINFO_Count_Get_Files" ^
  --allowlist-type "MEDIAINFO_Delete" ^
  --allowlist-type "MEDIAINFO_Get" ^
  --allowlist-type "MEDIAINFO_GetI" ^
  --allowlist-type "MEDIAINFO_Inform" ^
  --allowlist-type "MEDIAINFO_New" ^
  --allowlist-type "MEDIAINFO_Open" ^
  --allowlist-type "MEDIAINFO_Open_Buffer_Continue" ^
  --allowlist-type "MEDIAINFO_Open_Buffer_Continue_GoTo_Get" ^
  --allowlist-type "MEDIAINFO_Open_Buffer_Finalize" ^
  --allowlist-type "MEDIAINFO_Open_Buffer_Init" ^
  --allowlist-type "MEDIAINFO_Open_NextPacket" ^
  --allowlist-type "MEDIAINFO_Option" ^
  --allowlist-type "MEDIAINFO_Output_Buffer_Get" ^
  --allowlist-type "MEDIAINFO_Output_Buffer_GetI" ^
  --allowlist-type "MEDIAINFO_State_Get" ^
  -o src\bindings.rs 
```

* Add the following code to the top of `bindings.rs` to mute the warnings.

```rust
#![allow(non_camel_case_types, non_upper_case_globals, nonstandard_style, dead_code, unused_imports)]
```
