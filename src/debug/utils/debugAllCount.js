export const debugAllCount = (flashcards, showDueTodayOnly, showStarredOnly, selectedCategory, displayCategories, initialCategoryStats, categoryCompletedCounts) => {
  console.log('=== ALL CATEGORY COUNT DEBUG ===');
  console.log('Current filters:', { showDueTodayOnly, showStarredOnly, selectedCategory });
  
  // Method 1: Direct count of all filtered flashcards
  let directCount = flashcards.filter(card => {
    // Apply base filters
    if (card.active === false) return false;
    
    // Apply starred filter if enabled
    if (showStarredOnly && card.starred !== true) return false;
    
    // Apply due date filter if enabled
    if (showDueTodayOnly) {
      const now = new Date();
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate > now) return false;
    }
    
    return true;
  }).length;
  
  console.log('📊 Method 1 - Direct count of all filtered cards:', directCount);
  
  // Method 2: Sum of individual category counts (how "All" is actually calculated)
  let sumOfCategories = 0;
  
  displayCategories.forEach(category => {
    let categoryCards = flashcards.filter(card => {
      if (card.active === false) return false;
      return (card.category || 'Uncategorized') === category;
    });
    
    let categoryCount = 0;
    
    if (showDueTodayOnly) {
      if (showStarredOnly) {
        // Real-time counting for starred + due
        categoryCards = categoryCards.filter(card => card.starred === true);
        const now = new Date();
        categoryCards = categoryCards.filter(card => {
          let dueDate = card.dueDate || new Date(0);
          if (dueDate && typeof dueDate.toDate === 'function') {
            dueDate = dueDate.toDate();
          }
          return dueDate <= now;
        });
        categoryCount = categoryCards.length;
      } else {
        // Stable counting approach
        const initialStats = initialCategoryStats[category] || { total: 0, due: 0 };
        const completedCount = categoryCompletedCounts[category] || 0;
        categoryCount = Math.max(0, initialStats.due - completedCount);
      }
    } else {
      // All cards mode
      if (showStarredOnly) {
        categoryCards = categoryCards.filter(card => card.starred === true);
      }
      categoryCount = categoryCards.length;
    }
    
    console.log(`  - ${category}: ${categoryCount} cards`);
    sumOfCategories += categoryCount;
  });
  
  console.log('📊 Method 2 - Sum of individual categories:', sumOfCategories);
  
  // Method 3: Check what the app's actual "All" calculation returns
  const allCountCalculation = (() => {
    if (showDueTodayOnly) {
      let totalAcrossCategories = 0;
      
      displayCategories.forEach(category => {
        if (showStarredOnly) {
          // Same logic as the app uses
          let categoryCards = flashcards.filter(card => {
            if (card.active === false) return false;
            if (card.starred !== true) return false;
            return (card.category || 'Uncategorized') === category;
          });
          
          const now = new Date();
          categoryCards = categoryCards.filter(card => {
            let dueDate = card.dueDate || new Date(0);
            if (dueDate && typeof dueDate.toDate === 'function') {
              dueDate = dueDate.toDate();
            }
            return dueDate <= now;
          });
          
          totalAcrossCategories += categoryCards.length;
        } else {
          const initialStats = initialCategoryStats[category] || { total: 0, due: 0 };
          const completedCount = categoryCompletedCounts[category] || 0;
          const adjustedDueCount = Math.max(0, initialStats.due - completedCount);
          totalAcrossCategories += adjustedDueCount;
        }
      });
      
      return totalAcrossCategories;
    } else {
      let totalAcrossCategories = 0;
      
      displayCategories.forEach(category => {
        let categoryCards = flashcards.filter(card => {
          if (card.active === false) return false;
          return (card.category || 'Uncategorized') === category;
        });
        
        if (showStarredOnly) {
          categoryCards = categoryCards.filter(card => card.starred === true);
        }
        totalAcrossCategories += categoryCards.length;
      });
      
      return totalAcrossCategories;
    }
  })();
  
  console.log('📊 Method 3 - App\'s actual "All" calculation:', allCountCalculation);
  
  // Analysis
  console.log('\n🔍 Analysis:');
  if (directCount === sumOfCategories && sumOfCategories === allCountCalculation) {
    console.log('✅ All three methods match - counts are consistent');
  } else {
    console.log('❌ Count mismatch detected:');
    console.log(`   Direct count: ${directCount}`);
    console.log(`   Sum of categories: ${sumOfCategories}`);
    console.log(`   App calculation: ${allCountCalculation}`);
    
    if (directCount !== sumOfCategories) {
      console.log('   🔥 Issue: Direct count vs sum of categories mismatch');
      console.log('   This suggests category filtering logic differs from direct filtering');
    }
    
    if (sumOfCategories !== allCountCalculation) {
      console.log('   🔥 Issue: Sum of categories vs app calculation mismatch');
      console.log('   This suggests the app\'s "All" count logic has a bug');
    }
  }
  
  // Additional debugging info
  console.log('\n📋 Debug Info:');
  console.log('Display categories:', displayCategories);
  console.log('Initial category stats:', initialCategoryStats);
  console.log('Category completed counts:', categoryCompletedCounts);
  console.log('Total flashcards in database:', flashcards.length);
  console.log('Active flashcards:', flashcards.filter(card => card.active !== false).length);
  
  if (showStarredOnly) {
    console.log('Starred flashcards:', flashcards.filter(card => card.starred === true).length);
  }
  
  if (showDueTodayOnly) {
    const now = new Date();
    const dueCards = flashcards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    }).length;
    console.log('Due flashcards:', dueCards);
  }
  
  console.log('\n=== END ALL COUNT DEBUG ===');
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.debugAllCount = debugAllCount;
}