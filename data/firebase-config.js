// Firebaseコンソールで取得した値を入力してください。
// 手順: docs/FIREBASE_SETUP.md
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC745bHcsVmW6uCnbfXf5lXDWY2ijRtzeU",
  authDomain: "postinglog-54124.firebaseapp.com",
  projectId: "postinglog-54124",
  appId: "1:925278228089:web:f96126c9bfd4686e938ea8"
};

export const firebaseConfigured = () => Object.values(FIREBASE_CONFIG).every(Boolean);
