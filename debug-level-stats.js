#!/usr/bin/env node

/**
 * Debug script to test level statistics filtering
 * Tests if getLevelStats properly applies category and subcategory filters
 */

// Mock flashcard data for testing
const mockFlashcards = [
  // AWS category cards
  { id: '1', category: 'AWS', sub_category: 'EC2', level: 'easy', active: true },
  { id: '2', category: 'AWS', sub_category: 'EC2', level: 'good', active: true },
  { id: '3', category: 'AWS', sub_category: 'S3', level: 'hard', active: true },
  { id: '4', category: 'AWS', sub_category: 'S3', level: 'easy', active: true },
  { id: '5', category: 'AWS', sub_category: 'Lambda', level: 'new', active: true },
  
  // Java category cards  
  { id: '6', category: 'Java', sub_category: 'Collections', level: 'good', active: true },
  { id: '7', category: 'Java', sub_category: 'Collections', level: 'hard', active: true },
  { id: '8', category: 'Java', sub_category: 'Streams', level: 'easy', active: true },
  { id: '9', category: 'Java', sub_category: 'Concurrency', level: 'again', active: true },
  
  // Uncategorized cards
  { id: '10', category: null, sub_category: null, level: 'new', active: true },
  { id: '11', category: '', sub_category: '', level: 'good', active: true },
  
  // Inactive cards (should be filtered out)
  { id: '12', category: 'AWS', sub_category: 'RDS', level: 'easy', active: false },
  { id: '13', category: 'Java', sub_category: 'OOP', level: 'hard', active: false },
];

// Mock inferLevelFromFSRS function
function inferLevelFromFSRS(card) {
  return card.level || 'new';
}

// Simulate the getLevelStats function logic
function testGetLevelStats(flashcards, selectedCategory = 'All', selectedSubCategory = 'All') {
  let filteredCards = flashcards;
  
  console.log(`\n=== Testing getLevelStats ===`);
  console.log(`Selected Category: "${selectedCategory}"`);
  console.log(`Selected SubCategory: "${selectedSubCategory}"`);
  console.log(`Total flashcards: ${flashcards.length}`);
  
  // 1. Filter out inactive cards
  filteredCards = filteredCards.filter(card => card.active !== false);
  console.log(`After active filter: ${filteredCards.length} cards`);
  
  // 2. Filter by category
  if (selectedCategory !== 'All') {
    const beforeCategoryFilter = filteredCards.length;
    
    // Show categories before filtering
    const categoriesBefore = [...new Set(filteredCards.map(c => c.category || 'Uncategorized'))];
    console.log(`Categories before filter: [${categoriesBefore.join(', ')}]`);
    
    filteredCards = filteredCards.filter(card => {
      const cardCategory = card.category && card.category.trim() ? card.category : 'Uncategorized';
      return cardCategory === selectedCategory;
    });
    
    console.log(`After category filter ("${selectedCategory}"): ${beforeCategoryFilter} → ${filteredCards.length} cards`);
    
    // Verify filter worked correctly
    const categoriesAfter = [...new Set(filteredCards.map(c => c.category || 'Uncategorized'))];
    console.log(`Categories after filter: [${categoriesAfter.join(', ')}]`);
    
    if (filteredCards.length > 0 && (categoriesAfter.length !== 1 || categoriesAfter[0] !== selectedCategory)) {
      console.error(`❌ CATEGORY FILTER ERROR! Expected: "${selectedCategory}", Got: [${categoriesAfter.join(', ')}]`);
      return null;
    }
  }
  
  // 3. Filter by sub-category
  if (selectedSubCategory !== 'All') {
    const beforeSubCategoryFilter = filteredCards.length;
    
    // Show subcategories before filtering
    const subCategoriesBefore = [...new Set(filteredCards.map(c => c.sub_category || 'Uncategorized'))];
    console.log(`SubCategories before filter: [${subCategoriesBefore.join(', ')}]`);
    
    filteredCards = filteredCards.filter(card => {
      const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      return cardSubCategory === selectedSubCategory;
    });
    
    console.log(`After subcategory filter ("${selectedSubCategory}"): ${beforeSubCategoryFilter} → ${filteredCards.length} cards`);
    
    // Verify filter worked correctly
    const subCategoriesAfter = [...new Set(filteredCards.map(c => c.sub_category || 'Uncategorized'))];
    console.log(`SubCategories after filter: [${subCategoriesAfter.join(', ')}]`);
    
    if (filteredCards.length > 0 && (subCategoriesAfter.length !== 1 || subCategoriesAfter[0] !== selectedSubCategory)) {
      console.error(`❌ SUBCATEGORY FILTER ERROR! Expected: "${selectedSubCategory}", Got: [${subCategoriesAfter.join(', ')}]`);
      return null;
    }
  }
  
  // Calculate level counts
  const levelCounts = {};
  
  filteredCards.forEach(card => {
    const level = card.level || inferLevelFromFSRS(card);
    if (level && level.trim() !== '') {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }
  });
  
  // Show final results
  const totalCount = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);
  console.log(`Final level counts:`, levelCounts);
  console.log(`Total cards in levels: ${totalCount}`);
  console.log(`Filtered cards length: ${filteredCards.length}`);
  
  if (totalCount !== filteredCards.length) {
    console.error(`❌ COUNT MISMATCH! Level counts total (${totalCount}) ≠ filtered cards (${filteredCards.length})`);
  } else {
    console.log(`✅ Level counts verified correctly`);
  }
  
  return levelCounts;
}

// Helper function to show expected vs actual category totals
function verifyCategoryTotals(flashcards) {
  console.log(`\n=== Category Analysis ===`);
  
  const activeCards = flashcards.filter(card => card.active !== false);
  const categoryTotals = {};
  
  activeCards.forEach(card => {
    const category = card.category && card.category.trim() ? card.category : 'Uncategorized';
    categoryTotals[category] = (categoryTotals[category] || 0) + 1;
  });
  
  console.log(`Category totals (active cards only):`, categoryTotals);
  
  return categoryTotals;
}

// Run tests
console.log('🔍 Level Statistics Filtering Test');
console.log('=====================================');

// Show mock data structure
console.log('\n=== Mock Data Structure ===');
console.log(`Total cards: ${mockFlashcards.length}`);
console.log(`Active cards: ${mockFlashcards.filter(c => c.active !== false).length}`);
console.log(`Inactive cards: ${mockFlashcards.filter(c => c.active === false).length}`);

// Show category breakdown
const categoryTotals = verifyCategoryTotals(mockFlashcards);

// Test scenarios
console.log('\n🧪 Test Scenario 1: All categories');
const allCategoriesStats = testGetLevelStats(mockFlashcards, 'All', 'All');

console.log('\n🧪 Test Scenario 2: AWS category only');
const awsStats = testGetLevelStats(mockFlashcards, 'AWS', 'All');
const expectedAWSTotal = categoryTotals['AWS'] || 0;
const actualAWSTotal = Object.values(awsStats || {}).reduce((sum, count) => sum + count, 0);
console.log(`Expected AWS total: ${expectedAWSTotal}, Actual: ${actualAWSTotal}`);
if (actualAWSTotal !== expectedAWSTotal) {
  console.error(`❌ AWS CATEGORY TEST FAILED! Expected ${expectedAWSTotal}, got ${actualAWSTotal}`);
} else {
  console.log(`✅ AWS category test PASSED`);
}

console.log('\n🧪 Test Scenario 3: Java category only');
const javaStats = testGetLevelStats(mockFlashcards, 'Java', 'All');
const expectedJavaTotal = categoryTotals['Java'] || 0;
const actualJavaTotal = Object.values(javaStats || {}).reduce((sum, count) => sum + count, 0);
console.log(`Expected Java total: ${expectedJavaTotal}, Actual: ${actualJavaTotal}`);
if (actualJavaTotal !== expectedJavaTotal) {
  console.error(`❌ JAVA CATEGORY TEST FAILED! Expected ${expectedJavaTotal}, got ${actualJavaTotal}`);
} else {
  console.log(`✅ Java category test PASSED`);
}

console.log('\n🧪 Test Scenario 4: AWS + EC2 subcategory');
const awsEC2Stats = testGetLevelStats(mockFlashcards, 'AWS', 'EC2');
const expectedEC2Cards = mockFlashcards.filter(c => 
  c.active !== false && 
  c.category === 'AWS' && 
  c.sub_category === 'EC2'
).length;
const actualEC2Total = Object.values(awsEC2Stats || {}).reduce((sum, count) => sum + count, 0);
console.log(`Expected AWS+EC2 total: ${expectedEC2Cards}, Actual: ${actualEC2Total}`);
if (actualEC2Total !== expectedEC2Cards) {
  console.error(`❌ AWS+EC2 SUBCATEGORY TEST FAILED! Expected ${expectedEC2Cards}, got ${actualEC2Total}`);
} else {
  console.log(`✅ AWS+EC2 subcategory test PASSED`);
}

console.log('\n🧪 Test Scenario 5: Uncategorized cards');
const uncategorizedStats = testGetLevelStats(mockFlashcards, 'Uncategorized', 'All');
const expectedUncategorizedTotal = categoryTotals['Uncategorized'] || 0;
const actualUncategorizedTotal = Object.values(uncategorizedStats || {}).reduce((sum, count) => sum + count, 0);
console.log(`Expected Uncategorized total: ${expectedUncategorizedTotal}, Actual: ${actualUncategorizedTotal}`);
if (actualUncategorizedTotal !== expectedUncategorizedTotal) {
  console.error(`❌ UNCATEGORIZED TEST FAILED! Expected ${expectedUncategorizedTotal}, got ${actualUncategorizedTotal}`);
} else {
  console.log(`✅ Uncategorized test PASSED`);
}

console.log('\n=== Test Summary ===');
console.log('If all tests show ✅ PASSED, then getLevelStats filtering logic is working correctly.');
console.log('If any tests show ❌ FAILED, then there is a bug in the filtering logic.');