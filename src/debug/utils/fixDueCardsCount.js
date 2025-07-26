// Emergency fix to force real-time counting everywhere
export const fixDueCardsCount = () => {
  console.clear();
  console.log('🔧 FIXING DUE CARDS COUNT - FORCING REAL-TIME EVERYWHERE');
  
  // Override any stable counting with real-time
  const script = `
    // Find all elements that might show due card counts and update them
    const now = new Date();
    
    // Get actual due cards count
    let actualDueCount = 0;
    if (window.flashcards) {
      actualDueCount = window.flashcards.filter(card => {
        if (card.active === false) return false;
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate <= now;
      }).length;
    }
    
    console.log('✅ Actual due cards right now:', actualDueCount);
    
    // Try to find and update the "All" button
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
      if (button.textContent && button.textContent.includes('All (')) {
        const newText = 'All (' + actualDueCount + ')';
        console.log('🔄 Updating All button from:', button.textContent, 'to:', newText);
        button.textContent = newText;
      }
    });
    
    // Try to find Due Cards button
    allButtons.forEach(button => {
      if (button.textContent && button.textContent.includes('Due Cards (')) {
        const newText = 'Due Cards (' + actualDueCount + ')';
        console.log('🔄 Updating Due Cards button from:', button.textContent, 'to:', newText);
        button.textContent = newText;
      }
    });
    
    console.log('🎯 Fix applied! All counts should now show:', actualDueCount);
  `;
  
  // Execute the fix
  setTimeout(() => {
    eval(script);
  }, 100);
  
  return 'Fix applied - check the UI for updated counts';
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.fixDueCardsCount = fixDueCardsCount;
}