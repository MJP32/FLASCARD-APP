const fs = require('fs');
const path = require('path');

// Read the actual flashcard data from the app
function getFlashcardDataFromApp() {
  try {
    // Try to find any exported flashcard data or sample data
    // (Optional) paths to inspect in local dev tree
    
    // Look for any sample data files
    const sampleDataPaths = [
      path.join(__dirname, 'src', 'data'),
      path.join(__dirname, 'src', 'input'),
      path.join(__dirname, 'public')
    ];
    
    console.log('🔍 Looking for flashcard data files...');
    
    for (const dir of sampleDataPaths) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        console.log(`📁 Found in ${dir}:`, files);
      }
    }
    
    // Create mock data based on the console output we saw
    return [
      { id: '1', category: 'AWS', active: true, dueDate: new Date('2025-07-20') }, // completed
      { id: '2', category: 'Java', active: true, dueDate: new Date('2025-07-25') },
      { id: '3', category: 'Java', active: true, dueDate: new Date('2025-07-26') },
      { id: '4', category: 'Amazon LP', active: true, dueDate: new Date('2025-07-25') },
      { id: '5', category: 'Spring Security', active: true, dueDate: new Date('2025-07-25') },
      { id: '6', category: 'Spring', active: true, dueDate: new Date('2025-07-25') },
      { id: '7', category: 'Architecture', active: true, dueDate: new Date('2025-07-25') },
      { id: '8', category: 'Java Framework', active: true, dueDate: new Date('2025-07-25') },
      { id: '9', category: 'Security', active: true, dueDate: new Date('2025-07-25') },
      { id: '10', category: 'API Development', active: true, dueDate: new Date('2025-07-25') },
      { id: '11', category: 'DevOps', active: true, dueDate: new Date('2025-07-25') }
    ];
  } catch (error) {
    console.log('❌ Could not read actual data, using mock data');
    return [];
  }
}

// Mock initial stats based on console output
const mockInitialCategoryStats = {
  'AWS': 1,
  'Java': 31,
  'Amazon LP': 14,
  'Spring Security': 4,
  'Spring': 3,
  'Architecture': 3,
  'Java Framework': 2,
  'Security': 1,
  'API Development': 1,
  'DevOps': 1
};

const mockCategoryCompletedCounts = {
  'AWS': 1,
  'Java': 13,
  'Amazon LP': 0,
  'Spring Security': 0,
  'Spring': 0,
  'Architecture': 0,
  'Java Framework': 0,
  'Security': 0,
  'API Development': 0,
  'DevOps': 0
};

// Simulate the getCategories function from useFlashcards
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

// Simulate displayCategories logic
function simulateDisplayCategories(categories, showDueTodayOnly, allCategories, initialCategoryStats) {
  if (showDueTodayOnly) {
    const categoriesSet = new Set(categories);
    
    if (Object.keys(initialCategoryStats).length > 0) {
      Object.keys(initialCategoryStats).forEach(cat => {
        if (initialCategoryStats[cat] > 0) {
          categoriesSet.add(cat);
        }
      });
    }
    
    return Array.from(categoriesSet);
  } else {
    return allCategories;
  }
}

// Simulate card counting logic
function simulateGetCardCountInCategory(category, flashcards, showDueTodayOnly, showStarredOnly, initialCategoryStats, categoryCompletedCounts) {
  // Use stable counting when in due today mode (not starred)
  if (showDueTodayOnly && !showStarredOnly && Object.keys(initialCategoryStats).length > 0) {
    const initialCount = initialCategoryStats[category] || 0;
    const completedCount = categoryCompletedCounts[category] || 0;
    return Math.max(0, initialCount - completedCount);
  }
  
  // Otherwise use real-time counting
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

// Main analysis
function analyzeCategoryIssue() {
  console.log('🔍 REAL CATEGORY DATA ANALYSIS');
  console.log('==============================');
  
  const flashcards = getFlashcardDataFromApp();
  const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  
  console.log('📊 FLASHCARD DATA:');
  console.log(`Total cards: ${flashcards.length}`);
  console.log(`All categories: ${allCategories.join(', ')}`);
  console.log();
  
  // Test scenario: Due Today Only (the problematic one)
  const showDueTodayOnly = true;
  const showStarredOnly = false;
  
  console.log('🎯 SCENARIO: Due Today Only');
  console.log('============================');
  
  const categories = simulateGetCategories(flashcards, showDueTodayOnly);
  console.log('Categories from getCategories():', categories);
  
  const displayCategories = simulateDisplayCategories(categories, showDueTodayOnly, allCategories, mockInitialCategoryStats);
  console.log('DisplayCategories:', displayCategories);
  
  // Filter to only include categories with cards
  const filteredDisplayCategories = displayCategories.filter(category => {
    const cardCount = simulateGetCardCountInCategory(category, flashcards, showDueTodayOnly, showStarredOnly, mockInitialCategoryStats, mockCategoryCompletedCounts);
    return cardCount > 0;
  });
  
  console.log('FilteredDisplayCategories:', filteredDisplayCategories);
  console.log();
  
  console.log('📋 CATEGORY BREAKDOWN:');
  console.log('======================');
  
  allCategories.forEach(category => {
    const inCategories = categories.includes(category);
    const inDisplay = displayCategories.includes(category);
    const inFiltered = filteredDisplayCategories.includes(category);
    
    const realTimeCount = flashcards.filter(card => {
      if (card.active === false) return false;
      if ((card.category || 'Uncategorized') !== category) return false;
      const now = new Date();
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    }).length;
    
    const initialCount = mockInitialCategoryStats[category] || 0;
    const completedCount = mockCategoryCompletedCounts[category] || 0;
    const stableCount = Math.max(0, initialCount - completedCount);
    
    const status = inFiltered ? '✅' : '❌';
    
    console.log(`${status} ${category}:`);
    console.log(`    In categories: ${inCategories}`);
    console.log(`    In displayCategories: ${inDisplay}`);
    console.log(`    In filteredCategories: ${inFiltered}`);
    console.log(`    Real-time count: ${realTimeCount}`);
    console.log(`    Stable count: ${stableCount} (${initialCount} - ${completedCount})`);
    console.log();
  });
  
  console.log('🚨 PROBLEMS IDENTIFIED:');
  console.log('=======================');
  
  const problems = [];
  
  allCategories.forEach(category => {
    const inFiltered = filteredDisplayCategories.includes(category);
    const stableCount = Math.max(0, (mockInitialCategoryStats[category] || 0) - (mockCategoryCompletedCounts[category] || 0));
    const realTimeCount = flashcards.filter(card => {
      if (card.active === false) return false;
      if ((card.category || 'Uncategorized') !== category) return false;
      const now = new Date();
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    }).length;
    
    if (!inFiltered && stableCount > 0) {
      problems.push(`❌ ${category} should show (stable count: ${stableCount}) but doesn't appear in filtered list`);
    }
    
    if (inFiltered && stableCount === 0 && realTimeCount === 0) {
      problems.push(`❌ ${category} appears in filtered list but has no cards (stable: ${stableCount}, real-time: ${realTimeCount})`);
    }
  });
  
  if (problems.length === 0) {
    console.log('✅ No problems found with current logic!');
  } else {
    problems.forEach(problem => console.log(problem));
  }
  
  console.log();
  console.log('🔧 RECOMMENDED FIXES:');
  console.log('=====================');
  
  if (problems.some(p => p.includes('AWS'))) {
    console.log('1. AWS category issue: The displayCategories logic should include categories from initialCategoryStats');
    console.log('2. The filtering should use stable counting when available');
  }
  
  console.log('3. Ensure initialCategoryStats and categoryCompletedCounts are properly synchronized');
  console.log('4. Verify the timing of when these stats are initialized vs when components render');
}

analyzeCategoryIssue();