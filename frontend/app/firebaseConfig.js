import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjTqLwzPaaw5T2ECrZnYzACxBDoDBZE1E",
  authDomain: "moodtogame-d835a.firebaseapp.com",
  projectId: "moodtogame-d835a",
  storageBucket: "moodtogame-d835a.appspot.com",
  messagingSenderId: "739118756815",
  appId: "1:739118756815:web:f21adb735d2c6a63ebd8ba",
  measurementId: "G-XN5M0ENQZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
