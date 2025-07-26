/**
 * Debug utility to analyze category/subcategory counting inconsistencies
 */

/**
 * Analyze category and subcategory counting
 * @param {Array} flashcards - All flashcards
 * @param {string} userId - Current user ID
 * @param {Object} categoryStats - Current category stats from getCategoryStats
 * @param {Object} subCategoryStats - Current subcategory stats from getSubCategoryStats
 * @param {string} selectedCategory - Currently selected category
 * @returns {Object} Debug analysis
 */
export const analyzeCounting = (flashcards, userId, categoryStats, subCategoryStats, selectedCategory) => {
  console.log('🔍 COUNTING-DEBUG: Starting analysis...');
  
  // Get localStorage data
  const storedInitialCategoryStats = localStorage.getItem(`flashcard_initial_category_stats_${userId}`);
  const storedCategoryCompleted = localStorage.getItem(`flashcard_category_completed_${userId}`);
  const storedInitialSubCategoryStats = localStorage.getItem(`flashcard_initial_subcategory_stats_${userId}`);
  const storedSubCategoryCompleted = localStorage.getItem(`flashcard_subcategory_completed_${userId}`);
  
  const initialCategoryStats = storedInitialCategoryStats ? JSON.parse(storedInitialCategoryStats) : {};
  const categoryCompletedCounts = storedCategoryCompleted ? JSON.parse(storedCategoryCompleted) : {};
  const initialSubCategoryStats = storedInitialSubCategoryStats ? JSON.parse(storedInitialSubCategoryStats) : {};
  const subCategoryCompletedCounts = storedSubCategoryCompleted ? JSON.parse(storedSubCategoryCompleted) : {};
  
  console.log('🔍 COUNTING-DEBUG: localStorage data:', {
    initialCategoryStats,
    categoryCompletedCounts,
    initialSubCategoryStats,
    subCategoryCompletedCounts
  });
  
  // Calculate real-time counts from flashcards
  const realTimeStats = {
    categories: {},
    subcategories: {}
  };
  
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  flashcards.forEach(card => {
    if (card.active === false) return;
    
    const category = card.category || 'Uncategorized';
    const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
    const subCategoryKey = `${category}::${subCategory}`;
    
    // Count category stats
    if (!realTimeStats.categories[category]) {
      realTimeStats.categories[category] = { total: 0, due: 0 };
    }
    realTimeStats.categories[category].total++;
    
    const dueDate = card.dueDate || new Date(0);
    const dueDateObj = dueDate instanceof Date ? dueDate : dueDate.toDate();
    if (dueDateObj < endOfToday) {
      realTimeStats.categories[category].due++;
    }
    
    // Count subcategory stats
    if (!realTimeStats.subcategories[subCategoryKey]) {
      realTimeStats.subcategories[subCategoryKey] = { 
        total: 0, 
        due: 0, 
        category, 
        subCategory 
      };
    }
    realTimeStats.subcategories[subCategoryKey].total++;
    if (dueDateObj < endOfToday) {
      realTimeStats.subcategories[subCategoryKey].due++;
    }
  });
  
  console.log('🔍 COUNTING-DEBUG: Real-time stats:', realTimeStats);
  
  // Compare different counting methods for the specified category
  const analysis = {
    selectedCategory,
    categoryComparison: {},
    subcategoryComparison: {},
    discrepancies: []
  };
  
  // Analyze category counting
  const categoryRealTime = realTimeStats.categories[selectedCategory] || { total: 0, due: 0 };
  const categoryFromHook = categoryStats[selectedCategory] || { total: 0, due: 0 };
  const categoryInitial = initialCategoryStats[selectedCategory] || { total: 0, due: 0 };
  const categoryCompleted = categoryCompletedCounts[selectedCategory] || 0;
  const categoryStableCount = Math.max(0, categoryInitial.due - categoryCompleted);
  
  analysis.categoryComparison = {
    realTimeDue: categoryRealTime.due,
    realTimeTotal: categoryRealTime.total,
    hookDue: categoryFromHook.due,
    hookTotal: categoryFromHook.total,
    initialDue: categoryInitial.due,
    completed: categoryCompleted,
    stableCount: categoryStableCount
  };
  
  // Analyze subcategory counting for the selected category
  const subcategoriesInCategory = Object.keys(realTimeStats.subcategories)
    .filter(key => key.startsWith(`${selectedCategory}::`));
  
  let subcategorySum = {
    realTimeDue: 0,
    realTimeTotal: 0,
    hookDue: 0,
    hookTotal: 0,
    stableCount: 0
  };
  
  subcategoriesInCategory.forEach(key => {
    const subCategory = key.split('::')[1];
    const realTimeData = realTimeStats.subcategories[key];
    const hookData = subCategoryStats[subCategory] || { total: 0, due: 0 };
    const initialData = initialSubCategoryStats[key] || { total: 0, due: 0 };
    const completed = subCategoryCompletedCounts[key] || 0;
    const stableCount = Math.max(0, initialData.due - completed);
    
    analysis.subcategoryComparison[subCategory] = {
      realTimeDue: realTimeData.due,
      realTimeTotal: realTimeData.total,
      hookDue: hookData.due,
      hookTotal: hookData.total,
      initialDue: initialData.due,
      completed,
      stableCount
    };
    
    subcategorySum.realTimeDue += realTimeData.due;
    subcategorySum.realTimeTotal += realTimeData.total;
    subcategorySum.hookDue += hookData.due;
    subcategorySum.hookTotal += hookData.total;
    subcategorySum.stableCount += stableCount;
  });
  
  analysis.subcategorySum = subcategorySum;
  
  // Identify discrepancies
  if (analysis.categoryComparison.realTimeDue !== subcategorySum.realTimeDue) {
    analysis.discrepancies.push({
      type: 'realTime',
      category: analysis.categoryComparison.realTimeDue,
      subcategorySum: subcategorySum.realTimeDue,
      difference: analysis.categoryComparison.realTimeDue - subcategorySum.realTimeDue
    });
  }
  
  if (analysis.categoryComparison.hookDue !== subcategorySum.hookDue) {
    analysis.discrepancies.push({
      type: 'hook',
      category: analysis.categoryComparison.hookDue,
      subcategorySum: subcategorySum.hookDue,
      difference: analysis.categoryComparison.hookDue - subcategorySum.hookDue
    });
  }
  
  if (analysis.categoryComparison.stableCount !== subcategorySum.stableCount) {
    analysis.discrepancies.push({
      type: 'stable',
      category: analysis.categoryComparison.stableCount,
      subcategorySum: subcategorySum.stableCount,
      difference: analysis.categoryComparison.stableCount - subcategorySum.stableCount
    });
  }
  
  console.log('🔍 COUNTING-DEBUG: Analysis results:', analysis);
  
  // Log summary for easy debugging
  console.log('📊 COUNTING-SUMMARY for', selectedCategory + ':');
  console.log(`📊 Category count: ${analysis.categoryComparison.stableCount} (stable), ${analysis.categoryComparison.realTimeDue} (real-time)`);
  console.log(`📊 Subcategory sum: ${analysis.subcategorySum.stableCount} (stable), ${analysis.subcategorySum.realTimeDue} (real-time)`);
  
  if (analysis.discrepancies.length > 0) {
    console.log('⚠️  DISCREPANCIES FOUND:');
    analysis.discrepancies.forEach(disc => {
      console.log(`⚠️  ${disc.type}: Category=${disc.category}, SubcategorySum=${disc.subcategorySum}, Difference=${disc.difference}`);
    });
  } else {
    console.log('✅ No discrepancies found - counts are consistent!');
  }
  
  return analysis;
};

/**
 * Fix counting inconsistencies by recalculating from scratch
 * @param {Array} flashcards - All flashcards
 * @param {string} userId - Current user ID
 */
export const fixCountingInconsistencies = (flashcards, userId) => {
  console.log('🔧 COUNTING-FIX: Starting fix...');
  
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  const newCategoryStats = {};
  const newSubCategoryStats = {};
  
  flashcards.forEach(card => {
    if (card.active === false) return;
    
    const category = card.category || 'Uncategorized';
    const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
    const subCategoryKey = `${category}::${subCategory}`;
    
    // Update category stats
    if (!newCategoryStats[category]) {
      newCategoryStats[category] = { total: 0, due: 0 };
    }
    newCategoryStats[category].total++;
    
    const dueDate = card.dueDate || new Date(0);
    const dueDateObj = dueDate instanceof Date ? dueDate : dueDate.toDate();
    if (dueDateObj < endOfToday) {
      newCategoryStats[category].due++;
    }
    
    // Update subcategory stats
    if (!newSubCategoryStats[subCategoryKey]) {
      newSubCategoryStats[subCategoryKey] = { total: 0, due: 0, category, subCategory };
    }
    newSubCategoryStats[subCategoryKey].total++;
    if (dueDateObj < endOfToday) {
      newSubCategoryStats[subCategoryKey].due++;
    }
  });
  
  // Save the corrected stats
  localStorage.setItem(`flashcard_initial_category_stats_${userId}`, JSON.stringify(newCategoryStats));
  localStorage.setItem(`flashcard_initial_subcategory_stats_${userId}`, JSON.stringify(newSubCategoryStats));
  
  // Reset completion counts to ensure consistency
  localStorage.setItem(`flashcard_category_completed_${userId}`, JSON.stringify({}));
  localStorage.setItem(`flashcard_subcategory_completed_${userId}`, JSON.stringify({}));
  
  console.log('🔧 COUNTING-FIX: Fixed stats saved:', {
    newCategoryStats,
    newSubCategoryStats
  });
  
  return { newCategoryStats, newSubCategoryStats };
};

/**
 * Reset localStorage data to force fresh calculations
 * @param {string} userId - Current user ID
 */
export const resetCountingData = (userId) => {
  console.log('🔄 COUNTING-RESET: Clearing localStorage counting data...');
  
  const keysToRemove = [
    `flashcard_due_date_${userId}`,
    `flashcard_initial_due_${userId}`,
    `flashcard_completed_today_${userId}`,
    `flashcard_initial_category_stats_${userId}`,
    `flashcard_category_completed_${userId}`,
    `flashcard_initial_subcategory_stats_${userId}`,
    `flashcard_subcategory_completed_${userId}`
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️  Removed: ${key}`);
  });
  
  console.log('🔄 COUNTING-RESET: Data cleared. Please refresh the page to recalculate.');
};

/**
 * Add debug functions to window for console access
 */
export const addDebugCountingToWindow = (flashcards, userId, categoryStats, subCategoryStats, selectedCategory) => {
  window.debugCounting = {
    analyze: () => analyzeCounting(flashcards, userId, categoryStats, subCategoryStats, selectedCategory),
    fix: () => fixCountingInconsistencies(flashcards, userId),
    reset: () => resetCountingData(userId),
    logLocalStorage: () => {
      console.log('🔍 LOCALSTORAGE DEBUG:');
      console.log('Initial category stats:', localStorage.getItem(`flashcard_initial_category_stats_${userId}`));
      console.log('Category completed:', localStorage.getItem(`flashcard_category_completed_${userId}`));
      console.log('Initial subcategory stats:', localStorage.getItem(`flashcard_initial_subcategory_stats_${userId}`));
      console.log('Subcategory completed:', localStorage.getItem(`flashcard_subcategory_completed_${userId}`));
    }
  };
  
  console.log('🔧 Debug counting functions added to window.debugCounting');
  console.log('Available commands:');
  console.log('- window.debugCounting.analyze() - Analyze counting discrepancies');
  console.log('- window.debugCounting.fix() - Fix counting inconsistencies');
  console.log('- window.debugCounting.reset() - Reset localStorage and force recalculation');
  console.log('- window.debugCounting.logLocalStorage() - Log localStorage data');
};