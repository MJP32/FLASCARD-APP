/**
 * Debug utility to compare the three different counting methods in the flashcard app
 * Run this in browser console to analyze counting discrepancies
 */

function debugCountingComparison() {
  console.log('🔍 COUNTING COMPARISON DEBUG');
  console.log('============================');
  
  // Get data from React component state (assuming it's accessible in console)
  const flashcards = window.React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current?.memoizedState?.flashcards || [];
  
  if (flashcards.length === 0) {
    console.log('❌ No flashcards found. Make sure to run this from the app page.');
    return;
  }
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  // Method 1: Real-time due today calculation (like getCardsDueToday)
  const realTimeDueToday = flashcards.filter(card => {
    if (card.active === false) return false;
    let dueDate = card.dueDate || new Date(0);
    if (dueDate && typeof dueDate.toDate === 'function') {
      dueDate = dueDate.toDate();
    }
    return dueDate >= startOfToday && dueDate < endOfToday;
  });
  
  // Method 2: Real-time category stats calculation (like getCategoryStats)
  const categoryStats = {};
  flashcards.forEach(card => {
    if (card.active === false) return;
    const category = card.category || 'Uncategorized';
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, due: 0 };
    }
    categoryStats[category].total++;
    
    let dueDate = card.dueDate || new Date(0);
    if (dueDate && typeof dueDate.toDate === 'function') {
      dueDate = dueDate.toDate();
    }
    if (dueDate < endOfToday) {
      categoryStats[category].due++;
    }
  });
  
  // Method 3: Get localStorage-based counts (stable counting)
  const userId = localStorage.getItem('flashcard_user_id') || 'anonymous';
  const initialDueCardsCount = parseInt(localStorage.getItem(`flashcard_initial_due_${userId}`) || '0');
  const cardsCompletedToday = parseInt(localStorage.getItem(`flashcard_completed_today_${userId}`) || '0');
  const initialCategoryStats = JSON.parse(localStorage.getItem(`flashcard_initial_category_stats_${userId}`) || '{}');
  const categoryCompletedCounts = JSON.parse(localStorage.getItem(`flashcard_category_completed_${userId}`) || '{}');
  
  console.log('📊 COUNTING RESULTS:');
  console.log('===================');
  console.log('1. Real-time due today count:', realTimeDueToday.length);
  console.log('2. localStorage initial due count:', initialDueCardsCount);
  console.log('3. Cards completed today:', cardsCompletedToday);
  console.log('4. Remaining (initial - completed):', initialDueCardsCount - cardsCompletedToday);
  
  console.log('\\n🏷️ CATEGORY COMPARISON:');
  console.log('=======================');
  Object.keys(categoryStats).forEach(category => {
    const realTime = categoryStats[category];
    const initial = initialCategoryStats[category] || { total: 0, due: 0 };
    const completed = categoryCompletedCounts[category] || 0;
    const stable = Math.max(0, initial.due - completed);
    
    console.log(`${category}:`);
    console.log(`  Real-time due: ${realTime.due}`);
    console.log(`  Stable count: ${stable} (${initial.due} initial - ${completed} completed)`);
    console.log(`  Difference: ${realTime.due - stable}`);
  });
  
  console.log('\\n⚠️ DISCREPANCIES:');
  console.log('==================');
  
  const discrepancies = [];
  
  if (realTimeDueToday.length !== (initialDueCardsCount - cardsCompletedToday)) {
    discrepancies.push({
      type: 'Daily Progress vs Real-time',
      expected: initialDueCardsCount - cardsCompletedToday,
      actual: realTimeDueToday.length,
      difference: realTimeDueToday.length - (initialDueCardsCount - cardsCompletedToday)
    });
  }
  
  // Sum up all category due counts
  const totalCategoryDue = Object.values(categoryStats).reduce((sum, cat) => sum + cat.due, 0);
  if (totalCategoryDue !== realTimeDueToday.length) {
    discrepancies.push({
      type: 'Category Stats vs Real-time',
      expected: realTimeDueToday.length,
      actual: totalCategoryDue,
      difference: totalCategoryDue - realTimeDueToday.length
    });
  }
  
  if (discrepancies.length === 0) {
    console.log('✅ No discrepancies found - all counts are consistent!');
  } else {
    discrepancies.forEach(disc => {
      console.log(`❌ ${disc.type}: Expected ${disc.expected}, Got ${disc.actual}, Difference: ${disc.difference}`);
    });
  }
  
  console.log('\\n🔧 TO FIX:');
  console.log('==========');
  console.log('- Use consistent counting method across all UI elements');
  console.log('- Either use real-time calculation everywhere, or stable localStorage-based counting');
  console.log('- Consider updating initialDueCardsCount when cards are completed to maintain consistency');
  
  return {
    realTimeDueToday: realTimeDueToday.length,
    initialDueCardsCount,
    cardsCompletedToday,
    categoryStats,
    discrepancies
  };
}

// Add to window for console access
window.debugCountingComparison = debugCountingComparison;

console.log('🔧 Debug function added to window.debugCountingComparison()');
console.log('Run window.debugCountingComparison() to analyze counting discrepancies');