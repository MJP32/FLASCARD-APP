/**
 * Test script for auto-advance functionality
 * Run this in the browser console after the app is loaded
 */

export const runAutoAdvanceTests = () => {
  console.log('🧪 Starting Auto-Advance Tests...');
  
  if (!window.debugFlashcards) {
    console.error('❌ Debug functions not available. Make sure the app is loaded.');
    return;
  }
  
  const debug = window.debugFlashcards;
  
  // Test 1: Check current state
  console.log('\n🔍 Test 1: Current State');
  const currentState = debug.getCurrentState();
  
  // Test 2: Check filters
  console.log('\n📊 Test 2: Filter State');
  const filterStats = debug.checkFilters();
  
  // Test 3: Check subcategory tracking
  console.log('\n📋 Test 3: Subcategory Tracking');
  const tracking = debug.checkTracking();
  
  // Test 4: Check auto-advance conditions
  console.log('\n✅ Test 4: Auto-Advance Conditions');
  const conditions = debug.testAutoAdvanceConditions();
  
  // Test 5: Get available subcategories
  console.log('\n📋 Test 5: Available Subcategories');
  const subcategories = debug.getAvailableSubCategories();
  
  // Test 6: Get subcategory stats
  console.log('\n📊 Test 6: Subcategory Stats');
  const stats = debug.getSubCategoryStats();
  
  // Test 7: Manual trigger (if conditions allow)
  console.log('\n🚀 Test 7: Manual Trigger');
  if (conditions.allConditionsMet) {
    console.log('✅ All conditions met, trying manual trigger...');
    const triggerResult = debug.triggerAutoAdvance();
    console.log('Result:', triggerResult);
  } else {
    console.log('❌ Conditions not met for auto-advance:');
    Object.entries(conditions).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
  
  // Summary
  console.log('\n📝 Test Summary:');
  console.log('- Current category:', currentState.selectedCategory);
  console.log('- Current subcategory:', currentState.selectedSubCategory);
  console.log('- Filtered cards:', currentState.filteredFlashcards);
  console.log('- Show due today only:', currentState.showDueTodayOnly);
  console.log('- Available subcategories:', subcategories.length);
  console.log('- Auto-advance ready:', conditions.allConditionsMet);
  
  console.log('\n🧪 Auto-Advance Tests Complete!');
  
  return {
    currentState,
    filterStats,
    tracking,
    conditions,
    subcategories,
    stats
  };
};

// Also add a quick test function to console
const addTestToWindow = () => {
  if (typeof window !== 'undefined') {
    window.testAutoAdvance = runAutoAdvanceTests;
  }
};

// Call this during app initialization
addTestToWindow();