// Debug script to test sub-category filtering

// Mock flashcard data with categories and sub-categories
const mockFlashcards = [
  // Java category cards
  { id: '1', category: 'Java', sub_category: 'Collections', active: true, dueDate: new Date('2025-07-25') },
  { id: '2', category: 'Java', sub_category: 'Streams', active: true, dueDate: new Date('2025-07-25') },
  { id: '3', category: 'Java', sub_category: 'Collections', active: true, dueDate: new Date('2025-07-25') },
  { id: '4', category: 'Java', sub_category: 'Concurrency', active: true, dueDate: new Date('2025-07-25') },
  
  // AWS category cards
  { id: '5', category: 'AWS', sub_category: 'EC2', active: true, dueDate: new Date('2025-07-25') },
  { id: '6', category: 'AWS', sub_category: 'S3', active: true, dueDate: new Date('2025-07-25') },
  { id: '7', category: 'AWS', sub_category: 'Lambda', active: true, dueDate: new Date('2025-07-25') },
  
  // Spring category cards
  { id: '8', category: 'Spring', sub_category: 'Security', active: true, dueDate: new Date('2025-07-25') },
  { id: '9', category: 'Spring', sub_category: 'Boot', active: true, dueDate: new Date('2025-07-25') },
  
  // Cards with no sub-category
  { id: '10', category: 'Java', sub_category: '', active: true, dueDate: new Date('2025-07-25') },
  { id: '11', category: 'AWS', sub_category: null, active: true, dueDate: new Date('2025-07-25') }
];

// Simulate getSubCategories function
function simulateGetSubCategories(flashcards, selectedCategory, showDueTodayOnly) {
  let filteredCards = flashcards;
  
  // 1. Filter out inactive cards
  filteredCards = filteredCards.filter(card => card.active !== false);
  
  // 2. If a specific category is selected, only show sub-categories from that category
  if (selectedCategory !== 'All') {
    filteredCards = filteredCards.filter(card => card.category === selectedCategory);
  }
  
  // 3. If due today filter is enabled, only consider cards that are due
  if (showDueTodayOnly) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    filteredCards = filteredCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate < endOfToday;
    });
  }
  
  const subCategoriesSet = new Set();
  
  filteredCards.forEach(card => {
    const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
    subCategoriesSet.add(subCategory);
  });
  
  return [...subCategoriesSet].sort();
}

// Test different scenarios
function testSubCategoryFiltering() {
  console.log('🔍 SUB-CATEGORY FILTERING DEBUG');
  console.log('===============================');
  
  console.log('📊 Mock Data:');
  console.log(`Total cards: ${mockFlashcards.length}`);
  
  // Show cards by category
  const categoriesMap = {};
  mockFlashcards.forEach(card => {
    if (!categoriesMap[card.category]) {
      categoriesMap[card.category] = [];
    }
    categoriesMap[card.category].push(card);
  });
  
  Object.keys(categoriesMap).forEach(cat => {
    console.log(`\\n${cat} (${categoriesMap[cat].length} cards):`);
    categoriesMap[cat].forEach(card => {
      const subCat = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      console.log(`  - ${card.id}: ${subCat}`);
    });
  });
  
  console.log('\\n🧪 TESTING SUB-CATEGORY FILTERING:');
  console.log('===================================');
  
  // Test scenarios
  const testScenarios = [
    { selectedCategory: 'All', showDueTodayOnly: false, description: 'All categories, all cards' },
    { selectedCategory: 'Java', showDueTodayOnly: false, description: 'Java category, all cards' },
    { selectedCategory: 'AWS', showDueTodayOnly: false, description: 'AWS category, all cards' },
    { selectedCategory: 'Spring', showDueTodayOnly: false, description: 'Spring category, all cards' },
    { selectedCategory: 'Java', showDueTodayOnly: true, description: 'Java category, due today only' }
  ];
  
  testScenarios.forEach((scenario, i) => {
    console.log(`\\n${i + 1}. ${scenario.description}:`);
    console.log(`   selectedCategory: "${scenario.selectedCategory}"`);
    console.log(`   showDueTodayOnly: ${scenario.showDueTodayOnly}`);
    
    const subCategories = simulateGetSubCategories(
      mockFlashcards, 
      scenario.selectedCategory, 
      scenario.showDueTodayOnly
    );
    
    console.log(`   Result: [${subCategories.join(', ')}]`);
    console.log(`   Count: ${subCategories.length} sub-categories`);
    
    // Validate results
    if (scenario.selectedCategory === 'All') {
      // Should include sub-categories from all categories
      const expectedSubCats = ['Collections', 'Streams', 'Concurrency', 'EC2', 'S3', 'Lambda', 'Security', 'Boot', 'Uncategorized'];
      const hasAllExpected = expectedSubCats.every(subCat => subCategories.includes(subCat));
      console.log(`   ✅ Has all expected: ${hasAllExpected}`);
    } else {
      // Should only include sub-categories from selected category
      const cardsInCategory = mockFlashcards.filter(card => card.category === scenario.selectedCategory);
      const expectedSubCats = [...new Set(cardsInCategory.map(card => 
        card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized'
      ))].sort();
      
      const matches = JSON.stringify(subCategories) === JSON.stringify(expectedSubCats);
      console.log(`   Expected: [${expectedSubCats.join(', ')}]`);
      console.log(`   ${matches ? '✅' : '❌'} Matches expected: ${matches}`);
    }
  });
  
  console.log('\\n🚨 POTENTIAL ISSUES TO CHECK:');
  console.log('==============================');
  console.log('1. Is selectedCategory being updated correctly when category changes?');
  console.log('2. Are sub-categories re-rendering when selectedCategory changes?');
  console.log('3. Is there a React state synchronization delay?');
  console.log('4. Check browser console for any errors during category selection');
  console.log('5. Verify that getSubCategories is being called with correct selectedCategory');
}

testSubCategoryFiltering();