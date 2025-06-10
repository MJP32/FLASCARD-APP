import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
  authDomain: "flashcard-app-xxxxx.firebaseapp.com",
  projectId: "flashcard-app-xxxxx",
  storageBucket: "flashcard-app-xxxxx.appspot.com",
  messagingSenderId: "xxxxxxxxxxxx",
  appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxx"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };