// Debug script to analyze Amazon LP subcategory issue

console.log('🔍 DEBUGGING AMAZON LP SUBCATEGORY MISMATCH');
console.log('============================================');

// Mock Amazon LP cards based on what user described
const mockAmazonLPCards = [
  // The 7 that show up correctly
  { id: '1', category: 'Amazon LP', sub_category: 'Learn and Be Curious', active: true },
  { id: '2', category: 'Amazon LP', sub_category: 'Insist on the Highest Standards', active: true },
  { id: '3', category: 'Amazon LP', sub_category: 'Bias for Action', active: true },
  { id: '4', category: 'Amazon LP', sub_category: 'Are Right A Lot', active: true },
  { id: '5', category: 'Amazon LP', sub_category: 'Customer Obsession', active: true },
  { id: '6', category: 'Amazon LP', sub_category: 'Think Big', active: true },
  { id: '7', category: 'Amazon LP', sub_category: 'Dive Deep', active: true },
  
  // The 5 that are likely missing - different scenarios
  { id: '8', category: 'Amazon LP', sub_category: '', active: true }, // Empty string
  { id: '9', category: 'Amazon LP', sub_category: '   ', active: true }, // Whitespace only
  { id: '10', category: 'Amazon LP', sub_category: null, active: true }, // Null
  { id: '11', category: 'Amazon LP', active: true }, // No sub_category field
  { id: '12', category: 'Amazon LP', sub_category: undefined, active: true }, // Undefined
];

console.log('📊 MOCK DATA ANALYSIS:');
console.log(`Total Amazon LP cards: ${mockAmazonLPCards.length}`);

// Analyze each card's sub_category value
console.log('\\n📋 INDIVIDUAL CARD ANALYSIS:');
mockAmazonLPCards.forEach(card => {
  const subCat = card.sub_category;
  const hasField = card.hasOwnProperty('sub_category');
  const isEmpty = !subCat || !subCat.trim();
  const normalizedSubCat = subCat && subCat.trim() ? subCat : 'Uncategorized';
  
  console.log(`Card ${card.id}:`);
  console.log(`  sub_category: ${JSON.stringify(subCat)}`);
  console.log(`  has field: ${hasField}`);
  console.log(`  is empty/null: ${isEmpty}`);
  console.log(`  normalized: "${normalizedSubCat}"`);
  console.log('');
});

// Simulate the getSubCategories logic
function simulateGetSubCategories(cards, selectedCategory) {
  let filteredCards = cards.filter(card => card.active !== false);
  
  if (selectedCategory !== 'All') {
    filteredCards = filteredCards.filter(card => card.category === selectedCategory);
  }
  
  const subCategoriesSet = new Set();
  const subCategoryStats = {};
  
  filteredCards.forEach(card => {
    const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
    subCategoriesSet.add(subCategory);
    subCategoryStats[subCategory] = (subCategoryStats[subCategory] || 0) + 1;
  });
  
  const subCategories = [...subCategoriesSet];
  
  return { subCategories, subCategoryStats };
}

// Test with Amazon LP
console.log('🧪 SUBCATEGORY SIMULATION:');
const result = simulateGetSubCategories(mockAmazonLPCards, 'Amazon LP');

console.log('Subcategories found:', result.subCategories);
console.log('Subcategory counts:', result.subCategoryStats);

const totalSubcategoryCards = Object.values(result.subCategoryStats).reduce((sum, count) => sum + count, 0);
console.log(`Total cards in subcategories: ${totalSubcategoryCards}`);

if (totalSubcategoryCards !== mockAmazonLPCards.length) {
  console.log('❌ MISMATCH DETECTED!');
  console.log(`Expected: ${mockAmazonLPCards.length} cards`);
  console.log(`Found: ${totalSubcategoryCards} cards`);
  console.log(`Missing: ${mockAmazonLPCards.length - totalSubcategoryCards} cards`);
} else {
  console.log('✅ All cards accounted for');
}

// Check if "Uncategorized" appears
const hasUncategorized = result.subCategories.includes('Uncategorized');
const uncategorizedCount = result.subCategoryStats['Uncategorized'] || 0;

console.log(`\\n🔍 UNCATEGORIZED ANALYSIS:`);
console.log(`"Uncategorized" appears: ${hasUncategorized}`);
console.log(`"Uncategorized" count: ${uncategorizedCount}`);

if (!hasUncategorized && uncategorizedCount === 0) {
  console.log('❌ PROBLEM: Cards with empty sub_category should appear as "Uncategorized"');
} else {
  console.log('✅ Empty sub_category cards are handled correctly');
}

// Show what the UI should display
console.log('\\n📺 EXPECTED UI DISPLAY:');
result.subCategories.forEach(subCat => {
  const count = result.subCategoryStats[subCat];
  console.log(`  ${subCat} (${count})`);
});

console.log('\\n🔧 RECOMMENDED FIXES:');
console.log('1. Check if Amazon LP cards have missing or empty sub_category fields');
console.log('2. Verify that empty sub_category cards show as "Uncategorized"');
console.log('3. Look for cards that might be inactive (active: false)');
console.log('4. Check for sub_category values with special characters or encoding issues');
console.log('5. Verify the category field is exactly "Amazon LP" (case-sensitive)');