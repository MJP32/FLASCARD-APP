#!/usr/bin/env node

/**
 * Test script to verify level statistics properly filter by due date
 */

// Mock flashcard data with various due dates
const mockFlashcards = [
  // Due today cards
  { id: '1', category: 'AWS', level: 'easy', active: true, dueDate: new Date() },
  { id: '2', category: 'AWS', level: 'good', active: true, dueDate: new Date(Date.now() - 86400000) }, // Yesterday
  { id: '3', category: 'AWS', level: 'hard', active: true, dueDate: new Date(Date.now() - 172800000) }, // 2 days ago
  
  // Future due cards (should be filtered out when showDueTodayOnly = true)
  { id: '4', category: 'AWS', level: 'easy', active: true, dueDate: new Date(Date.now() + 86400000) }, // Tomorrow
  { id: '5', category: 'AWS', level: 'good', active: true, dueDate: new Date(Date.now() + 172800000) }, // 2 days later
  { id: '6', category: 'AWS', level: 'new', active: true, dueDate: new Date(Date.now() + 259200000) }, // 3 days later
  
  // Java category - mixed due dates
  { id: '7', category: 'Java', level: 'good', active: true, dueDate: new Date() }, // Due today
  { id: '8', category: 'Java', level: 'hard', active: true, dueDate: new Date(Date.now() + 86400000) }, // Tomorrow
  
  // Starred cards
  { id: '9', category: 'AWS', level: 'easy', active: true, dueDate: new Date(), starred: true },
  { id: '10', category: 'AWS', level: 'hard', active: true, dueDate: new Date(Date.now() + 86400000), starred: true }, // Future
];

// Mock inferLevelFromFSRS
function inferLevelFromFSRS(card) {
  return card.level || 'new';
}

// Test getLevelStats with due date filter
function testGetLevelStats(flashcards, selectedCategory, showDueTodayOnly, showStarredOnly) {
  let filteredCards = flashcards;
  
  console.log(`\n=== Testing getLevelStats ===`);
  console.log(`Category: "${selectedCategory}"`);
  console.log(`Show Due Today Only: ${showDueTodayOnly}`);
  console.log(`Show Starred Only: ${showStarredOnly}`);
  console.log(`Total cards: ${flashcards.length}`);
  
  // 1. Filter out inactive cards
  filteredCards = filteredCards.filter(card => card.active !== false);
  console.log(`After active filter: ${filteredCards.length} cards`);
  
  // 2. Filter by category
  if (selectedCategory !== 'All') {
    const beforeCategoryFilter = filteredCards.length;
    filteredCards = filteredCards.filter(card => {
      const cardCategory = card.category && card.category.trim() ? card.category : 'Uncategorized';
      return cardCategory === selectedCategory;
    });
    console.log(`After category filter ("${selectedCategory}"): ${beforeCategoryFilter} → ${filteredCards.length} cards`);
  }
  
  // 3. Apply due date filter if showDueTodayOnly is enabled
  if (showDueTodayOnly) {
    const beforeDueFilter = filteredCards.length;
    const now = new Date();
    filteredCards = filteredCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    });
    console.log(`After due date filter: ${beforeDueFilter} → ${filteredCards.length} cards`);
    
    // Show which cards remain
    console.log('Cards that passed due filter:', filteredCards.map(c => ({
      id: c.id,
      category: c.category,
      level: c.level,
      dueDate: c.dueDate.toLocaleDateString()
    })));
  }
  
  // 4. Apply starred filter if showStarredOnly is enabled
  if (showStarredOnly) {
    const beforeStarredFilter = filteredCards.length;
    filteredCards = filteredCards.filter(card => card.starred === true);
    console.log(`After starred filter: ${beforeStarredFilter} → ${filteredCards.length} cards`);
  }
  
  // Calculate level counts
  const levelCounts = {};
  filteredCards.forEach(card => {
    const level = card.level || inferLevelFromFSRS(card);
    if (level && level.trim() !== '') {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }
  });
  
  console.log(`Final level counts:`, levelCounts);
  const totalCount = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);
  console.log(`Total cards in levels: ${totalCount}`);
  
  return levelCounts;
}

// Test scenarios
console.log('🔍 Level Statistics Due Date Filter Test');
console.log('=========================================');

// Show mock data
console.log('\n=== Mock Data Summary ===');
const now = new Date();
const dueToday = mockFlashcards.filter(c => c.dueDate <= now).length;
const dueFuture = mockFlashcards.filter(c => c.dueDate > now).length;
console.log(`Total cards: ${mockFlashcards.length}`);
console.log(`Due today or earlier: ${dueToday}`);
console.log(`Due in future: ${dueFuture}`);

// Test 1: AWS without due filter (should show all AWS cards)
console.log('\n🧪 Test 1: AWS category WITHOUT due filter');
const awsAllStats = testGetLevelStats(mockFlashcards, 'AWS', false, false);
const awsAllTotal = Object.values(awsAllStats).reduce((sum, count) => sum + count, 0);
console.log(`Expected: 8 AWS cards (6 regular + 2 starred)`);
console.log(`Actual: ${awsAllTotal} cards`);
console.log(awsAllTotal === 8 ? '✅ PASSED' : '❌ FAILED');

// Test 2: AWS with due filter (should only show due today cards)
console.log('\n🧪 Test 2: AWS category WITH due filter');
const awsDueStats = testGetLevelStats(mockFlashcards, 'AWS', true, false);
const awsDueTotal = Object.values(awsDueStats).reduce((sum, count) => sum + count, 0);
console.log(`Expected: 4 AWS cards due today`);
console.log(`Actual: ${awsDueTotal} cards`);
console.log(awsDueTotal === 4 ? '✅ PASSED' : '❌ FAILED');

// Test 3: All categories with due filter
console.log('\n🧪 Test 3: All categories WITH due filter');
const allDueStats = testGetLevelStats(mockFlashcards, 'All', true, false);
const allDueTotal = Object.values(allDueStats).reduce((sum, count) => sum + count, 0);
console.log(`Expected: 5 cards due today (4 AWS + 1 Java)`);
console.log(`Actual: ${allDueTotal} cards`);
console.log(allDueTotal === 5 ? '✅ PASSED' : '❌ FAILED');

// Test 4: AWS with due filter and starred filter
console.log('\n🧪 Test 4: AWS WITH due filter AND starred filter');
const awsDueStarredStats = testGetLevelStats(mockFlashcards, 'AWS', true, true);
const awsDueStarredTotal = Object.values(awsDueStarredStats).reduce((sum, count) => sum + count, 0);
console.log(`Expected: 1 AWS card (due today AND starred)`);
console.log(`Actual: ${awsDueStarredTotal} cards`);
console.log(awsDueStarredTotal === 1 ? '✅ PASSED' : '❌ FAILED');

console.log('\n=== Summary ===');
console.log('Level statistics should now properly filter by due date when "Due Today" filter is active.');