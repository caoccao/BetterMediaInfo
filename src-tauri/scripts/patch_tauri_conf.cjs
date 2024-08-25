const fs = require("fs");
const path = require("path");

const repoRoot = path.join(path.dirname(__filename), "..\\..\\");

try {
  const tauriConfPath = path.join(repoRoot, "src-tauri\\tauri.conf.json");
  const tauriConf = fs.readFileSync(tauriConfPath, { encoding: "utf8" });
  const jsonObject = JSON.parse(tauriConf);
  jsonObject["tauri"]["bundle"]["resources"] = [
    "MediaInfo.dll",
    "msvcp140.dll",
    "vcruntime140.dll",
    "vcruntime140_1.dll",
  ];
  const newTauriConf = JSON.stringify(jsonObject, null, 2);
  fs.writeFileSync(tauriConfPath, newTauriConf, { encoding: "utf8" });
  console.info(`Patched "${tauriConfPath}".`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
