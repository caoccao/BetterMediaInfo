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
