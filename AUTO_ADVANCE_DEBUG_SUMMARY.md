# Auto-Advance Debug Summary

## Changes Made

### 1. Enhanced Debug Logging in useFlashcards.js

**Auto-advance logic (lines 391-455)**:
- Added detailed logging for all auto-advance conditions
- Reduced time delay from 5 seconds to 2 seconds for faster testing
- Added debug breakdown of filter states
- Added ability to skip time delay for debugging (`window.debugFlashcards.skipTimeDelay`)

**getNextSubCategoryWithLeastCards function (lines 164-298)**:
- Added comprehensive logging for subcategory selection process
- Debug localStorage tracking data
- Debug subcategory statistics and sorting

**Filter processing (lines 288-298)**:
- Added logging for subcategory filtering step
- Shows before/after counts for subcategory filter

### 2. Added Debug Utilities

**debugCurrentFilterState function**:
- Shows current filter settings
- Breaks down card counts at each filter step
- Samples cards for debugging

**manualTriggerAutoAdvance function**:
- Allows manual triggering of auto-advance logic
- Bypasses time delay for immediate testing

**debugSubCategoryTracking function**:
- Inspects localStorage subcategory tracking
- Shows initial stats vs completed counts
- Calculates remaining cards per subcategory

### 3. Browser Console Debug Interface

**Created `/src/utils/debugAutoAdvance.js`**:
- Adds `window.debugFlashcards` object with debug functions
- Provides easy access to all debug features from browser console

**Created `/src/utils/testAutoAdvance.js`**:
- Adds `window.testAutoAdvance()` function for comprehensive testing
- Runs complete test suite of auto-advance functionality

### 4. Updated App.js

- Added imports for new debug utilities
- Added debug functions to hook destructuring
- Added useEffect to initialize debug interface
- Made debug functions available globally

## Debug Commands Available

Open browser console and run:

```javascript
// Check current state
window.debugFlashcards.getCurrentState()

// Check filter breakdown
window.debugFlashcards.checkFilters()

// Check subcategory tracking
window.debugFlashcards.checkTracking()

// Test auto-advance conditions
window.debugFlashcards.testAutoAdvanceConditions()

// Enable immediate auto-advance (skip 2-second delay)
window.debugFlashcards.enableTimeDelaySkip()

// Manually trigger auto-advance
window.debugFlashcards.triggerAutoAdvance()

// Run complete test suite
window.testAutoAdvance()
```

## Auto-Advance Conditions

For auto-advance to work, ALL of these must be true:

1. `showDueTodayOnly` must be `true`
2. `selectedCategory` must NOT be `'All'`
3. `selectedSubCategory` must NOT be `'All'`
4. `timeSinceManualChange > 2000` (2 seconds) OR `skipTimeDelay` enabled
5. `filteredFlashcards.length === 0` (no cards available)

## Common Issues

### Issue 1: Time Delay Preventing Auto-Advance
**Solution**: Run `window.debugFlashcards.enableTimeDelaySkip()` to bypass the 2-second delay

### Issue 2: Subcategory Has Cards But Auto-Advance Triggered
**Solution**: Check localStorage tracking - the subcategory might appear empty based on completed counts

### Issue 3: No Next Subcategory Found
**Solution**: Check `debugSubCategoryTracking()` to see if other subcategories have remaining cards

### Issue 4: Filter Chain Issues
**Solution**: Use `debugCurrentFilterState()` to see where cards are being filtered out

## Key Files Modified

- `/src/hooks/useFlashcards.js` - Main auto-advance logic and debug functions
- `/src/utils/debugAutoAdvance.js` - Browser console debug interface
- `/src/utils/testAutoAdvance.js` - Comprehensive test suite
- `/src/App.js` - Integration of debug utilities
- `/AUTO_ADVANCE_DEBUG_SUMMARY.md` - This summary document

## Next Steps

1. Open the app in browser
2. Open browser console (F12)
3. Run `window.testAutoAdvance()` to see current state
4. If time delay is the issue, run `window.debugFlashcards.enableTimeDelaySkip()`
5. Navigate to a subcategory with 0 cards and wait for auto-advance
6. Check console logs for detailed debugging information