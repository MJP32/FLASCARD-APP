export const debugAmazonLP = (flashcards) => {
  console.log('=== AMAZON LP DEBUG ===');
  
  // Find all cards that might be Amazon LP
  const amazonCards = flashcards.filter(card => {
    const category = (card.category || '').toLowerCase();
    return category.includes('amazon') || category.includes('lp') || category.includes('leadership');
  });
  
  console.log(`Found ${amazonCards.length} cards that might be Amazon LP`);
  
  if (amazonCards.length > 0) {
    console.log('\nAmazon LP cards:');
    amazonCards.forEach((card, index) => {
      console.log(`${index + 1}. Category: "${card.category}", Active: ${card.active !== false}, Question: ${card.question?.substring(0, 50)}...`);
    });
  }
  
  // Check all unique categories
  const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  console.log('\n📁 All unique categories in database:');
  allCategories.sort().forEach(cat => {
    const count = flashcards.filter(card => (card.category || 'Uncategorized') === cat).length;
    const activeCount = flashcards.filter(card => (card.category || 'Uncategorized') === cat && card.active !== false).length;
    console.log(`  - "${cat}": ${count} cards (${activeCount} active)`);
  });
  
  // Check for similar categories
  const similarCategories = allCategories.filter(cat => {
    const lower = cat.toLowerCase();
    return lower.includes('amazon') || lower.includes('lp') || lower.includes('leadership') || lower.includes('principle');
  });
  
  if (similarCategories.length > 0) {
    console.log('\n🔍 Categories that might be related to Amazon LP:');
    similarCategories.forEach(cat => {
      console.log(`  - "${cat}"`);
    });
  }
  
  console.log('\n=== END AMAZON LP DEBUG ===');
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.debugAmazonLP = debugAmazonLP;
}