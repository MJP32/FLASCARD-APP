#!/usr/bin/env node

/**
 * Debug Script for Category/Count Mismatch Issues
 * 
 * This script simulates the exact category filtering logic from the app
 * to identify why some categories show up without cards and others don't show up with cards.
 */

// (no filesystem access required for this simulation)

console.log('🔍 CATEGORY/COUNT MISMATCH DEBUG SCRIPT');
console.log('='.repeat(60));

// Mock flashcard data with various scenarios that could cause mismatches
const mockFlashcards = [
  // Normal active cards
  {
    id: '1',
    category: 'Math',
    sub_category: 'Algebra',
    question: 'What is 2+2?',
    answer: '4',
    active: true,
    dueDate: new Date('2024-01-01'), // Past due
    starred: false
  },
  {
    id: '2',
    category: 'Science',
    sub_category: 'Physics', 
    question: 'What is gravity?',
    answer: 'A force',
    active: true,
    dueDate: new Date('2025-12-31'), // Future due
    starred: true
  },
  // AWS cards with different states
  {
    id: '3',
    category: 'AWS',
    sub_category: 'EC2',
    question: 'What is EC2?',
    answer: 'Elastic Compute Cloud',
    active: true,
    dueDate: new Date('2024-01-01'), // Past due
    starred: false
  },
  {
    id: '4',
    category: 'AWS',
    sub_category: 'S3',
    question: 'What is S3?',
    answer: 'Simple Storage Service',
    active: false, // INACTIVE - this could cause issues
    dueDate: new Date('2024-01-01'),
    starred: false
  },
  // Edge cases that might cause mismatches
  {
    id: '5',
    category: 'EmptyCategory', // Category with only inactive cards
    sub_category: 'Test',
    question: 'Test question',
    answer: 'Test answer',
    active: false, // INACTIVE
    dueDate: new Date('2024-01-01'),
    starred: false
  },
  {
    id: '6',
    category: 'FutureOnly', // Category with only future due cards
    sub_category: 'Future',
    question: 'Future question',
    answer: 'Future answer',
    active: true,
    dueDate: new Date('2025-12-31'), // FUTURE DUE
    starred: false
  },
  {
    id: '7',
    category: 'StarredOnly', // Category with only starred cards
    sub_category: 'Special',
    question: 'Special question',
    answer: 'Special answer',
    active: true,
    dueDate: new Date('2025-12-31'), // Future due
    starred: true // STARRED
  },
  // Case sensitivity issues
  {
    id: '8',
    category: 'aws', // lowercase AWS
    sub_category: 'Lambda',
    question: 'What is Lambda?',
    answer: 'Serverless compute',
    active: true,
    dueDate: new Date('2024-01-01'),
    starred: false
  }
];

// Simulate the getCategories function from useFlashcards.js
function simulateGetCategories(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n📊 SIMULATING getCategories() FUNCTION:');
  console.log(`Filters: showDueTodayOnly=${showDueTodayOnly}, showStarredOnly=${showStarredOnly}`);
  
  let filteredCards = flashcards;
  
  // 1. Filter out inactive cards
  filteredCards = filteredCards.filter(card => card.active !== false);
  console.log(`After active filter: ${filteredCards.length} cards`);
  
  // 2. Apply starred filter if enabled
  if (showStarredOnly) {
    filteredCards = filteredCards.filter(card => card.starred === true);
    console.log(`After starred filter: ${filteredCards.length} cards`);
  }
  
  // 3. Apply due date filter if enabled
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
        categoriesWithDueCards.add(card.category || 'Uncategorized');
      }
    });
    
    console.log(`Categories with due cards: [${Array.from(categoriesWithDueCards).join(', ')}]`);
    return Array.from(categoriesWithDueCards).sort();
  }
  
  // 4. For non-due mode, return all categories with active cards
  const categories = [...new Set(filteredCards.map(card => card.category || 'Uncategorized'))];
  console.log(`Categories from filtered cards: [${categories.join(', ')}]`);
  
  return categories.sort();
}

// Simulate the filteredDisplayCategories logic from App.js
function simulateFilteredDisplayCategories(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n🔍 SIMULATING filteredDisplayCategories LOGIC:');
  
  // First get categories from getCategories
  const displayCategories = simulateGetCategories(flashcards, showDueTodayOnly, showStarredOnly);
  console.log(`Display categories from getCategories: [${displayCategories.join(', ')}]`);
  
  // Then filter to only include categories with actual cards using the counting logic
  const getCardCountInCategory = (category) => {
    // Start with all flashcards
    let categoryCards = flashcards.filter(card => {
      // Only count active cards
      if (card.active === false) return false;
      // Match the category
      return (card.category || 'Uncategorized') === category;
    });
    
    // Apply filters based on current mode
    if (showDueTodayOnly && showStarredOnly) {
      // When both filters are on, count actual starred due cards
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
      // Filter by due date only
      const now = new Date();
      categoryCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate <= now;
      });
    } else if (showStarredOnly) {
      // Filter by starred only
      categoryCards = categoryCards.filter(card => card.starred === true);
    }
    
    return categoryCards.length;
  };
  
  // Filter displayCategories to only include categories with actual cards
  const filteredCategories = displayCategories.filter(category => {
    const cardCount = getCardCountInCategory(category);
    console.log(`  ${category}: ${cardCount} cards`);
    return cardCount > 0;
  });
  
  console.log(`Final filtered categories: [${filteredCategories.join(', ')}]`);
  return filteredCategories;
}

// Simulate the individual category button counting logic
function simulateIndividualButtonCounts(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n🔢 SIMULATING INDIVIDUAL BUTTON COUNTS:');
  
  // Get all unique categories (this is what the buttons iterate over)
  const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  console.log(`All categories found in flashcards: [${allCategories.join(', ')}]`);
  
  const buttonCounts = {};
  
  allCategories.forEach(category => {
    // This is the exact logic from the individual category buttons
    let categoryCards = flashcards.filter(card => {
      // Only count active cards
      if (card.active === false) return false;
      // Match the category
      return (card.category || 'Uncategorized') === category;
    });

    // Calculate count based on showDueTodayOnly and showStarredOnly
    let actualCardsInCategory;
    
    if (showDueTodayOnly && showStarredOnly) {
      // When both filters are on, count actual starred due cards
      categoryCards = categoryCards.filter(card => card.starred === true);
      
      const now = new Date();
      categoryCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate <= now;
      });
      
      actualCardsInCategory = categoryCards.length;
    } else if (showDueTodayOnly) {
      const now = new Date();
      categoryCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate <= now;
      });
      actualCardsInCategory = categoryCards.length;
    } else {
      // For non-due mode, count actual cards with filters
      if (showStarredOnly) {
        categoryCards = categoryCards.filter(card => card.starred === true);
      }
      actualCardsInCategory = categoryCards.length;
    }
    
    buttonCounts[category] = actualCardsInCategory;
    console.log(`  ${category}: ${actualCardsInCategory} cards (button would ${actualCardsInCategory === 0 ? 'NOT show' : 'show'})`);
  });
  
  return buttonCounts;
}

// Compare the results and identify mismatches
function identifyMismatches(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n🚨 IDENTIFYING MISMATCHES:');
  console.log(`Scenario: showDueTodayOnly=${showDueTodayOnly}, showStarredOnly=${showStarredOnly}`);
  
  const filteredCategories = simulateFilteredDisplayCategories(flashcards, showDueTodayOnly, showStarredOnly);
  const buttonCounts = simulateIndividualButtonCounts(flashcards, showDueTodayOnly, showStarredOnly);
  
  // Categories that show up in the filter but have 0 cards in buttons
  const categoriesWithZeroCounts = filteredCategories.filter(category => 
    buttonCounts[category] === 0
  );
  
  // Categories that have cards but don't show up in the filter
  const categoriesWithCardsNotShowing = Object.keys(buttonCounts).filter(category =>
    buttonCounts[category] > 0 && !filteredCategories.includes(category)
  );
  
  console.log('\n❌ CATEGORIES SHOWING WITH 0 CARDS:');
  if (categoriesWithZeroCounts.length === 0) {
    console.log('  ✅ None found - this is good!');
  } else {
    categoriesWithZeroCounts.forEach(category => {
      console.log(`  - ${category} (shows in list but has 0 cards in buttons)`);
    });
  }
  
  console.log('\n❌ CATEGORIES WITH CARDS NOT SHOWING:');
  if (categoriesWithCardsNotShowing.length === 0) {
    console.log('  ✅ None found - this is good!');
  } else {
    categoriesWithCardsNotShowing.forEach(category => {
      console.log(`  - ${category} (has ${buttonCounts[category]} cards but not in category list)`);
    });
  }
  
  return {
    categoriesWithZeroCounts,
    categoriesWithCardsNotShowing,
    filteredCategories,
    buttonCounts
  };
}

// Test all scenarios
function testAllScenarios(flashcards) {
  console.log('\n🧪 TESTING ALL FILTER SCENARIOS:');
  
  const scenarios = [
    { showDueTodayOnly: false, showStarredOnly: false, name: 'All Cards' },
    { showDueTodayOnly: true, showStarredOnly: false, name: 'Due Today Only' },
    { showDueTodayOnly: false, showStarredOnly: true, name: 'Starred Only' },
    { showDueTodayOnly: true, showStarredOnly: true, name: 'Due Today + Starred' }
  ];
  
  const results = {};
  
  scenarios.forEach(scenario => {
    console.log('\n' + '='.repeat(50));
    console.log(`🔍 SCENARIO: ${scenario.name}`);
    console.log('='.repeat(50));
    
    const result = identifyMismatches(flashcards, scenario.showDueTodayOnly, scenario.showStarredOnly);
    results[scenario.name] = result;
  });
  
  return results;
}

// Provide recommendations based on findings
function provideRecommendations(results) {
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('='.repeat(50));
  
  let foundIssues = false;
  
  Object.entries(results).forEach(([scenarioName, result]) => {
    if (result.categoriesWithZeroCounts.length > 0 || result.categoriesWithCardsNotShowing.length > 0) {
      foundIssues = true;
      console.log(`\n⚠️  Issues found in "${scenarioName}" scenario:`);
      
      if (result.categoriesWithZeroCounts.length > 0) {
        console.log(`   - Categories showing with 0 cards: ${result.categoriesWithZeroCounts.join(', ')}`);
        console.log(`   - Fix: These categories should be filtered out of the category list`);
      }
      
      if (result.categoriesWithCardsNotShowing.length > 0) {
        console.log(`   - Categories with cards not showing: ${result.categoriesWithCardsNotShowing.join(', ')}`);
        console.log(`   - Fix: These categories should be included in the category list`);
      }
    }
  });
  
  if (!foundIssues) {
    console.log('✅ No mismatches found in any scenario - the logic appears to be working correctly!');
  } else {
    console.log('\n🔧 GENERAL FIXES:');
    console.log('1. Ensure getCategories() and filteredDisplayCategories use the same filtering logic');
    console.log('2. Check for timing issues - make sure all counts use the same flashcards data');
    console.log('3. Verify that inactive cards are consistently filtered out');
    console.log('4. Check for case sensitivity issues in category names');
    console.log('5. Ensure due date calculations are consistent across all functions');
  }
}

// Main execution
function main() {
  try {
    console.log('Using mock flashcard data to test category/count mismatch scenarios...\n');
    
    // Show the test data
    console.log('📋 TEST DATA:');
    mockFlashcards.forEach((card, index) => {
      console.log(`  ${index + 1}. "${card.category}" | Active: ${card.active} | Due: ${card.dueDate.toISOString().split('T')[0]} | Starred: ${card.starred} | Q: ${card.question.substring(0, 30)}...`);
    });
    
    // Test all scenarios
    const results = testAllScenarios(mockFlashcards);
    
    // Provide recommendations
    provideRecommendations(results);
    
    console.log('\n🔧 NEXT STEPS FOR YOUR ACTUAL APP:');
    console.log('1. Run the debug functions in your browser console:');
    console.log('   - window.debugEmptyCategories()');
    console.log('   - window.debugCategorySubcategoryMismatch()');
    console.log('   - window.debugQuiet()');
    console.log('2. Compare the results with this simulation');
    console.log('3. Check if your actual data has similar patterns to the test data');
    console.log('4. Look for timing or caching issues in the real app');
    
  } catch (error) {
    console.error('❌ Error running debug script:', error);
  }
}

// Run the script
main();
