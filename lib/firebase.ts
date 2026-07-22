import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAiLFB0nHWIL0xulAvgM0G66_wV0zuNjPk",
  authDomain: "ostadi-72df9.firebaseapp.com",
  projectId: "ostadi-72df9",
  storageBucket: "ostadi-72df9.firebasestorage.app",
  messagingSenderId: "413785281009",
  appId: "1:413785281009:web:4fd5559b43e412595e3450",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
