/**
 * Helper functions for multi-selection functionality
 */

/**
 * Check if a value is selected in multi-selection mode
 * @param {string|Array} selection - Current selection (can be string for backward compatibility or array)
 * @param {string} value - Value to check
 * @returns {boolean} - Whether the value is selected
 */
export const isSelected = (selection, value) => {
  if (Array.isArray(selection)) {
    return selection.includes(value);
  }
  // Backward compatibility with single selection
  return selection === value;
};

/**
 * Check if 'All' is selected
 * @param {string|Array} selection - Current selection
 * @returns {boolean} - Whether 'All' is selected
 */
export const isAllSelected = (selection) => {
  if (Array.isArray(selection)) {
    return selection.includes('All');
  }
  return selection === 'All';
};

/**
 * Toggle selection of a value
 * @param {Array} currentSelection - Current selection array
 * @param {string} value - Value to toggle
 * @param {Array} allValues - All possible values (excluding 'All')
 * @returns {Array} - New selection array
 */
export const toggleSelection = (currentSelection, value, allValues) => {
  if (value === 'All') {
    // If 'All' is clicked, select all or deselect all
    if (currentSelection.includes('All')) {
      return []; // Deselect all
    } else {
      return ['All', ...allValues]; // Select all
    }
  } else {
    // Regular value clicked
    let newSelection = [...currentSelection];
    
    // Remove 'All' if it was selected
    newSelection = newSelection.filter(v => v !== 'All');
    
    if (currentSelection.includes(value)) {
      // Deselect this value
      newSelection = newSelection.filter(v => v !== value);
    } else {
      // Select this value
      newSelection.push(value);
    }
    
    // If all values are selected, add 'All' back
    if (newSelection.length === allValues.length) {
      newSelection = ['All', ...newSelection];
    }
    
    // If no values selected, default to 'All'
    if (newSelection.length === 0) {
      newSelection = ['All'];
    }
    
    return newSelection;
  }
};

/**
 * Filter cards based on multi-selection
 * @param {Array} cards - Cards to filter
 * @param {Array} selectedValues - Selected values
 * @param {string} field - Field to filter by (e.g., 'category', 'sub_category', 'level')
 * @param {string} defaultValue - Default value for missing fields
 * @returns {Array} - Filtered cards
 */
export const filterByMultiSelection = (cards, selectedValues, field, defaultValue = 'Uncategorized') => {
  if (!Array.isArray(selectedValues) || selectedValues.length === 0 || selectedValues.includes('All')) {
    return cards;
  }
  
  return cards.filter(card => {
    const cardValue = card[field] && card[field].trim() ? card[field] : defaultValue;
    return selectedValues.includes(cardValue);
  });
};

/**
 * Convert single selection to multi-selection array
 * @param {string|Array} selection - Current selection
 * @returns {Array} - Selection as array
 */
export const ensureArray = (selection) => {
  if (Array.isArray(selection)) {
    return selection;
  }
  return selection ? [selection] : ['All'];
};