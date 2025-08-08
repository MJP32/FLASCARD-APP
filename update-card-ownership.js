// Script to update all cards to current user's ID
window.updateCardOwnership = async function() {
  if (!confirm('This will update ALL cards to be owned by you. Continue?')) {
    return;
  }
  
  const userId = window.flashcardHook?.userId;
  if (!userId) {
    alert('No user ID found. Please log in first.');
    return;
  }
  
  const flashcards = window.flashcardHook?.flashcards || [];
  let updated = 0;
  let failed = 0;
  
  for (const card of flashcards) {
    if (card.userId !== userId) {
      try {
        await window.flashcardHook.updateFlashcard(card.id, { userId: userId });
        updated++;
      } catch (error) {
        failed++;
      }
    }
  }
  
  alert(`Update complete!\nUpdated: ${updated} cards\nFailed: ${failed} cards`);
};

// Don't run automatically - user must call window.updateCardOwnership()
console.log('To update all cards to your ownership, run: window.updateCardOwnership()');