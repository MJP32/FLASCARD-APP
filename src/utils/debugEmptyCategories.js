export const debugEmptyCategories = (flashcards, showDueTodayOnly, showStarredOnly, displayCategories, initialCategoryStats, categoryCompletedCounts) => {
  console.log('=== EMPTY CATEGORIES DEBUG ===');
  console.log('Current filters:', { showDueTodayOnly, showStarredOnly });
  console.log('Total flashcards:', flashcards.length);
  console.log('Display categories:', displayCategories);
  
  const emptyCategories = [];
  const nonEmptyCategories = [];
  
  displayCategories.forEach(category => {
    console.log(`\n📁 Checking category: "${category}"`);
    
    // Get all cards in this category
    let categoryCards = flashcards.filter(card => {
      if (card.active === false) return false;
      return (card.category || 'Uncategorized') === category;
    });
    
    console.log(`  Total active cards in category: ${categoryCards.length}`);
    
    // Calculate the actual count that would be displayed
    let actualCardsInCategory = 0;
    let calculationMethod = '';
    
    if (showDueTodayOnly && showStarredOnly) {
      // Both filters on - real-time counting
      calculationMethod = 'Real-time (starred + due)';
      categoryCards = categoryCards.filter(card => card.starred === true);
      console.log(`  After starred filter: ${categoryCards.length}`);
      
      const now = new Date();
      const dueCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate <= now;
      });
      
      actualCardsInCategory = dueCards.length;
      console.log(`  After due date filter: ${actualCardsInCategory}`);
      
    } else if (showDueTodayOnly) {
      // Only due filter - stable counting
      calculationMethod = 'Stable counting (due only)';
      const initialStats = initialCategoryStats[category] || { total: 0, due: 0 };
      const completedCount = categoryCompletedCounts[category] || 0;
      actualCardsInCategory = Math.max(0, initialStats.due - completedCount);
      
      console.log(`  Initial due cards: ${initialStats.due}`);
      console.log(`  Completed count: ${completedCount}`);
      console.log(`  Calculated remaining: ${actualCardsInCategory}`);
      
      // Let's also check the real count for comparison
      const now = new Date();
      const realDueCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate <= now;
      });
      console.log(`  Real-time due cards (for comparison): ${realDueCards.length}`);
      
    } else {
      // All cards mode
      calculationMethod = 'Real-time (all cards)';
      if (showStarredOnly) {
        categoryCards = categoryCards.filter(card => card.starred === true);
        console.log(`  After starred filter: ${categoryCards.length}`);
      }
      actualCardsInCategory = categoryCards.length;
    }
    
    console.log(`  Final count (${calculationMethod}): ${actualCardsInCategory}`);
    
    if (actualCardsInCategory === 0) {
      console.log(`  ❌ EMPTY CATEGORY DETECTED`);
      emptyCategories.push({
        category,
        calculationMethod,
        initialStats: initialCategoryStats[category],
        completedCount: categoryCompletedCounts[category]
      });
    } else {
      console.log(`  ✅ Category has ${actualCardsInCategory} cards`);
      nonEmptyCategories.push({
        category,
        count: actualCardsInCategory,
        calculationMethod
      });
    }
  });
  
  console.log('\n📊 SUMMARY:');
  console.log(`Non-empty categories: ${nonEmptyCategories.length}`);
  console.log(`Empty categories: ${emptyCategories.length}`);
  
  if (emptyCategories.length > 0) {
    console.log('\n❌ EMPTY CATEGORIES (should not be showing):');
    emptyCategories.forEach(({ category, calculationMethod, initialStats, completedCount }) => {
      console.log(`  - "${category}" (${calculationMethod})`);
      if (initialStats) {
        console.log(`    Initial stats: ${JSON.stringify(initialStats)}`);
        console.log(`    Completed: ${completedCount || 0}`);
      }
    });
    
    console.log('\n🔧 POSSIBLE CAUSES:');
    console.log('1. Stable counting out of sync - completed more cards than initially due');
    console.log('2. Cards became inactive after initial stats were recorded');
    console.log('3. Due dates were changed after initial stats were recorded');
    console.log('4. localStorage data got corrupted');
    
    console.log('\n💡 SOLUTIONS:');
    console.log('1. Clear localStorage and refresh to reset counts');
    console.log('2. Switch to "All Cards" mode and back to refresh stats');
    console.log('3. Check if filteredDisplayCategories logic needs adjustment');
  } else {
    console.log('✅ No empty categories detected - all showing categories have cards');
  }
  
  console.log('\n=== END EMPTY CATEGORIES DEBUG ===');
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.debugEmptyCategories = debugEmptyCategories;
}