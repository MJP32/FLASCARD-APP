#!/usr/bin/env node

/**
 * Flashcard App Diagnostic Engine
 * 
 * Comprehensive analysis of category and subcategory filtering issues
 * Run with: node diagnostic-engine.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FLASHCARD APP DIAGNOSTIC ENGINE');
console.log('='.repeat(60));

// Simulate realistic flashcard data based on your console logs
const createTestData = () => {
  const flashcards = [
    // Java category cards (15 cards as shown in logs)
    ...Array.from({length: 15}, (_, i) => ({
      id: `java-${i}`,
      category: 'Java',
      sub_category: ['Core Java', 'Collections', 'Streams', 'Concurrency'][i % 4],
      question: `Java question ${i + 1}`,
      answer: `Java answer ${i + 1}`,
      active: true,
      dueDate: new Date(2024, 0, 1 + i),
      starred: i % 10 === 0 // 10% starred
    })),
    
    // Amazon LP category cards (8 cards as shown in logs)
    ...Array.from({length: 8}, (_, i) => ({
      id: `amazon-lp-${i}`,
      category: 'Amazon LP',
      sub_category: ['Leadership', 'Customer Obsession', 'Ownership', 'Bias for Action'][i % 4],
      question: `Amazon LP question ${i + 1}`,
      answer: `Amazon LP answer ${i + 1}`,
      active: true,
      dueDate: new Date(2024, 0, 1 + i),
      starred: i % 5 === 0 // 20% starred
    })),
    
    // Spring Security category cards (3 cards as shown in logs)
    ...Array.from({length: 3}, (_, i) => ({
      id: `spring-security-${i}`,
      category: 'Spring Security',
      sub_category: ['Authentication', 'Authorization', 'OAuth'][i % 3],
      question: `Spring Security question ${i + 1}`,
      answer: `Spring Security answer ${i + 1}`,
      active: true,
      dueDate: new Date(2024, 0, 1 + i),
      starred: false
    })),
    
    // Spring category cards (2 cards as shown in logs)
    ...Array.from({length: 2}, (_, i) => ({
      id: `spring-${i}`,
      category: 'Spring',
      sub_category: ['Core', 'Boot'][i % 2],
      question: `Spring question ${i + 1}`,
      answer: `Spring answer ${i + 1}`,
      active: true,
      dueDate: new Date(2024, 0, 1 + i),
      starred: false
    })),
    
    // AWS cards - these are MISSING from your categories but should exist
    {
      id: 'aws-1',
      category: 'AWS',
      sub_category: 'EC2',
      question: 'What is EC2?',
      answer: 'Elastic Compute Cloud',
      active: true, // This should make it appear
      dueDate: new Date(2024, 0, 1),
      starred: false
    },
    {
      id: 'aws-2',
      category: 'AWS',
      sub_category: 'S3',
      question: 'What is S3?',
      answer: 'Simple Storage Service',
      active: false, // INACTIVE - this could be the problem
      dueDate: new Date(2024, 0, 1),
      starred: false
    },
    {
      id: 'aws-3',
      category: 'aws', // LOWERCASE - this could be the problem
      sub_category: 'Lambda',
      question: 'What is Lambda?',
      answer: 'Serverless compute',
      active: true,
      dueDate: new Date(2025, 11, 31), // FUTURE DATE - could be filtered out
      starred: false
    }
  ];
  
  return flashcards;
};

// Simulate the getCategories function from useFlashcards.js
const simulateGetCategories = (flashcards, showDueTodayOnly = false, showStarredOnly = false) => {
  console.log('\n📊 SIMULATING getCategories() FUNCTION:');
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
};

// Simulate the getSubCategories function
const simulateGetSubCategories = (flashcards, selectedCategory, showDueTodayOnly = false, showStarredOnly = false) => {
  console.log('\n📂 SIMULATING getSubCategories() FUNCTION:');
  console.log(`Selected category: "${selectedCategory}"`);
  console.log(`Filters: showDueTodayOnly=${showDueTodayOnly}, showStarredOnly=${showStarredOnly}`);
  
  let filteredCards = flashcards;
  
  // 1. Filter out inactive cards
  filteredCards = filteredCards.filter(card => card.active !== false);
  
  // 2. Filter by selected category (unless "All")
  if (selectedCategory !== 'All') {
    filteredCards = filteredCards.filter(card => card.category === selectedCategory);
    console.log(`  After category filter ("${selectedCategory}"): ${filteredCards.length} cards`);
  }
  
  // 3. Apply starred filter if enabled
  if (showStarredOnly) {
    filteredCards = filteredCards.filter(card => card.starred === true);
    console.log(`  After starred filter: ${filteredCards.length} cards`);
  }
  
  // 4. Apply due date filter if enabled
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
    console.log(`  After due date filter: ${filteredCards.length} cards`);
  }
  
  // 5. Extract subcategories
  const subCategories = [...new Set(filteredCards.map(card => card.sub_category || 'Uncategorized'))];
  console.log(`  Subcategories found: [${subCategories.join(', ')}]`);
  
  return subCategories.sort();
};

// Analyze AWS-specific issues
const analyzeAWSIssues = (flashcards) => {
  console.log('\n🔍 AWS-SPECIFIC ANALYSIS:');
  
  const awsCards = flashcards.filter(card => {
    const category = (card.category || '').toLowerCase();
    return category.includes('aws');
  });
  
  console.log(`Total AWS-related cards: ${awsCards.length}`);
  
  if (awsCards.length === 0) {
    console.log('❌ No AWS cards found at all');
    return { awsCards: [], issues: ['No AWS cards exist'] };
  }
  
  const issues = [];
  
  awsCards.forEach((card, index) => {
    console.log(`\n  AWS Card ${index + 1}:`);
    console.log(`    ID: ${card.id}`);
    console.log(`    Category: "${card.category}"`);
    console.log(`    Subcategory: "${card.sub_category}"`);
    console.log(`    Active: ${card.active}`);
    console.log(`    Due Date: ${card.dueDate.toISOString().split('T')[0]}`);
    console.log(`    Starred: ${card.starred}`);
    
    // Check for issues
    if (card.active === false) {
      issues.push(`Card ${card.id} is inactive`);
    }
    
    if (card.category !== 'AWS') {
      issues.push(`Card ${card.id} has category "${card.category}" instead of "AWS"`);
    }
    
    if (card.dueDate > new Date()) {
      issues.push(`Card ${card.id} has future due date (${card.dueDate.toISOString().split('T')[0]})`);
    }
  });
  
  console.log('\n  Issues found:');
  if (issues.length === 0) {
    console.log('    ✅ No issues detected with AWS cards');
  } else {
    issues.forEach(issue => console.log(`    ❌ ${issue}`));
  }
  
  return { awsCards, issues };
};

// Test all scenarios
const runComprehensiveTests = (flashcards) => {
  console.log('\n🧪 COMPREHENSIVE TESTING:');
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
    
    const categories = simulateGetCategories(flashcards, scenario.showDueTodayOnly, scenario.showStarredOnly);
    
    // Test subcategories for each category
    const subcategoryResults = {};
    categories.forEach(category => {
      const subCategories = simulateGetSubCategories(flashcards, category, scenario.showDueTodayOnly, scenario.showStarredOnly);
      subcategoryResults[category] = subCategories;
    });
    
    results[scenario.name] = {
      categories,
      subcategoryResults,
      awsIncluded: categories.includes('AWS') || categories.includes('aws')
    };
    
    console.log(`\n  RESULTS:`);
    console.log(`    Categories: [${categories.join(', ')}]`);
    console.log(`    AWS included: ${results[scenario.name].awsIncluded ? '✅ YES' : '❌ NO'}`);
    console.log(`    Subcategories per category:`);
    Object.entries(subcategoryResults).forEach(([cat, subs]) => {
      console.log(`      ${cat}: [${subs.join(', ')}]`);
    });
  });
  
  return results;
};

// Generate recommendations
const generateRecommendations = (results, awsAnalysis) => {
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('='.repeat(50));
  
  console.log('\n🎯 AWS CATEGORY ISSUES:');
  if (awsAnalysis.awsCards.length === 0) {
    console.log('❌ No AWS cards found');
    console.log('   → Create AWS cards in your app');
  } else {
    console.log(`✅ ${awsAnalysis.awsCards.length} AWS cards found`);
    
    if (awsAnalysis.issues.length > 0) {
      console.log('❌ Issues with AWS cards:');
      awsAnalysis.issues.forEach(issue => console.log(`   → ${issue}`));
    }
    
    // Check if AWS appears in any scenario
    const awsAppearsInAnyScenario = Object.values(results).some(result => result.awsIncluded);
    
    if (!awsAppearsInAnyScenario) {
      console.log('❌ AWS doesn\'t appear in any scenario');
      console.log('   → Check if all AWS cards are inactive');
      console.log('   → Check if AWS cards have future due dates');
      console.log('   → Check for case sensitivity issues ("aws" vs "AWS")');
    } else {
      console.log('✅ AWS appears in some scenarios');
    }
  }
  
  console.log('\n🎯 SUBCATEGORY FILTERING ISSUES:');
  
  // Check if subcategories are working properly
  const subcategoryIssues = [];
  
  Object.entries(results).forEach(([scenarioName, result]) => {
    Object.entries(result.subcategoryResults).forEach(([category, subcategories]) => {
      if (subcategories.length === 0) {
        subcategoryIssues.push(`${scenarioName}: ${category} has no subcategories`);
      }
    });
  });
  
  if (subcategoryIssues.length === 0) {
    console.log('✅ Subcategory filtering appears to work correctly');
  } else {
    console.log('❌ Subcategory filtering issues:');
    subcategoryIssues.forEach(issue => console.log(`   → ${issue}`));
  }
  
  console.log('\n🔧 IMMEDIATE ACTIONS:');
  console.log('1. Check Manage Cards for AWS card status');
  console.log('2. Verify AWS cards are active and have correct category name');
  console.log('3. Test subcategory filtering by selecting different categories');
  console.log('4. Check if filters are affecting visibility');
  console.log('5. Try creating a new test AWS card');
};

// Main execution
const main = () => {
  console.log('Creating test data based on your console logs...\n');
  
  const flashcards = createTestData();
  console.log(`📊 Test data created: ${flashcards.length} flashcards`);
  
  // Show data summary
  const categoryCounts = {};
  flashcards.forEach(card => {
    const cat = card.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  
  console.log('\n📂 Category distribution:');
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} cards`);
  });
  
  // Run analysis
  const awsAnalysis = analyzeAWSIssues(flashcards);
  const results = runComprehensiveTests(flashcards);
  generateRecommendations(results, awsAnalysis);
  
  console.log('\n✅ Diagnostic complete!');
  console.log('Compare these results with your actual app behavior to identify the specific issues.');
};

// Run the diagnostic
main();
