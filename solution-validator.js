#!/usr/bin/env node

/**
 * Solution Validator
 * 
 * Tests proposed solutions for category and subcategory issues
 * Run with: node solution-validator.js
 */

console.log('🔧 SOLUTION VALIDATOR');
console.log('='.repeat(50));

// Create test scenarios that match your app's issues
const createProblemScenarios = () => {
  return {
    // Scenario 1: AWS cards exist but are inactive
    awsInactive: [
      {
        id: 'aws-1',
        category: 'AWS',
        sub_category: 'EC2',
        question: 'What is EC2?',
        answer: 'Elastic Compute Cloud',
        active: false, // PROBLEM: Inactive
        dueDate: new Date(2024, 0, 1),
        starred: false
      },
      {
        id: 'java-1',
        category: 'Java',
        sub_category: 'Core',
        question: 'What is Java?',
        answer: 'Programming language',
        active: true,
        dueDate: new Date(2024, 0, 1),
        starred: false
      }
    ],
    
    // Scenario 2: AWS cards have wrong case
    awsWrongCase: [
      {
        id: 'aws-1',
        category: 'aws', // PROBLEM: Lowercase
        sub_category: 'EC2',
        question: 'What is EC2?',
        answer: 'Elastic Compute Cloud',
        active: true,
        dueDate: new Date(2024, 0, 1),
        starred: false
      },
      {
        id: 'java-1',
        category: 'Java',
        sub_category: 'Core',
        question: 'What is Java?',
        answer: 'Programming language',
        active: true,
        dueDate: new Date(2024, 0, 1),
        starred: false
      }
    ],
    
    // Scenario 3: AWS cards have future due dates
    awsFutureDue: [
      {
        id: 'aws-1',
        category: 'AWS',
        sub_category: 'EC2',
        question: 'What is EC2?',
        answer: 'Elastic Compute Cloud',
        active: true,
        dueDate: new Date(2025, 11, 31), // PROBLEM: Future date
        starred: false
      },
      {
        id: 'java-1',
        category: 'Java',
        sub_category: 'Core',
        question: 'What is Java?',
        answer: 'Programming language',
        active: true,
        dueDate: new Date(2024, 0, 1),
        starred: false
      }
    ],
    
    // Scenario 4: Subcategory filtering broken
    subcategoryBroken: [
      {
        id: 'alp-1',
        category: 'Amazon LP',
        sub_category: 'Customer Obsession',
        question: 'Customer Obsession question',
        answer: 'Customer answer',
        active: true,
        dueDate: new Date(2024, 0, 1),
        starred: false
      },
      {
        id: 'alp-2',
        category: 'Amazon LP',
        sub_category: 'Ownership',
        question: 'Ownership question',
        answer: 'Ownership answer',
        active: false, // PROBLEM: Some subcategory cards inactive
        dueDate: new Date(2024, 0, 2),
        starred: false
      },
      {
        id: 'alp-3',
        category: 'Amazon LP',
        sub_category: 'Leadership',
        question: 'Leadership question',
        answer: 'Leadership answer',
        active: true,
        dueDate: new Date(2025, 11, 31), // PROBLEM: Future due date
        starred: false
      }
    ]
  };
};

// Test solution: Fix inactive AWS cards
const testFixInactiveAWS = (problemCards) => {
  console.log('\n🔧 TESTING SOLUTION: Fix Inactive AWS Cards');
  console.log('-'.repeat(40));
  
  console.log('BEFORE fix:');
  const beforeCategories = getCategories(problemCards);
  console.log(`  Categories: [${beforeCategories.join(', ')}]`);
  console.log(`  AWS included: ${beforeCategories.includes('AWS') ? '✅' : '❌'}`);
  
  // Apply fix: Activate all AWS cards
  const fixedCards = problemCards.map(card => {
    if ((card.category || '').toLowerCase().includes('aws')) {
      return { ...card, active: true };
    }
    return card;
  });
  
  console.log('\nAFTER fix (activate AWS cards):');
  const afterCategories = getCategories(fixedCards);
  console.log(`  Categories: [${afterCategories.join(', ')}]`);
  console.log(`  AWS included: ${afterCategories.includes('AWS') ? '✅' : '❌'}`);
  
  const fixed = afterCategories.includes('AWS') && !beforeCategories.includes('AWS');
  console.log(`\nResult: ${fixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
  
  return { fixed, beforeCategories, afterCategories };
};

// Test solution: Fix AWS case sensitivity
const testFixAWSCase = (problemCards) => {
  console.log('\n🔧 TESTING SOLUTION: Fix AWS Case Sensitivity');
  console.log('-'.repeat(40));
  
  console.log('BEFORE fix:');
  const beforeCategories = getCategories(problemCards);
  console.log(`  Categories: [${beforeCategories.join(', ')}]`);
  console.log(`  AWS included: ${beforeCategories.includes('AWS') ? '✅' : '❌'}`);
  console.log(`  aws included: ${beforeCategories.includes('aws') ? '✅' : '❌'}`);
  
  // Apply fix: Standardize to uppercase "AWS"
  const fixedCards = problemCards.map(card => {
    if ((card.category || '').toLowerCase() === 'aws') {
      return { ...card, category: 'AWS' };
    }
    return card;
  });
  
  console.log('\nAFTER fix (standardize to "AWS"):');
  const afterCategories = getCategories(fixedCards);
  console.log(`  Categories: [${afterCategories.join(', ')}]`);
  console.log(`  AWS included: ${afterCategories.includes('AWS') ? '✅' : '❌'}`);
  console.log(`  aws included: ${afterCategories.includes('aws') ? '✅' : '❌'}`);
  
  const fixed = afterCategories.includes('AWS') && !beforeCategories.includes('AWS');
  console.log(`\nResult: ${fixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
  
  return { fixed, beforeCategories, afterCategories };
};

// Test solution: Fix due date filtering
const testFixDueDateFiltering = (problemCards) => {
  console.log('\n🔧 TESTING SOLUTION: Fix Due Date Filtering');
  console.log('-'.repeat(40));
  
  console.log('BEFORE fix (with due date filter):');
  const beforeCategories = getCategories(problemCards, true); // showDueTodayOnly = true
  console.log(`  Categories: [${beforeCategories.join(', ')}]`);
  console.log(`  AWS included: ${beforeCategories.includes('AWS') ? '✅' : '❌'}`);
  
  console.log('\nAFTER fix (turn off due date filter):');
  const afterCategories = getCategories(problemCards, false); // showDueTodayOnly = false
  console.log(`  Categories: [${afterCategories.join(', ')}]`);
  console.log(`  AWS included: ${afterCategories.includes('AWS') ? '✅' : '❌'}`);
  
  const fixed = afterCategories.includes('AWS') && !beforeCategories.includes('AWS');
  console.log(`\nResult: ${fixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
  
  return { fixed, beforeCategories, afterCategories };
};

// Test solution: Fix subcategory filtering
const testFixSubcategoryFiltering = (problemCards) => {
  console.log('\n🔧 TESTING SOLUTION: Fix Subcategory Filtering');
  console.log('-'.repeat(40));
  
  const selectedCategory = 'Amazon LP';
  
  console.log(`BEFORE fix (${selectedCategory} subcategories):`);
  const beforeSubcategories = getSubCategories(problemCards, selectedCategory);
  console.log(`  Subcategories: [${beforeSubcategories.join(', ')}]`);
  console.log(`  Count: ${beforeSubcategories.length}`);
  
  // Apply fix: Activate all cards and set due dates to past
  const fixedCards = problemCards.map(card => {
    if (card.category === selectedCategory) {
      return { 
        ...card, 
        active: true, 
        dueDate: new Date(2024, 0, 1) // Set to past date
      };
    }
    return card;
  });
  
  console.log(`\nAFTER fix (activate cards and set due dates):`);
  const afterSubcategories = getSubCategories(fixedCards, selectedCategory);
  console.log(`  Subcategories: [${afterSubcategories.join(', ')}]`);
  console.log(`  Count: ${afterSubcategories.length}`);
  
  const fixed = afterSubcategories.length > beforeSubcategories.length;
  console.log(`\nResult: ${fixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
  
  return { fixed, beforeSubcategories, afterSubcategories };
};

// Helper functions (same as in other scripts)
const getCategories = (flashcards, showDueTodayOnly = false, showStarredOnly = false) => {
  let filteredCards = flashcards.filter(card => card.active !== false);
  
  if (showStarredOnly) {
    filteredCards = filteredCards.filter(card => card.starred === true);
  }
  
  if (showDueTodayOnly) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const categoriesWithDueCards = new Set();
    filteredCards.forEach(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate < endOfToday) {
        categoriesWithDueCards.add(card.category || 'Uncategorized');
      }
    });
    
    return Array.from(categoriesWithDueCards).sort();
  }
  
  const categories = [...new Set(filteredCards.map(card => card.category || 'Uncategorized'))];
  return categories.sort();
};

const getSubCategories = (flashcards, selectedCategory, showDueTodayOnly = false, showStarredOnly = false) => {
  let filteredCards = flashcards.filter(card => card.active !== false);
  
  if (selectedCategory !== 'All') {
    filteredCards = filteredCards.filter(card => card.category === selectedCategory);
  }
  
  if (showStarredOnly) {
    filteredCards = filteredCards.filter(card => card.starred === true);
  }
  
  if (showDueTodayOnly) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    filteredCards = filteredCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      return dueDate < endOfToday;
    });
  }
  
  const subCategories = [...new Set(filteredCards.map(card => card.sub_category || 'Uncategorized'))];
  return subCategories.sort();
};

// Run all solution tests
const runAllSolutionTests = () => {
  console.log('🧪 TESTING ALL PROPOSED SOLUTIONS');
  console.log('='.repeat(50));
  
  const scenarios = createProblemScenarios();
  const results = {};
  
  // Test AWS inactive solution
  console.log('\n' + '='.repeat(30) + ' AWS INACTIVE SCENARIO ' + '='.repeat(30));
  results.awsInactive = testFixInactiveAWS(scenarios.awsInactive);
  
  // Test AWS case sensitivity solution
  console.log('\n' + '='.repeat(30) + ' AWS CASE SENSITIVITY SCENARIO ' + '='.repeat(30));
  results.awsWrongCase = testFixAWSCase(scenarios.awsWrongCase);
  
  // Test due date filtering solution
  console.log('\n' + '='.repeat(30) + ' AWS FUTURE DUE DATE SCENARIO ' + '='.repeat(30));
  results.awsFutureDue = testFixDueDateFiltering(scenarios.awsFutureDue);
  
  // Test subcategory filtering solution
  console.log('\n' + '='.repeat(30) + ' SUBCATEGORY FILTERING SCENARIO ' + '='.repeat(30));
  results.subcategoryBroken = testFixSubcategoryFiltering(scenarios.subcategoryBroken);
  
  return results;
};

// Generate final recommendations
const generateFinalRecommendations = (results) => {
  console.log('\n💡 FINAL RECOMMENDATIONS');
  console.log('='.repeat(50));
  
  const workingSolutions = [];
  const failedSolutions = [];
  
  Object.entries(results).forEach(([scenario, result]) => {
    if (result.fixed) {
      workingSolutions.push(scenario);
    } else {
      failedSolutions.push(scenario);
    }
  });
  
  console.log('\n✅ WORKING SOLUTIONS:');
  if (workingSolutions.length === 0) {
    console.log('   None of the tested solutions worked');
  } else {
    workingSolutions.forEach(solution => {
      console.log(`   ✅ ${solution} fix works`);
    });
  }
  
  console.log('\n❌ FAILED SOLUTIONS:');
  if (failedSolutions.length === 0) {
    console.log('   All tested solutions worked');
  } else {
    failedSolutions.forEach(solution => {
      console.log(`   ❌ ${solution} fix didn't work`);
    });
  }
  
  console.log('\n🎯 RECOMMENDED ACTIONS FOR YOUR APP:');
  console.log('1. Check Manage Cards for AWS card status (active/inactive)');
  console.log('2. Verify AWS category name is exactly "AWS" (not "aws")');
  console.log('3. Check if AWS cards have future due dates');
  console.log('4. Turn off "Due Today" filter to see all categories');
  console.log('5. For subcategories: ensure cards are active and have proper due dates');
  
  console.log('\n🔧 CODE FIXES TO IMPLEMENT:');
  console.log('1. Add validation to ensure category names are consistent');
  console.log('2. Add debug logging to track category/subcategory calculations');
  console.log('3. Add force refresh function for manual testing');
  console.log('4. Ensure React components re-render when data changes');
};

// Main execution
const main = () => {
  console.log('Testing proposed solutions for flashcard app issues...\n');
  
  const results = runAllSolutionTests();
  generateFinalRecommendations(results);
  
  console.log('\n✅ Solution validation complete!');
  console.log('Use these results to identify which fixes to apply in your app.');
};

// Run the validator
main();
