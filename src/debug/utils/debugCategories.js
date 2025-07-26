export const debugCategories = (flashcards) => {
  console.log('=== CATEGORY/SUBCATEGORY DEBUG ===');
  
  // Group by category
  const categoryMap = {};
  
  flashcards.forEach(card => {
    const category = card.category || 'Uncategorized';
    const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
    const isActive = card.active !== false;
    const isDue = card.dueDate && new Date(card.dueDate.toDate ? card.dueDate.toDate() : card.dueDate) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1);
    
    if (!categoryMap[category]) {
      categoryMap[category] = {
        total: 0,
        active: 0,
        due: 0,
        subcategories: {}
      };
    }
    
    categoryMap[category].total++;
    if (isActive) categoryMap[category].active++;
    if (isDue) categoryMap[category].due++;
    
    if (!categoryMap[category].subcategories[subCategory]) {
      categoryMap[category].subcategories[subCategory] = {
        total: 0,
        active: 0,
        due: 0
      };
    }
    
    categoryMap[category].subcategories[subCategory].total++;
    if (isActive) categoryMap[category].subcategories[subCategory].active++;
    if (isDue) categoryMap[category].subcategories[subCategory].due++;
  });
  
  // Display results
  Object.entries(categoryMap).forEach(([category, data]) => {
    console.log(`\n📁 Category: ${category}`);
    console.log(`   Total: ${data.total}, Active: ${data.active}, Due: ${data.due}`);
    console.log(`   Subcategories (${Object.keys(data.subcategories).length}):`);
    
    Object.entries(data.subcategories).forEach(([subCategory, subData]) => {
      console.log(`     - ${subCategory}: Total ${subData.total}, Active ${subData.active}, Due ${subData.due}`);
    });
  });
  
  console.log('\n=== END DEBUG ===');
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.debugCategories = debugCategories;
}