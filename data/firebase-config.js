// Firebaseコンソールで取得した値を入力してください。
// 手順: docs/FIREBASE_SETUP.md
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};

export const firebaseConfigured = () => Object.values(FIREBASE_CONFIG).every(Boolean);
