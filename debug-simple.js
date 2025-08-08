// Simple debug test using existing instances
window.debugSimple = function() {
  let results = [];
  
  try {
    // Check if user is logged in
    const userId = window.flashcardHook?.userId || 
                   window.firebase?.auth?.currentUser?.uid ||
                   localStorage.getItem('userId');
    
    if (!userId) {
      alert('❌ NO USER ID FOUND - Not logged in?');
      return;
    }
    
    results.push('User ID: ' + userId);
    
    // Check current card
    const currentCard = window.flashcardHook?.getCurrentCard?.();
    if (currentCard) {
      results.push('Card ID: ' + currentCard.id);
      results.push('Card userId: ' + currentCard.userId);
      results.push('Match: ' + (currentCard.userId === userId));
    } else {
      results.push('No current card');
    }
    
    // Check if updateFlashcard exists
    const hasUpdate = typeof window.flashcardHook?.updateFlashcard === 'function';
    results.push('UpdateFlashcard available: ' + hasUpdate);
    
    alert(results.join('\n'));
    
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

window.debugSimple();