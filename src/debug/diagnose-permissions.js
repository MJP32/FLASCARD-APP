/**
 * Debug script to diagnose Firestore permissions issues
 * Add this to your browser console to debug the permissions error
 */

window.diagnosePermissions = async function() {
  console.log('🔍 PERMISSIONS DIAGNOSIS');
  console.log('========================');
  
  // Check authentication status
  const user = window.firebaseAuth?.currentUser;
  console.log('👤 Authentication Status:');
  console.log('  - User logged in:', !!user);
  console.log('  - User ID:', user?.uid);
  console.log('  - User email:', user?.email);
  console.log('  - Is anonymous:', user?.isAnonymous);
  
  // Check current card
  const currentCard = window.flashcardHook?.getCurrentCard?.();
  console.log('\n📋 Current Card:');
  console.log('  - Card exists:', !!currentCard);
  console.log('  - Card ID:', currentCard?.id);
  console.log('  - Card userId field:', currentCard?.userId);
  console.log('  - userId matches auth:', currentCard?.userId === user?.uid);
  
  // Check a few more cards
  const flashcards = window.flashcardHook?.flashcards || [];
  console.log('\n📚 Sample Cards Analysis:');
  console.log('  - Total cards:', flashcards.length);
  
  if (flashcards.length > 0) {
    const sampleCards = flashcards.slice(0, 3);
    sampleCards.forEach((card, index) => {
      console.log(`  - Card ${index + 1}:`);
      console.log(`    ID: ${card.id}`);
      console.log(`    Has userId: ${!!card.userId}`);
      console.log(`    userId value: ${card.userId}`);
      console.log(`    Matches auth: ${card.userId === user?.uid}`);
    });
  }
  
  // Test a simple Firestore read operation
  console.log('\n🔥 Testing Firestore Access:');
  try {
    if (window.firebase?.firestore) {
      const db = window.firebase.firestore();
      const testQuery = db.collection('flashcards').where('userId', '==', user?.uid).limit(1);
      const snapshot = await testQuery.get();
      console.log('  - Read test: SUCCESS');
      console.log('  - Cards accessible:', snapshot.size);
    } else {
      console.log('  - Firestore not available in window object');
    }
  } catch (error) {
    console.log('  - Read test: FAILED');
    console.log('  - Error:', error.message);
    console.log('  - Error code:', error.code);
  }
  
  // Check if updateFlashcard function is available
  console.log('\n🛠️ Function Availability:');
  console.log('  - updateFlashcard available:', typeof window.flashcardHook?.updateFlashcard === 'function');
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (!user) {
    console.log('  ❌ User not authenticated - Please log in');
  } else if (!currentCard) {
    console.log('  ❌ No current card selected');
  } else if (!currentCard.userId) {
    console.log('  ❌ Current card missing userId field - This card may be corrupted');
  } else if (currentCard.userId !== user.uid) {
    console.log('  ❌ Card belongs to different user - Permission denied expected');
  } else {
    console.log('  ✅ Authentication and card ownership look correct');
    console.log('  💭 The issue might be with Firestore security rules or network connectivity');
  }
  
  console.log('\n🔧 TO FIX:');
  console.log('1. Ensure you are properly logged in');
  console.log('2. Check Firestore security rules in Firebase console');
  console.log('3. Verify network connectivity');
  console.log('4. Check browser console for more specific errors');
};

console.log('🔍 Permissions diagnostic tool loaded. Run window.diagnosePermissions() to debug.');