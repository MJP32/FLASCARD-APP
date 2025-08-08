// Check current authentication and card state
window.checkAuthState = function() {
  // Re-enable console temporarily
  if (window.enableDebugMode) {
    window.enableDebugMode();
  }
  
  console.log('=== AUTH & CARD STATE CHECK ===');
  
  // Check all possible auth sources
  console.log('1. Checking authentication sources:');
  console.log('   - window.flashcardHook?.userId:', window.flashcardHook?.userId);
  console.log('   - localStorage userId:', localStorage.getItem('userId'));
  
  // Check auth instance
  if (window.firebase?.auth?.currentUser) {
    const user = window.firebase.auth.currentUser;
    console.log('2. Firebase Auth User:');
    console.log('   - UID:', user.uid);
    console.log('   - Email:', user.email);
    console.log('   - Anonymous:', user.isAnonymous);
  } else {
    console.log('2. No Firebase auth instance found in window');
  }
  
  // Check current card
  const currentCard = window.flashcardHook?.getCurrentCard?.();
  if (currentCard) {
    console.log('3. Current Card:');
    console.log('   - ID:', currentCard.id);
    console.log('   - userId field:', currentCard.userId);
    console.log('   - Question:', currentCard.question?.substring(0, 50) + '...');
  } else {
    console.log('3. No current card');
  }
  
  // Check if we can see the auth in the app
  console.log('4. App State:');
  console.log('   - flashcardHook exists:', !!window.flashcardHook);
  console.log('   - updateFlashcard exists:', typeof window.flashcardHook?.updateFlashcard);
  
  // Try to find the actual error
  console.log('\n5. Checking Firestore connection...');
  
  // Return summary
  const userId = window.flashcardHook?.userId || localStorage.getItem('userId');
  const summary = `
SUMMARY:
- Logged in: ${!!userId}
- User ID: ${userId || 'None'}
- Current card: ${currentCard ? 'Yes' : 'No'}
- Card userId: ${currentCard?.userId || 'N/A'}
- Match: ${currentCard ? (currentCard.userId === userId) : 'N/A'}
  `;
  
  console.log(summary);
  alert(summary);
};

window.checkAuthState();