import { FIREBASE_CONFIG, firebaseConfigured } from "../data/firebase-config.js";
import { store } from "./store.js";

const APP_PATH = ["app", "state"];
let auth;
let db;
let currentUser = null;
let remoteTimer = null;
let remoteUnsubscribe = null;
let modules = null;

async function loadModules() {
  if (modules) return modules;
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")
  ]);
  modules = { ...appModule, ...authModule, ...firestoreModule };
  return modules;
}

function userDoc(uid) {
  return modules.doc(db, "users", uid, ...APP_PATH);
}

async function pushState(nextState) {
  if (!currentUser) return;
  clearTimeout(remoteTimer);
  remoteTimer = setTimeout(async () => {
    try {
      await modules.setDoc(userDoc(currentUser.uid), { state: nextState, updatedAt: modules.serverTimestamp() });
      window.dispatchEvent(new CustomEvent("poskatsu-sync", { detail: { status: "synced" } }));
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent("poskatsu-sync", { detail: { status: "error", error } }));
    }
  }, 600);
}

async function mergeRemote(user, hasLocalState) {
  const reference = userDoc(user.uid);
  const snapshot = await modules.getDoc(reference);
  const local = store.export();
  if (!snapshot.exists()) {
    await modules.setDoc(reference, { state: local, updatedAt: modules.serverTimestamp() });
    return;
  }
  const remote = snapshot.data().state;
  if (remote && (!hasLocalState || String(remote.updatedAt || "") > String(local.updatedAt || ""))) store.replace(remote, { remote: true });
  else await modules.setDoc(reference, { state: local, updatedAt: modules.serverTimestamp() });
}

function watchRemote(user) {
  if (remoteUnsubscribe) remoteUnsubscribe();
  remoteUnsubscribe = modules.onSnapshot(userDoc(user.uid), (snapshot) => {
    if (!snapshot.exists() || snapshot.metadata.hasPendingWrites || currentUser?.uid !== user.uid) return;
    const remote = snapshot.data().state;
    if (remote && String(remote.updatedAt || "") > String(store.export().updatedAt || "")) store.replace(remote, { remote: true });
  }, (error) => {
    console.error(error);
    window.dispatchEvent(new CustomEvent("poskatsu-sync", { detail: { status: "error", error } }));
  });
}

export const firebaseAdapter = {
  configured: firebaseConfigured,
  user: () => currentUser,
  async init() {
    if (!firebaseConfigured()) return { configured: false };
    const sdk = await loadModules();
    const app = sdk.initializeApp(FIREBASE_CONFIG);
    auth = sdk.getAuth(app);
    db = sdk.initializeFirestore(app, { localCache: sdk.persistentLocalCache({ tabManager: sdk.persistentMultipleTabManager() }) });
    store.setRemoteSave(pushState);
    sdk.onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        const hasLocalState = store.setScope(`user_${user.uid}`);
        await mergeRemote(user, hasLocalState);
        watchRemote(user);
      } else {
        if (remoteUnsubscribe) remoteUnsubscribe();
        remoteUnsubscribe = null;
        store.setScope("anonymous");
      }
      window.dispatchEvent(new CustomEvent("poskatsu-auth", { detail: { user } }));
    });
    return { configured: true };
  },
  async signIn() {
    if (!firebaseConfigured()) throw new Error("Firebaseが未設定です。");
    const sdk = await loadModules();
    return sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
  },
  async signOut() { if (auth) await modules.signOut(auth); },
  async deleteAccount() {
    if (!currentUser) { store.clear(); return; }
    const user = currentUser;
    clearTimeout(remoteTimer);
    remoteTimer = null;
    if (remoteUnsubscribe) remoteUnsubscribe();
    remoteUnsubscribe = null;
    await modules.deleteDoc(userDoc(user.uid));
    store.clear();
    await modules.terminate(db);
    try {
      await modules.clearIndexedDbPersistence(db);
    } catch (error) {
      throw new Error("ローカルキャッシュを削除できませんでした。他のポス活ログのタブを閉じ、ページを再読み込みしてからもう一度お試しください。", { cause: error });
    }
    await modules.deleteUser(user);
    currentUser = null;
    db = null;
    return { reload: true };
  }
};
