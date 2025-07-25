// Quick console debug script - paste this into browser console
// Copy and paste this entire script into your browser's developer console (F12)

(function() {
  console.log('🔍 QUICK CATEGORY DEBUG');
  console.log('='.repeat(40));
  
  // Try to get flashcards from React app
  let flashcards = [];
  
  // Method 1: Check if flashcards are in window
  if (window.flashcards) {
    flashcards = window.flashcards;
    console.log('✅ Found flashcards in window.flashcards');
  }
  
  // Method 2: Try to get from React DevTools
  if (flashcards.length === 0) {
    try {
      const reactRoot = document.querySelector('#root')._reactInternalInstance || 
                       document.querySelector('#root')._reactInternals;
      // This is a simplified attempt - React internals are complex
      console.log('🔍 Trying to access React state...');
    } catch (e) {
      console.log('❌ Could not access React state directly');
    }
  }
  
  // Method 3: Check localStorage for any flashcard data
  if (flashcards.length === 0) {
    console.log('🔍 Checking localStorage...');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes('flashcard')) {
        console.log(`Found localStorage key: ${key}`);
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(data)) {
            console.log(`  - Contains ${data.length} items`);
          }
        } catch (e) {
          console.log(`  - Could not parse as JSON`);
        }
      }
    }
  }
  
  if (flashcards.length === 0) {
    console.log('❌ No flashcards found. Try these steps:');
    console.log('1. Make sure the app is fully loaded');
    console.log('2. Navigate to the main flashcard view');
    console.log('3. Open Manage Cards to see if cards exist there');
    console.log('4. Try refreshing the page and running this again');
    return;
  }
  
  console.log(`📊 Found ${flashcards.length} flashcards`);
  
  // Analyze categories
  console.log('\n📂 CATEGORY ANALYSIS:');
  
  // All categories
  const allCategories = flashcards.map(card => card.category || 'Uncategorized');
  const uniqueCategories = [...new Set(allCategories)];
  console.log('All unique categories:', uniqueCategories);
  
  // Category counts
  const counts = {};
  allCategories.forEach(cat => {
    counts[cat] = (counts[cat] || 0) + 1;
  });
  console.log('Category counts:', counts);
  
  // AWS specific
  console.log('\n🔍 AWS ANALYSIS:');
  const awsCards = flashcards.filter(card => {
    const cat = (card.category || '').toLowerCase();
    return cat.includes('aws');
  });
  
  console.log(`AWS cards found: ${awsCards.length}`);
  if (awsCards.length > 0) {
    awsCards.forEach((card, i) => {
      console.log(`  ${i+1}. "${card.category}" - Active: ${card.active !== false} - "${card.question?.substring(0, 50)}..."`);
    });
  }
  
  // Check for case variations
  const caseVariations = flashcards.filter(card => {
    const cat = (card.category || '').toLowerCase();
    return cat === 'aws' || cat === 'Aws' || cat === 'aWs' || cat === 'AWS';
  });
  
  if (caseVariations.length > 0) {
    console.log('\n📝 Case variations found:');
    caseVariations.forEach(card => {
      console.log(`  Category: "${card.category}" (exact case)`);
    });
  }
  
  // Active cards
  const activeCards = flashcards.filter(card => card.active !== false);
  const activeCategories = [...new Set(activeCards.map(card => card.category || 'Uncategorized'))];
  console.log(`\n✅ Active cards: ${activeCards.length}/${flashcards.length}`);
  console.log('Categories with active cards:', activeCategories);
  
  // Due cards
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dueCards = activeCards.filter(card => {
    let dueDate = card.dueDate || new Date(0);
    if (dueDate && typeof dueDate.toDate === 'function') {
      dueDate = dueDate.toDate();
    }
    return dueDate < endOfToday;
  });
  
  const dueCategories = [...new Set(dueCards.map(card => card.category || 'Uncategorized'))];
  console.log(`\n⏰ Due cards: ${dueCards.length}/${activeCards.length}`);
  console.log('Categories with due cards:', dueCategories);
  
  // Final recommendation
  console.log('\n💡 RECOMMENDATION:');
  if (awsCards.length === 0) {
    console.log('❌ No AWS cards found. Check if card was saved correctly.');
  } else if (awsCards.every(card => card.active === false)) {
    console.log('⚠️ AWS cards exist but are inactive. Activate them in Manage Cards.');
  } else if (!dueCategories.includes('AWS') && !dueCategories.some(cat => cat.toLowerCase() === 'aws')) {
    console.log('⚠️ AWS cards exist and are active but not due today. Turn off "Due Today" filter.');
  } else {
    console.log('✅ AWS cards should be visible. There may be a bug in category filtering.');
  }
  
})();

// Also add the debug function to window for later use
window.quickDebugCategories = function() {
  const flashcards = window.flashcards || [];
  return {
    total: flashcards.length,
    categories: [...new Set(flashcards.map(card => card.category || 'Uncategorized'))],
    awsCards: flashcards.filter(card => (card.category || '').toLowerCase().includes('aws')),
    activeCards: flashcards.filter(card => card.active !== false).length
  };
};

console.log('✅ Debug script ready. You can also run window.quickDebugCategories() anytime.');
