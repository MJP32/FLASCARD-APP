// Verification script to test the category fix

// Mock data based on the console output we saw
const mockFlashcards = [
  { id: '1', category: 'AWS', active: true, dueDate: new Date('2025-07-25') }, // AWS has 1 due card
  { id: '2', category: 'Java', active: true, dueDate: new Date('2025-07-25') },
  { id: '3', category: 'Amazon LP', active: true, dueDate: new Date('2025-07-25') },
  { id: '4', category: 'Spring Security', active: true, dueDate: new Date('2025-07-25') },
  { id: '5', category: 'Spring', active: true, dueDate: new Date('2025-07-25') },
  { id: '6', category: 'Architecture', active: true, dueDate: new Date('2025-07-25') },
  { id: '7', category: 'Java Framework', active: true, dueDate: new Date('2025-07-25') },
  { id: '8', category: 'Security', active: true, dueDate: new Date('2025-07-25') },
  { id: '9', category: 'API Development', active: true, dueDate: new Date('2025-07-25') },
  { id: '10', category: 'DevOps', active: true, dueDate: new Date('2025-07-25') }
];

// Simulate the FIXED getCategories function (returns categories with due cards)
function simulateGetCategories(flashcards, showDueTodayOnly) {
  let filteredCards = flashcards.filter(card => card.active !== false);
  
  if (showDueTodayOnly) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const categoriesWithDueCards = new Set();
    
    filteredCards.forEach(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      
      if (dueDate < endOfToday) {
        const category = card.category || 'Uncategorized';
        categoriesWithDueCards.add(category);
      }
    });
    
    return Array.from(categoriesWithDueCards);
  } else {
    return [...new Set(filteredCards.map(card => card.category || 'Uncategorized'))];
  }
}

// Simulate FIXED displayCategories logic (simplified)
function simulateDisplayCategories(categories, showDueTodayOnly, allCategories) {
  if (showDueTodayOnly) {
    return categories; // Use real-time categories from hook
  } else {
    return allCategories;
  }
}

// Simulate FIXED card counting logic (always real-time)
function simulateGetCardCountInCategory(category, flashcards, showDueTodayOnly, showStarredOnly) {
  // Always use real-time counting
  let categoryCards = flashcards.filter(card => {
    if (card.active === false) return false;
    return (card.category || 'Uncategorized') === category;
  });
  
  if (showDueTodayOnly && showStarredOnly) {
    categoryCards = categoryCards.filter(card => card.starred === true);
    
    const now = new Date();
    categoryCards = categoryCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    });
  } else if (showDueTodayOnly) {
    const now = new Date();
    categoryCards = categoryCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    });
  } else if (showStarredOnly) {
    categoryCards = categoryCards.filter(card => card.starred === true);
  }
  
  return categoryCards.length;
}

// Test the fix
function testFix() {
  console.log('🧪 TESTING CATEGORY FIX');
  console.log('========================');
  
  const flashcards = mockFlashcards;
  const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  const showDueTodayOnly = true;
  const showStarredOnly = false;
  
  console.log('📊 Test Data:');
  console.log(`Total cards: ${flashcards.length}`);
  console.log(`All categories: ${allCategories.join(', ')}`);
  console.log();
  
  console.log('🔍 FIXED Logic Test:');
  console.log('====================');
  
  const categories = simulateGetCategories(flashcards, showDueTodayOnly);
  console.log('1. Categories from getCategories():', categories);
  
  const displayCategories = simulateDisplayCategories(categories, showDueTodayOnly, allCategories);
  console.log('2. DisplayCategories:', displayCategories);
  
  const filteredDisplayCategories = displayCategories.filter(category => {
    const cardCount = simulateGetCardCountInCategory(category, flashcards, showDueTodayOnly, showStarredOnly);
    return cardCount > 0;
  });
  
  console.log('3. FilteredDisplayCategories:', filteredDisplayCategories);
  console.log();
  
  console.log('✅ VERIFICATION:');
  console.log('================');
  
  const awsInFiltered = filteredDisplayCategories.includes('AWS');
  const awsCardCount = simulateGetCardCountInCategory('AWS', flashcards, showDueTodayOnly, showStarredOnly);
  
  console.log(`AWS in filtered categories: ${awsInFiltered ? '✅ YES' : '❌ NO'}`);
  console.log(`AWS card count: ${awsCardCount}`);
  
  if (awsInFiltered && awsCardCount > 0) {
    console.log('🎉 SUCCESS: AWS category now shows up correctly!');
  } else {
    console.log('❌ FAILED: AWS category still has issues');
  }
  
  console.log();
  console.log('📋 All Categories Status:');
  filteredDisplayCategories.forEach(cat => {
    const count = simulateGetCardCountInCategory(cat, flashcards, showDueTodayOnly, showStarredOnly);
    console.log(`  ✅ ${cat}: ${count} cards`);
  });
  
  // Check for missing categories
  const missingCategories = allCategories.filter(cat => !filteredDisplayCategories.includes(cat));
  if (missingCategories.length > 0) {
    console.log();
    console.log('⚠️  Categories not showing:');
    missingCategories.forEach(cat => {
      const count = simulateGetCardCountInCategory(cat, flashcards, showDueTodayOnly, showStarredOnly);
      console.log(`  ❌ ${cat}: ${count} cards`);
    });
  }
}

testFix();