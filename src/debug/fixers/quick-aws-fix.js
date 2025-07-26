// Quick AWS Fix - Paste this into browser console
// Make sure your app is running first!

console.log('🔧 Quick AWS Fix Starting...');

// Simple function to fix AWS cards
async function quickAWSFix() {
  // Check if the app functions are available
  if (!window.flashcards) {
    console.error('❌ App not loaded. Make sure your flashcard app is running and you are logged in.');
    return;
  }
  
  if (!window.updateFlashcard) {
    console.error('❌ Update function not available. Make sure you are logged in to the app.');
    return;
  }
  
  console.log('✅ App functions found. Proceeding with AWS fix...');
  
  // Find AWS cards
  const flashcards = window.flashcards;
  const awsCards = flashcards.filter(card => 
    (card.category || '').toLowerCase() === 'aws' && 
    card.active !== false
  );
  
  console.log(`📋 Found ${awsCards.length} AWS cards`);
  
  if (awsCards.length === 0) {
    console.log('❌ No AWS cards found. Check if cards exist with category "AWS"');
    
    // Show all categories
    const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
    console.log('📊 All categories:', allCategories);
    return;
  }
  
  // Update all AWS cards to be due now
  const now = new Date();
  let updated = 0;
  
  for (const card of awsCards) {
    try {
      await window.updateFlashcard(card.id, { 
        dueDate: now,
        active: true // Ensure card is active
      });
      updated++;
      console.log(`✅ Updated AWS card ${updated}/${awsCards.length}`);
    } catch (error) {
      console.error(`❌ Failed to update card ${card.id}:`, error);
    }
  }
  
  console.log(`🎉 Successfully updated ${updated}/${awsCards.length} AWS cards`);
  
  // Force UI refresh if available
  if (window.forceAWSUpdate) {
    console.log('🔄 Triggering UI refresh...');
    setTimeout(() => {
      window.location.reload(); // Force page reload to ensure UI updates
    }, 1000);
  }
  
  return { total: awsCards.length, updated };
}

// Run the fix
quickAWSFix().then(result => {
  if (result) {
    console.log('✅ AWS fix completed!', result);
  }
}).catch(error => {
  console.error('❌ AWS fix failed:', error);
});
