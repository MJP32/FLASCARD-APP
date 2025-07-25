export const debugCategorySubcategoryMismatch = (flashcards, showDueTodayOnly, selectedCategory) => {
  console.log('=== CATEGORY/SUBCATEGORY MISMATCH DEBUG ===');
  console.log('Current filters:', { showDueTodayOnly, selectedCategory });
  
  // Get all cards for Amazon LP (or any specified category)
  const searchCategory = 'Amazon LP'; // You can change this to debug other categories
  
  const amazonLPCards = flashcards.filter(card => {
    return (card.category || 'Uncategorized') === searchCategory;
  });
  
  console.log(`\n📁 Found ${amazonLPCards.length} cards in "${searchCategory}" category`);
  
  if (amazonLPCards.length === 0) {
    console.log('❌ No cards found with this exact category name');
    console.log('💡 Checking for similar category names...');
    
    const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
    const similarCategories = allCategories.filter(cat => {
      const lower = cat.toLowerCase();
      return lower.includes('amazon') || lower.includes('lp') || lower.includes('leadership');
    });
    
    console.log('Similar categories found:', similarCategories);
    return;
  }
  
  // Check card status
  const activeCards = amazonLPCards.filter(card => card.active !== false);
  console.log(`📊 ${activeCards.length} active cards out of ${amazonLPCards.length} total`);
  
  // Check due dates if in due cards mode
  if (showDueTodayOnly) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const dueCards = activeCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate < endOfToday;
    });
    
    console.log(`⏰ ${dueCards.length} cards are due today in "${searchCategory}"`);
    
    if (dueCards.length === 0) {
      console.log('❌ This explains why the category is not showing in due cards mode');
      console.log('💡 The category has no due cards, so it gets filtered out');
    }
  }
  
  // Check subcategories
  const subcategories = [...new Set(amazonLPCards.map(card => {
    return card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
  }))];
  
  console.log(`\n📂 Subcategories in "${searchCategory}":`, subcategories);
  
  // Check each subcategory for due cards
  subcategories.forEach(subcat => {
    const subcatCards = amazonLPCards.filter(card => {
      const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      return cardSubCategory === subcat && card.active !== false;
    });
    
    console.log(`\n  📂 Subcategory: "${subcat}"`);
    console.log(`     Total cards: ${subcatCards.length}`);
    
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      const dueSuSubcatCards = subcatCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate < endOfToday;
      });
      
      console.log(`     Due cards: ${dueSuSubcatCards.length}`);
      
      if (dueSuSubcatCards.length > 0) {
        console.log(`     ✅ This subcategory should be visible in due cards mode`);
      }
    }
  });
  
  // Simulate the getCategories() logic
  console.log('\n🔍 Simulating getCategories() logic:');
  
  let filteredCards = flashcards.filter(card => card.active !== false);
  console.log(`Step 1: Active cards: ${filteredCards.length}`);
  
  if (showDueTodayOnly) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    filteredCards = filteredCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate < endOfToday;
    });
    console.log(`Step 2: Due cards: ${filteredCards.length}`);
  }
  
  const categories = [...new Set(filteredCards.map(card => card.category || 'Uncategorized'))];
  console.log(`Step 3: Categories found:`, categories);
  
  const hasAmazonLP = categories.includes(searchCategory);
  console.log(`Step 4: "${searchCategory}" in categories list: ${hasAmazonLP}`);
  
  // Recommendation
  console.log('\n💡 Recommendation:');
  if (!hasAmazonLP && subcategories.length > 0) {
    console.log('❌ ISSUE CONFIRMED: Category is missing but subcategories exist');
    console.log('🔧 SOLUTION: Modify getCategories() to include categories that have due cards in ANY subcategory');
  } else if (hasAmazonLP) {
    console.log('✅ Category should be showing - check other filters or UI rendering');
  }
  
  console.log('\n=== END MISMATCH DEBUG ===');
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.debugCategorySubcategoryMismatch = debugCategorySubcategoryMismatch;
}