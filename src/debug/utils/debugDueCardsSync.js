export const debugDueCardsSync = (flashcards, showDueTodayOnly, filteredFlashcards, dailyProgress, filteredDisplayCategories) => {
  console.log('=== DUE CARDS SYNC DEBUG ===');
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
  
  console.log('📊 Reality Check:');
  console.log(`  Total flashcards: ${flashcards.length}`);
  console.log(`  Active flashcards: ${allActiveCards.length}`);
  console.log(`  Actually due right now: ${realDueCards.length}`);
  
  // Method 2: What filteredFlashcards shows (main display)
  console.log('\n📱 Main Display (filteredFlashcards):');
  console.log(`  Cards shown in main area: ${filteredFlashcards.length}`);
  console.log(`  Due cards mode: ${showDueTodayOnly ? 'ON' : 'OFF'}`);
  
  // Method 3: Daily Progress numbers
  if (dailyProgress) {
    console.log('\n📈 Daily Progress Widget:');
    console.log(`  Completed today: ${dailyProgress.completedToday || 0}`);
    console.log(`  Due today: ${dailyProgress.dueToday || 0}`);
    console.log(`  Total for today: ${dailyProgress.totalToday || 0}`);
    
    // Check if these match reality
    const progressTotal = (dailyProgress.completedToday || 0) + (dailyProgress.dueToday || 0);
    if (progressTotal !== dailyProgress.totalToday) {
      console.log('  ❌ Progress math error: completed + due ≠ total');
    }
  }
  
  // Method 4: Sum of all category counts
  console.log('\n📁 Category Counts:');
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
  
  console.log('  Categories with cards:', Object.keys(categoryBreakdown).length);
  console.log('  Sum of all categories:', categorySum);
  console.log('  Breakdown:', categoryBreakdown);
  
  // Method 5: Check localStorage stable counting
  console.log('\n💾 Stable Counting (localStorage):');
  const initialStats = JSON.parse(localStorage.getItem('flashcardInitialStats') || '{}');
  const completedCounts = JSON.parse(localStorage.getItem('flashcardCompletedCounts') || '{}');
  
  let stableSum = 0;
  Object.keys(initialStats).forEach(category => {
    const initial = initialStats[category]?.due || 0;
    const completed = completedCounts[category] || 0;
    const remaining = Math.max(0, initial - completed);
    stableSum += remaining;
    console.log(`  ${category}: ${initial} initial - ${completed} completed = ${remaining} remaining`);
  });
  console.log('  Total from stable counting:', stableSum);
  
  // Analysis
  console.log('\n🔍 Analysis:');
  console.log(`Reality (actual due cards): ${realDueCards.length}`);
  console.log(`Main display shows: ${filteredFlashcards.length}`);
  console.log(`Category sum: ${categorySum}`);
  console.log(`Stable counting sum: ${stableSum}`);
  
  if (dailyProgress) {
    console.log(`Daily progress due: ${dailyProgress.dueToday || 0}`);
  }
  
  // Identify mismatches
  const allNumbers = [
    realDueCards.length,
    filteredFlashcards.length,
    categorySum,
    stableSum,
    dailyProgress?.dueToday || -1
  ].filter(n => n >= 0);
  
  const uniqueNumbers = [...new Set(allNumbers)];
  if (uniqueNumbers.length > 1) {
    console.log('\n❌ MISMATCH DETECTED - Different components show different numbers!');
    console.log('Unique values:', uniqueNumbers);
    
    console.log('\n🔧 Possible causes:');
    console.log('1. Stable counting (localStorage) is out of sync with reality');
    console.log('2. Different components use different filtering logic');
    console.log('3. Completed counts exceed initial counts');
    console.log('4. Cards were deactivated after initial stats were recorded');
    
    console.log('\n💡 Solutions:');
    console.log('1. Clear localStorage to reset stable counting:');
    console.log('   localStorage.removeItem("flashcardInitialStats")');
    console.log('   localStorage.removeItem("flashcardCompletedCounts")');
    console.log('2. Refresh the page after clearing');
    console.log('3. Switch to "All Cards" mode and back to refresh stats');
  } else {
    console.log('\n✅ All numbers match - system is in sync');
  }
  
  console.log('\n=== END DUE CARDS SYNC DEBUG ===');
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.debugDueCardsSync = debugDueCardsSync;
}