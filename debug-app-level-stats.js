#!/usr/bin/env node

/**
 * Debug script to check actual app state
 * This will help identify why level counts exceed category totals in the real app
 */

console.log('🔍 App Level Statistics Real-World Debug');
console.log('========================================');

console.log(`
This script helps debug the actual app behavior. 

INSTRUCTIONS:
1. Open your browser and go to the flashcard app
2. Open Developer Tools (F12) 
3. Go to Console tab
4. Copy and paste this code into the console:

// === START COPY FROM HERE ===

console.log('🔍 REAL APP DEBUG - Level Statistics');
console.log('====================================');

// Check if the necessary objects exist
if (!window.flashcardHookState) {
  console.error('❌ window.flashcardHookState not found');
} else {
  console.log('✅ window.flashcardHookState found:', window.flashcardHookState);
}

// Check selected category in App.js
const appSelectedCategory = document.querySelector('.filter-btn.active')?.textContent?.split('(')[0]?.trim();
console.log('App selected category from DOM:', appSelectedCategory);

// Check if useFlashcards hook is accessible
if (window.flashcardHook) {
  console.log('✅ window.flashcardHook found:', window.flashcardHook);
} else {
  console.error('❌ window.flashcardHook not found');
}

// Try to access the flashcards data
if (window.flashcards) {
  console.log('✅ window.flashcards found, length:', window.flashcards.length);
  
  // Analyze the flashcards data
  const activeCards = window.flashcards.filter(card => card.active !== false);
  console.log('Active cards:', activeCards.length);
  
  // Show category distribution
  const categoryDistribution = {};
  activeCards.forEach(card => {
    const category = card.category && card.category.trim() ? card.category : 'Uncategorized';
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
  });
  console.log('Category distribution:', categoryDistribution);
  
  // Show level distribution for each category
  Object.keys(categoryDistribution).forEach(category => {
    const categoryCards = activeCards.filter(card => {
      const cardCategory = card.category && card.category.trim() ? card.category : 'Uncategorized';
      return cardCategory === category;
    });
    
    const levelDistribution = {};
    categoryCards.forEach(card => {
      const level = card.level || 'unknown';
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    });
    
    console.log(\`Category "\${category}" level distribution:\`, levelDistribution);
    console.log(\`Category "\${category}" total:\`, categoryCards.length);
  });
  
  // Test the actual getLevelStats function if accessible
  if (window.flashcardHook && typeof window.flashcardHook.getLevelStats === 'function') {
    console.log('Testing actual getLevelStats function...');
    const actualLevelStats = window.flashcardHook.getLevelStats();
    console.log('Actual getLevelStats result:', actualLevelStats);
    
    const actualTotal = Object.values(actualLevelStats).reduce((sum, count) => sum + count, 0);
    console.log('Actual level stats total:', actualTotal);
  }
  
} else {
  console.error('❌ window.flashcards not found');
}

// Check what the UI is showing
console.log('\\n=== UI Analysis ===');
const levelButtons = document.querySelectorAll('.level-section .filter-btn');
if (levelButtons.length > 0) {
  console.log('Level buttons found:', levelButtons.length);
  levelButtons.forEach(btn => {
    const text = btn.textContent.trim();
    console.log('Level button:', text);
  });
} else {
  console.log('No level buttons found in DOM');
}

const categoryButtons = document.querySelectorAll('.filter-section:not(.level-section) .filter-btn');
if (categoryButtons.length > 0) {
  console.log('Category buttons found:', categoryButtons.length);
  categoryButtons.forEach(btn => {
    const text = btn.textContent.trim();
    const isActive = btn.classList.contains('active');
    console.log('Category button:', text, isActive ? '(ACTIVE)' : '');
  });
}

console.log('\\n=== Parameter Mismatch Check ===');
// Check if the selectedCategory parameter is being passed correctly
const hookState = window.flashcardHookState || {};
console.log('Hook state selectedCategory:', hookState.selectedCategory);
console.log('Hook state selectedSubCategory:', hookState.selectedSubCategory);

// === END COPY TO HERE ===

4. After running the code, copy the output and analyze:
   - Are the category totals correct?
   - Do level statistics exceed category totals?
   - Is selectedCategory being passed correctly?
   - Is there a mismatch between DOM and hook state?

5. If you find issues, check:
   - Is selectedCategory parameter being passed to useFlashcards correctly?
   - Are there multiple instances of useFlashcards running?
   - Is there a timing issue with state updates?
`);