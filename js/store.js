import { APARTMENT_BASELINE_VERSION, INITIAL_APARTMENTS, createInitialState } from "./data.js";

const STORAGE_PREFIX = "poskatsu_log_state_v1";
const ACCOUNT_SCHEMA_VERSION = 2;
const DEFAULT_ACCOUNT_ID = "account-default";
const now = () => new Date().toISOString();
let storageKey = STORAGE_PREFIX;
let container = loadContainer(storageKey);
const listeners = new Set();
let remoteSave = null;

function migrateState(savedState = {}) {
  const deletedIds = new Set(savedState.deletedInitialApartmentIds || []);
  const savedApartments = Array.isArray(savedState.apartments) ? savedState.apartments : [];
  const apartmentsById = new Map(savedApartments.map((item) => [item.id, item]));
  const correctedUnits = new Map([
    ["apt-vert-clair-osaki", { from: 230, to: 140 }],
    ["apt-park-habio-ebara-nakanobu-ekimae", { from: 141, to: 140 }]
  ]);
  for (const candidate of INITIAL_APARTMENTS) {
    const existing = apartmentsById.get(candidate.id);
    if (!existing && !deletedIds.has(candidate.id)) {
      apartmentsById.set(candidate.id, structuredClone(candidate));
      continue;
    }
    if (!existing) continue;
    const genericAddress = `東京都品川区${candidate.area}`;
    const correction = correctedUnits.get(candidate.id);
    apartmentsById.set(candidate.id, {
      ...existing,
      address: !existing.address || existing.address === genericAddress ? candidate.address : existing.address,
      units: correction && existing.units === correction.from ? correction.to : existing.units,
      lat: Number.isFinite(existing.lat) ? existing.lat : candidate.lat,
      lng: Number.isFinite(existing.lng) ? existing.lng : candidate.lng
    });
  }
  return {
    ...createInitialState(),
    ...savedState,
    apartments: [...apartmentsById.values()],
    apartmentBaselineVersion: APARTMENT_BASELINE_VERSION,
    deletedInitialApartmentIds: [...deletedIds]
  };
}

function createContainer(initialState = createInitialState()) {
  const timestamp = now();
  return {
    schemaVersion: ACCOUNT_SCHEMA_VERSION,
    activeAccountId: DEFAULT_ACCOUNT_ID,
    accounts: [{ id: DEFAULT_ACCOUNT_ID, name: "活動アカウント1", createdAt: timestamp, updatedAt: timestamp }],
    accountStates: { [DEFAULT_ACCOUNT_ID]: migrateState(initialState) },
    updatedAt: timestamp
  };
}

function normalizeContainer(saved) {
  if (!saved || !Array.isArray(saved.accounts) || !saved.accountStates) return createContainer(saved);
  const accounts = saved.accounts
    .filter((account) => account?.id && account?.name && saved.accountStates[account.id])
    .map((account) => ({ ...account, name: String(account.name).trim().slice(0, 60) }));
  if (!accounts.length) return createContainer();
  const accountStates = Object.fromEntries(accounts.map((account) => [account.id, migrateState(saved.accountStates[account.id])]));
  const activeAccountId = accounts.some((account) => account.id === saved.activeAccountId) ? saved.activeAccountId : accounts[0].id;
  return { ...saved, schemaVersion: ACCOUNT_SCHEMA_VERSION, accounts, accountStates, activeAccountId, updatedAt: saved.updatedAt || now() };
}

function loadContainer(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (parsed) return normalizeContainer(parsed);
  } catch (error) {
    console.warn("Local state could not be read", error);
  }
  return createContainer();
}

const activeState = () => container.accountStates[container.activeAccountId];

function notify() {
  const state = activeState();
  listeners.forEach((listener) => listener(state));
}

function persist(notifyRemote = true) {
  const timestamp = now();
  activeState().updatedAt = timestamp;
  container.updatedAt = timestamp;
  const account = container.accounts.find((item) => item.id === container.activeAccountId);
  if (account) account.updatedAt = timestamp;
  localStorage.setItem(storageKey, JSON.stringify(container));
  notify();
  if (notifyRemote && remoteSave) remoteSave(structuredClone(container));
}

export const store = {
  get: () => activeState(),
  getAccounts: () => structuredClone(container.accounts),
  getActiveAccount: () => structuredClone(container.accounts.find((account) => account.id === container.activeAccountId)),
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  setRemoteSave(handler) { remoteSave = handler; },
  setScope(scope = "anonymous") {
    storageKey = scope === "anonymous" ? STORAGE_PREFIX : `${STORAGE_PREFIX}_${scope}`;
    const hasStoredState = localStorage.getItem(storageKey) !== null;
    container = loadContainer(storageKey);
    notify();
    return hasStoredState;
  },
  replace(nextState, { remote = false } = {}) {
    container = normalizeContainer(structuredClone(nextState));
    localStorage.setItem(storageKey, JSON.stringify(container));
    notify();
    if (!remote && remoteSave) remoteSave(structuredClone(container));
  },
  createAccount(name) {
    const cleanName = String(name || "").trim().slice(0, 60);
    if (!cleanName) throw new Error("活動アカウント名を入力してください。");
    const id = `account-${crypto.randomUUID()}`;
    const timestamp = now();
    container.accounts.push({ id, name: cleanName, createdAt: timestamp, updatedAt: timestamp });
    container.accountStates[id] = createInitialState();
    container.activeAccountId = id;
    persist();
    return id;
  },
  switchAccount(id) {
    if (!container.accounts.some((account) => account.id === id)) throw new Error("活動アカウントが見つかりません。");
    if (id === container.activeAccountId) return;
    container.activeAccountId = id;
    persist();
  },
  renameAccount(id, name) {
    const cleanName = String(name || "").trim().slice(0, 60);
    const account = container.accounts.find((item) => item.id === id);
    if (!account || !cleanName) throw new Error("活動アカウント名を入力してください。");
    account.name = cleanName;
    persist();
  },
  deleteAccount(id) {
    if (container.accounts.length <= 1) throw new Error("活動アカウントは1つ以上必要です。");
    const index = container.accounts.findIndex((account) => account.id === id);
    if (index < 0) throw new Error("活動アカウントが見つかりません。");
    container.accounts.splice(index, 1);
    delete container.accountStates[id];
    if (container.activeAccountId === id) container.activeAccountId = container.accounts[Math.min(index, container.accounts.length - 1)].id;
    persist();
  },
  saveActivity(activity) {
    const state = activeState();
    const index = state.activities.findIndex((item) => item.id === activity.id);
    if (index >= 0) state.activities[index] = activity;
    else state.activities.unshift(activity);
    activity.workers.forEach((name) => {
      if (name && !state.workers.includes(name)) state.workers.push(name);
    });
    persist();
  },
  deleteActivity(id) { const state = activeState(); state.activities = state.activities.filter((item) => item.id !== id); persist(); },
  saveMaterial(material) {
    const state = activeState();
    const index = state.materials.findIndex((item) => item.id === material.id);
    if (index >= 0) state.materials[index] = material;
    else state.materials.push(material);
    persist();
  },
  saveApartment(apartment) {
    const state = activeState();
    const index = state.apartments.findIndex((item) => item.id === apartment.id);
    if (index >= 0) state.apartments[index] = apartment;
    else state.apartments.push(apartment);
    persist();
  },
  deleteApartment(id) {
    const state = activeState();
    state.apartments = state.apartments.filter((item) => item.id !== id);
    if (INITIAL_APARTMENTS.some((item) => item.id === id) && !state.deletedInitialApartmentIds.includes(id)) state.deletedInitialApartmentIds.push(id);
    persist();
  },
  saveGoal(month, value) { activeState().goals[month] = Number(value) || 0; persist(); },
  saveImportMapping(signature, mapping) { activeState().importMappings[signature] = mapping; persist(); },
  clear() { container = createContainer(); localStorage.removeItem(storageKey); notify(); },
  export: () => structuredClone(container)
};
