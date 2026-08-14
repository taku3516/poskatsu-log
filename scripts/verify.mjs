import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const required = ["index.html", "css/app.css", "js/app.js", "js/store.js", "js/firebase-adapter.js", "data/demographics.js", "manifest.webmanifest", "sw.js", "firebase/firestore.rules", "docs/FIREBASE_SETUP.md"];
let failed = false;

for (const file of required) {
  try { await readFile(path.join(root, file)); }
  catch { console.error(`MISSING ${file}`); failed = true; }
}

for (const directory of ["js", "data", "scripts"]) {
  for (const file of await readdir(path.join(root, directory))) {
    if (!file.endsWith(".js") && !file.endsWith(".mjs")) continue;
    const result = spawnSync(process.execPath, ["--check", path.join(root, directory, file)], { encoding: "utf8" });
    if (result.status !== 0) { console.error(result.stderr); failed = true; }
  }
}

const html = await readFile(path.join(root, "index.html"), "utf8");
for (const label of ["ホーム", "活動を記録", "活動履歴", "配布地図", "マンション", "分析", "設定・データ管理"]) {
  if (!html.includes(label)) { console.error(`UI LABEL MISSING ${label}`); failed = true; }
}

const config = await readFile(path.join(root, "data/firebase-config.js"), "utf8");
for (const field of ["apiKey", "authDomain", "projectId", "appId"]) {
  if (!new RegExp(`${field}:\\s*["'][^"']+["']`).test(config)) { console.error(`FIREBASE CONFIG MISSING ${field}`); failed = true; }
}

if (failed) process.exit(1);
console.log("verify: required files, JavaScript syntax, UI labels, and Firebase config passed");
