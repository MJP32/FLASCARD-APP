// Debug script to check empty/null subcategory handling

console.log('🔍 DEBUGGING EMPTY SUBCATEGORY ISSUE');
console.log('====================================');

// Test the exact logic from App.js vs useFlashcards.js
console.log('\n📋 TESTING SUBCATEGORY NORMALIZATION:');

// Test cases: different ways sub_category can be empty
const testCases = [
  { sub_category: '', description: 'Empty string' },
  { sub_category: '   ', description: 'Whitespace only' },
  { sub_category: null, description: 'Null value' },
  { sub_category: undefined, description: 'Undefined value' },
  { sub_category: 'Learn and Be Curious', description: 'Normal value' }
];

console.log('\nApp.js logic (current):');
testCases.forEach(test => {
  const appResult = test.sub_category && test.sub_category.trim() ? test.sub_category : 'Uncategorized';
  console.log(`  ${test.description}: "${test.sub_category}" → "${appResult}"`);
});

console.log('\nuseFlashcards.js logic (current):');
testCases.forEach(test => {
  const hookResult = test.sub_category && test.sub_category.trim() ? test.sub_category : 'Uncategorized';
  console.log(`  ${test.description}: "${test.sub_category}" → "${hookResult}"`);
});

console.log('\n🔍 ANALYSIS:');
console.log('Both App.js and useFlashcards.js use identical logic:');
console.log('  card.sub_category && card.sub_category.trim() ? card.sub_category : "Uncategorized"');
console.log('\nThis should handle all empty cases correctly.');

console.log('\n🚨 POTENTIAL ISSUES:');
console.log('1. React state synchronization between selectedCategory and subCategories');
console.log('2. Timing issue where subcategories render before selectedCategory updates');
console.log('3. The selectedCategory state is not properly passed to getSubCategories');

console.log('\n🔧 DEBUGGING STEPS:');
console.log('Run this in the browser console when Amazon LP is selected:');
console.log('');
console.log('// Check if selectedCategory is properly set');
console.log('console.log("selectedCategory:", window.React?._currentDispatcher?.useState?.[0] || "unknown");');
console.log('');
console.log('// Check subCategories array');
console.log('console.log("subCategories from hook:", window.flashcardHook?.getSubCategories?.() || "not available");');
console.log('');
console.log('// Check actual subcategory buttons');
console.log('const buttons = document.querySelectorAll(".subcategory-section .filter-btn");');
console.log('console.log("Subcategory buttons:", buttons.length);');
console.log('buttons.forEach(btn => console.log("  ", btn.textContent.trim()));');

console.log('\n💡 LIKELY ROOT CAUSE:');
console.log('The selectedCategory state is "All" when subcategories are rendered,');
console.log('even though the user clicked "Amazon LP". This would cause getSubCategories');
console.log('to return ALL subcategories, not just Amazon LP subcategories.');

console.log('\n🔧 POTENTIAL FIX:');
console.log('Ensure selectedCategory state updates are applied before subCategories re-render.');
console.log('This might require adding selectedCategory as a dependency to useFlashcards hook.');