#!/usr/bin/env node

/**
 * Debug script to analyze level count inconsistencies
 * Run this in the browser console to see what's happening with level counts
 */

console.log('🔍 LEVEL COUNT DEBUG SCRIPT');
console.log('===============================');

console.log(`
INSTRUCTIONS:
1. Open your browser and go to the flashcard app
2. Select "Spring Rest" subcategory (or any subcategory with count issues)
3. Open Developer Tools (F12) 
4. Go to Console tab
5. Copy and paste this code into the console:

// === START COPY FROM HERE ===

console.log('🔍 LEVEL COUNT ANALYSIS');
console.log('========================');

// Get flashcards data
if (!window.flashcards || !Array.isArray(window.flashcards)) {
  console.error('❌ window.flashcards not found or not an array');
} else {
  const allCards = window.flashcards;
  console.log('Total flashcards:', allCards.length);

  // Get current filter state
  const hookState = window.flashcardHookState || {};
  const selectedCategory = hookState.selectedCategory || 'All';
  const selectedSubCategory = hookState.selectedSubCategory || 'All';
  
  console.log('Current filters:', {
    selectedCategory,
    selectedSubCategory
  });

  // Filter cards like the app does
  let filteredCards = allCards.filter(card => card.active !== false);
  console.log('Active cards:', filteredCards.length);

  if (selectedCategory !== 'All') {
    filteredCards = filteredCards.filter(card => {
      const cardCategory = card.category && card.category.trim() ? card.category : 'Uncategorized';
      return cardCategory === selectedCategory;
    });
    console.log(\`Cards in "\${selectedCategory}" category:\`, filteredCards.length);
  }

  if (selectedSubCategory !== 'All') {
    filteredCards = filteredCards.filter(card => {
      const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      return cardSubCategory === selectedSubCategory;
    });
    console.log(\`Cards in "\${selectedSubCategory}" subcategory:\`, filteredCards.length);
  }

  // Analyze levels
  console.log('\\n📊 LEVEL ANALYSIS FOR FILTERED CARDS:');
  console.log('=====================================');

  const levelCounts = {};
  const cardsWithoutLevel = [];
  const cardsWithEmptyLevel = [];

  filteredCards.forEach((card, index) => {
    let level = card.level;
    
    // If no level, try to infer from FSRS (reproduce the app logic)
    if (!level) {
      const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
      
      if (difficulty >= 8) level = 'again';
      else if (difficulty >= 7) level = 'hard';
      else if (difficulty <= 3 && easeFactor >= 2.8) level = 'easy';
      else if (interval >= 4) level = 'good';
      else level = 'new';
    }

    if (!level || level.trim() === '') {
      cardsWithEmptyLevel.push({
        index,
        id: card.id,
        question: card.question?.substring(0, 50) || 'No question',
        originalLevel: card.level,
        difficulty: card.difficulty,
        easeFactor: card.easeFactor,
        interval: card.interval
      });
    } else {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }

    if (!card.level) {
      cardsWithoutLevel.push({
        index,
        id: card.id,
        question: card.question?.substring(0, 50) || 'No question',
        inferredLevel: level,
        difficulty: card.difficulty,
        easeFactor: card.easeFactor,
        interval: card.interval
      });
    }
  });

  console.log('Level counts by inferred level:', levelCounts);
  console.log('Total cards with levels:', Object.values(levelCounts).reduce((sum, count) => sum + count, 0));
  console.log('Cards with empty/null levels:', cardsWithEmptyLevel.length);
  console.log('Cards without original level (inferred):', cardsWithoutLevel.length);

  // Show details
  if (cardsWithEmptyLevel.length > 0) {
    console.log('\\n⚠️ Cards with empty/null levels:', cardsWithEmptyLevel);
  }

  if (cardsWithoutLevel.length > 0) {
    console.log('\\n📝 Cards without original level (showing inferred):', cardsWithoutLevel);
  }

  // Compare with subcategory count
  console.log('\\n🔍 COMPARISON:');
  console.log('================');
  console.log(\`Subcategory "\${selectedSubCategory}" should have: \${filteredCards.length} cards\`);
  const totalLevelCards = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);
  console.log(\`Level counts total: \${totalLevelCards} cards\`);
  console.log(\`Difference: \${filteredCards.length - totalLevelCards} cards\`);

  if (filteredCards.length !== totalLevelCards) {
    console.error('❌ MISMATCH FOUND! Subcategory count does not match level totals');
    console.log('This suggests some cards are not being counted in levels');
  } else {
    console.log('✅ Counts match - no issue found');
  }

  // Show level breakdown
  console.log('\\n📋 LEVEL BREAKDOWN:');
  Object.entries(levelCounts).sort(([,a], [,b]) => b - a).forEach(([level, count]) => {
    console.log(\`  \${level}: \${count} cards\`);
  });
}

// === END COPY TO HERE ===

6. Analyze the output to see:
   - What levels are being calculated vs. displayed
   - Whether there are cards with missing/empty levels
   - If the total counts match between subcategory and levels
`);