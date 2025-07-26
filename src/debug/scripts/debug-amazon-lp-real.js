// Script to debug the real Amazon LP subcategory issue

// Add to window for browser console access
window.debugAmazonLP = function() {
  console.log('🔍 DEBUGGING REAL AMAZON LP SUBCATEGORIES');
  console.log('=========================================');
  
  // Try to get React component state (this is tricky but sometimes works)
  const categoryButtons = document.querySelectorAll('.filter-btn');
  const amazonLPButton = Array.from(categoryButtons).find(btn => btn.textContent.includes('Amazon LP'));
  
  if (!amazonLPButton) {
    console.log('❌ Amazon LP button not found');
    return;
  }
  
  const isActive = amazonLPButton.classList.contains('active');
  console.log(`Amazon LP button active: ${isActive}`);
  
  if (!isActive) {
    console.log('🔄 Clicking Amazon LP to activate...');
    amazonLPButton.click();
    
    // Wait for React to update
    setTimeout(() => {
      window.debugAmazonLP(); // Recursive call after click
    }, 200);
    return;
  }
  
  // Amazon LP is selected, now check subcategories
  const subcategorySection = document.querySelector('.subcategory-section');
  if (!subcategorySection) {
    console.log('❌ Subcategory section not found');
    return;
  }
  
  const isCollapsed = subcategorySection.classList.contains('collapsed');
  console.log(`Subcategory section collapsed: ${isCollapsed}`);
  
  if (isCollapsed) {
    console.log('🔄 Expanding subcategory section...');
    const collapseButton = subcategorySection.querySelector('.collapse-toggle');
    if (collapseButton) {
      collapseButton.click();
      setTimeout(() => {
        window.debugAmazonLP(); // Recursive call after expand
      }, 200);
      return;
    }
  }
  
  // Get subcategory buttons
  const subcategoryButtons = subcategorySection.querySelectorAll('.filter-btn');
  console.log(`\\n📊 SUBCATEGORIES FOUND: ${subcategoryButtons.length}`);
  
  const subcategories = [];
  subcategoryButtons.forEach((btn, i) => {
    const text = btn.textContent.trim();
    const isActive = btn.classList.contains('active');
    console.log(`${i + 1}. ${text} (active: ${isActive})`);
    subcategories.push(text);
  });
  
  // Parse the counts
  const subcategoryCounts = {};
  let totalCount = 0;
  
  subcategories.forEach(subcat => {
    const match = subcat.match(/^(.+?)\\s*\\((\\d+)\\)$/);
    if (match) {
      const name = match[1];
      const count = parseInt(match[2]);
      subcategoryCounts[name] = count;
      totalCount += count;
      console.log(`  Parsed: "${name}" = ${count} cards`);
    }
  });
  
  console.log(`\\n📈 SUMMARY:`);
  console.log(`Total subcategories: ${Object.keys(subcategoryCounts).length}`);
  console.log(`Total cards in subcategories: ${totalCount}`);
  console.log(`Expected total (from category): 8 cards`);
  console.log(`Missing cards: ${8 - totalCount}`);
  
  // Check if "Uncategorized" is present
  const hasUncategorized = 'Uncategorized' in subcategoryCounts;
  console.log(`Has "Uncategorized": ${hasUncategorized}`);
  
  if (!hasUncategorized) {
    console.log('\\n❌ PROBLEM: "Uncategorized" subcategory missing!');
    console.log('This suggests cards with empty sub_category are not showing.');
  }
  
  console.log('\\n🔍 WHAT THIS TELLS US:');
  if (totalCount === 8) {
    console.log('✅ All 8 cards are accounted for in subcategories');
    console.log('✅ No missing cards - the subcategory logic is working correctly');
  } else if (totalCount < 8) {
    console.log(`❌ ${8 - totalCount} cards are missing from subcategories`);
    console.log('❌ Some cards are not appearing in any subcategory');
  } else {
    console.log(`❌ More cards (${totalCount}) than expected (8) - possible counting error`);
  }
  
  return {
    subcategories: Object.keys(subcategoryCounts),
    counts: subcategoryCounts,
    totalCount,
    hasUncategorized
  };
};

console.log('\\n🚀 RUN THIS IN BROWSER CONSOLE:');
console.log('================================');
console.log('window.debugAmazonLP()');
console.log('\\nThis will:');
console.log('1. Click Amazon LP if not selected');
console.log('2. Expand subcategories if collapsed');
console.log('3. Count and analyze all subcategories');
console.log('4. Tell you exactly what\'s missing');

// Auto-run if we're in browser
if (typeof window !== 'undefined' && window.document) {
  setTimeout(() => {
    console.log('\\n🔄 Auto-running Amazon LP debug...');
    if (typeof window.debugAmazonLP === 'function') {
      window.debugAmazonLP();
    }
  }, 1000);
}