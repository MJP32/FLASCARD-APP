// Debug the current card that's failing
window.debugCurrentCard = function() {
  console.log('🔍 DEBUGGING CURRENT CARD');
  console.log('========================');
  
  const { getAuth } = require('firebase/auth');
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  console.log('Current user:', currentUser?.uid);
  
  const currentCard = window.flashcardHook?.getCurrentCard?.();
  if (currentCard) {
    console.log('Current card:');
    console.log('  - ID:', currentCard.id);
    console.log('  - userId:', currentCard.userId);
    console.log('  - Question:', currentCard.question?.substring(0, 50));
    console.log('  - Match:', currentCard.userId === currentUser?.uid);
  }
  
  // Try direct update test
  console.log('\nTesting direct update...');
  if (currentCard && window.flashcardHook?.updateFlashcard) {
    window.flashcardHook.updateFlashcard(currentCard.id, {
      testDirectUpdate: Date.now()
    }).then(() => {
      console.log('✅ Direct update worked!');
    }).catch(error => {
      console.log('❌ Direct update failed:', error.message);
    });
  }
};

window.debugCurrentCard();