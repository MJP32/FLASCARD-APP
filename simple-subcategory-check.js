// Simple manual check for subcategory issue

console.log('🔍 SIMPLE SUBCATEGORY CHECK');
console.log('===========================');

console.log('📋 MANUAL STEPS TO CHECK:');
console.log('1. Click on "Amazon LP" category button');
console.log('2. Look at the subcategories that appear');
console.log('3. Count them and compare to expected');
console.log('');

console.log('📊 EXPECTED RESULTS (based on your description):');
console.log('You said you see 7 subcategories:');
console.log('  - Learn and Be Curious (1)');
console.log('  - Insist on the Highest Standards (1)');
console.log('  - Bias for Action (1)');
console.log('  - Are Right A Lot (1)');
console.log('  - Customer Obsession (1)');
console.log('  - Think Big (1)');
console.log('  - Dive Deep (1)');
console.log('  Total: 7 cards');
console.log('');

console.log('📈 WHAT SHOULD HAPPEN:');
console.log('Console shows Amazon LP has 8 cards total.');
console.log('If 7 subcategories show 7 cards, then 1 card is missing.');
console.log('That missing card should appear as "Uncategorized (1)"');
console.log('');

console.log('🔍 DEBUGGING QUESTIONS:');
console.log('1. Do you see exactly 7 subcategories or more?');
console.log('2. Do you see any "Uncategorized" subcategory?');
console.log('3. What is the total count of all subcategory cards?');
console.log('4. Does the subcategory total equal 8 (matching category total)?');
console.log('');

console.log('🚨 POSSIBLE ISSUES:');
console.log('If you see 7 subcategories with 7 total cards:');
console.log('  → 1 card has empty sub_category but not showing as "Uncategorized"');
console.log('  → Bug in subcategory normalization or counting logic');
console.log('');
console.log('If you see 8 subcategories with 8 total cards:');
console.log('  → Everything is working correctly');
console.log('  → The "issue" might be a misunderstanding');
console.log('');

console.log('🔧 IMMEDIATE ACTION:');
console.log('Please tell me:');
console.log('A) How many subcategory buttons do you see for Amazon LP?');
console.log('B) What is the total count across all subcategories?');
console.log('C) Do you see an "Uncategorized" subcategory?');

// Add a simple function to check DOM if available
if (typeof document !== 'undefined') {
  window.checkSubcategoriesNow = function() {
    const subcategoryButtons = document.querySelectorAll('.subcategory-section .filter-btn');
    console.log(`\\n🔍 CURRENT SUBCATEGORY BUTTONS: ${subcategoryButtons.length}`);
    
    let totalCards = 0;
    subcategoryButtons.forEach((btn, i) => {
      const text = btn.textContent.trim();
      const match = text.match(/\\((\\d+)\\)$/);
      const count = match ? parseInt(match[1]) : 0;
      totalCards += count;
      console.log(`  ${i + 1}. ${text}`);
    });
    
    console.log(`\\nTotal cards in subcategories: ${totalCards}`);
    console.log(`Expected from category: 8`);
    console.log(`Difference: ${8 - totalCards}`);
    
    return { count: subcategoryButtons.length, totalCards, buttons: Array.from(subcategoryButtons).map(b => b.textContent.trim()) };
  };
  
  console.log('\\n💡 QUICK CHECK AVAILABLE:');
  console.log('Run: window.checkSubcategoriesNow()');
}