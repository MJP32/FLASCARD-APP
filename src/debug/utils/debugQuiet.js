export const debugQuiet = (flashcards, showDueTodayOnly, filteredFlashcards, filteredDisplayCategories) => {
  // Clear console and stop logging temporarily
  console.clear();
  const originalConsoleLog = console.log;
  console.log = () => {}; // Disable console.log temporarily
  
  const now = new Date();
  
  // Method 1: Direct count of all due cards (reality check)
  const allActiveCards = flashcards.filter(card => card.active !== false);
  const realDueCards = allActiveCards.filter(card => {
    let dueDate = card.dueDate || new Date(0);
    if (dueDate && typeof dueDate.toDate === 'function') {
      dueDate = dueDate.toDate();
    }
    return dueDate <= now;
  });
  
  // Method 2: What filteredFlashcards shows (main display)
  const mainDisplayCount = filteredFlashcards.length;
  
  // Method 3: Sum of all category counts
  let categorySum = 0;
  const categoryBreakdown = {};
  
  filteredDisplayCategories.forEach(category => {
    const categoryCards = flashcards.filter(card => {
      if (card.active === false) return false;
      return (card.category || 'Uncategorized') === category;
    });
    
    let categoryDueCount = 0;
    if (showDueTodayOnly) {
      const dueCategoryCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate <= now;
      });
      categoryDueCount = dueCategoryCards.length;
    } else {
      categoryDueCount = categoryCards.length;
    }
    
    categoryBreakdown[category] = categoryDueCount;
    categorySum += categoryDueCount;
  });
  
  // Store results in window for easy access
  const results = {
    reality: realDueCards.length,
    mainDisplay: mainDisplayCount,
    categorySum: categorySum,
    categories: categoryBreakdown,
    totalCards: flashcards.length,
    activeCards: allActiveCards.length,
    dueCardsMode: showDueTodayOnly,
    mismatch: !(realDueCards.length === mainDisplayCount && mainDisplayCount === categorySum)
  };
  
  // Re-enable console.log
  console.log = originalConsoleLog;
  
  // Store in window for easy access
  window.debugResults = results;
  
  // Display clean summary
  console.log('=== DUE CARDS DEBUG SUMMARY ===');
  console.log(`Reality (actual due cards): ${results.reality}`);
  console.log(`Main display shows: ${results.mainDisplay}`);
  console.log(`Sum of categories: ${results.categorySum}`);
  console.log(`Due cards mode: ${results.dueCardsMode ? 'ON' : 'OFF'}`);
  
  if (results.mismatch) {
    console.log('❌ MISMATCH DETECTED!');
    console.log('Individual categories:', results.categories);
  } else {
    console.log('✅ All counts match');
  }
  
  console.log('\nTo see full details: window.debugResults');
  console.log('================================');
  
  return results;
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.debugQuiet = debugQuiet;
}