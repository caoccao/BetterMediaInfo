const fs = require("fs");
const path = require("path");
const process = require("process");

const systemRoot = process.env.SYSTEMROOT;

try {
  fs.copyFileSync("..\\MediaInfoLib\\Project\\MSVC2022\\x64\\Release\\MediaInfo.dll", "src-tauri\\MediaInfo.dll");
  fs.copyFileSync(path.join(systemRoot, "System32\\msvcp140.dll"), "src-tauri\\msvcp140.dll");
  fs.copyFileSync(path.join(systemRoot, "System32\\vcruntime140.dll"), "src-tauri\\vcruntime140.dll");
  fs.copyFileSync(path.join(systemRoot, "System32\\vcruntime140_1.dll"), "src-tauri\\vcruntime140_1.dll");
} catch (error) {
  console.error(error);
  process.exit(1);
}
