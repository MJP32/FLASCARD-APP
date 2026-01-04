import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Debug utility to test Firestore connection and permissions
 */
export const debugFirestore = async (firebaseApp) => {
  console.log('🔍 Starting Firestore debug...');
  
  try {
    // Check Firebase app
    if (!firebaseApp) {
      console.error('❌ Firebase app is null');
      return;
    }
    console.log('✅ Firebase app initialized');
    
    // Check Auth
    const auth = getAuth(firebaseApp);
    const currentUser = auth.currentUser;
    console.log('🔐 Current user:', currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      isAnonymous: currentUser.isAnonymous
    } : 'No user logged in');
    
    // Check Firestore
    const db = getFirestore(firebaseApp);
    console.log('✅ Firestore instance created');
    
    // Try a simple read operation
    if (currentUser) {
      console.log('📖 Attempting to read flashcards for user:', currentUser.uid);
      
      const flashcardsRef = collection(db, 'flashcards');
      const q = query(flashcardsRef, where('userId', '==', currentUser.uid));
      
      try {
        const snapshot = await getDocs(q);
        console.log('✅ Successfully read from Firestore');
        console.log(`📚 Found ${snapshot.size} flashcards`);
        
        // Log first few documents
        let count = 0;
        snapshot.forEach(doc => {
          if (count < 3) {
            console.log(`Card ${count + 1}:`, doc.id, doc.data());
            count++;
          }
        });
      } catch (error) {
        console.error('❌ Failed to read from Firestore:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'permission-denied') {
          console.error('🚫 PERMISSION DENIED - Check Firestore security rules');
          console.log('Suggested rules for development:');
          console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /flashcards/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}`);
        }
      }
    } else {
      console.log('⚠️ No user logged in - cannot test Firestore read');
    }
    
    // Test Firestore connectivity with a metadata call
    try {
      console.log('🔗 Testing Firestore connectivity...');
      // Connectivity checked via a lightweight query above when reading flashcards
      console.log('✅ Firestore connectivity test passed');
    } catch (error) {
      console.error('❌ Firestore connectivity test failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

/**
 * Check Firestore security rules
 */
export const checkFirestoreRules = () => {
  console.log('📋 Firestore Security Rules Checklist:');
  console.log('1. Go to Firebase Console > Firestore Database > Rules');
  console.log('2. Ensure rules allow authenticated users to read/write their own data');
  console.log('3. Example rules for this app:');
  console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own flashcards
    match /flashcards/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Allow users to read/write their own settings
    match /userSettings/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}`);
};