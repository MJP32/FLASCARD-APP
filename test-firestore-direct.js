// Direct Firestore test - paste this into browser console
// This bypasses all the app logic and tests Firestore directly

window.testFirestoreDirect = async function() {
  console.log('🧪 DIRECT FIRESTORE TEST');
  console.log('=========================');
  
  try {
    // Import Firebase modules
    const { getFirestore, doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    
    // Get instances
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    console.log('🔧 Setup:');
    console.log('  - Firestore:', !!db);
    console.log('  - Auth:', !!auth);
    console.log('  - User:', !!user);
    console.log('  - User ID:', user?.uid);
    console.log('  - Is Anonymous:', user?.isAnonymous);
    
    if (!user) {
      console.log('❌ No authenticated user - cannot proceed');
      return;
    }
    
    // Get the current card
    const currentCard = window.flashcardHook?.getCurrentCard?.();
    if (!currentCard) {
      console.log('❌ No current card available');
      return;
    }
    
    console.log('📋 Testing with card:', currentCard.id);
    console.log('📋 Card userId:', currentCard.userId);
    
    // Test 1: Read the document
    console.log('\n📖 TEST 1: Reading document');
    const cardRef = doc(db, 'flashcards', currentCard.id);
    
    try {
      const docSnap = await getDoc(cardRef);
      if (docSnap.exists()) {
        console.log('✅ Read successful');
        console.log('📄 Document data:', {
          userId: docSnap.data().userId,
          question: docSnap.data().question?.substring(0, 30) + '...'
        });
      } else {
        console.log('❌ Document does not exist');
        return;
      }
    } catch (readError) {
      console.log('❌ Read failed:');
      console.log('  - Error:', readError.message);
      console.log('  - Code:', readError.code);
      console.log('  - Full error:', readError);
      return;
    }
    
    // Test 2: Update the document
    console.log('\n✏️ TEST 2: Updating document');
    try {
      await updateDoc(cardRef, {
        testField: 'direct-test-' + Date.now(),
        lastModified: serverTimestamp()
      });
      console.log('✅ Update successful!');
      console.log('🎉 Firestore permissions are working correctly!');
      console.log('💡 The issue might be in the app code, not Firestore rules');
      
    } catch (updateError) {
      console.log('❌ Update failed:');
      console.log('  - Error:', updateError.message);
      console.log('  - Code:', updateError.code);
      console.log('  - Full error:', updateError);
      
      if (updateError.code === 'permission-denied') {
        console.log('🚨 FIRESTORE SECURITY RULES ISSUE:');
        console.log('   The rules are still blocking this operation');
        console.log('   Double-check that you PUBLISHED (not just saved) the rules');
      } else if (updateError.code === 'unauthenticated') {
        console.log('🚨 AUTHENTICATION ISSUE:');
        console.log('   The user is not properly authenticated');
      }
    }
    
  } catch (importError) {
    console.log('❌ Failed to import Firebase:', importError);
  }
};

console.log('🧪 Direct Firestore test loaded. Run window.testFirestoreDirect() to test.');