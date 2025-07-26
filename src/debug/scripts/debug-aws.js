// AWS Category Debug Script
// Copy and paste this entire script into your browser console while your app is running

console.log('🔍 AWS CATEGORY DEBUG SCRIPT STARTING...');

// Function to debug AWS cards
function debugAWSIssue() {
  console.log('\n=== AWS CATEGORY DIAGNOSTIC ===');
  
  // Check if window objects exist
  if (!window.flashcards) {
    console.error('❌ window.flashcards not found - app may not be loaded');
    return;
  }
  
  const flashcards = window.flashcards;
  console.log(`📋 Total flashcards: ${flashcards.length}`);
  
  // Find AWS cards (case insensitive)
  const awsCards = flashcards.filter(card => {
    const category = (card.category || '').toLowerCase();
    return category === 'aws' || category === 'AWS';
  });
  
  console.log(`🎯 AWS cards found: ${awsCards.length}`);
  
  if (awsCards.length === 0) {
    console.log('❌ No AWS cards found. Check if cards were created with category "AWS"');
    
    // Show all unique categories
    const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
    console.log('📊 All categories in system:', allCategories);
    return;
  }
  
  // Analyze each AWS card
  console.log('\n📝 AWS Cards Analysis:');
  awsCards.forEach((card, idx) => {
    let dueDate = card.dueDate || new Date(0);
    if (dueDate && typeof dueDate.toDate === 'function') {
      dueDate = dueDate.toDate();
    }
    
    const now = new Date();
    const isDue = dueDate <= now;
    
    console.log(`Card ${idx + 1}:`, {
      id: card.id,
      question: card.question?.substring(0, 40) + '...',
      category: card.category,
      dueDate: dueDate.toISOString(),
      isDueNow: isDue,
      active: card.active !== false,
      starred: !!card.starred
    });
  });
  
  // Check React state if available
  const reactFiber = document.querySelector('#root')._reactInternalInstance || 
                    document.querySelector('#root')._reactInternals;
  
  if (reactFiber) {
    console.log('\n⚛️ React State Check:');
    // This is a simplified check - in practice, React state inspection is complex
    console.log('React fiber found - state inspection would require more complex logic');
  }
  
  // Manual fix function
  console.log('\n🔧 MANUAL FIX FUNCTIONS:');
  console.log('Run these commands to fix the issue:');
  console.log('1. window.forceAWSUpdate() - Force AWS cards to be due now');
  console.log('2. window.debugAWSCards() - Run built-in diagnostic');
  console.log('3. window.makeCategoryDueNow("AWS") - Make AWS cards due now');
  
  return {
    totalCards: flashcards.length,
    awsCards: awsCards.length,
    awsCardDetails: awsCards
  };
}

// Auto-run the diagnostic
debugAWSIssue();

// Make it available globally
window.debugAWSIssue = debugAWSIssue;

console.log('\n✅ Debug script loaded. Run debugAWSIssue() anytime to re-run diagnostic.');
