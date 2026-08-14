import { createInitialState } from "./data.js";

const STORAGE_PREFIX = "poskatsu_log_state_v1";
let storageKey = STORAGE_PREFIX;
let state = loadState(storageKey);
const listeners = new Set();
let remoteSave = null;

function loadState(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (parsed && Array.isArray(parsed.activities)) return { ...createInitialState(), ...parsed };
  } catch (error) {
    console.warn("Local state could not be read", error);
  }
  return createInitialState();
}

function persist(notifyRemote = true) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(storageKey, JSON.stringify(state));
  listeners.forEach((listener) => listener(state));
  if (notifyRemote && remoteSave) remoteSave(structuredClone(state));
}

export const store = {
  get: () => state,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  setRemoteSave(handler) { remoteSave = handler; },
  setScope(scope = "anonymous") {
    storageKey = scope === "anonymous" ? STORAGE_PREFIX : `${STORAGE_PREFIX}_${scope}`;
    const hasStoredState = localStorage.getItem(storageKey) !== null;
    state = loadState(storageKey);
    listeners.forEach((listener) => listener(state));
    return hasStoredState;
  },
  replace(nextState, { remote = false } = {}) {
    state = { ...createInitialState(), ...structuredClone(nextState) };
    persist(!remote);
  },
  saveActivity(activity) {
    const index = state.activities.findIndex((item) => item.id === activity.id);
    if (index >= 0) state.activities[index] = activity;
    else state.activities.unshift(activity);
    activity.workers.forEach((name) => {
      if (name && !state.workers.includes(name)) state.workers.push(name);
    });
    persist();
  },
  deleteActivity(id) { state.activities = state.activities.filter((item) => item.id !== id); persist(); },
  saveMaterial(material) {
    const index = state.materials.findIndex((item) => item.id === material.id);
    if (index >= 0) state.materials[index] = material;
    else state.materials.push(material);
    persist();
  },
  saveApartment(apartment) {
    const index = state.apartments.findIndex((item) => item.id === apartment.id);
    if (index >= 0) state.apartments[index] = apartment;
    else state.apartments.push(apartment);
    persist();
  },
  deleteApartment(id) { state.apartments = state.apartments.filter((item) => item.id !== id); persist(); },
  saveGoal(month, value) { state.goals[month] = Number(value) || 0; persist(); },
  saveImportMapping(signature, mapping) { state.importMappings[signature] = mapping; persist(); },
  clear() { state = createInitialState(); localStorage.removeItem(storageKey); listeners.forEach((listener) => listener(state)); },
  export: () => structuredClone(state)
};
