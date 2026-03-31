// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCv5Ks-POtiBxtvmYdHUxXj5_DeGvPM0JA",
  authDomain: "silverback-sentry-c6727.firebaseapp.com",
  projectId: "silverback-sentry-c6727",
  storageBucket: "silverback-sentry-c6727.firebasestorage.app",
  messagingSenderId: "454155459151",
  appId: "1:454155459151:web:616bc52feafb6d595c683a",
  measurementId: "G-WMHJFJWTPZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;