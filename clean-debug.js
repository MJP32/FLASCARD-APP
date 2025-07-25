// Clean debug script for category mismatch issues
// Paste this into browser console (F12) for clean output

(function() {
  console.clear(); // Clear the console first
  
  console.log('🔍 CLEAN CATEGORY DEBUG');
  console.log('='.repeat(40));
  
  // Get flashcards
  const flashcards = window.flashcards || [];
  if (flashcards.length === 0) {
    console.log('❌ No flashcards found. Make sure app is loaded.');
    return;
  }
  
  console.log(`📊 Total flashcards: ${flashcards.length}`);
  
  // Get current filter state
  const showDueTodayOnly = window.showDueTodayOnly || false;
  const showStarredOnly = window.showStarredOnly || false;
  const selectedCategory = window.selectedCategory || 'All';
  
  console.log('\n🔧 Current Filters:');
  console.log(`  Due Today Only: ${showDueTodayOnly}`);
  console.log(`  Starred Only: ${showStarredOnly}`);
  console.log(`  Selected Category: ${selectedCategory}`);
  
  // Analyze categories
  console.log('\n📂 CATEGORY ANALYSIS:');
  
  // Get all unique categories
  const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  console.log(`All categories: [${allCategories.join(', ')}]`);
  
  // Count cards in each category with current filters
  console.log('\n📊 CARD COUNTS BY CATEGORY:');
  
  const categoryCounts = {};
  
  allCategories.forEach(category => {
    // Start with all cards in this category
    let categoryCards = flashcards.filter(card => {
      if (card.active === false) return false; // Skip inactive
      return (card.category || 'Uncategorized') === category;
    });
    
    const totalActive = categoryCards.length;
    
    // Apply current filters
    if (showStarredOnly) {
      categoryCards = categoryCards.filter(card => card.starred === true);
    }
    
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      categoryCards = categoryCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate < endOfToday;
      });
    }
    
    const filteredCount = categoryCards.length;
    categoryCounts[category] = { totalActive, filteredCount };
    
    const status = filteredCount > 0 ? '✅' : '❌';
    console.log(`  ${status} ${category}: ${filteredCount} cards (${totalActive} total active)`);
  });
  
  // Check what categories should show vs what actually shows
  console.log('\n🔍 CATEGORY VISIBILITY CHECK:');
  
  // Categories that should show (have cards with current filters)
  const shouldShow = allCategories.filter(cat => categoryCounts[cat].filteredCount > 0);
  console.log(`Should show: [${shouldShow.join(', ')}]`);
  
  // Try to get what actually shows (if available)
  if (window.categories) {
    const actuallyShowing = window.categories || [];
    console.log(`Actually showing: [${actuallyShowing.join(', ')}]`);
    
    // Find mismatches
    const shouldShowButDont = shouldShow.filter(cat => !actuallyShowing.includes(cat));
    const showButShouldnt = actuallyShowing.filter(cat => !shouldShow.includes(cat));
    
    if (shouldShowButDont.length > 0) {
      console.log(`❌ Should show but don't: [${shouldShowButDont.join(', ')}]`);
    }
    
    if (showButShouldnt.length > 0) {
      console.log(`❌ Show but shouldn't: [${showButShouldnt.join(', ')}]`);
    }
    
    if (shouldShowButDont.length === 0 && showButShouldnt.length === 0) {
      console.log('✅ No mismatches found!');
    }
  } else {
    console.log('⚠️ window.categories not available');
  }
  
  // AWS specific check
  console.log('\n🔍 AWS SPECIFIC CHECK:');
  const awsCards = flashcards.filter(card => {
    const cat = (card.category || '').toLowerCase();
    return cat.includes('aws');
  });
  
  if (awsCards.length === 0) {
    console.log('❌ No AWS cards found');
  } else {
    console.log(`📊 AWS cards found: ${awsCards.length}`);
    awsCards.forEach((card, i) => {
      const activeStatus = card.active !== false ? '✅' : '❌';
      const starredStatus = card.starred ? '⭐' : '⚪';
      
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      const isDue = dueDate <= new Date() ? '⏰' : '⏳';
      
      console.log(`  ${i+1}. "${card.category}" ${activeStatus} ${starredStatus} ${isDue} - ${card.question?.substring(0, 40)}...`);
    });
    
    // Check if AWS should be visible with current filters
    const awsCategory = awsCards.find(card => card.category === 'AWS')?.category || 
                       awsCards.find(card => card.category === 'aws')?.category;
    
    if (awsCategory && categoryCounts[awsCategory]) {
      const awsCount = categoryCounts[awsCategory].filteredCount;
      console.log(`🎯 AWS category "${awsCategory}" should ${awsCount > 0 ? 'SHOW' : 'NOT SHOW'} with current filters`);
    }
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (showStarredOnly && Object.values(categoryCounts).every(c => c.filteredCount === 0)) {
    console.log('⭐ Turn off "Starred Only" filter - no cards are starred');
  }
  
  if (showDueTodayOnly && Object.values(categoryCounts).every(c => c.filteredCount === 0)) {
    console.log('⏰ Turn off "Due Today" filter - no cards are due');
  }
  
  const hasActiveCards = Object.values(categoryCounts).some(c => c.totalActive > 0);
  if (!hasActiveCards) {
    console.log('❌ No active cards found - check if cards are marked as inactive');
  }
  
  console.log('\n✅ Debug complete!');
  
  // Return summary for further inspection
  return {
    totalCards: flashcards.length,
    allCategories,
    categoryCounts,
    shouldShow,
    currentFilters: { showDueTodayOnly, showStarredOnly, selectedCategory },
    awsCards: awsCards.length
  };
})();
