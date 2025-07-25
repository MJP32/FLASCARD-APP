#!/usr/bin/env node

// Terminal-based AWS Category Debug Script
// Run with: node debug-terminal.js

const fs = require('fs');
const path = require('path');

console.log('🔍 AWS Category Debug - Terminal Version');
console.log('=====================================\n');

// Function to search for flashcard data in common locations
function findFlashcardData() {
  const possiblePaths = [
    // Local storage simulation files
    './localStorage.json',
    './flashcards.json',
    // Firebase export files
    './firebase-export.json',
    './firestore-export.json',
    // Common data directories
    './data/flashcards.json',
    './src/data/flashcards.json',
    // Check if there are any JSON files with flashcard data
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.flashcards || Array.isArray(data)) {
          console.log(`✅ Found flashcard data in: ${filePath}`);
          return data.flashcards || data;
        }
      } catch (err) {
        console.log(`❌ Error reading ${filePath}: ${err.message}`);
      }
    }
  }

  console.log('❌ No flashcard data files found in common locations');
  console.log('💡 This script works best with exported Firebase data');
  return null;
}

// Function to analyze AWS cards
function analyzeAWSCards(flashcards) {
  if (!Array.isArray(flashcards)) {
    console.log('❌ Invalid flashcard data format');
    return;
  }

  console.log(`📊 Total flashcards: ${flashcards.length}`);

  // Find AWS cards (case insensitive)
  const awsCards = flashcards.filter(card => {
    const category = (card.category || '').toLowerCase();
    return category === 'aws' || category.includes('aws');
  });

  console.log(`🎯 AWS cards found: ${awsCards.length}`);

  if (awsCards.length === 0) {
    console.log('\n❌ No AWS cards found!');
    
    // Show all categories to help debug
    const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
    console.log('\n📋 All categories in your data:');
    allCategories.forEach(cat => {
      const count = flashcards.filter(card => (card.category || 'Uncategorized') === cat).length;
      console.log(`  - ${cat}: ${count} cards`);
    });
    
    return;
  }

  // Analyze AWS cards
  console.log('\n📝 AWS Cards Analysis:');
  awsCards.forEach((card, idx) => {
    let dueDate = card.dueDate;
    
    // Handle Firebase Timestamp objects
    if (dueDate && typeof dueDate === 'object' && dueDate._seconds) {
      dueDate = new Date(dueDate._seconds * 1000);
    } else if (dueDate && typeof dueDate === 'string') {
      dueDate = new Date(dueDate);
    } else if (!dueDate) {
      dueDate = new Date(0);
    }

    const now = new Date();
    const isDue = dueDate <= now;
    const isActive = card.active !== false;

    console.log(`  Card ${idx + 1}:`);
    console.log(`    Question: ${(card.question || '').substring(0, 50)}...`);
    console.log(`    Category: ${card.category}`);
    console.log(`    Due Date: ${dueDate.toISOString()}`);
    console.log(`    Is Due Now: ${isDue}`);
    console.log(`    Is Active: ${isActive}`);
    console.log(`    Is Starred: ${!!card.starred}`);
    console.log('');
  });

  // Summary
  const dueCount = awsCards.filter(card => {
    let dueDate = card.dueDate;
    if (dueDate && typeof dueDate === 'object' && dueDate._seconds) {
      dueDate = new Date(dueDate._seconds * 1000);
    } else if (dueDate && typeof dueDate === 'string') {
      dueDate = new Date(dueDate);
    } else if (!dueDate) {
      dueDate = new Date(0);
    }
    return dueDate <= new Date();
  }).length;

  const activeCount = awsCards.filter(card => card.active !== false).length;

  console.log('📊 Summary:');
  console.log(`  Total AWS cards: ${awsCards.length}`);
  console.log(`  Active AWS cards: ${activeCount}`);
  console.log(`  Due AWS cards: ${dueCount}`);
  
  if (dueCount === 0 && activeCount > 0) {
    console.log('\n💡 Issue found: AWS cards exist but none are due!');
    console.log('   This is why the AWS category isn\'t showing in "Due Today" mode.');
    console.log('   Solution: Use window.forceAWSUpdate() in the browser console.');
  } else if (activeCount === 0) {
    console.log('\n💡 Issue found: All AWS cards are inactive!');
    console.log('   Check if cards were accidentally deactivated.');
  } else if (dueCount > 0) {
    console.log('\n✅ AWS cards look good - they should be visible in the app.');
    console.log('   If not visible, there might be a UI refresh issue.');
  }
}

// Main execution
function main() {
  const flashcards = findFlashcardData();
  
  if (flashcards) {
    analyzeAWSCards(flashcards);
  } else {
    console.log('\n💡 To use this script:');
    console.log('1. Export your Firebase data to a JSON file');
    console.log('2. Save it as "flashcards.json" in this directory');
    console.log('3. Run this script again');
    console.log('\nAlternatively, use the browser console functions:');
    console.log('- window.debugAWSCards()');
    console.log('- window.forceAWSUpdate()');
  }
}

// Run the script
main();
