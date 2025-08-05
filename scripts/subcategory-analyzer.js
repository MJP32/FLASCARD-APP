#!/usr/bin/env node

/**
 * Subcategory Filtering Analyzer
 * 
 * Detailed analysis of subcategory filtering issues
 * Run with: node subcategory-analyzer.js
 */

console.log('🔍 SUBCATEGORY FILTERING ANALYZER');
console.log('='.repeat(50));

// Create test data with detailed subcategory scenarios
const createSubcategoryTestData = () => {
  return [
    // Amazon LP cards with various subcategories
    {
      id: 'alp-1',
      category: 'Amazon LP',
      sub_category: 'Customer Obsession',
      question: 'What is Customer Obsession?',
      answer: 'Start with customer and work backwards',
      active: true,
      dueDate: new Date(2024, 0, 1),
      starred: false
    },
    {
      id: 'alp-2',
      category: 'Amazon LP',
      sub_category: 'Ownership',
      question: 'What is Ownership?',
      answer: 'Act on behalf of the entire company',
      active: true,
      dueDate: new Date(2024, 0, 2),
      starred: true
    },
    {
      id: 'alp-3',
      category: 'Amazon LP',
      sub_category: 'Customer Obsession',
      question: 'Another Customer Obsession question',
      answer: 'Another answer',
      active: true,
      dueDate: new Date(2025, 11, 31), // Future date
      starred: false
    },
    {
      id: 'alp-4',
      category: 'Amazon LP',
      sub_category: 'Bias for Action',
      question: 'What is Bias for Action?',
      answer: 'Speed matters in business',
      active: false, // INACTIVE
      dueDate: new Date(2024, 0, 3),
      starred: false
    },
    {
      id: 'alp-5',
      category: 'Amazon LP',
      sub_category: 'Leadership',
      question: 'Leadership principle',
      answer: 'Leaders develop leaders',
      active: true,
      dueDate: new Date(2024, 0, 4),
      starred: false
    },
    
    // Java cards with subcategories
    {
      id: 'java-1',
      category: 'Java',
      sub_category: 'Core Java',
      question: 'What is Java?',
      answer: 'Object-oriented programming language',
      active: true,
      dueDate: new Date(2024, 0, 5),
      starred: false
    },
    {
      id: 'java-2',
      category: 'Java',
      sub_category: 'Collections',
      question: 'What is ArrayList?',
      answer: 'Dynamic array implementation',
      active: true,
      dueDate: new Date(2024, 0, 6),
      starred: true
    },
    {
      id: 'java-3',
      category: 'Java',
      sub_category: 'Core Java',
      question: 'Another Core Java question',
      answer: 'Another answer',
      active: true,
      dueDate: new Date(2025, 11, 31), // Future date
      starred: false
    },
    
    // AWS cards with subcategories
    {
      id: 'aws-1',
      category: 'AWS',
      sub_category: 'EC2',
      question: 'What is EC2?',
      answer: 'Elastic Compute Cloud',
      active: true,
      dueDate: new Date(2024, 0, 7),
      starred: false
    },
    {
      id: 'aws-2',
      category: 'AWS',
      sub_category: 'S3',
      question: 'What is S3?',
      answer: 'Simple Storage Service',
      active: true,
      dueDate: new Date(2024, 0, 8),
      starred: false
    }
  ];
};

// Detailed subcategory filtering simulation
const analyzeSubcategoryFiltering = (flashcards, selectedCategory, showDueTodayOnly = false, showStarredOnly = false) => {
  console.log('\n📂 DETAILED SUBCATEGORY ANALYSIS');
  console.log(`Selected Category: "${selectedCategory}"`);
  console.log(`Show Due Today Only: ${showDueTodayOnly}`);
  console.log(`Show Starred Only: ${showStarredOnly}`);
  console.log('-'.repeat(40));
  
  // Step 1: Get all cards in the selected category
  let categoryCards = flashcards;
  
  if (selectedCategory !== 'All') {
    categoryCards = flashcards.filter(card => card.category === selectedCategory);
  }
  
  console.log(`\n1️⃣ Cards in "${selectedCategory}" category: ${categoryCards.length}`);
  categoryCards.forEach(card => {
    console.log(`   ${card.id}: "${card.sub_category}" (active: ${card.active}, due: ${card.dueDate.toISOString().split('T')[0]}, starred: ${card.starred})`);
  });
  
  // Step 2: Filter by active status
  const activeCards = categoryCards.filter(card => card.active !== false);
  console.log(`\n2️⃣ Active cards: ${activeCards.length}`);
  activeCards.forEach(card => {
    console.log(`   ${card.id}: "${card.sub_category}"`);
  });
  
  // Step 3: Apply starred filter if enabled
  let filteredCards = activeCards;
  if (showStarredOnly) {
    filteredCards = filteredCards.filter(card => card.starred === true);
    console.log(`\n3️⃣ Starred cards: ${filteredCards.length}`);
    filteredCards.forEach(card => {
      console.log(`   ${card.id}: "${card.sub_category}"`);
    });
  }
  
  // Step 4: Apply due date filter if enabled
  if (showDueTodayOnly) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    filteredCards = filteredCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      return dueDate < endOfToday;
    });
    
    console.log(`\n4️⃣ Due cards: ${filteredCards.length}`);
    filteredCards.forEach(card => {
      console.log(`   ${card.id}: "${card.sub_category}" (due: ${card.dueDate.toISOString().split('T')[0]})`);
    });
  }
  
  // Step 5: Extract unique subcategories
  const subcategories = [...new Set(filteredCards.map(card => card.sub_category || 'Uncategorized'))];
  
  console.log(`\n5️⃣ Final subcategories: [${subcategories.join(', ')}]`);
  
  // Step 6: Analyze each subcategory
  console.log('\n6️⃣ Subcategory breakdown:');
  subcategories.forEach(subcat => {
    const subcatCards = filteredCards.filter(card => (card.sub_category || 'Uncategorized') === subcat);
    console.log(`   "${subcat}": ${subcatCards.length} cards`);
    subcatCards.forEach(card => {
      console.log(`     - ${card.id}: ${card.question.substring(0, 30)}...`);
    });
  });
  
  return {
    totalCards: categoryCards.length,
    activeCards: activeCards.length,
    filteredCards: filteredCards.length,
    subcategories: subcategories,
    subcategoryDetails: subcategories.map(subcat => ({
      name: subcat,
      cardCount: filteredCards.filter(card => (card.sub_category || 'Uncategorized') === subcat).length
    }))
  };
};

// Test subcategory filtering for all categories
const testAllCategorySubcategories = (flashcards) => {
  console.log('\n🧪 TESTING ALL CATEGORY SUBCATEGORIES');
  console.log('='.repeat(50));
  
  // Get all unique categories
  const categories = [...new Set(flashcards.map(card => card.category))];
  categories.push('All'); // Add "All" category
  
  const scenarios = [
    { showDueTodayOnly: false, showStarredOnly: false, name: 'No Filters' },
    { showDueTodayOnly: true, showStarredOnly: false, name: 'Due Today Only' },
    { showDueTodayOnly: false, showStarredOnly: true, name: 'Starred Only' }
  ];
  
  const results = {};
  
  scenarios.forEach(scenario => {
    console.log(`\n${'='.repeat(30)} ${scenario.name} ${'='.repeat(30)}`);
    results[scenario.name] = {};
    
    categories.forEach(category => {
      console.log(`\n--- Testing "${category}" category ---`);
      const result = analyzeSubcategoryFiltering(flashcards, category, scenario.showDueTodayOnly, scenario.showStarredOnly);
      results[scenario.name][category] = result;
      
      console.log(`\nSUMMARY for "${category}":`);
      console.log(`  Total cards in category: ${result.totalCards}`);
      console.log(`  Active cards: ${result.activeCards}`);
      console.log(`  Filtered cards: ${result.filteredCards}`);
      console.log(`  Subcategories showing: ${result.subcategories.length}`);
      console.log(`  Subcategories: [${result.subcategories.join(', ')}]`);
    });
  });
  
  return results;
};

// Identify subcategory filtering issues
const identifySubcategoryIssues = (results) => {
  console.log('\n🚨 SUBCATEGORY FILTERING ISSUES ANALYSIS');
  console.log('='.repeat(50));
  
  const issues = [];
  
  Object.entries(results).forEach(([scenarioName, scenarioResults]) => {
    console.log(`\n📊 ${scenarioName} Scenario:`);
    
    Object.entries(scenarioResults).forEach(([category, result]) => {
      if (category === 'All') return; // Skip "All" category for this analysis
      
      const hasCards = result.totalCards > 0;
      const hasActiveCards = result.activeCards > 0;
      const hasFilteredCards = result.filteredCards > 0;
      const hasSubcategories = result.subcategories.length > 0;
      
      console.log(`  ${category}:`);
      console.log(`    Has cards: ${hasCards ? '✅' : '❌'} (${result.totalCards})`);
      console.log(`    Has active cards: ${hasActiveCards ? '✅' : '❌'} (${result.activeCards})`);
      console.log(`    Has filtered cards: ${hasFilteredCards ? '✅' : '❌'} (${result.filteredCards})`);
      console.log(`    Has subcategories: ${hasSubcategories ? '✅' : '❌'} (${result.subcategories.length})`);
      
      // Identify specific issues
      if (hasCards && !hasActiveCards) {
        issues.push(`${scenarioName}: ${category} has cards but all are inactive`);
      }
      
      if (hasActiveCards && !hasFilteredCards) {
        issues.push(`${scenarioName}: ${category} has active cards but none pass filters`);
      }
      
      if (hasFilteredCards && !hasSubcategories) {
        issues.push(`${scenarioName}: ${category} has filtered cards but no subcategories`);
      }
      
      if (hasCards && hasActiveCards && hasFilteredCards && !hasSubcategories) {
        issues.push(`${scenarioName}: ${category} should show subcategories but doesn't`);
      }
    });
  });
  
  console.log('\n🔍 ISSUES SUMMARY:');
  if (issues.length === 0) {
    console.log('✅ No subcategory filtering issues detected');
  } else {
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ❌ ${issue}`);
    });
  }
  
  return issues;
};

// Generate specific recommendations
const generateSubcategoryRecommendations = (results, issues) => {
  console.log('\n💡 SUBCATEGORY FILTERING RECOMMENDATIONS');
  console.log('='.repeat(50));
  
  if (issues.length === 0) {
    console.log('✅ Subcategory filtering logic appears to be working correctly');
    console.log('\nIf you\'re still experiencing issues in your app:');
    console.log('1. Check if React state is updating properly when category changes');
    console.log('2. Verify useEffect dependencies include selectedCategory');
    console.log('3. Check for timing issues in component re-rendering');
    console.log('4. Ensure getSubCategories is called when category selection changes');
  } else {
    console.log('❌ Issues detected with subcategory filtering:');
    
    // Categorize issues
    const inactiveIssues = issues.filter(issue => issue.includes('inactive'));
    const filterIssues = issues.filter(issue => issue.includes('filters'));
    const subcategoryIssues = issues.filter(issue => issue.includes('subcategories'));
    
    if (inactiveIssues.length > 0) {
      console.log('\n🔧 INACTIVE CARD ISSUES:');
      inactiveIssues.forEach(issue => console.log(`   → ${issue}`));
      console.log('   Fix: Activate cards in Manage Cards modal');
    }
    
    if (filterIssues.length > 0) {
      console.log('\n🔧 FILTER ISSUES:');
      filterIssues.forEach(issue => console.log(`   → ${issue}`));
      console.log('   Fix: Turn off Due Today and Starred filters');
    }
    
    if (subcategoryIssues.length > 0) {
      console.log('\n🔧 SUBCATEGORY LOGIC ISSUES:');
      subcategoryIssues.forEach(issue => console.log(`   → ${issue}`));
      console.log('   Fix: Check getSubCategories function implementation');
    }
  }
  
  console.log('\n🚀 IMMEDIATE TESTING STEPS:');
  console.log('1. Select "Amazon LP" category in your app');
  console.log('2. Check if subcategories appear: Customer Obsession, Ownership, Leadership');
  console.log('3. Turn off all filters and test again');
  console.log('4. Select different categories and verify subcategories change');
  console.log('5. Check browser console for any JavaScript errors');
};

// Main execution
const main = () => {
  console.log('Creating detailed subcategory test data...\n');
  
  const flashcards = createSubcategoryTestData();
  console.log(`📊 Test data created: ${flashcards.length} flashcards`);
  
  // Show data overview
  const categorySubcategoryMap = {};
  flashcards.forEach(card => {
    const cat = card.category;
    if (!categorySubcategoryMap[cat]) {
      categorySubcategoryMap[cat] = new Set();
    }
    categorySubcategoryMap[cat].add(card.sub_category);
  });
  
  console.log('\n📂 Category → Subcategory mapping:');
  Object.entries(categorySubcategoryMap).forEach(([cat, subcats]) => {
    console.log(`  ${cat}: [${Array.from(subcats).join(', ')}]`);
  });
  
  // Run comprehensive subcategory tests
  const results = testAllCategorySubcategories(flashcards);
  const issues = identifySubcategoryIssues(results);
  generateSubcategoryRecommendations(results, issues);
  
  console.log('\n✅ Subcategory analysis complete!');
};

// Run the analyzer
main();
