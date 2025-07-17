/**
 * Debug utility for auto-advance functionality
 * Add this to your flashcard app component for debugging
 */

export const addDebugAutoAdvanceToWindow = (flashcardHook) => {
  // Add debug functions to window for easy access in dev tools
  window.debugFlashcards = {
    // Check current filter state
    checkFilters: () => {
      const stats = flashcardHook.debugCurrentFilterState();
      console.log('📊 Current filter stats:', stats);
      return stats;
    },

    // Check subcategory tracking
    checkTracking: () => {
      const tracking = flashcardHook.debugSubCategoryTracking();
      console.log('📋 Subcategory tracking:', tracking);
      return tracking;
    },

    // Manually trigger auto-advance
    triggerAutoAdvance: () => {
      const result = flashcardHook.manualTriggerAutoAdvance();
      console.log('🚀 Auto-advance result:', result);
      return result;
    },

    // Get current state
    getCurrentState: () => {
      const state = {
        selectedCategory: flashcardHook.selectedCategory,
        selectedSubCategory: flashcardHook.selectedSubCategory,
        selectedLevel: flashcardHook.selectedLevel,
        showDueTodayOnly: flashcardHook.showDueTodayOnly,
        filteredFlashcards: flashcardHook.filteredFlashcards.length,
        totalFlashcards: flashcardHook.flashcards.length
      };
      console.log('🔍 Current state:', state);
      return state;
    },

    // Get available subcategories
    getAvailableSubCategories: () => {
      const subcategories = flashcardHook.getSubCategories();
      console.log('📋 Available subcategories:', subcategories);
      return subcategories;
    },

    // Get subcategory stats
    getSubCategoryStats: () => {
      const stats = flashcardHook.getSubCategoryStats();
      console.log('📊 Subcategory stats:', stats);
      return stats;
    },

    // Test auto-advance conditions
    testAutoAdvanceConditions: () => {
      const conditions = {
        showDueTodayOnly: flashcardHook.showDueTodayOnly,
        categoryNotAll: flashcardHook.selectedCategory !== 'All',
        subCategoryNotAll: flashcardHook.selectedSubCategory !== 'All',
        hasNoCards: flashcardHook.filteredFlashcards.length === 0,
        skipTimeDelay: window.debugFlashcards?.skipTimeDelay || false,
        allConditionsMet: flashcardHook.showDueTodayOnly && 
                         flashcardHook.selectedCategory !== 'All' && 
                         flashcardHook.selectedSubCategory !== 'All' && 
                         flashcardHook.filteredFlashcards.length === 0
      };
      console.log('✅ Auto-advance conditions:', conditions);
      return conditions;
    },

    // Test what subcategory should be selected next
    testNextSubcategorySelection: () => {
      console.log('🔍 TESTING NEXT SUBCATEGORY SELECTION');
      console.log('=====================================');
      
      const currentCategory = flashcardHook.selectedCategory;
      const currentSubCategory = flashcardHook.selectedSubCategory;
      
      console.log('Current state:', { currentCategory, currentSubCategory });
      
      // Get all subcategory stats for the current category
      const allStats = flashcardHook.getSubCategoryStats();
      console.log('All subcategory stats (filtered by current category):', allStats);
      
      // Simulate what getNextSubCategoryWithLeastCards should return
      const availableSubcats = Object.entries(allStats)
        .filter(([subCat, stats]) => stats.due > 0 && subCat !== currentSubCategory)
        .sort(([, statsA], [, statsB]) => statsA.due - statsB.due);
      
      console.log('Available subcategories (excluding current, sorted by due count):');
      availableSubcats.forEach(([subCat, stats]) => {
        console.log(`  ${subCat}: ${stats.due} due cards`);
      });
      
      const shouldSelect = availableSubcats.length > 0 ? availableSubcats[0][0] : null;
      console.log('Should select:', shouldSelect);
      
      // Now test what the actual function returns
      console.log('\nTesting actual function...');
      const actualResult = flashcardHook.getNextSubCategoryWithLeastCards(currentCategory, currentSubCategory);
      console.log('Actual function result:', actualResult);
      
      console.log('\nComparison:');
      console.log('Expected:', shouldSelect);
      console.log('Actual:', actualResult);
      console.log('Match:', shouldSelect === actualResult);
      
      return { expected: shouldSelect, actual: actualResult, match: shouldSelect === actualResult };
    },
    
    // Enable/disable time delay skip
    enableTimeDelaySkip: () => {
      window.debugFlashcards.skipTimeDelay = true;
      console.log('⏭️ Time delay skip enabled for auto-advance');
    },
    
    disableTimeDelaySkip: () => {
      window.debugFlashcards.skipTimeDelay = false;
      console.log('⏹️ Time delay skip disabled for auto-advance');
    },
    
    // Simple function test - just call the function and see what happens
    simpleFunctionTest: () => {
      console.log('🧪 SIMPLE FUNCTION TEST');
      console.log('=======================');
      
      const currentCategory = flashcardHook.selectedCategory;
      const currentSubCategory = flashcardHook.selectedSubCategory;
      
      console.log('Input:', { currentCategory, currentSubCategory });
      
      try {
        const result = flashcardHook.getNextSubCategoryWithLeastCards(currentCategory, currentSubCategory);
        console.log('✅ Function executed successfully');
        console.log('Result:', result);
        return result;
      } catch (error) {
        console.error('❌ Function threw an error:', error);
        return null;
      }
    }
  };

  // Add a complete test function to window
  window.testAutoAdvance = () => {
    console.log('🧪 TESTING AUTO-ADVANCE FUNCTIONALITY');
    console.log('=====================================');
    
    // 1. Check current state
    console.log('1. Current State:');
    const state = window.debugFlashcards.getCurrentState();
    
    // 2. Check subcategory stats
    console.log('\n2. Subcategory Stats:');
    const stats = window.debugFlashcards.getSubCategoryStats();
    
    // 3. Test what should be selected next
    console.log('\n3. Next Subcategory Selection Test:');
    const selectionTest = window.debugFlashcards.testNextSubcategorySelection();
    
    // 4. Test auto-advance conditions
    console.log('\n4. Auto-advance Conditions:');
    const conditions = window.debugFlashcards.testAutoAdvanceConditions();
    
    // 5. Enable time delay skip for testing
    console.log('\n5. Enabling time delay skip...');
    window.debugFlashcards.enableTimeDelaySkip();
    
    // 6. Try manual trigger
    console.log('\n6. Manual Auto-advance Trigger:');
    const result = window.debugFlashcards.triggerAutoAdvance();
    
    console.log('\n7. Final State:');
    const finalState = window.debugFlashcards.getCurrentState();
    
    console.log('\n🧪 TEST COMPLETE');
    console.log('Summary:');
    console.log('- Expected next subcategory:', selectionTest.expected);
    console.log('- Function returned:', selectionTest.actual);
    console.log('- Auto-advance triggered:', result);
    console.log('- Subcategory changed:', state.selectedSubCategory !== finalState.selectedSubCategory);
    console.log('- New subcategory:', finalState.selectedSubCategory);
    
    return { state, stats, selectionTest, conditions, result, finalState };
  };

  console.log('🔧 Debug functions added to window.debugFlashcards');
  console.log('Usage:');
  console.log('  window.debugFlashcards.checkFilters()');
  console.log('  window.debugFlashcards.checkTracking()');
  console.log('  window.debugFlashcards.triggerAutoAdvance()');
  console.log('  window.debugFlashcards.getCurrentState()');
  console.log('  window.debugFlashcards.testAutoAdvanceConditions()');
  console.log('  window.debugFlashcards.testNextSubcategorySelection() // Test selection logic');
  console.log('  window.debugFlashcards.simpleFunctionTest() // Simple function test');
  console.log('  window.debugFlashcards.enableTimeDelaySkip()  // Skip 2-second delay');
  console.log('  window.debugFlashcards.disableTimeDelaySkip() // Restore delay');
  console.log('  window.testAutoAdvance() // Run complete test suite');
};