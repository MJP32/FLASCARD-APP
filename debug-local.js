#!/usr/bin/env node

/**
 * Local Debug Script for Flashcard Categories
 * 
 * This script analyzes the flashcard app's category generation logic
 * and helps identify why AWS category might not be showing up.
 * 
 * Usage:
 * 1. Save this file as debug-local.js
 * 2. Run: node debug-local.js
 * 3. Or make executable: chmod +x debug-local.js && ./debug-local.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FLASHCARD CATEGORY DEBUG SCRIPT');
console.log('='.repeat(50));

// Mock flashcard data for testing
const mockFlashcards = [
  {
    id: '1',
    category: 'Math',
    sub_category: 'Algebra',
    question: 'What is 2+2?',
    answer: '4',
    active: true,
    dueDate: new Date('2024-01-01'),
    starred: false
  },
  {
    id: '2', 
    category: 'Science',
    sub_category: 'Physics',
    question: 'What is gravity?',
    answer: 'A force',
    active: true,
    dueDate: new Date('2024-12-31'),
    starred: false
  },
  {
    id: '3',
    category: 'AWS', // This should appear in categories
    sub_category: 'EC2',
    question: 'What is EC2?',
    answer: 'Elastic Compute Cloud',
    active: true,
    dueDate: new Date('2024-01-01'),
    starred: false
  },
  {
    id: '4',
    category: 'aws', // Lowercase version
    sub_category: 'S3',
    question: 'What is S3?',
    answer: 'Simple Storage Service',
    active: true,
    dueDate: new Date('2024-01-01'),
    starred: false
  },
  {
    id: '5',
    category: 'AWS',
    sub_category: 'Lambda',
    question: 'What is Lambda?',
    answer: 'Serverless compute',
    active: false, // Inactive card
    dueDate: new Date('2024-01-01'),
    starred: false
  }
];

// Simulate the app's category generation logic
function simulateGetCategories(flashcards, showDueTodayOnly = false, showStarredOnly = false) {
  console.log('\n📊 SIMULATING getCategories() FUNCTION:');
  console.log(`Parameters: showDueTodayOnly=${showDueTodayOnly}, showStarredOnly=${showStarredOnly}`);
  
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
    
    console.log(`Categories with due cards: ${Array.from(categoriesWithDueCards).join(', ')}`);
    
    // Only include categories that have at least one due card
    const categories = Array.from(categoriesWithDueCards);
    return categories.sort();
  }
  
  // 4. For non-due mode, return all categories with active cards
  const categories = [...new Set(filteredCards.map(card => card.category || 'Uncategorized'))];
  console.log(`All categories from active cards: ${categories.join(', ')}`);
  
  return categories.sort();
}

// Analyze the flashcard data
function analyzeFlashcards(flashcards) {
  console.log('\n📋 FLASHCARD ANALYSIS:');
  console.log(`Total flashcards: ${flashcards.length}`);
  
  // Show all cards
  console.log('\nAll cards:');
  flashcards.forEach((card, index) => {
    console.log(`  ${index + 1}. "${card.category}" | Active: ${card.active} | Due: ${card.dueDate.toISOString().split('T')[0]} | Q: ${card.question.substring(0, 40)}...`);
  });
  
  // Unique categories
  const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  console.log(`\nUnique categories (all cards): ${allCategories.join(', ')}`);
  
  // Active cards only
  const activeCards = flashcards.filter(card => card.active !== false);
  const activeCategories = [...new Set(activeCards.map(card => card.category || 'Uncategorized'))];
  console.log(`Active cards: ${activeCards.length}/${flashcards.length}`);
  console.log(`Categories (active only): ${activeCategories.join(', ')}`);
  
  // AWS specific analysis
  console.log('\n🔍 AWS SPECIFIC ANALYSIS:');
  const awsCards = flashcards.filter(card => {
    const category = (card.category || '').toLowerCase();
    return category.includes('aws');
  });
  
  console.log(`AWS cards found: ${awsCards.length}`);
  awsCards.forEach((card, index) => {
    console.log(`  ${index + 1}. Category: "${card.category}" | Active: ${card.active} | Question: ${card.question}`);
  });
  
  // Case sensitivity check
  const exactAWS = flashcards.filter(card => card.category === 'AWS');
  const lowercaseAWS = flashcards.filter(card => card.category === 'aws');
  console.log(`Exact "AWS" matches: ${exactAWS.length}`);
  console.log(`Lowercase "aws" matches: ${lowercaseAWS.length}`);
  
  return { allCategories, activeCategories, awsCards };
}

// Test different scenarios
function testScenarios(flashcards) {
  console.log('\n🧪 TESTING DIFFERENT SCENARIOS:');
  
  console.log('\n--- Scenario 1: Show All Cards ---');
  const allCategories = simulateGetCategories(flashcards, false, false);
  console.log(`Result: ${allCategories.join(', ')}`);
  console.log(`AWS included: ${allCategories.includes('AWS') ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n--- Scenario 2: Due Today Only ---');
  const dueCategories = simulateGetCategories(flashcards, true, false);
  console.log(`Result: ${dueCategories.join(', ')}`);
  console.log(`AWS included: ${dueCategories.includes('AWS') ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n--- Scenario 3: Starred Only ---');
  const starredCategories = simulateGetCategories(flashcards, false, true);
  console.log(`Result: ${starredCategories.join(', ')}`);
  console.log(`AWS included: ${starredCategories.includes('AWS') ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n--- Scenario 4: Due Today + Starred ---');
  const dueStarredCategories = simulateGetCategories(flashcards, true, true);
  console.log(`Result: ${dueStarredCategories.join(', ')}`);
  console.log(`AWS included: ${dueStarredCategories.includes('AWS') ? '✅ YES' : '❌ NO'}`);
}

// Provide recommendations
function provideRecommendations(analysis) {
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (analysis.awsCards.length === 0) {
    console.log('❌ No AWS cards found.');
    console.log('   → Check if the card was saved correctly');
    console.log('   → Verify the category field is not empty');
  } else {
    const activeAWSCards = analysis.awsCards.filter(card => card.active !== false);
    
    if (activeAWSCards.length === 0) {
      console.log('⚠️  AWS cards exist but are all inactive.');
      console.log('   → Activate AWS cards in Manage Cards modal');
    } else {
      console.log('✅ Active AWS cards found.');
      
      // Check for case sensitivity issues
      const hasUppercaseAWS = analysis.awsCards.some(card => card.category === 'AWS');
      const hasLowercaseAWS = analysis.awsCards.some(card => card.category === 'aws');
      
      if (hasLowercaseAWS && !hasUppercaseAWS) {
        console.log('⚠️  AWS cards use lowercase "aws" instead of "AWS"');
        console.log('   → Edit cards to use "AWS" (uppercase) for consistency');
      }
      
      if (hasUppercaseAWS && hasLowercaseAWS) {
        console.log('⚠️  Mixed case: some cards use "AWS", others use "aws"');
        console.log('   → Standardize all cards to use "AWS" (uppercase)');
      }
      
      console.log('   → If still not showing, check due date filtering');
      console.log('   → Try turning off "Due Today" filter');
      console.log('   → Check browser console for JavaScript errors');
    }
  }
}

// Main execution
function main() {
  try {
    console.log('Using mock flashcard data for testing...\n');
    
    const analysis = analyzeFlashcards(mockFlashcards);
    testScenarios(mockFlashcards);
    provideRecommendations(analysis);
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Compare this output with your actual app behavior');
    console.log('2. Check if your AWS card matches the patterns above');
    console.log('3. Verify the category field in your actual AWS card');
    console.log('4. Test with "Due Today" filter on/off');
    console.log('5. Check browser console for any JavaScript errors');
    
    console.log('\n📝 TO DEBUG YOUR ACTUAL DATA:');
    console.log('1. Open browser console (F12) in your app');
    console.log('2. Run: console.log(JSON.stringify(flashcards, null, 2))');
    console.log('3. Copy the output and analyze the AWS card structure');
    
  } catch (error) {
    console.error('❌ Error running debug script:', error);
  }
}

// Run the script
main();
