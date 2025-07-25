#!/usr/bin/env node

/**
 * Analyze Category Mismatch Issue
 * 
 * This script simulates the exact category filtering logic to identify
 * why some categories show up without cards and others with cards don't show up.
 */

console.log('🔍 CATEGORY MISMATCH ANALYSIS');
console.log('='.repeat(50));

// Mock realistic flashcard data that could cause the issues you're seeing
const mockFlashcards = [
  // Active cards that should show
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
    starred: false
  },
  // AWS cards - the main issue
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
  // Problematic scenarios that cause mismatches
  {
    id: '4',
    category: 'EmptyCategory', // This category will show in some lists but have 0 cards in others
    sub_category: 'Test',
    question: 'Test question',
    answer: 'Test answer',
    active: false, // INACTIVE - causes mismatch
    dueDate: new Date('2024-01-01'),
    starred: false
  },
  {
    id: '5',
    category: 'FutureOnly', // Category with only future cards
    sub_category: 'Future',
    question: 'Future question',
    answer: 'Future answer',
    active: true,
    dueDate: new Date('2025-12-31'), // FUTURE - causes mismatch in "Due Today" mode
    starred: false
  },
  {
    id: '6',
    category: 'StarredOnly', // Category with only starred cards
    sub_category: 'Special',
    question: 'Special question',
    answer: 'Special answer',
    active: true,
    dueDate: new Date('2024-01-01'),
    starred: true // STARRED - causes mismatch when starred filter is off
  }
];

// Simulate the getCategories function (what determines which categories show in the list)
function getCategories(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n📋 SIMULATING getCategories() - What categories should show in the list');
  console.log(`Filters: showDueTodayOnly=${showDueTodayOnly}, showStarredOnly=${showStarredOnly}`);
  
  let filteredCards = flashcards;
  
  // 1. Filter out inactive cards
  filteredCards = filteredCards.filter(card => card.active !== false);
  console.log(`  After active filter: ${filteredCards.length} cards`);
  
  // 2. Apply starred filter if enabled
  if (showStarredOnly) {
    filteredCards = filteredCards.filter(card => card.starred === true);
    console.log(`  After starred filter: ${filteredCards.length} cards`);
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
    
    const categories = Array.from(categoriesWithDueCards);
    console.log(`  Categories with due cards: [${categories.join(', ')}]`);
    return categories.sort();
  }
  
  // 4. For non-due mode, return all categories with filtered cards
  const categories = [...new Set(filteredCards.map(card => card.category || 'Uncategorized'))];
  console.log(`  Categories from filtered cards: [${categories.join(', ')}]`);
  
  return categories.sort();
}

// Simulate individual category button counting (what determines if buttons show counts)
function getIndividualCategoryCounts(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n🔢 SIMULATING Individual Category Button Counts');
  
  // Get all unique categories (this is what the UI iterates over)
  const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  console.log(`  All categories found: [${allCategories.join(', ')}]`);
  
  const buttonCounts = {};
  
  allCategories.forEach(category => {
    // Start with all cards in this category
    let categoryCards = flashcards.filter(card => {
      if (card.active === false) return false; // Only count active cards
      return (card.category || 'Uncategorized') === category;
    });

    // Apply filters
    if (showStarredOnly) {
      categoryCards = categoryCards.filter(card => card.starred === true);
    }
    
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      categoryCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate < endOfToday;
      });
    }
    
    const count = categoryCards.length;
    buttonCounts[category] = count;
    
    const status = count > 0 ? '✅' : '❌';
    console.log(`  ${status} ${category}: ${count} cards`);
  });
  
  return buttonCounts;
}

// Identify mismatches between what should show and what buttons count
function identifyMismatches(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n🚨 IDENTIFYING MISMATCHES');
  console.log(`Scenario: showDueTodayOnly=${showDueTodayOnly}, showStarredOnly=${showStarredOnly}`);
  
  const categoriesFromList = getCategories(flashcards, showDueTodayOnly, showStarredOnly);
  const buttonCounts = getIndividualCategoryCounts(flashcards, showDueTodayOnly, showStarredOnly);
  
  // Categories that show in list but have 0 cards in buttons
  const showingWithZeroCounts = categoriesFromList.filter(category => 
    buttonCounts[category] === 0
  );
  
  // Categories that have cards in buttons but don't show in list
  const hasCardsButNotShowing = Object.keys(buttonCounts).filter(category =>
    buttonCounts[category] > 0 && !categoriesFromList.includes(category)
  );
  
  console.log('\n❌ PROBLEMS FOUND:');
  
  if (showingWithZeroCounts.length > 0) {
    console.log(`  Categories showing in list but have 0 cards: [${showingWithZeroCounts.join(', ')}]`);
    console.log(`  ↳ These should be filtered OUT of the category list`);
  }
  
  if (hasCardsButNotShowing.length > 0) {
    console.log(`  Categories with cards but not in list: [${hasCardsButNotShowing.join(', ')}]`);
    hasCardsButNotShowing.forEach(cat => {
      console.log(`    ↳ ${cat}: has ${buttonCounts[cat]} cards but not in category list`);
    });
  }
  
  if (showingWithZeroCounts.length === 0 && hasCardsButNotShowing.length === 0) {
    console.log('  ✅ No mismatches found in this scenario!');
  }
  
  return {
    showingWithZeroCounts,
    hasCardsButNotShowing,
    categoriesFromList,
    buttonCounts
  };
}

// Test all filter combinations
function testAllScenarios() {
  console.log('\n🧪 TESTING ALL FILTER SCENARIOS');
  console.log('='.repeat(50));
  
  const scenarios = [
    { showDueTodayOnly: false, showStarredOnly: false, name: 'All Cards (No Filters)' },
    { showDueTodayOnly: true, showStarredOnly: false, name: 'Due Today Only' },
    { showDueTodayOnly: false, showStarredOnly: true, name: 'Starred Only' },
    { showDueTodayOnly: true, showStarredOnly: true, name: 'Due Today + Starred' }
  ];
  
  const results = {};
  
  scenarios.forEach(scenario => {
    console.log('\n' + '='.repeat(40));
    console.log(`🔍 SCENARIO: ${scenario.name}`);
    console.log('='.repeat(40));
    
    const result = identifyMismatches(mockFlashcards, scenario.showDueTodayOnly, scenario.showStarredOnly);
    results[scenario.name] = result;
  });
  
  return results;
}

// Provide specific recommendations
function provideRecommendations(results) {
  console.log('\n💡 SPECIFIC RECOMMENDATIONS');
  console.log('='.repeat(50));
  
  let foundIssues = false;
  
  Object.entries(results).forEach(([scenarioName, result]) => {
    if (result.showingWithZeroCounts.length > 0 || result.hasCardsButNotShowing.length > 0) {
      foundIssues = true;
      console.log(`\n⚠️  Issues in "${scenarioName}":`);
      
      if (result.showingWithZeroCounts.length > 0) {
        console.log(`   Problem: Categories showing with 0 cards: ${result.showingWithZeroCounts.join(', ')}`);
        console.log(`   Fix: Update getCategories() to filter out categories with 0 actual cards`);
      }
      
      if (result.hasCardsButNotShowing.length > 0) {
        console.log(`   Problem: Categories with cards not showing: ${result.hasCardsButNotShowing.join(', ')}`);
        console.log(`   Fix: Update getCategories() to include all categories with actual cards`);
      }
    }
  });
  
  if (!foundIssues) {
    console.log('✅ No logic issues found! The problem might be:');
    console.log('   1. Timing issues - different parts of app using different data snapshots');
    console.log('   2. React state synchronization delays');
    console.log('   3. Caching issues in the browser');
    console.log('   4. Real data edge cases not covered in simulation');
  }
  
  console.log('\n🔧 IMMEDIATE ACTIONS FOR YOUR APP:');
  console.log('1. Turn off ALL filters (Due Today + Starred) and see if AWS appears');
  console.log('2. Refresh the page completely (F5)');
  console.log('3. Check if your AWS card is marked as active in Manage Cards');
  console.log('4. Verify the AWS card category field is exactly "AWS" (not "aws")');
  console.log('5. Check if there are JavaScript errors in browser console');
}

// Main execution
function main() {
  console.log('Analyzing category mismatch patterns with realistic test data...\n');
  
  // Show test data
  console.log('📋 TEST DATA OVERVIEW:');
  mockFlashcards.forEach((card, index) => {
    const activeStatus = card.active ? '✅' : '❌';
    const starredStatus = card.starred ? '⭐' : '⚪';
    const dueStatus = card.dueDate <= new Date() ? '⏰' : '⏳';
    
    console.log(`  ${index + 1}. "${card.category}" ${activeStatus} ${starredStatus} ${dueStatus} - ${card.question.substring(0, 30)}...`);
  });
  
  // Test all scenarios
  const results = testAllScenarios();
  
  // Provide recommendations
  provideRecommendations(results);
  
  console.log('\n🎯 SUMMARY:');
  console.log('This analysis shows common patterns that cause category/count mismatches.');
  console.log('Compare these results with your actual app behavior to identify the specific issue.');
}

// Run the analysis
main();
