/**
 * Debug utility for troubleshooting due card filtering issues
 */

export const debugDueCards = (flashcards, selectedCategory, selectedSubCategory) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  console.log('=== DUE CARDS DEBUG ===');
  console.log('Current time:', now);
  console.log('Start of today:', startOfToday);
  console.log('End of today:', endOfToday);
  console.log('Total flashcards:', flashcards.length);
  console.log('Selected filters:', { selectedCategory, selectedSubCategory });
  
  // Check all cards and their due status
  const cardAnalysis = flashcards.map(card => {
    const dueDate = card.dueDate || new Date(0);
    const dueDateObj = dueDate instanceof Date ? dueDate : dueDate.toDate();
    
    return {
      id: card.id,
      question: card.question?.substring(0, 50),
      category: card.category,
      subCategory: card.sub_category,
      active: card.active,
      dueDate: dueDateObj,
      dueDateString: dueDateObj.toLocaleString(),
      isPastDue: dueDateObj < startOfToday,
      isDueToday: dueDateObj >= startOfToday && dueDateObj < endOfToday,
      isDueNow: dueDateObj <= now,
      hoursUntilDue: (dueDateObj - now) / (1000 * 60 * 60),
      matchesCategory: selectedCategory === 'All' || card.category === selectedCategory,
      matchesSubCategory: selectedSubCategory === 'All' || card.sub_category === selectedSubCategory
    };
  });
  
  // Group cards by status
  const activeCards = cardAnalysis.filter(c => c.active !== false);
  const inactiveCards = cardAnalysis.filter(c => c.active === false);
  const dueNowCards = activeCards.filter(c => c.isDueNow);
  const dueTodayCards = activeCards.filter(c => c.isDueToday);
  const pastDueCards = activeCards.filter(c => c.isPastDue);
  const futureCards = activeCards.filter(c => !c.isDueNow);
  
  console.log('\n=== CARD STATUS SUMMARY ===');
  console.log('Active cards:', activeCards.length);
  console.log('Inactive cards:', inactiveCards.length);
  console.log('Due now (<=now):', dueNowCards.length);
  console.log('Due today only:', dueTodayCards.length);
  console.log('Past due (<today):', pastDueCards.length);
  console.log('Future cards (>now):', futureCards.length);
  
  // Check filtered results
  const filteredDueCards = dueNowCards.filter(c => c.matchesCategory && c.matchesSubCategory);
  
  console.log('\n=== FILTERED RESULTS ===');
  console.log('Due cards matching filters:', filteredDueCards.length);
  
  // Show sample cards
  console.log('\n=== SAMPLE DUE CARDS ===');
  dueNowCards.slice(0, 5).forEach(card => {
    console.log({
      question: card.question,
      dueDate: card.dueDateString,
      hoursOverdue: -card.hoursUntilDue,
      category: card.category,
      subCategory: card.subCategory,
      matchesFilters: card.matchesCategory && card.matchesSubCategory
    });
  });
  
  // Show sample future cards to see if there's a timezone issue
  console.log('\n=== SAMPLE FUTURE CARDS ===');
  futureCards.slice(0, 3).forEach(card => {
    console.log({
      question: card.question,
      dueDate: card.dueDateString,
      hoursUntilDue: card.hoursUntilDue,
      category: card.category
    });
  });
  
  // Check for timezone issues
  console.log('\n=== TIMEZONE CHECK ===');
  console.log('System timezone offset (minutes):', now.getTimezoneOffset());
  console.log('Sample card due date analysis:');
  
  const sampleCard = flashcards[0];
  if (sampleCard && sampleCard.dueDate) {
    const dueDate = sampleCard.dueDate instanceof Date ? sampleCard.dueDate : sampleCard.dueDate.toDate();
    console.log('Raw dueDate:', sampleCard.dueDate);
    console.log('Converted to Date:', dueDate);
    console.log('ISO String:', dueDate.toISOString());
    console.log('Local String:', dueDate.toLocaleString());
    console.log('Timezone offset:', dueDate.getTimezoneOffset());
  }
  
  return {
    activeCards: activeCards.length,
    dueNowCards: dueNowCards.length,
    filteredDueCards: filteredDueCards.length,
    analysis: cardAnalysis
  };
};