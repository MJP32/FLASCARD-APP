import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyC3R7pV3mXqg2-kY9xvH126BoF5KQDQDls",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "flashcard-app-3f2a3.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "flashcard-app-3f2a3",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "flashcard-app-3f2a3.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "399745541062",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:399745541062:web:958a2cfbd7c6c9c78988c7",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-6LJ19R2ZTZ"
};

// Initialize Firebase services
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Initialize Analytics only in production
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, auth, db, analytics };