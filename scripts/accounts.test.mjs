import assert from "node:assert/strict";

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

globalThis.localStorage = new MemoryStorage();

const legacyState = {
  version: 1,
  activities: [{ id: "legacy-activity", workers: [], materials: [], areas: [] }],
  materials: [{ id: "legacy-material", name: "既存配布物", active: true }],
  workers: [],
  apartments: [],
  deletedInitialApartmentIds: [],
  goals: {},
  importMappings: {},
  updatedAt: "2026-08-14T00:00:00.000Z"
};
localStorage.setItem("poskatsu_log_state_v1", JSON.stringify(legacyState));

const { store } = await import("../js/store.js");

assert.equal(store.getAccounts().length, 1);
assert.equal(store.getActiveAccount().name, "活動アカウント1");
assert.equal(store.get().activities[0].id, "legacy-activity", "legacy activity must be migrated");

const originalAccountId = store.getActiveAccount().id;
const secondAccountId = store.createAccount("候補者B");
assert.equal(store.getActiveAccount().id, secondAccountId);
assert.equal(store.get().activities.length, 0, "new account must start without activities");

store.saveActivity({ id: "candidate-b-activity", workers: [], materials: [], areas: [] });
store.switchAccount(originalAccountId);
assert.equal(store.get().activities.length, 1);
assert.equal(store.get().activities[0].id, "legacy-activity", "accounts must keep activities isolated");

store.renameAccount(originalAccountId, "候補者A");
assert.equal(store.getActiveAccount().name, "候補者A");
store.deleteAccount(secondAccountId);
assert.equal(store.getAccounts().length, 1);
assert.throws(() => store.deleteAccount(originalAccountId), /1つ以上必要/);

const exported = store.export();
assert.equal(exported.schemaVersion, 2);
assert.deepEqual(Object.keys(exported.accountStates), [originalAccountId]);

console.log("account tests: migration, creation, isolation, rename, switching, and deletion passed");
