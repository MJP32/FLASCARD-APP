// Add this to your browser console to debug the exact update that's failing

window.debugCardUpdate = async function() {
  console.log('🔍 DEBUGGING CARD UPDATE');
  console.log('========================');
  
  // Get current card and user info
  const currentCard = window.flashcardHook?.getCurrentCard?.();
  const user = window.firebase?.auth?.currentUser;
  
  console.log('📋 Current card:', currentCard?.id);
  console.log('👤 Current user:', user?.uid);
  console.log('🔑 User authenticated:', !!user);
  
  if (!currentCard) {
    console.log('❌ No current card to test');
    return;
  }
  
  if (!user) {
    console.log('❌ No authenticated user');
    return;
  }
  
  // Try the same update that's failing
  try {
    console.log('🔄 Attempting card update...');
    
    const testUpdateData = {
      testField: 'debug-test-' + Date.now(),
      lastModified: new Date()
    };
    
    // Use the same updateFlashcard function that's failing
    const updateFunction = window.flashcardHook?.updateFlashcard;
    if (typeof updateFunction === 'function') {
      await updateFunction(currentCard.id, testUpdateData);
      console.log('✅ Update successful!');
    } else {
      console.log('❌ updateFlashcard function not available');
    }
    
  } catch (error) {
    console.log('❌ Update failed:', error.message);
    console.log('📊 Error details:');
    console.log('  - Error code:', error.code);
    console.log('  - Error type:', typeof error);
    console.log('  - Full error:', error);
    
    // Check specific error types
    if (error.code === 'permission-denied') {
      console.log('🚨 PERMISSION DENIED - Security rules issue');
      console.log('💡 Suggestions:');
      console.log('  1. Check Firestore rules in Firebase Console');
      console.log('  2. Ensure rules were PUBLISHED (not just saved)');
      console.log('  3. Check if user has proper authentication');
    } else if (error.code === 'not-found') {
      console.log('🚨 DOCUMENT NOT FOUND');
      console.log('💡 Card ID might be invalid:', currentCard.id);
    } else if (error.code === 'unauthenticated') {
      console.log('🚨 UNAUTHENTICATED');
      console.log('💡 User session might be expired');
    }
  }
};

console.log('🔧 Debug function loaded. Run window.debugCardUpdate() to test card update.');