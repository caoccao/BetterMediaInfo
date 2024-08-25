const fs = require("fs");
const path = require("path");
const process = require("process");

const systemRoot = process.env.SYSTEMROOT;

function copy(from, to) {
  fs.copyFileSync(from, to);
  console.info(`Copied from "${from}" to "${to}".`);
}

try {
  copy(
    "..\\MediaInfoLib\\Project\\MSVC2022\\x64\\Release\\MediaInfo.dll",
    "src-tauri\\MediaInfo.dll"
  );
  copy(
    path.join(systemRoot, "System32\\msvcp140.dll"),
    "src-tauri\\msvcp140.dll"
  );
  copy(
    path.join(systemRoot, "System32\\vcruntime140.dll"),
    "src-tauri\\vcruntime140.dll"
  );
  copy(
    path.join(systemRoot, "System32\\vcruntime140_1.dll"),
    "src-tauri\\vcruntime140_1.dll"
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}
