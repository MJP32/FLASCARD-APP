// Comprehensive subcategory filtering diagnostic script

console.log('🔍 COMPREHENSIVE SUBCATEGORY FILTERING ANALYSIS');
console.log('==============================================');

// Mock flashcard data based on real app structure
const mockFlashcards = [
  // Amazon LP cards (should be 8 total based on console logs)
  { id: '1', category: 'Amazon LP', sub_category: 'Learn and Be Curious', active: true, dueDate: new Date('2025-07-25') },
  { id: '2', category: 'Amazon LP', sub_category: 'Insist on the Highest Standards', active: true, dueDate: new Date('2025-07-25') },
  { id: '3', category: 'Amazon LP', sub_category: 'Bias for Action', active: true, dueDate: new Date('2025-07-25') },
  { id: '4', category: 'Amazon LP', sub_category: 'Are Right A Lot', active: true, dueDate: new Date('2025-07-25') },
  { id: '5', category: 'Amazon LP', sub_category: 'Customer Obsession', active: true, dueDate: new Date('2025-07-25') },
  { id: '6', category: 'Amazon LP', sub_category: 'Think Big', active: true, dueDate: new Date('2025-07-25') },
  { id: '7', category: 'Amazon LP', sub_category: 'Dive Deep', active: true, dueDate: new Date('2025-07-25') },
  { id: '8', category: 'Amazon LP', sub_category: '', active: true, dueDate: new Date('2025-07-25') }, // Empty subcategory
  
  // Java cards (different subcategories)
  { id: '9', category: 'Java', sub_category: 'Collections', active: true, dueDate: new Date('2025-07-25') },
  { id: '10', category: 'Java', sub_category: 'Streams', active: true, dueDate: new Date('2025-07-25') },
  { id: '11', category: 'Java', sub_category: 'Concurrency', active: true, dueDate: new Date('2025-07-25') },
  { id: '12', category: 'Java', sub_category: null, active: true, dueDate: new Date('2025-07-25') }, // Null subcategory
  
  // Spring cards
  { id: '13', category: 'Spring', sub_category: 'Security', active: true, dueDate: new Date('2025-07-25') },
  { id: '14', category: 'Spring', sub_category: 'Boot', active: true, dueDate: new Date('2025-07-25') }
];

// Simulate the exact getSubCategories function from useFlashcards.js
function simulateGetSubCategories(flashcards, selectedCategory, showDueTodayOnly = true, showStarredOnly = false) {
  let filteredCards = flashcards;
  
  console.log(`\\n🔍 getSubCategories called with:`, {
    selectedCategory,
    showDueTodayOnly,
    totalFlashcards: flashcards.length
  });
  
  // 1. Filter out inactive cards
  filteredCards = filteredCards.filter(card => card.active !== false);
  console.log(`After active filter: ${filteredCards.length} cards`);
  
  // 2. If a specific category is selected, only show sub-categories from that category
  if (selectedCategory !== 'All') {
    const beforeCategoryFilter = filteredCards.length;
    filteredCards = filteredCards.filter(card => card.category === selectedCategory);
    console.log(`After category filter (${selectedCategory}): ${filteredCards.length} cards (was ${beforeCategoryFilter})`);
  }
  
  // 3. If due today filter is enabled, only consider cards that are due
  if (showDueTodayOnly) {
    const beforeDueFilter = filteredCards.length;
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    filteredCards = filteredCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate < endOfToday;
    });
    console.log(`After due date filter: ${filteredCards.length} cards (was ${beforeDueFilter})`);
  }
  
  const subCategoriesSet = new Set();
  const subCategoryStats = {};
  
  filteredCards.forEach(card => {
    const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
    subCategoriesSet.add(subCategory);
    subCategoryStats[subCategory] = (subCategoryStats[subCategory] || 0) + 1;
  });
  
  const subCategories = [...subCategoriesSet];
  
  console.log(`🔍 getSubCategories result:`, {
    subCategories,
    subCategoryStats,
    finalCardCount: filteredCards.length
  });
  
  return subCategories.sort((a, b) => {
    const countA = subCategoryStats[a] || 0;
    const countB = subCategoryStats[b] || 0;
    return countB - countA; // Sort descending (most to least)
  });
}

// Test different scenarios
function testSubcategoryFiltering() {
  console.log('\\n📊 TESTING SUBCATEGORY FILTERING SCENARIOS');
  console.log('===========================================');
  
  const scenarios = [
    { selectedCategory: 'All', description: 'All categories selected' },
    { selectedCategory: 'Amazon LP', description: 'Amazon LP selected' },
    { selectedCategory: 'Java', description: 'Java selected' },
    { selectedCategory: 'Spring', description: 'Spring selected' },
    { selectedCategory: 'NonExistent', description: 'Non-existent category selected' }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`\\n${index + 1}. ${scenario.description}:`);
    console.log(''.padEnd(50, '-'));
    
    const result = simulateGetSubCategories(mockFlashcards, scenario.selectedCategory);
    
    console.log(`✅ Result: ${result.length} subcategories found`);
    result.forEach((subCat, i) => {
      console.log(`   ${i + 1}. ${subCat}`);
    });
    
    // Validation
    if (scenario.selectedCategory === 'Amazon LP') {
      const expectedSubcats = ['Learn and Be Curious', 'Insist on the Highest Standards', 'Bias for Action', 'Are Right A Lot', 'Customer Obsession', 'Think Big', 'Dive Deep', 'Uncategorized'];
      const hasAllExpected = expectedSubcats.every(sub => result.includes(sub));
      console.log(`   Expected 8 subcategories, got ${result.length}: ${hasAllExpected ? '✅' : '❌'}`);
      
      if (!hasAllExpected) {
        const missing = expectedSubcats.filter(sub => !result.includes(sub));
        console.log(`   Missing: ${missing.join(', ')}`);
      }
    }
  });
}

// Simulate App.js subcategory button rendering
function simulateSubcategoryButtonRendering(flashcards, selectedCategory, subCategories, showDueTodayOnly = true, showStarredOnly = false) {
  console.log(`\\n🖥️  SIMULATING APP.JS SUBCATEGORY BUTTON RENDERING`);
  console.log(`Selected Category: ${selectedCategory}`);
  console.log(`Subcategories to render: ${subCategories.length}`);
  
  const buttonsToShow = [];
  
  subCategories.forEach(subCategory => {
    // Count actual cards in this subcategory from ALL flashcards (not filtered)
    // Apply the same base filters as the main filtering logic
    let subCategoryCards = flashcards.filter(card => {
      // Only count active cards
      if (card.active === false) return false;
      // Match the selected category (if not 'All')
      if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
      // Match the subcategory
      const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      return cardSubCategory === subCategory;
    });
    
    // If showing due cards only, filter by due date
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      subCategoryCards = subCategoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate < endOfToday;
      });
    }
    
    // If showing starred only, filter by starred
    if (showStarredOnly) {
      subCategoryCards = subCategoryCards.filter(card => card.starred === true);
    }
    
    const actualCardsInSubCategory = subCategoryCards.length;
    
    // Skip subcategories with no actual cards (this is the potential issue!)
    if (actualCardsInSubCategory === 0) {
      console.log(`   ❌ Skipping "${subCategory}" (0 cards)`);
      return;
    }
    
    console.log(`   ✅ Showing "${subCategory}" (${actualCardsInSubCategory} cards)`);
    buttonsToShow.push({
      name: subCategory,
      count: actualCardsInSubCategory
    });
  });
  
  console.log(`\\n📊 FINAL BUTTONS TO SHOW: ${buttonsToShow.length}`);
  buttonsToShow.forEach((btn, i) => {
    console.log(`   ${i + 1}. ${btn.name} (${btn.count})`);
  });
  
  return buttonsToShow;
}

// Main analysis function
function analyzeSubcategoryIssue() {
  console.log('\\n🚨 COMPREHENSIVE ISSUE ANALYSIS');
  console.log('================================');
  
  // Test the filtering logic
  testSubcategoryFiltering();
  
  // Test Amazon LP specifically
  console.log('\\n🎯 AMAZON LP SPECIFIC ANALYSIS');
  console.log('==============================');
  
  const amazonLPSubcategories = simulateGetSubCategories(mockFlashcards, 'Amazon LP');
  const amazonLPButtons = simulateSubcategoryButtonRendering(mockFlashcards, 'Amazon LP', amazonLPSubcategories);
  
  console.log('\\n📋 ANALYSIS SUMMARY:');
  console.log('====================');
  
  console.log(`1. getSubCategories returns: ${amazonLPSubcategories.length} subcategories`);
  console.log(`2. App.js would show: ${amazonLPButtons.length} buttons`);
  console.log(`3. Total cards in buttons: ${amazonLPButtons.reduce((sum, btn) => sum + btn.count, 0)}`);
  
  if (amazonLPSubcategories.length > amazonLPButtons.length) {
    console.log('\\n❌ PROBLEM IDENTIFIED:');
    console.log('Some subcategories returned by getSubCategories are being filtered out by App.js');
    console.log('This happens when the counting logic in App.js returns 0 cards for a subcategory');
    
    const filtered = amazonLPSubcategories.filter(sub => 
      !amazonLPButtons.some(btn => btn.name === sub)
    );
    console.log(`Filtered out subcategories: ${filtered.join(', ')}`);
  } else if (amazonLPSubcategories.length === amazonLPButtons.length) {
    console.log('\\n✅ NO ISSUE DETECTED:');
    console.log('All subcategories from getSubCategories are showing in the UI');
  }
  
  console.log('\\n🔧 POTENTIAL FIXES:');
  console.log('===================');
  console.log('1. Check if there\'s a mismatch between getSubCategories and App.js counting logic');
  console.log('2. Verify that empty sub_category cards are normalized to "Uncategorized" consistently');
  console.log('3. Ensure React state updates are synchronized properly');
  console.log('4. Check if there are timing issues with selectedCategory updates');
  
  return {
    subcategoriesFromHook: amazonLPSubcategories.length,
    buttonsShown: amazonLPButtons.length,
    totalCardsInButtons: amazonLPButtons.reduce((sum, btn) => sum + btn.count, 0),
    hasIssue: amazonLPSubcategories.length > amazonLPButtons.length
  };
}

// Run the analysis
analyzeSubcategoryIssue();