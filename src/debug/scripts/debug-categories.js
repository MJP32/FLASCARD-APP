// Debug script to analyze category generation issues
// Run this in the browser console or add to the app temporarily

window.debugCategories = function() {
  console.log('🔍 CATEGORY DEBUG ANALYSIS');
  console.log('='.repeat(50));
  
  // Get flashcards from the app state
  const flashcards = window.flashcards || [];
  console.log(`📊 Total flashcards: ${flashcards.length}`);
  
  if (flashcards.length === 0) {
    console.log('❌ No flashcards found. Make sure the app is loaded.');
    return;
  }
  
  // 1. Analyze all categories in flashcards
  console.log('\n1️⃣ ALL CATEGORIES ANALYSIS:');
  const allCategoriesRaw = flashcards.map(card => ({
    category: card.category,
    question: card.question?.substring(0, 50) + '...',
    active: card.active,
    id: card.id
  }));
  
  console.log('Raw categories from all cards:');
  allCategoriesRaw.forEach((card, index) => {
    console.log(`  ${index + 1}. "${card.category}" (active: ${card.active}) - ${card.question}`);
  });
  
  // 2. Unique categories
  console.log('\n2️⃣ UNIQUE CATEGORIES:');
  const uniqueCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  console.log('Unique categories found:', uniqueCategories);
  
  // 3. AWS specific analysis
  console.log('\n3️⃣ AWS SPECIFIC ANALYSIS:');
  const awsCards = flashcards.filter(card => {
    const category = (card.category || '').toLowerCase();
    return category.includes('aws');
  });
  
  console.log(`AWS cards found: ${awsCards.length}`);
  awsCards.forEach((card, index) => {
    console.log(`  ${index + 1}. Category: "${card.category}" | Active: ${card.active} | Question: ${card.question?.substring(0, 50)}...`);
  });
  
  // 4. Active cards analysis
  console.log('\n4️⃣ ACTIVE CARDS ANALYSIS:');
  const activeCards = flashcards.filter(card => card.active !== false);
  const activeCategoriesUnique = [...new Set(activeCards.map(card => card.category || 'Uncategorized'))];
  console.log(`Active cards: ${activeCards.length}/${flashcards.length}`);
  console.log('Categories from active cards:', activeCategoriesUnique);
  
  // 5. Due cards analysis (if due filter is enabled)
  console.log('\n5️⃣ DUE CARDS ANALYSIS:');
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  const dueCards = flashcards.filter(card => {
    if (card.active === false) return false;
    let dueDate = card.dueDate || new Date(0);
    if (dueDate && typeof dueDate.toDate === 'function') {
      dueDate = dueDate.toDate();
    }
    return dueDate < endOfToday;
  });
  
  const dueCategoriesUnique = [...new Set(dueCards.map(card => card.category || 'Uncategorized'))];
  console.log(`Due cards: ${dueCards.length}/${flashcards.length}`);
  console.log('Categories from due cards:', dueCategoriesUnique);
  
  // 6. Category counts
  console.log('\n6️⃣ CATEGORY COUNTS:');
  const categoryCounts = {};
  const activeCategoryCounts = {};
  const dueCategoryCounts = {};
  
  flashcards.forEach(card => {
    const category = card.category || 'Uncategorized';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    
    if (card.active !== false) {
      activeCategoryCounts[category] = (activeCategoryCounts[category] || 0) + 1;
    }
    
    if (card.active !== false) {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate < endOfToday) {
        dueCategoryCounts[category] = (dueCategoryCounts[category] || 0) + 1;
      }
    }
  });
  
  console.log('All category counts:', categoryCounts);
  console.log('Active category counts:', activeCategoryCounts);
  console.log('Due category counts:', dueCategoryCounts);
  
  // 7. Check current app state
  console.log('\n7️⃣ CURRENT APP STATE:');
  console.log('showDueTodayOnly:', window.showDueTodayOnly);
  console.log('showStarredOnly:', window.showStarredOnly);
  console.log('selectedCategory:', window.selectedCategory);
  console.log('selectedSubCategory:', window.selectedSubCategory);
  
  // 8. Test category generation functions
  console.log('\n8️⃣ CATEGORY GENERATION TEST:');
  try {
    // Try to access the getCategories function if available
    if (window.getCategories) {
      const generatedCategories = window.getCategories();
      console.log('Generated categories from getCategories():', generatedCategories);
    } else {
      console.log('getCategories function not available in window');
    }
    
    if (window.categories) {
      console.log('Current categories from app state:', window.categories);
    } else {
      console.log('categories not available in window');
    }
  } catch (error) {
    console.log('Error testing category generation:', error);
  }
  
  // 9. Recommendations
  console.log('\n9️⃣ RECOMMENDATIONS:');
  
  if (awsCards.length === 0) {
    console.log('❌ No AWS cards found. Check if the card was saved correctly.');
  } else {
    const activeAWSCards = awsCards.filter(card => card.active !== false);
    if (activeAWSCards.length === 0) {
      console.log('⚠️ AWS cards found but all are inactive. Activate them in Manage Cards.');
    } else {
      const dueAWSCards = activeAWSCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate < endOfToday;
      });
      
      if (dueAWSCards.length === 0 && window.showDueTodayOnly) {
        console.log('⚠️ AWS cards are active but not due today. Turn off "Due Today" filter to see them.');
      } else {
        console.log('✅ AWS cards should be visible. Check category generation logic.');
      }
    }
  }
  
  console.log('\n🔍 Debug complete. Check the analysis above for issues.');
  
  return {
    totalCards: flashcards.length,
    uniqueCategories,
    awsCards,
    activeCategoriesUnique,
    dueCategoriesUnique,
    categoryCounts,
    activeCategoryCounts,
    dueCategoryCounts
  };
};

// Auto-run if flashcards are available
if (typeof window !== 'undefined' && window.flashcards) {
  console.log('🚀 Auto-running category debug...');
  window.debugCategories();
} else {
  console.log('📝 Debug script loaded. Run window.debugCategories() when app is ready.');
}
