// Script to diagnose and fix subcategory filtering issue

console.log('🔧 SUBCATEGORY ISSUE DIAGNOSTIC');
console.log('==============================');

// Add diagnostic function to window
window.diagnoseSubcategories = function() {
  console.log('🔍 DIAGNOSING SUBCATEGORY ISSUE...');
  
  // Step 1: Check if Amazon LP is selected
  const categoryButtons = document.querySelectorAll('.filter-btn');
  const amazonLPButton = Array.from(categoryButtons).find(btn => 
    btn.textContent.includes('Amazon LP')
  );
  
  if (!amazonLPButton) {
    console.log('❌ Amazon LP button not found');
    return { error: 'Amazon LP button not found' };
  }
  
  const isAmazonLPSelected = amazonLPButton.classList.contains('active');
  console.log(`Amazon LP selected: ${isAmazonLPSelected}`);
  
  if (!isAmazonLPSelected) {
    console.log('🔄 Clicking Amazon LP button...');
    amazonLPButton.click();
    
    // Wait for React to update
    setTimeout(() => {
      window.diagnoseSubcategories();
    }, 500);
    return { status: 'Clicking Amazon LP' };
  }
  
  // Step 2: Check subcategory section
  const subcategorySection = document.querySelector('.subcategory-section');
  if (!subcategorySection) {
    console.log('❌ Subcategory section not found');
    return { error: 'Subcategory section not found' };
  }
  
  const isCollapsed = subcategorySection.classList.contains('collapsed');
  console.log(`Subcategory section collapsed: ${isCollapsed}`);
  
  if (isCollapsed) {
    console.log('🔄 Expanding subcategory section...');
    const expandButton = subcategorySection.querySelector('.collapse-toggle');
    if (expandButton) {
      expandButton.click();
      setTimeout(() => {
        window.diagnoseSubcategories();
      }, 500);
      return { status: 'Expanding subcategories' };
    }
  }
  
  // Step 3: Get all subcategory buttons
  const subcategoryButtons = subcategorySection.querySelectorAll('.filter-btn');
  console.log(`\\n📊 SUBCATEGORY BUTTONS FOUND: ${subcategoryButtons.length}`);
  
  let totalCards = 0;
  const subcategories = [];
  
  subcategoryButtons.forEach((btn, i) => {
    const text = btn.textContent.trim();
    const match = text.match(/^(.+?)\\s*\\((\\d+)\\)$/);
    
    if (match) {
      const name = match[1];
      const count = parseInt(match[2]);
      subcategories.push({ name, count });
      totalCards += count;
      console.log(`${i + 1}. ${name}: ${count} cards`);
    } else {
      console.log(`${i + 1}. ${text} (could not parse count)`);
    }
  });
  
  console.log(`\\n📈 SUMMARY:`);
  console.log(`Total subcategories: ${subcategories.length}`);
  console.log(`Total cards in subcategories: ${totalCards}`);
  console.log(`Expected from category button: 5`);
  console.log(`Missing: ${5 - totalCards}`);
  
  // Step 4: Check for "Uncategorized"
  const hasUncategorized = subcategories.some(sub => sub.name === 'Uncategorized');
  console.log(`Has "Uncategorized": ${hasUncategorized}`);
  
  // Step 5: Diagnosis
  console.log('\\n🚨 DIAGNOSIS:');
  if (totalCards === 5 && subcategories.length >= 1) {
    console.log('✅ Subcategories are working correctly');
    console.log('✅ All 5 cards are accounted for');
  } else if (totalCards < 5) {
    console.log(`❌ Missing ${5 - totalCards} cards from subcategories`);
    console.log('❌ Some cards are not appearing in any subcategory');
    
    if (!hasUncategorized) {
      console.log('💡 Likely issue: Cards with empty sub_category not showing as "Uncategorized"');
    }
  } else if (totalCards > 5) {
    console.log(`❌ Too many cards (${totalCards}) - possible counting error`);
  }
  
  if (subcategories.length === 0) {
    console.log('❌ CRITICAL: No subcategory buttons found at all');
    console.log('💡 This suggests the subcategory rendering is completely broken');
  }
  
  return {
    subcategories,
    totalCards,
    expectedCards: 5,
    hasUncategorized,
    isWorking: totalCards === 5 && subcategories.length >= 1
  };
};

// Instructions
console.log('\\n🚀 TO DIAGNOSE THE ISSUE:');
console.log('=========================');
console.log('1. Run: window.diagnoseSubcategories()');
console.log('2. This will automatically:');
console.log('   - Click Amazon LP if not selected');
console.log('   - Expand subcategories if collapsed');
console.log('   - Count and analyze all subcategories');
console.log('   - Give you a detailed diagnosis');
console.log('');
console.log('💡 The script will tell you exactly what\'s wrong and how to fix it.');

// Auto-run
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('\\n🔄 Auto-running diagnosis...');
    window.diagnoseSubcategories();
  }, 1000);
}