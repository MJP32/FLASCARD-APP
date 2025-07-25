// Script to check sub-category state and trigger debug logs

console.log('🔍 CHECKING SUB-CATEGORY STATE');
console.log('==============================');

// Add this to window object for easy browser console access
window.checkSubcategoryDebug = function() {
  console.log('🔍 Current App State Check:');
  
  // Check if React app exists
  if (typeof window.React === 'undefined') {
    console.log('❌ React not found - app may not be loaded');
    return;
  }
  
  // Try to access common elements
  const categoryButtons = document.querySelectorAll('.filter-btn');
  const subcategorySection = document.querySelector('.subcategory-section');
  const amazonLPButton = Array.from(categoryButtons).find(btn => btn.textContent.includes('Amazon LP'));
  
  console.log('📊 DOM Element Check:');
  console.log(`- Total filter buttons: ${categoryButtons.length}`);
  console.log(`- Subcategory section exists: ${!!subcategorySection}`);
  console.log(`- Amazon LP button exists: ${!!amazonLPButton}`);
  console.log(`- Amazon LP button active: ${amazonLPButton?.classList.contains('active')}`);
  
  if (subcategorySection) {
    const isCollapsed = subcategorySection.classList.contains('collapsed');
    const subcategoryButtons = subcategorySection.querySelectorAll('.filter-btn');
    console.log(`- Subcategory section collapsed: ${isCollapsed}`);
    console.log(`- Subcategory buttons count: ${subcategoryButtons.length}`);
    
    console.log('📋 Subcategory buttons:');
    subcategoryButtons.forEach((btn, i) => {
      console.log(`  ${i + 1}. ${btn.textContent} (active: ${btn.classList.contains('active')})`);
    });
  }
  
  // Check if we can click Amazon LP
  if (amazonLPButton && !amazonLPButton.classList.contains('active')) {
    console.log('\\n🔄 Clicking Amazon LP button to trigger debug logs...');
    amazonLPButton.click();
    
    setTimeout(() => {
      console.log('\\n📝 After clicking Amazon LP:');
      const newSubcategoryButtons = document.querySelectorAll('.subcategory-section .filter-btn');
      console.log(`- New subcategory buttons count: ${newSubcategoryButtons.length}`);
      newSubcategoryButtons.forEach((btn, i) => {
        console.log(`  ${i + 1}. ${btn.textContent}`);
      });
    }, 100);
  }
  
  return {
    categoryButtons: categoryButtons.length,
    hasSubcategorySection: !!subcategorySection,
    hasAmazonLPButton: !!amazonLPButton,
    amazonLPActive: amazonLPButton?.classList.contains('active')
  };
};

// Instructions for user
console.log('\\n🚀 INSTRUCTIONS:');
console.log('================');
console.log('1. Run: window.checkSubcategoryDebug()');
console.log('2. This will check current state and try to click Amazon LP');
console.log('3. Look for the debug logs after clicking');
console.log('4. If no debug logs appear, there may be an issue with the category selection');

// Auto-run if in browser
if (typeof window !== 'undefined' && window.document) {
  // Wait a bit for page to load, then run
  setTimeout(() => {
    console.log('\\n🔄 Auto-running subcategory check...');
    window.checkSubcategoryDebug();
  }, 1000);
}