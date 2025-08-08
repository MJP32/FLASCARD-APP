// Debug script for Firestore permissions
// Run this in browser console to diagnose the issue

console.log('🔍 FIRESTORE PERMISSIONS DEBUG');
console.log('===============================');

// 1. Check Firebase Auth
import { getAuth } from 'firebase/auth';
const auth = getAuth();
const user = auth.currentUser;

console.log('👤 Authentication:');
console.log('  - Current user:', user);
console.log('  - User ID:', user?.uid);
console.log('  - Is anonymous:', user?.isAnonymous);
console.log('  - Email:', user?.email);

// 2. Test Firestore connection
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
const db = getFirestore();

console.log('\n🔥 Firestore connection:');
console.log('  - Database instance:', db);

// 3. Test reading a document first
async function testRead() {
  try {
    const flashcards = window.flashcardHook?.flashcards || [];
    if (flashcards.length === 0) {
      console.log('❌ No flashcards available to test');
      return null;
    }
    
    const testCard = flashcards[0];
    console.log('\n📖 Testing READ operation:');
    console.log('  - Test card ID:', testCard.id);
    console.log('  - Test card userId:', testCard.userId);
    
    const docRef = doc(db, 'flashcards', testCard.id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('✅ READ successful');
      console.log('  - Document data:', docSnap.data());
      return { docRef, data: docSnap.data() };
    } else {
      console.log('❌ Document does not exist');
      return null;
    }
  } catch (error) {
    console.log('❌ READ failed:', error.message);
    console.log('  - Error code:', error.code);
    return null;
  }
}

// 4. Test writing to the same document
async function testWrite(docRef) {
  try {
    console.log('\n✏️ Testing WRITE operation:');
    console.log('  - Attempting to update document...');
    
    await updateDoc(docRef, {
      testField: 'test-value-' + Date.now(),
      lastModified: new Date()
    });
    
    console.log('✅ WRITE successful');
    return true;
  } catch (error) {
    console.log('❌ WRITE failed:', error.message);
    console.log('  - Error code:', error.code);
    console.log('  - Full error:', error);
    return false;
  }
}

// 5. Run the tests
async function runDiagnostics() {
  if (!user) {
    console.log('❌ No authenticated user found');
    return;
  }
  
  const readResult = await testRead();
  if (readResult) {
    await testWrite(readResult.docRef);
  }
  
  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  console.log('1. Check Firebase Console → Firestore → Rules');
  console.log('2. Verify rules were published (not just saved)');
  console.log('3. Try refreshing the browser to clear auth cache');
  console.log('4. Check browser network tab for 403 errors');
}

// Export to window for easy access
window.debugFirestorePermissions = runDiagnostics;

console.log('\n▶️ Run window.debugFirestorePermissions() to start diagnostics');