import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createImportedActivityIdentity, csvEscape, escapeHtml } from "../js/security.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const payload = '\"><img src=x onerror="globalThis.pwned=true">';
const identity = createImportedActivityIdentity(payload, (prefix) => `${prefix}-safe-id`);
assert.equal(identity.id, "import-safe-id");
assert.equal(identity.sourceId, payload);
assert.equal(escapeHtml(payload), "&quot;&gt;&lt;img src=x onerror=&quot;globalThis.pwned=true&quot;&gt;");

assert.equal(csvEscape("通常の文字列"), "通常の文字列");
assert.equal(csvEscape("=HYPERLINK(\"https://example.com\")"), '"\'=HYPERLINK(""https://example.com"")"');
assert.equal(csvEscape("  @SUM(1,2)"), '"\'  @SUM(1,2)"');
assert.equal(csvEscape("a,b"), '"a,b"');

const rules = await readFile(path.join(root, "firebase/firestore.rules"), "utf8");
assert.match(rules, /match \/users\/\{uid\}\/app\/state/);
assert.doesNotMatch(rules, /match \/users\/\{uid\}\/\{document=\*\*\}/);

const adapter = await readFile(path.join(root, "js/firebase-adapter.js"), "utf8");
for (const behavior of ["signInWithPopup", "onSnapshot", "setDoc", "clearIndexedDbPersistence", "terminate(db)"]) {
  assert.ok(adapter.includes(behavior), `Firebase behavior missing: ${behavior}`);
}

const app = await readFile(path.join(root, "js/app.js"), "utf8");
assert.ok(app.includes("createImportedActivityIdentity"));
assert.ok(app.includes("escapeHtml(activity.id)"));
assert.ok(app.includes("existing.sourceId === item.sourceId"));

console.log("security tests: XSS, CSV export, Firestore scope, deletion, and sync invariants passed");
