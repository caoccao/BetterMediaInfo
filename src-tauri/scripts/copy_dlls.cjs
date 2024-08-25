const fs = require("fs");
const path = require("path");
const process = require("process");

const systemRoot = process.env.SYSTEMROOT;
const repoRoot = path.join(path.dirname(__filename), "..\\..\\");

function copy(from, to) {
  fs.copyFileSync(from, to);
  console.info(`Copied from "${from}" to "${to}".`);
}

try {
  copy(
    path.join(
      repoRoot,
      "..\\MediaInfoLib\\Project\\MSVC2022\\x64\\Release\\MediaInfo.dll"
    ),
    path.join(repoRoot, "src-tauri\\MediaInfo.dll")
  );
  copy(
    path.join(systemRoot, "System32\\msvcp140.dll"),
    path.join(repoRoot, "src-tauri\\msvcp140.dll")
  );
  copy(
    path.join(systemRoot, "System32\\vcruntime140.dll"),
    path.join(repoRoot, "src-tauri\\vcruntime140.dll")
  );
  copy(
    path.join(systemRoot, "System32\\vcruntime140_1.dll"),
    path.join(repoRoot, "src-tauri\\vcruntime140_1.dll")
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}
