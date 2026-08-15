import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { INITIAL_APARTMENTS } from "../js/data.js";

const root = path.resolve(import.meta.dirname, "..");
const required = ["index.html", "css/app.css", "js/app.js", "js/store.js", "js/firebase-adapter.js", "js/security.js", "data/demographics.js", "manifest.webmanifest", "sw.js", "firebase/firestore.rules", "docs/FIREBASE_SETUP.md"];
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
for (const label of ["ホーム", "活動を記録", "活動履歴", "配布地図", "マンション", "分析", "設定・データ管理", "活動アカウント"]) {
  if (!html.includes(label)) { console.error(`UI LABEL MISSING ${label}`); failed = true; }
}
if (html.includes("手動設定手順を見る")) { console.error("MANUAL FIREBASE SETUP LINK MUST NOT BE SHOWN"); failed = true; }

const firebaseAdapter = await readFile(path.join(root, "js/firebase-adapter.js"), "utf8");
if (firebaseAdapter.includes("設定画面の手順")) { console.error("HIDDEN FIREBASE SETUP INSTRUCTION MUST NOT BE REFERENCED"); failed = true; }

const app = await readFile(path.join(root, "js/app.js"), "utf8");
for (const feature of ["addCurrentLocationControl(activityMap)", "addCurrentLocationControl(apartmentMap)", 'map.on("locationfound"', 'map.on("locationerror"']) {
  if (!app.includes(feature)) { console.error(`CURRENT LOCATION FEATURE MISSING ${feature}`); failed = true; }
}

const store = await readFile(path.join(root, "js/store.js"), "utf8");
for (const feature of ["createAccount(name)", "switchAccount(id)", "renameAccount(id, name)", "deleteAccount(id)", "accountStates"]) {
  if (!store.includes(feature)) { console.error(`ACTIVITY ACCOUNT FEATURE MISSING ${feature}`); failed = true; }
}

const apartmentIds = new Set(INITIAL_APARTMENTS.map((item) => item.id));
if (INITIAL_APARTMENTS.length < 40) { console.error("INITIAL APARTMENTS MUST INCLUDE AT LEAST 40 CANDIDATES"); failed = true; }
if (apartmentIds.size !== INITIAL_APARTMENTS.length) { console.error("INITIAL APARTMENT IDS MUST BE UNIQUE"); failed = true; }
for (const apartment of INITIAL_APARTMENTS) {
  if (!apartment.name || !apartment.address || !apartment.area || apartment.units < 100 || !apartment.sourceUrl || !Number.isFinite(apartment.lat) || !Number.isFinite(apartment.lng)) {
    console.error(`INVALID INITIAL APARTMENT ${apartment.id}`);
    failed = true;
  }
  if (apartment.lat < 35.57 || apartment.lat > 35.65 || apartment.lng < 139.68 || apartment.lng > 139.78) {
    console.error(`INITIAL APARTMENT OUTSIDE SHINAGAWA MAP BOUNDS ${apartment.id}`);
    failed = true;
  }
}

const config = await readFile(path.join(root, "data/firebase-config.js"), "utf8");
for (const field of ["apiKey", "authDomain", "projectId", "appId"]) {
  if (!new RegExp(`${field}:\\s*["'][^"']+["']`).test(config)) { console.error(`FIREBASE CONFIG MISSING ${field}`); failed = true; }
}

if (failed) process.exit(1);
console.log("verify: required files, JavaScript syntax, UI labels, and Firebase config passed");
