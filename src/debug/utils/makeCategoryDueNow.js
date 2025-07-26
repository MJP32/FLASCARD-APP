export const makeCategoryDueNow = async (categoryName) => {
  console.log(`🎯 Making all "${categoryName}" cards due now...`);
  
  if (!window.flashcards) {
    console.error('❌ Flashcards not available');
    return;
  }
  
  // Find all cards in the specified category
  const categoryCards = window.flashcards.filter(card => 
    (card.category || 'Uncategorized') === categoryName && card.active !== false
  );
  
  if (categoryCards.length === 0) {
    console.log(`❌ No active cards found in "${categoryName}" category`);
    return;
  }
  
  console.log(`📋 Found ${categoryCards.length} cards in "${categoryName}" category`);
  
  // Use the updateFlashcard function from the hooks
  if (!window.updateFlashcard) {
    console.error('❌ Update function not available. The app needs to be loaded first.');
    return;
  }
  
  const now = new Date();
  let successCount = 0;
  let errorCount = 0;
  
  // Update each card to be due now
  for (const card of categoryCards) {
    try {
      console.log(`⏰ Updating card: ${card.question?.substring(0, 50)}...`);
      
      await window.updateFlashcard(card.id, {
        dueDate: now
      });
      
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to update card ${card.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`✅ Successfully updated ${successCount} cards`);
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} cards`);
  }
  
  console.log(`🎉 "${categoryName}" category should now appear in Due Cards mode!`);
  
  return {
    total: categoryCards.length,
    success: successCount,
    errors: errorCount
  };
};

// Auto-run for AWS category when function is loaded
export const makeAWSDueNow = async () => {
  try {
    console.log('🚀 Auto-running AWS category update...');
    const result = await makeCategoryDueNow('AWS');
    return result;
  } catch (error) {
    console.error('❌ Auto-update failed:', error);
    return null;
  }
};

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.makeCategoryDueNow = makeCategoryDueNow;
}