import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';

// Components
import LoginScreen from './LoginScreen.jsx';
import FlashcardDisplay from './components/FlashcardDisplay';
import FlashcardForm from './components/FlashcardForm';
import SettingsModal from './components/SettingsModal';
import ImportExportModal from './components/ImportExportModal';
import GenerateQuestionsModal from './components/GenerateQuestionsModal';
import ManageCardsModal from './components/ManageCardsModal';
import Calendar from './Calendar';
import RichTextEditor from './RichTextEditor';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useFlashcards } from './hooks/useFlashcards';
import { useSettings } from './hooks/useSettings';

// Utils and Constants
import { SUCCESS_MESSAGES, ERROR_MESSAGES, DEFAULT_FSRS_PARAMS } from './utils/constants';
// import { toggleSelection } from './utils/multiSelectionHelpers';
import { debugFirestore, checkFirestoreRules } from './debug/utils/firebaseDebug';
import { debugDueCards } from './debug/utils/debugDueCards';
import { addDebugAutoAdvanceToWindow } from './debug/utils/debugAutoAdvance';
import { addDebugCountingToWindow } from './debug/utils/debugCounting';
import { debugCategories } from './debug/utils/debugCategories';
import { debugAmazonLP } from './debug/utils/debugAmazonLP';
import { debugAllCount } from './debug/utils/debugAllCount';
import { debugCategorySubcategoryMismatch } from './debug/utils/debugCategorySubcategoryMismatch';
import { debugEmptyCategories } from './debug/utils/debugEmptyCategories';
import { debugDueCardsSync } from './debug/utils/debugDueCardsSync';
import { debugQuiet } from './debug/utils/debugQuiet';
import { fixDueCardsCount } from './debug/utils/fixDueCardsCount';
import { makeCategoryDueNow, makeAWSDueNow } from './debug/utils/makeCategoryDueNow';
import './debug/utils/testAutoAdvance'; // Adds window.testAutoAdvance() function

// Styles
import './App.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3R7pV3mXqg2-kY9xvH126BoF5KQDQDls",
  authDomain: "flashcard-app-3f2a3.firebaseapp.com",
  projectId: "flashcard-app-3f2a3",
  storageBucket: "flashcard-app-3f2a3.firebasestorage.app",
  messagingSenderId: "399745541062",
  appId: "1:399745541062:web:958a2cfbd7c6c9c78988c7",
  measurementId: "G-6LJ19R2ZTZ"
};

/**
 * Main App component for the flashcard application
 */
function App() {
  // Firebase app initialization
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // Authentication state
  const [showLoginScreen, setShowLoginScreen] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateCardForm, setShowCreateCardForm] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showManageCardsModal, setShowManageCardsModal] = useState(false);

  // Edit card states
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editCardData, setEditCardData] = useState(null);

  // Mobile header collapse state
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Message states
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // AI Generation states
  const [apiKeys, setApiKeys] = useState({
    openai: localStorage.getItem('openai_api_key') || '',
    anthropic: localStorage.getItem('anthropic_api_key') || '',
    gemini: localStorage.getItem('gemini_api_key') || ''
  });
  const [selectedProvider, setSelectedProvider] = useState(localStorage.getItem('selected_ai_provider') || 'openai');

  // Session-wide notes states
  const [notes, setNotes] = useState(() => localStorage.getItem('flashcard_session_notes') || '');
  const [showNotesDropdown, setShowNotesDropdown] = useState(false);
  const [notesCopied, setNotesCopied] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Streak tracking state
  const [streakDays, setStreakDays] = useState(0);
  
  // Track if we've checked for default cards creation
  const [hasCheckedForDefaults, setHasCheckedForDefaults] = useState(false);
  
  // Track if anonymous warning has been dismissed
  const [isAnonymousWarningDismissed, setIsAnonymousWarningDismissed] = useState(false);
  
  // Track initial due cards count for the day
  const [initialDueCardsCount, setInitialDueCardsCount] = useState(0);
  const [cardsCompletedToday, setCardsCompletedToday] = useState(0);
  const [persistentDueCardsCount, setPersistentDueCardsCount] = useState(0);
  const [initialCategoryStats, setInitialCategoryStats] = useState({});
  const [categoryCompletedCounts, setCategoryCompletedCounts] = useState({});
  const [initialSubCategoryStats, setInitialSubCategoryStats] = useState({});
  const [subCategoryCompletedCounts, setSubCategoryCompletedCounts] = useState({});
  const [lastManualCategoryChange, setLastManualCategoryChange] = useState(0);
  const [isManualCategorySelection, setIsManualCategorySelection] = useState(false);

  // Category selection state - managed in App.js to avoid circular dependency
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Collapsible sections state - auto-collapse on mobile
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(window.innerWidth <= 768);
  const [isSubCategoriesCollapsed, setIsSubCategoriesCollapsed] = useState(window.innerWidth <= 768);
  const [isLevelsCollapsed, setIsLevelsCollapsed] = useState(window.innerWidth <= 768);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(window.innerWidth <= 768);
  const [areNotesToolbarHidden, setAreNotesToolbarHidden] = useState(false);

  


  // Initialize Firebase
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      setFirebaseApp(app);
      setIsFirebaseInitialized(true);
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      setError('Failed to initialize application');
    }
  }, []);

  // Initialize hooks
  const {
    userId,
    userDisplayName,
    isAnonymous,
    isAuthReady,
    authError,
    isLoading: authLoading,
    signInAnonymouslyUser,
    signInWithEmail,
    createUserWithEmail,
    signOutUser,
    sendPasswordReset,
    clearAuthError
  } = useAuth(firebaseApp);

  const {
    flashcards,
    filteredFlashcards,
    currentCardIndex,
    showAnswer,
    selectedSubCategory,
    selectedLevel,
    showDueTodayOnly,
    showStarredOnly,
    categorySortBy,
    isLoading: flashcardsLoading,
    error: flashcardsError,
    getCurrentCard,
    getCategories,
    getSubCategories,
    getSubCategoryStats,
    getAllSubCategoryStats,
    getLevels,
    getLevelStats,
    getCategoryStats,
    getCardsDueToday,
    getPastDueCards,
    getAllDueCards,
    getFilteredDueCards,
    getCardsReviewedToday,
    setShowAnswer,
    setSelectedSubCategory,
    setSelectedLevel,
    setShowDueTodayOnly,
    setShowStarredOnly,
    setCategorySortBy,
    setCurrentCardIndex,
    nextCard,
    prevCard,
    addToNavigationHistory,
    getNextCategoryWithDueCards,
    getNextCategoryWithLeastCards,
    getNextSubCategoryWithLeastCards,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    bulkImportFlashcards,
    toggleStarCard,
    clearError: clearFlashcardsError,
    // Debug functions
    manualTriggerAutoAdvance,
    debugCurrentFilterState,
    debugSubCategoryTracking,
    
    // Utility functions
    inferLevelFromFSRS
  } = useFlashcards(firebaseApp, userId, selectedCategory);

  const {
    isDarkMode,
    fsrsParams,
    showIntervalSettings,
    settingsLoaded,
    isLoading: settingsLoading,
    error: settingsError,
    toggleDarkMode,
    updateFsrsParams,
    toggleIntervalSettings,
    resetFsrsParams,
    clearError: clearSettingsError
  } = useSettings(firebaseApp, userId);

  // Get computed values (must be before any useEffect that uses them)
  const categoryStats = getCategoryStats();
  const currentCard = getCurrentCard();
  const categories = getCategories();
  const subCategories = getSubCategories(selectedCategory);
  
  // Debug subcategories when they change
  React.useEffect(() => {
    console.log('🔍 App.js subCategories updated:', {
      selectedCategory,
      subCategories,
      subCategoriesLength: subCategories.length
    });
  }, [selectedCategory, subCategories]);
  const subCategoryStats = getSubCategoryStats(selectedCategory);
  const levels = getLevels();
  const levelStats = getLevelStats();
  
  // Debug: Check for level count mismatches and category/subcategory consistency
  React.useEffect(() => {
    if (Object.keys(levelStats).length > 0) {
      const levelsArray = levels || [];
      const statsLevels = Object.keys(levelStats);
      const totalStatsCount = Object.values(levelStats).reduce((sum, count) => sum + count, 0);
      
      console.log('🔍 LEVEL DEBUG:', {
        levelsFromGetLevels: levelsArray,
        levelsFromStats: statsLevels,
        levelStats: levelStats,
        totalCardsInStats: totalStatsCount,
        missingLevels: statsLevels.filter(level => !levelsArray.includes(level))
      });
      
      if (statsLevels.length !== levelsArray.length) {
        console.warn('⚠️ LEVEL MISMATCH: getLevels() and getLevelStats() have different levels!');
      }

      // Debug category vs subcategory counts
      if (showDueTodayOnly && selectedCategory === 'All') {
        // Get all due cards to analyze category/subcategory distribution
        const now = new Date();
        const allDueCards = flashcards.filter(card => {
          if (card.active === false) return false;
          if (!card.dueDate) return false;
          let dueDate = card.dueDate;
          if (dueDate && typeof dueDate.toDate === 'function') {
            dueDate = dueDate.toDate();
          }
          return dueDate <= now;
        });

        console.log('🔍 CATEGORY/SUBCATEGORY DEBUG:', {
          totalDueCards: allDueCards.length,
          categoryCounts: {},
          subcategoryCounts: {},
          cardsWithoutSubcategory: allDueCards.filter(card => !card.sub_category || card.sub_category.trim() === '').length
        });

        // Count by category
        const categoryBreakdown = {};
        const subcategoryBreakdown = {};
        allDueCards.forEach(card => {
          const category = card.category || 'Uncategorized';
          const subcategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
          
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
          subcategoryBreakdown[subcategory] = (subcategoryBreakdown[subcategory] || 0) + 1;
        });

        const totalCategoryCards = Object.values(categoryBreakdown).reduce((sum, count) => sum + count, 0);
        const totalSubcategoryCards = Object.values(subcategoryBreakdown).reduce((sum, count) => sum + count, 0);

        console.log('Category breakdown:', categoryBreakdown, 'Total:', totalCategoryCards);
        console.log('Subcategory breakdown:', subcategoryBreakdown, 'Total:', totalSubcategoryCards);

        if (totalCategoryCards !== totalSubcategoryCards) {
          console.error('❌ CATEGORY/SUBCATEGORY MISMATCH!', {
            categoryTotal: totalCategoryCards,
            subcategoryTotal: totalSubcategoryCards,
            difference: totalCategoryCards - totalSubcategoryCards
          });
        }
      }
    }
  }, [levels, levelStats, showDueTodayOnly, selectedCategory, flashcards]);
  
  // Debug: Check consistency between levels and levelStats
  React.useEffect(() => {
    console.log('🔍 LEVEL-CONSISTENCY-CHECK:', {
      selectedCategory,
      selectedSubCategory: window.flashcardHookState?.selectedSubCategory || 'All',
      levels,
      levelStats,
      levelsLength: levels.length,
      levelStatsKeys: Object.keys(levelStats)
    });
  }, [levels, levelStats, selectedCategory]);

  // Calculate persistent due cards count based on selected category/subcategory
  const calculateDueCardsForCurrentSelection = useCallback(() => {
    if (!flashcards.length) return 0;
    
    let filteredCards = flashcards.filter(card => card.active !== false);
    console.log(`📊 DUE-COUNT-CALC: Starting with ${filteredCards.length} active cards`);
    
    // Apply category filter
    if (selectedCategory !== 'All') {
      const beforeCategory = filteredCards.length;
      filteredCards = filteredCards.filter(card => {
        const cardCategory = card.category && card.category.trim() ? card.category : 'Uncategorized';
        return cardCategory === selectedCategory;
      });
      console.log(`📊 DUE-COUNT-CALC: Category filter "${selectedCategory}": ${beforeCategory} → ${filteredCards.length}`);
    }
    
    // Apply subcategory filter if using useFlashcards hook
    const { selectedSubCategory } = window.flashcardHookState || { selectedSubCategory: 'All' };
    if (selectedSubCategory !== 'All') {
      const beforeSubCategory = filteredCards.length;
      filteredCards = filteredCards.filter(card => {
        const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
        return cardSubCategory === selectedSubCategory;
      });
      console.log(`📊 DUE-COUNT-CALC: Subcategory filter "${selectedSubCategory}": ${beforeSubCategory} → ${filteredCards.length}`);
    }
    
    // Filter for due cards (due date <= now)
    const now = new Date();
    const beforeDue = filteredCards.length;
    const dueCards = filteredCards.filter(card => {
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    });
    
    console.log(`📊 DUE-COUNT-CALC: Due filter: ${beforeDue} → ${dueCards.length} cards due`);
    return dueCards.length;
  }, [flashcards, selectedCategory]);

  // Function to update persistent due cards count when category/subcategory changes
  const updatePersistentDueCount = useCallback(() => {
    if (!userId) return;
    
    const newCount = calculateDueCardsForCurrentSelection();
    const previousCount = persistentDueCardsCount;
    
    setPersistentDueCardsCount(newCount);
    localStorage.setItem(`flashcard_persistent_due_${userId}`, newCount.toString());
    
    console.log('🔄 PERSISTENT-COUNT-UPDATE: Updated due cards count:', {
      previousCount,
      newCount,
      selectedCategory,
      selectedSubCategory: window.flashcardHookState?.selectedSubCategory || 'All'
    });
  }, [userId, calculateDueCardsForCurrentSelection, persistentDueCardsCount, selectedCategory]);

  // Get all categories (not filtered by due date) as fallback
  const allCategories = useMemo(() => {
    const activeCards = flashcards.filter(card => card.active !== false);
    return [...new Set(activeCards.map(card => card.category || 'Uncategorized'))];
  }, [flashcards]);

  // Use categories from due filter, or all categories if showing all cards
  const displayCategories = useMemo(() => {
    if (showDueTodayOnly) {
      // In due today mode, use real-time categories from the hook
      // The filtering below will determine which ones actually show
      return categories;
    } else {
      // In all cards mode, show all categories
      return allCategories;
    }
  }, [categories, showDueTodayOnly, allCategories]);
  
  // Filter displayCategories to only include categories with actual cards using same logic as individual buttons
  const filteredDisplayCategories = useMemo(() => {
    // Create special debug function for AWS category
    window.debugAWSCards = () => {
      const allCards = flashcards || [];
      const awsCards = allCards.filter(card => {
        const category = (card.category || '').toLowerCase();
        return category === 'aws';
      });
      
      const awsInCategories = (categories || []).includes('AWS');
      const awsInDisplayCategories = (displayCategories || []).includes('AWS');
      const awsInFiltered = (filteredDisplayCategories || []).includes('AWS');
      
      // console.log(`AWS Debug: ${awsCards.length} cards found, visible: ${awsInFiltered}`);
      
      return { awsCards, awsInCategories, awsInDisplayCategories, awsInFiltered };
    };
    
    // Helper function to count cards in a category with current filters
    const getCardCountInCategory = (category) => {
      // Always use real-time counting - this ensures categories with actual due cards show up
      let categoryCards = flashcards.filter(card => {
        // Only count active cards
        if (card.active === false) return false;
        // Match the category
        return (card.category || 'Uncategorized') === category;
      });
      
      // Apply filters based on current mode
      if (showDueTodayOnly && showStarredOnly) {
        // When both filters are on, count actual starred due cards
        categoryCards = categoryCards.filter(card => card.starred === true);
        
        const now = new Date();
        categoryCards = categoryCards.filter(card => {
          // Skip cards without valid due dates (but allow Firestore Timestamps)
          if (!card.dueDate && card.dueDate !== 0) return false;
          let dueDate = card.dueDate;
          if (dueDate && typeof dueDate.toDate === 'function') {
            dueDate = dueDate.toDate();
          } else if (typeof dueDate === 'number' || typeof dueDate === 'string') {
            dueDate = new Date(dueDate);
          }
          // Skip invalid dates
          if (!dueDate || isNaN(dueDate.getTime())) return false;
          return dueDate <= now;
        });
      } else if (showDueTodayOnly) {
        // Filter by due date only - use end of today like useFlashcards
        const now = new Date();
        categoryCards = categoryCards.filter(card => {
          // Skip cards without valid due dates (but allow Firestore Timestamps)
          if (!card.dueDate && card.dueDate !== 0) return false;
          let dueDate = card.dueDate;
          if (dueDate && typeof dueDate.toDate === 'function') {
            dueDate = dueDate.toDate();
          } else if (typeof dueDate === 'number' || typeof dueDate === 'string') {
            dueDate = new Date(dueDate);
          }
          // Skip invalid dates
          if (!dueDate || isNaN(dueDate.getTime())) return false;
          return dueDate <= now;
        });
      } else if (showStarredOnly) {
        // Filter by starred only
        categoryCards = categoryCards.filter(card => card.starred === true);
      }
      
      return categoryCards.length;
    };
    
    // Filter displayCategories to only include categories with actual cards
    const filteredCategories = displayCategories.filter(category => {
      const cardCount = getCardCountInCategory(category);
      return cardCount > 0;
    });
    
    return filteredCategories;
  }, [displayCategories, flashcards, showDueTodayOnly, showStarredOnly]);

  // Initialize debug utilities (development only)
  useEffect(() => {
    if (flashcards && userId && manualTriggerAutoAdvance && debugCurrentFilterState && debugSubCategoryTracking) {
      const flashcardHook = {
        flashcards,
        filteredFlashcards,
        selectedCategory,
        selectedSubCategory,
        selectedLevel,
        showDueTodayOnly,
        manualTriggerAutoAdvance,
        debugCurrentFilterState,
        debugSubCategoryTracking,
        getSubCategories,
        getSubCategoryStats
      };
      addDebugAutoAdvanceToWindow(flashcardHook);
      
      // Add counting debug utilities
      addDebugCountingToWindow(flashcards, userId, categoryStats, getSubCategoryStats(), selectedCategory);
      
      // Add category debug utility to window (but don't call it automatically)
      window.debugCategories = () => debugCategories(flashcards);
      window.debugAmazonLP = () => debugAmazonLP(flashcards);
      window.debugCategorySubcategoryMismatch = () => debugCategorySubcategoryMismatch(flashcards, showDueTodayOnly, selectedCategory);
      window.debugEmptyCategories = () => debugEmptyCategories(flashcards, showDueTodayOnly, showStarredOnly, filteredDisplayCategories, initialCategoryStats, categoryCompletedCounts);
      window.debugQuiet = () => debugQuiet(flashcards, showDueTodayOnly, filteredFlashcards, filteredDisplayCategories);
      window.fixDueCardsCount = fixDueCardsCount;
      window.makeCategoryDueNow = makeCategoryDueNow;
      window.makeAWSDueNow = makeAWSDueNow;
      window.flashcards = flashcards; // Make flashcards available for fix function
      window.updateFlashcard = updateFlashcard; // Make update function available
      
      // Force update of AWS cards to be due now and add a UI refresh trigger
      window.forceAWSUpdate = async () => {
        const now = new Date();
        let updateCount = 0;
        
        const awsCards = flashcards.filter(card => 
          (card.category || '').toLowerCase() === 'aws' && 
          card.active !== false
        );
        
        for (const card of awsCards) {
          try {
            await updateFlashcard(card.id, { dueDate: now });
            updateCount++;
          } catch (err) {
            console.error('Failed to update AWS card:', err);
          }
        }
        
        // Force UI refresh
        if (showDueTodayOnly) {
          setShowDueTodayOnly(false);
          setTimeout(() => setShowDueTodayOnly(true), 500);
        } else {
          setShowDueTodayOnly(true);
        }
        
        // console.log(`AWS Update: ${updateCount}/${awsCards.length} cards updated`);
        return { updated: updateCount, total: awsCards.length };
      };
      
      // Add the regular auto-run AWS update but with UI refresh
      setTimeout(async () => {
        const hasAWSCards = flashcards.some(card => card.category === 'AWS' && card.active !== false);
        const awsInCategories = categories.includes('AWS');
        
        if (hasAWSCards && !awsInCategories && showDueTodayOnly) {
          window.forceAWSUpdate();
        }
      }, 2000); // Wait 2 seconds for everything to load
      // Calculate displayCategories and dailyProgress for debug function
      const debugDisplayCategories = categories.length > 0 ? categories : (!showDueTodayOnly ? allCategories : []);
      const dailyProgress = {
        completedToday: cardsCompletedToday,
        dueToday: initialDueCardsCount, // Daily progress uses stable counting
        totalToday: initialDueCardsCount
      };
      window.debugAllCount = () => debugAllCount(flashcards, showDueTodayOnly, showStarredOnly, selectedCategory, debugDisplayCategories, initialCategoryStats, categoryCompletedCounts);
      window.debugDueCardsSync = () => debugDueCardsSync(flashcards, showDueTodayOnly, filteredFlashcards, dailyProgress, filteredDisplayCategories);

      // Force refresh categories function for debugging
      window.forceRefreshCategories = () => {
        console.log('🔄 Force refreshing categories...');

        // Force re-render by updating a dummy state
        setMessage('Refreshing categories...');
        setTimeout(() => setMessage(''), 1000);

        // Log current state
        console.log('Current flashcards:', flashcards.length);
        console.log('Current categories:', categories);

        // Force recalculation if getCategories is available
        if (getCategories) {
          const newCategories = getCategories();
          console.log('Recalculated categories:', newCategories);
        }

        // Force page refresh as last resort
        console.log('If categories still don\'t appear, try: window.location.reload()');
      };

      // Debug subcategory filtering issues
      window.debugSubcategoryFiltering = () => {
        console.log('🔍 SUBCATEGORY FILTERING DEBUG');
        console.log('='.repeat(40));

        console.log('Current state:', {
          selectedCategory,
          selectedSubCategory,
          showDueTodayOnly,
          showStarredOnly
        });

        if (selectedCategory === 'All') {
          console.log('⚠️ Category is "All" - subcategories should show from all categories');
        } else {
          const categoryCards = flashcards.filter(card =>
            card.active !== false && card.category === selectedCategory
          );

          console.log(`Cards in "${selectedCategory}":`, categoryCards.length);

          const allSubCats = [...new Set(
            categoryCards.map(card => card.sub_category || 'Uncategorized')
          )];

          console.log('All subcategories in category:', allSubCats);
          console.log('Filtered subcategories showing:', subCategories);

          // Check each subcategory
          allSubCats.forEach(subCat => {
            const subCatCards = categoryCards.filter(card =>
              (card.sub_category || 'Uncategorized') === subCat
            );

            let filteredSubCatCards = subCatCards;

            if (showDueTodayOnly) {
              const now = new Date();
              filteredSubCatCards = filteredSubCatCards.filter(card => {
                // Skip cards without valid due dates (but allow Firestore Timestamps)
                if (!card.dueDate && card.dueDate !== 0) return false;
                let dueDate = card.dueDate;
                if (dueDate && typeof dueDate.toDate === 'function') {
                  dueDate = dueDate.toDate();
                } else if (typeof dueDate === 'number' || typeof dueDate === 'string') {
                  dueDate = new Date(dueDate);
                }
                // Skip invalid dates
                if (!dueDate || isNaN(dueDate.getTime())) return false;
                return dueDate <= now;
              });
            }

            if (showStarredOnly) {
              filteredSubCatCards = filteredSubCatCards.filter(card => card.starred === true);
            }

            const shouldShow = filteredSubCatCards.length > 0;
            const isShowing = subCategories.includes(subCat);
            const status = shouldShow === isShowing ? '✅' : '❌';

            console.log(`${status} "${subCat}": ${filteredSubCatCards.length} cards (should ${shouldShow ? 'show' : 'hide'}, is ${isShowing ? 'showing' : 'hidden'})`);
          });
        }
      };

      // Add hook functions to window for communication between App.js and useFlashcards.js
      window.flashcardHook = {
        setLastCardCompletionTime: (timestamp) => {
          // This will be called from App.js when a card is completed
          // console.log('🔄 Card completion timestamp set:', timestamp);
        }
      };

      // Log category debug info once when flashcards change
      if (flashcards && flashcards.length > 0 && !window._hasLoggedCategories) {
        // console.log('\n🔍 CATEGORY DEBUG - Check terminal for details\n');
        debugCategories(flashcards);
        window._hasLoggedCategories = true;
      }
    }
  }, [flashcards, userId, filteredFlashcards, selectedCategory, selectedSubCategory, selectedLevel, showDueTodayOnly]);

  // Sync login screen visibility with authentication state
  useEffect(() => {
    if (isAuthReady) {
      if (userId) {
        // User is authenticated, hide login screen
        setShowLoginScreen(false);
        // console.log('User authenticated, hiding login screen');
        // Reset the default cards check for this new user
        setHasCheckedForDefaults(false);
        // Reset anonymous warning dismissal for new user
        setIsAnonymousWarningDismissed(false);
      } else {
        // No user, show login screen
        setShowLoginScreen(true);
        // console.log('No user found, showing login screen');
        // Reset the check when logging out
        setHasCheckedForDefaults(false);
        // Reset anonymous warning dismissal when logging out
        setIsAnonymousWarningDismissed(false);
      }
    }
  }, [isAuthReady, userId]);

  // Debug: Monitor selectedCategory changes - DISABLED
  // useEffect(() => {
  //   console.log('🔍 selectedCategory changed to:', selectedCategory);
  // }, [selectedCategory]);

  // Create default flashcards for new users
  useEffect(() => {
    // console.log('🔍 Default cards useEffect triggered:', {
    //   isAuthReady,
    //   userId,
    //   hasAddFlashcard: !!addFlashcard,
    //   flashcardsLength: flashcards.length,
    //   hasCheckedForDefaults
    // });
    
    // Only run when user is authenticated, we have the addFlashcard function, and we haven't checked yet
    if (isAuthReady && userId && addFlashcard && !hasCheckedForDefaults) {
      // console.log('🔍 Conditions met, setting timer for default card creation');
      setHasCheckedForDefaults(true); // Mark that we've checked to prevent multiple runs
      
      // Small delay to ensure Firestore listener has had time to populate flashcards
      const timer = setTimeout(() => {
        // console.log('🔍 Timer fired, calling createDefaultFlashcards');
        createDefaultFlashcards(userId);
      }, 2000); // Increased to 2 seconds
      
      return () => {
        // console.log('🔍 Cleaning up timer');
        clearTimeout(timer);
      };
    }
  }, [isAuthReady, userId, addFlashcard, flashcards.length, hasCheckedForDefaults]);

  // Handle authentication
  const handleLogin = async (loginType, emailVal = '', passwordVal = '') => {
    clearAuthError();
    setError('');

    try {
      switch (loginType) {
        case 'anonymous':
          await signInAnonymouslyUser();
          break;
        case 'login':
          await signInWithEmail(emailVal, passwordVal);
          break;
        case 'register':
          await createUserWithEmail(emailVal, passwordVal);
          break;
        default:
          throw new Error('Invalid login type');
      }
      // setShowLoginScreen(false); // This will be handled by the useEffect
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Authentication failed');
    }
  };

  // Handle password reset
  const handlePasswordReset = async (resetEmail) => {
    clearAuthError();
    setError('');
    
    try {
      await sendPasswordReset(resetEmail);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send password reset email');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      // setShowLoginScreen(true); // This will be handled by the useEffect
      setEmail('');
      setPassword('');
      // Clear any user-specific state
      setMessage('');
      setError('');
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
    }
  };

  // Handle flashcard operations
  const handleCreateCard = async (cardData) => {
    try {
      await addFlashcard(cardData);
      setMessage(SUCCESS_MESSAGES.CARD_CREATED);
      setShowCreateCardForm(false);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to create flashcard');
    }
  };

  // Handle review card with FSRS algorithm
  const handleReviewCard = async (rating) => {
    const card = getCurrentCard();
    if (!card) {
      console.error('No current card found for review');
      return;
    }

    // console.log('🔄 Reviewing card:', card.id, 'Rating:', rating);

    try {
      // FSRS algorithm implementation
      const now = new Date();
      let { 
        easeFactor = 2.5, 
        interval = 1, 
        repetitions = 0, 
        difficulty = 5, 
        stability = 2,
        lastReviewed 
      } = card;
      
      // Convert rating to numeric value
      const ratingMap = { again: 1, hard: 2, good: 3, easy: 4 };
      const numRating = ratingMap[rating];
      
      // FSRS parameters from settings
      const { 
        requestRetention = 0.9, 
        maximumInterval = 36500,
        w = DEFAULT_FSRS_PARAMS.w,
        againFactor = 0.5,
        hardFactor = 0.8,
        goodFactor = 1.0,
        easyFactor = 1.3,
        initialAgainInterval = 1,
        initialHardInterval = 1,
        initialGoodInterval = 4,
        initialEasyInterval = 15
      } = fsrsParams;
      
      // Calculate elapsed days since last review
      const lastReviewDate = lastReviewed ? (lastReviewed.toDate ? lastReviewed.toDate() : new Date(lastReviewed)) : null;
      const elapsedDays = lastReviewDate ? Math.max(1, Math.round((now - lastReviewDate) / (1000 * 60 * 60 * 24))) : 0;
      
      // FSRS-4.5 algorithm implementation
      if (numRating === 1) { // Again
        repetitions = 0;
        
        // For first review or after a lapse
        if (card.repetitions === 0) {
          interval = initialAgainInterval / (24 * 60); // Convert minutes to days
        } else {
          // Use againFactor to reduce the interval
          interval = Math.max(1, Math.round(interval * againFactor));
        }
        
        // Increase difficulty
        difficulty = Math.min(10, difficulty + w[6]);
        
        // Reduce stability significantly
        stability = stability * Math.exp(w[11] * Math.pow(difficulty, w[12]));
        stability = Math.max(0.1, stability);
        
        // Reduce ease factor
        easeFactor = Math.max(1.3, easeFactor - 0.2);
        
      } else if (numRating === 2) { // Hard
        
        if (repetitions === 0) {
          interval = initialHardInterval / (24 * 60); // Convert minutes to days
        } else {
          // Apply hard factor to current interval
          const newInterval = interval * hardFactor;
          // But also consider the actual elapsed time
          interval = Math.max(elapsedDays + 1, Math.round(newInterval));
        }
        
        repetitions++;
        
        // Slightly increase difficulty
        difficulty = Math.min(10, difficulty + w[5] * 0.5);
        
        // Slightly reduce stability
        const recallProbability = Math.exp(-elapsedDays / stability);
        stability = stability * (1 + Math.exp(w[8]) * (11 - difficulty) * Math.pow(stability, w[9]) * (Math.exp(recallProbability * w[10]) - 1));
        
        // Slightly reduce ease factor
        easeFactor = Math.max(1.3, easeFactor - 0.15);
        
      } else if (numRating === 3) { // Good
        
        if (repetitions === 0) {
          interval = initialGoodInterval;
        } else if (repetitions === 1) {
          interval = initialGoodInterval * 1.5;
        } else {
          // Standard interval calculation with goodFactor
          const newInterval = interval * easeFactor * goodFactor;
          interval = Math.round(newInterval);
        }
        
        repetitions++;
        
        // Maintain or slightly reduce difficulty
        difficulty = Math.max(1, difficulty - w[6] * 0.3);
        
        // Increase stability based on successful recall
        const recallProbability = Math.exp(-elapsedDays / stability);
        stability = stability * (1 + Math.exp(w[8]) * (11 - difficulty) * Math.pow(stability, w[9]) * (Math.exp(recallProbability * w[10]) - 1));
        
        // Maintain ease factor
        // easeFactor stays the same
        
      } else if (numRating === 4) { // Easy
        
        if (repetitions === 0) {
          interval = initialEasyInterval;
        } else {
          // Apply easy bonus to interval
          const newInterval = interval * easeFactor * easyFactor;
          interval = Math.round(newInterval);
        }
        
        repetitions++;
        
        // Reduce difficulty
        difficulty = Math.max(1, difficulty - w[7]);
        
        // Increase stability more for easy recall
        const recallProbability = Math.exp(-elapsedDays / stability);
        stability = stability * (1 + Math.exp(w[8]) * (11 - difficulty) * Math.pow(stability, w[9]) * (Math.exp(recallProbability * w[10]) - 1) * 1.3);
        
        // Increase ease factor
        easeFactor = Math.min(2.5, easeFactor + 0.15);
      }
      
      // Apply fuzz factor to prevent cards bunching up
      const fuzzRange = interval * (fsrsParams.fuzzFactor || 0.05);
      const fuzz = (Math.random() - 0.5) * 2 * fuzzRange;
      interval = Math.max(1, Math.round(interval + fuzz));
      
      // Apply maximum interval limit
      interval = Math.min(interval, maximumInterval);
      
      // Calculate next due date
      const dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
      
      // Import Timestamp for proper Firestore format
      const { Timestamp } = await import('firebase/firestore');
      
      const updateData = {
        easeFactor,
        interval,
        repetitions,
        difficulty,
        stability,
        dueDate: Timestamp.fromDate(dueDate),
        lastReviewed: Timestamp.fromDate(now),
        reviewCount: (card.reviewCount || 0) + 1,
        level: rating // Store the rating as the level
      };
      
      // console.log('📝 Updating card with data:', updateData);
      // console.log(`📅 Next review: ${interval} days from now (${dueDate.toLocaleDateString()})`);
      
      // Add current card to navigation history before updating it
      // This ensures we can navigate back to this card even if it gets filtered out
      addToNavigationHistory(card);
      
      // Update the card
      await updateFlashcard(card.id, updateData);

      // console.log('✅ Card review successful!');
      // console.log('📅 Card new due date:', dueDate);
      // console.log('📅 Is card still due today?', dueDate <= new Date());
      // console.log('🔍 Current card ID:', card.id);
      // console.log('🔍 Update data applied:', updateData);

      setMessage(`Card reviewed as ${rating.toUpperCase()}! Next review in ${interval} day${interval !== 1 ? 's' : ''}.`);

      // Check if the card was due today before reviewing (to determine if we should decrement due count)
      const cardWasDueToday = (() => {
        let cardDueDate = card.dueDate || new Date(0);
        if (cardDueDate && typeof cardDueDate.toDate === 'function') {
          cardDueDate = cardDueDate.toDate();
        }
        return cardDueDate <= now;
      })();

      // Increment completed cards count
      const newCompletedCount = cardsCompletedToday + 1;
      setCardsCompletedToday(newCompletedCount);

      // Decrement persistent due cards count if the card was due today and relevant to current selection
      if (cardWasDueToday) {
        const cardMatchesCurrentSelection = (() => {
          // Check category match
          const cardCategory = card.category && card.category.trim() ? card.category : 'Uncategorized';
          if (selectedCategory !== 'All' && cardCategory !== selectedCategory) {
            return false;
          }
          
          // Check subcategory match if subcategory is selected
          const { selectedSubCategory } = window.flashcardHookState || { selectedSubCategory: 'All' };
          if (selectedSubCategory !== 'All') {
            const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
            if (cardSubCategory !== selectedSubCategory) {
              return false;
            }
          }
          
          return true;
        })();
        
        if (cardMatchesCurrentSelection) {
          const newPersistentCount = Math.max(0, persistentDueCardsCount - 1);
          setPersistentDueCardsCount(newPersistentCount);
          localStorage.setItem(`flashcard_persistent_due_${userId}`, newPersistentCount.toString());
          console.log('📉 REVIEW-DECREMENT: Card review decremented due count:', {
            cardId: card.id,
            cardCategory: card.category || 'Uncategorized',
            cardSubCategory: card.sub_category || 'Uncategorized',
            rating,
            previousCount: persistentDueCardsCount,
            newCount: newPersistentCount,
            cardWasDueToday,
            cardMatchesCurrentSelection
          });
        } else {
          console.log('📊 REVIEW-NO-DECREMENT: Card review did not decrement due count:', {
            cardId: card.id,
            cardCategory: card.category || 'Uncategorized',
            cardSubCategory: card.sub_category || 'Uncategorized',
            selectedCategory,
            selectedSubCategory: window.flashcardHookState?.selectedSubCategory || 'All',
            cardWasDueToday,
            cardMatchesCurrentSelection
          });
        }
      }

      // Save updated completed count to localStorage
      localStorage.setItem(`flashcard_completed_today_${userId}`, newCompletedCount.toString());

      // Mark that a card was just completed (for auto-advance logic)
      // This is passed to the useFlashcards hook to prevent auto-advance without user activity
      if (window.flashcardHook && window.flashcardHook.setLastCardCompletionTime) {
        window.flashcardHook.setLastCardCompletionTime(Date.now());
      }
      
      // Increment category-specific completed count
      const cardCategory = card.category || 'Uncategorized';
      const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      const subCategoryKey = `${cardCategory}::${cardSubCategory}`;
      
      const newCategoryCompleted = { ...categoryCompletedCounts };
      const newSubCategoryCompleted = { ...subCategoryCompletedCounts };
      
      newCategoryCompleted[cardCategory] = (newCategoryCompleted[cardCategory] || 0) + 1;
      newSubCategoryCompleted[subCategoryKey] = (newSubCategoryCompleted[subCategoryKey] || 0) + 1;
      
      setCategoryCompletedCounts(newCategoryCompleted);
      setSubCategoryCompletedCounts(newSubCategoryCompleted);

      // Save updated completion counts to localStorage
      localStorage.setItem(`flashcard_category_completed_${userId}`, JSON.stringify(newCategoryCompleted));
      localStorage.setItem(`flashcard_subcategory_completed_${userId}`, JSON.stringify(newSubCategoryCompleted));
      
      if (userId) {
        localStorage.setItem(`flashcard_completed_today_${userId}`, newCompletedCount.toString());
        localStorage.setItem(`flashcard_category_completed_${userId}`, JSON.stringify(newCategoryCompleted));
        localStorage.setItem(`flashcard_subcategory_completed_${userId}`, JSON.stringify(newSubCategoryCompleted));
      }
      
      // Hide answer and move to next card
      setShowAnswer(false);
      
      // Let the filtering effect handle navigation automatically, but add a backup
      // The useFlashcards hook should detect that the current card is no longer available
      // and automatically move to the next card via smart index management
      // console.log('🔄 Card review completed, waiting for automatic navigation...');

      // Force navigation to next card after a brief delay
      setTimeout(() => {
        // console.log('🔄 FORCING NAVIGATION: Moving to next card');
        nextCard();
      }, 100);
      
      clearMessage();
      
    } catch (error) {
      console.error('❌ Error reviewing card:', error);
      console.error('Card ID:', card.id);
      console.error('Rating:', rating);
      setError(`Failed to update card review: ${error.message}`);
    }
  };

  const handleUpdateCard = async (cardData, cardId) => {
    try {
      await updateFlashcard(cardId, cardData);
      setMessage(SUCCESS_MESSAGES.CARD_UPDATED);
      setIsEditingCard(false);
      setEditCardData(null);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to update flashcard');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this flashcard?')) {
      return;
    }

    try {
      // Store current position for smart navigation
      const currentCard = getCurrentCard();
      const currentPosition = currentCardIndex;
      const totalCards = filteredFlashcards.length;
      
      console.log(`🗑️ Deleting card at position ${currentPosition} of ${totalCards}`);
      
      await deleteFlashcard(cardId);
      
      // Navigate to next available card
      // The filtering system will handle the actual navigation via useEffect
      // But we can help by adjusting the index if we're at the end
      if (currentPosition >= totalCards - 1 && totalCards > 1) {
        // We're deleting the last card, move to the previous one
        setCurrentCardIndex(Math.max(0, currentPosition - 1));
        console.log(`🔄 Deleted last card, moving to position ${Math.max(0, currentPosition - 1)}`);
      }
      // For other positions, let the filtering system handle navigation automatically
      
      setMessage(SUCCESS_MESSAGES.CARD_DELETED);
      setIsEditingCard(false);
      setEditCardData(null);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to delete flashcard');
    }
  };

  const handleImport = async (cardsData) => {
    try {
      await bulkImportFlashcards(cardsData);
      setMessage(`${SUCCESS_MESSAGES.IMPORT_SUCCESS}: ${cardsData.length} cards imported`);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to import flashcards');
    }
  };

  const handleGenerateQuestions = async (questionsData) => {
    try {
      await bulkImportFlashcards(questionsData);
      setMessage(`✨ ${questionsData.length} AI-generated questions created successfully!`);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to create generated questions');
    }
  };

  const handleToggleCardActive = async (cardId, isActive) => {
    try {
      await updateFlashcard(cardId, { active: isActive });
      setMessage(`Card ${isActive ? 'activated' : 'deactivated'} successfully`);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to update card status');
    }
  };

  // Create default flashcards for new users
  const createDefaultFlashcards = async (currentUserId) => {
    console.log('🔍 createDefaultFlashcards called with:', {
      currentUserId,
      hasAddFlashcard: !!addFlashcard,
      flashcardsLength: flashcards.length
    });

    if (!currentUserId || !addFlashcard) {
      console.log('❌ Cannot create default cards: missing userId or addFlashcard function', {
        currentUserId: !!currentUserId,
        addFlashcard: !!addFlashcard
      });
      return;
    }

    // Check if defaults have already been created for this user
    const defaultsKey = `defaultCards_${currentUserId}`;
    const hasDefaults = localStorage.getItem(defaultsKey);
    
    console.log('🔍 Checking localStorage for defaults:', { defaultsKey, hasDefaults });
    
    if (hasDefaults) {
      console.log('📋 Default cards already created for this user');
      return;
    }

    // Check if user already has flashcards
    console.log('🔍 Checking flashcards length:', flashcards.length);
    if (flashcards.length > 0) {
      console.log('📋 User already has flashcards, skipping default creation');
      localStorage.setItem(defaultsKey, 'true'); // Mark as having defaults to avoid future checks
      return;
    }

    console.log('📋 Creating default flashcards for new user:', currentUserId);

    const defaultCards = [
      {
        question: "What is 2+2?",
        answer: "4",
        category: "Math",
        sub_category: "Arithmetic", 
        level: "new",
        additional_info: "Basic addition"
      },
      {
        question: "Capital of France?",
        answer: "Paris",
        category: "Geography",
        sub_category: "Europe",
        level: "easy", 
        additional_info: "Located in Western Europe"
      }
    ];

    try {
      let createdCount = 0;
      for (const cardData of defaultCards) {
        await addFlashcard(cardData);
        createdCount++;
      }
      
      // Mark defaults as created
      localStorage.setItem(defaultsKey, 'true');
      
      console.log(`✅ Successfully created ${createdCount} default flashcards`);
      setMessage(`Welcome! We've added ${createdCount} sample cards to get you started.`);
      clearMessage();
      
    } catch (error) {
      console.error('❌ Error creating default flashcards:', error);
      // Don't show error to user - this is a nice-to-have feature
    }
  };

  // Handle edit card
  const handleEditCard = (card) => {
    setEditCardData(card);
    setIsEditingCard(true);
    setShowCreateCardForm(true);
  };

  // Clear messages after delay
  const clearMessage = useCallback(() => {
    setTimeout(() => {
      setMessage('');
    }, 3000);
  }, []);

  const clearError = () => {
    setError('');
    clearAuthError();
    clearFlashcardsError();
    clearSettingsError();
  };

  // Handle API key updates
  const handleApiKeysUpdate = (newApiKeys, newSelectedProvider) => {
    setApiKeys(newApiKeys);
    setSelectedProvider(newSelectedProvider);
    
    // Save to localStorage
    Object.entries(newApiKeys).forEach(([provider, key]) => {
      if (key) {
        localStorage.setItem(`${provider}_api_key`, key);
      } else {
        localStorage.removeItem(`${provider}_api_key`);
      }
    });
    
    localStorage.setItem('selected_ai_provider', newSelectedProvider);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.contentEditable === 'true') {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault();
          // Toggle answer visibility
          console.log('Toggle answer:', showAnswer, '->', !showAnswer);
          setShowAnswer(prev => !prev);
          break;
        case 'ArrowLeft':
        case 'p':
          event.preventDefault();
          prevCard();
          break;
        case 'ArrowRight':
        case 'n':
          event.preventDefault();
          nextCard();
          break;
        case '1':
          // Only allow rating when answer is shown
          if (showAnswer && getCurrentCard()) {
            event.preventDefault();
            handleReviewCard('again');
          }
          break;
        case '2':
          // Only allow rating when answer is shown
          if (showAnswer && getCurrentCard()) {
            event.preventDefault();
            handleReviewCard('hard');
          }
          break;
        case '3':
          // Only allow rating when answer is shown
          if (showAnswer && getCurrentCard()) {
            event.preventDefault();
            handleReviewCard('good');
          }
          break;
        case '4':
          // Only allow rating when answer is shown
          if (showAnswer && getCurrentCard()) {
            event.preventDefault();
            handleReviewCard('easy');
          }
          break;
        case 'c':
          if (event.ctrlKey || event.metaKey) return; // Don't interfere with copy
          event.preventDefault();
          setShowCreateCardForm(true);
          break;
        case 's':
          if (event.ctrlKey || event.metaKey) return; // Don't interfere with save
          event.preventDefault();
          setShowSettingsModal(true);
          break;
        case 'e':
          // Edit current card if available
          if (getCurrentCard()) {
            event.preventDefault();
            handleEditCard(getCurrentCard());
          }
          break;
        case 'g':
          // Generate questions if available
          event.preventDefault();
          setShowGenerateModal(true);
          break;
        case 'i':
          // Import/Export modal
          event.preventDefault();
          setShowImportExportModal(true);
          break;
        case 'm':
          event.preventDefault();
          setShowManageCardsModal(true);
          break;
        case 'Escape':
          event.preventDefault();
          setShowCreateCardForm(false);
          setShowSettingsModal(false);
          setShowImportExportModal(false);
          setShowCalendarModal(false);
          setShowManageCardsModal(false);
          setShowGenerateModal(false);
          setIsEditingCard(false);
          setEditCardData(null);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, nextCard, prevCard, setShowAnswer, handleReviewCard, getCurrentCard, handleEditCard]);

  // Computed values now declared earlier in the component

  // Save notes to localStorage when changed
  useEffect(() => {
    localStorage.setItem('flashcard_session_notes', notes);
  }, [notes]);

  // Handle notes text change
  const handleNotesChange = (value) => {
    setNotes(value);
  };

  // Clear notes
  const handleClearNotes = () => {
    setNotes('');
  };
  
  // Get due cards for easy access
  const pastDueCards = getPastDueCards();
  const cardsDueToday = getCardsDueToday();
  const allDueCards = getAllDueCards();
  const filteredDueCards = getFilteredDueCards();
  const cardsReviewedToday = getCardsReviewedToday();

  // Load streak from localStorage on mount
  useEffect(() => {
    if (userId) {
      const savedStreak = localStorage.getItem(`streak_${userId}`) || '0';
      setStreakDays(parseInt(savedStreak, 10));
    }
  }, [userId]);

  // Initialize daily due cards count
  useEffect(() => {
    if (userId && flashcards.length > 0 && categoryStats && subCategoryStats) {
      const today = new Date().toDateString();
      const storedDate = localStorage.getItem(`flashcard_due_date_${userId}`);
      const storedCount = localStorage.getItem(`flashcard_initial_due_${userId}`);
      const storedPersistentCount = localStorage.getItem(`flashcard_persistent_due_${userId}`);
      const storedCompleted = localStorage.getItem(`flashcard_completed_today_${userId}`);
      const storedCategoryStats = localStorage.getItem(`flashcard_initial_category_stats_${userId}`);
      const storedCategoryCompleted = localStorage.getItem(`flashcard_category_completed_${userId}`);
      const storedSubCategoryStats = localStorage.getItem(`flashcard_initial_subcategory_stats_${userId}`);
      const storedSubCategoryCompleted = localStorage.getItem(`flashcard_subcategory_completed_${userId}`);
      
      // If it's a new day or first time, reset counts
      if (storedDate !== today) {
        const newInitialCount = allDueCards.length;
        const newPersistentCount = calculateDueCardsForCurrentSelection();
        const newCategoryStats = categoryStats;
        const newSubCategoryStats = getAllSubCategoryStats();
        
        console.log('🔄 COUNTING-INIT: Setting initial stats for new day');
        console.log('🔄 Initial category stats:', newCategoryStats);
        console.log('🔄 Initial subcategory stats keys:', Object.keys(newSubCategoryStats));
        console.log('🔄 Total due cards:', newInitialCount);
        console.log('🔄 Persistent due cards for current selection:', newPersistentCount);
        
        setInitialDueCardsCount(newInitialCount);
        setPersistentDueCardsCount(newPersistentCount);
        setCardsCompletedToday(0);
        setInitialCategoryStats(newCategoryStats);
        setCategoryCompletedCounts({});
        setInitialSubCategoryStats(newSubCategoryStats);
        setSubCategoryCompletedCounts({});
        localStorage.setItem(`flashcard_due_date_${userId}`, today);
        localStorage.setItem(`flashcard_initial_due_${userId}`, newInitialCount.toString());
        localStorage.setItem(`flashcard_persistent_due_${userId}`, newPersistentCount.toString());
        localStorage.setItem(`flashcard_completed_today_${userId}`, '0');
        localStorage.setItem(`flashcard_initial_category_stats_${userId}`, JSON.stringify(newCategoryStats));
        localStorage.setItem(`flashcard_category_completed_${userId}`, JSON.stringify({}));
        localStorage.setItem(`flashcard_initial_subcategory_stats_${userId}`, JSON.stringify(newSubCategoryStats));
        localStorage.setItem(`flashcard_subcategory_completed_${userId}`, JSON.stringify({}));
      } else {
        // Restore counts from localStorage
        setInitialDueCardsCount(parseInt(storedCount) || allDueCards.length);
        setPersistentDueCardsCount(parseInt(storedPersistentCount) || calculateDueCardsForCurrentSelection());
        setCardsCompletedToday(parseInt(storedCompleted) || 0);
        setInitialCategoryStats(storedCategoryStats ? JSON.parse(storedCategoryStats) : categoryStats);
        setCategoryCompletedCounts(storedCategoryCompleted ? JSON.parse(storedCategoryCompleted) : {});
        setInitialSubCategoryStats(storedSubCategoryStats ? JSON.parse(storedSubCategoryStats) : getAllSubCategoryStats());
        setSubCategoryCompletedCounts(storedSubCategoryCompleted ? JSON.parse(storedSubCategoryCompleted) : {});
      }
    }
  }, [userId, flashcards.length, categoryStats, getAllSubCategoryStats, calculateDueCardsForCurrentSelection]);

  // Update persistent due cards count when category or subcategory changes
  useEffect(() => {
    if (userId && flashcards.length > 0) {
      updatePersistentDueCount();
    }
  }, [selectedCategory, updatePersistentDueCount, flashcards.length, userId]);

  // Fix completion count inconsistencies - DISABLED to prevent infinite loop
  useEffect(() => {
    // Disabled to prevent infinite loop - use window.debugCounting.reset() instead
    return;
  }, []);

  // Check and update streak when all cards are completed
  useEffect(() => {
    if (!userId || !flashcards.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toDateString();
    
    // Check if all cards have been completed today
    const allCardsCompleted = allDueCards.length === 0 && flashcards.length > 0;
    
    if (allCardsCompleted) {
      const lastCompletionDate = localStorage.getItem(`lastCompletion_${userId}`);
      const lastStreakUpdate = localStorage.getItem(`lastStreakUpdate_${userId}`);
      
      // Only update streak once per day
      if (lastStreakUpdate !== todayString) {
        let newStreak = streakDays;
        
        if (lastCompletionDate) {
          const lastDate = new Date(lastCompletionDate);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          // If last completion was yesterday, increment streak
          if (lastDate.toDateString() === yesterday.toDateString()) {
            newStreak = streakDays + 1;
          } else if (lastDate.toDateString() === todayString) {
            // Already completed today, keep current streak
            newStreak = streakDays;
          } else {
            // Gap in completions, reset streak to 1
            newStreak = 1;
          }
        } else {
          // First completion ever
          newStreak = 1;
        }
        
        setStreakDays(newStreak);
        localStorage.setItem(`streak_${userId}`, newStreak.toString());
        localStorage.setItem(`lastCompletion_${userId}`, todayString);
        localStorage.setItem(`lastStreakUpdate_${userId}`, todayString);
      }
    }
  }, [userId, allDueCards.length, flashcards.length, streakDays]);

  // Auto-switch to "All" if selected category has no due cards (using stable counting)
  useEffect(() => {
    if (!showDueTodayOnly || selectedCategory === 'All') return;

    // TEMPORARILY DISABLE CATEGORY AUTO-SWITCH TO DEBUG SWITCHING
    const categoryAutoSwitchDisabled = true;

    // Don't auto-switch if user is manually selecting categories
    if (isManualCategorySelection) {
      console.log(`📂 Skipping auto-switch for "${selectedCategory}" - manual category selection in progress`);
      return;
    }

    // Don't auto-switch if user manually selected a category in the last 10 seconds
    const timeSinceManualChange = Date.now() - lastManualCategoryChange;
    if (timeSinceManualChange < 10000) {
      console.log(`📂 Skipping auto-switch for "${selectedCategory}" - manual selection too recent (${timeSinceManualChange}ms ago)`);
      return;
    }

    // Use real-time count for auto-switch logic
    const now = new Date();
    const categoryDueCards = flashcards.filter(card => {
      if (card.active === false) return false;
      if ((card.category || 'Uncategorized') !== selectedCategory) return false;
      // Skip cards without valid due dates
      if (!card.dueDate) return false;
      let dueDate = card.dueDate;
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    });

    if (categoryDueCards.length === 0) {
      if (categoryAutoSwitchDisabled) {
        console.log(`🚫 CATEGORY AUTO-SWITCH: Would switch "${selectedCategory}" to "All" but auto-switch is disabled`);
      } else {
        console.log(`📂 Category "${selectedCategory}" has no due cards remaining, switching to "All"`);
        setSelectedCategory('All');
      }
    }
  }, [selectedCategory, showDueTodayOnly, setSelectedCategory, flashcards, lastManualCategoryChange, isManualCategorySelection]);
  
  // Log due cards info on initial load (useful for debugging)
  useEffect(() => {
    console.log('📊 Due Cards Summary:', {
      pastDue: pastDueCards.length,
      dueToday: cardsDueToday.length,
      totalDue: allDueCards.length,
      filteredDue: filteredDueCards.length,
      filteredFlashcards: filteredFlashcards.length,
      showDueTodayOnly: showDueTodayOnly,
      selectedCategory: selectedCategory,
      selectedSubCategory: selectedSubCategory,
      pastDueCards: pastDueCards.map(card => ({ 
        question: card.question?.substring(0, 50), 
        dueDate: card.dueDate 
      })),
      cardsDueToday: cardsDueToday.map(card => ({ 
        question: card.question?.substring(0, 50), 
        dueDate: card.dueDate 
      }))
    });
    
    // Run detailed debug when due cards are expected but not showing
    if (showDueTodayOnly && filteredFlashcards.length === 0 && allDueCards.length > 0) {
      console.log('⚠️ WARNING: Due cards exist but none are showing!');
      debugDueCards(flashcards, selectedCategory, selectedSubCategory);
    }
  }, [pastDueCards.length, cardsDueToday.length, allDueCards.length, filteredDueCards.length, filteredFlashcards.length, showDueTodayOnly, selectedCategory, selectedSubCategory, flashcards]);

  // CATEGORY SYNC DEBUG: Track category changes to identify timing issues
  useEffect(() => {
    if (flashcards.length > 0) {
      const awsCards = flashcards.filter(card =>
        (card.category || '').toLowerCase().includes('aws')
      );

      console.log('🔍 CATEGORY SYNC DEBUG:', {
        flashcardsLength: flashcards.length,
        categoriesLength: categories.length,
        categories: categories,
        awsCardsFound: awsCards.length,
        awsInCategories: categories.includes('AWS'),
        awsInCategoriesLower: categories.includes('aws'),
        showDueTodayOnly,
        showStarredOnly,
        timestamp: new Date().toISOString()
      });

      // Specific AWS debugging
      if (awsCards.length > 0) {
        console.log('🔍 AWS CARDS DETAIL:', awsCards.map(card => ({
          id: card.id,
          category: card.category,
          active: card.active,
          question: card.question?.substring(0, 50)
        })));
      }
    }
  }, [flashcards, categories, showDueTodayOnly, showStarredOnly]);

  // SUBCATEGORY SYNC DEBUG: Track subcategory filtering issues
  useEffect(() => {
    if (flashcards.length > 0) {
      console.log('🔍 SUBCATEGORY SYNC DEBUG:', {
        selectedCategory,
        selectedSubCategory,
        subCategoriesLength: subCategories.length,
        subCategories: subCategories,
        showDueTodayOnly,
        showStarredOnly,
        timestamp: new Date().toISOString()
      });

      // Show cards in selected category and their subcategories
      if (selectedCategory !== 'All') {
        const categoryCards = flashcards.filter(card =>
          card.active !== false && card.category === selectedCategory
        );

        const categorySubCategories = [...new Set(
          categoryCards.map(card => card.sub_category || 'Uncategorized')
        )];

        console.log('🔍 CATEGORY CARDS DETAIL:', {
          selectedCategory,
          cardsInCategory: categoryCards.length,
          actualSubCategories: categorySubCategories,
          filteredSubCategories: subCategories,
          mismatch: categorySubCategories.length !== subCategories.length
        });
      }
    }
  }, [flashcards, selectedCategory, selectedSubCategory, subCategories, showDueTodayOnly, showStarredOnly]);

  // Auto-navigation to next category with due cards
  useEffect(() => {

    // TEMPORARILY DISABLE CATEGORY AUTO-NAVIGATION TO DEBUG SWITCHING
    const categoryAutoNavigationDisabled = true;

    // Only auto-navigate when:
    // 1. We're showing due cards only
    // 2. We have a specific category selected (not "All")
    // 3. There are no filtered cards left in the current category
    // 4. There are NO subcategories with due cards in the current category
    // 5. There are still due cards in other categories
    // 6. User hasn't manually selected a category recently
    const timeSinceManualChange = Date.now() - lastManualCategoryChange;
    if (showDueTodayOnly && selectedCategory !== 'All' && filteredFlashcards.length === 0 && allDueCards.length > 0 && !isManualCategorySelection && timeSinceManualChange > 10000 && !categoryAutoNavigationDisabled) {
      console.log('🔄 Category auto-advance triggered:', {
        selectedCategory,
        selectedSubCategory,
        filteredFlashcardsLength: filteredFlashcards.length,
        allDueCardsLength: allDueCards.length
      });
      
      // Check if there are any subcategories with due cards in the current category
      const nextSubCategory = getNextSubCategoryWithLeastCards(selectedCategory, selectedSubCategory);
      const hasSubcategoriesWithDueCards = nextSubCategory !== null;

      console.log('🔄 Subcategory check:', {
        nextSubCategory,
        hasSubcategoriesWithDueCards,
        currentSubCategory: selectedSubCategory
      });

      // If there are subcategories with due cards, advance to the next subcategory instead of switching categories
      if (hasSubcategoriesWithDueCards) {
        console.log(`🔄 Auto-advancing to next subcategory: "${nextSubCategory}" within category "${selectedCategory}"`);

        // Use a delay to ensure state stability and prevent conflicts with useFlashcards auto-advance
        // This should rarely run since useFlashcards handles subcategory auto-advance
        setTimeout(() => {
          setSelectedSubCategory(nextSubCategory);
          setMessage(`Switched to "${nextSubCategory}" subcategory - showing due cards`);

          // Clear message after 3 seconds
          setTimeout(() => setMessage(''), 3000);
        }, 300);

        return; // Don't switch categories
      }

      // Only switch categories if there are no subcategories with due cards left in current category
      if (!hasSubcategoriesWithDueCards) {
        const nextCategory = getNextCategoryWithDueCards(selectedCategory);
        
        if (nextCategory) {
          console.log(`🔄 Auto-navigating from "${selectedCategory}" to "${nextCategory}" (category completed)`);
          setSelectedCategory(nextCategory);
          // Ensure we stay in due cards mode
          setShowDueTodayOnly(true);
          setMessage(`Switched to "${nextCategory}" category (${selectedCategory} completed) - showing due cards`);
          
          // Clear message after 3 seconds
          setTimeout(() => setMessage(''), 3000);
        } else {
          console.log('🎉 All categories completed!');
        }
      } else {
        console.log('🔄 Current category still has subcategories with due cards, not switching category');
        console.log('🔄 Should advance to subcategory:', nextSubCategory);
      }
    }
  }, [showDueTodayOnly, selectedCategory, selectedSubCategory, filteredFlashcards.length, allDueCards.length, getNextCategoryWithDueCards, getNextSubCategoryWithLeastCards, setSelectedCategory, setShowDueTodayOnly, lastManualCategoryChange, isManualCategorySelection]);

  // Debug logging for loading state
  // console.log('App loading state:', {
  //   isFirebaseInitialized,
  //   isAuthReady,
  //   settingsLoaded,
  //   userId,
  //   showLoginScreen
  // });

  // Show loading screen while initializing
  if (!isFirebaseInitialized || !isAuthReady || !settingsLoaded) {
    return (
      <div className={`app-loading ${isDarkMode ? 'dark' : ''}`}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading Flashcard App...</p>
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
            <p>Firebase: {isFirebaseInitialized ? '✅' : '⏳'}</p>
            <p>Auth: {isAuthReady ? '✅' : '⏳'}</p>
            <p>Settings: {settingsLoaded ? '✅' : '⏳'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (showLoginScreen) {
    return (
      <LoginScreen
        handleLogin={(e) => {
          e.preventDefault();
          handleLogin('login', email, password);
        }}
        handleRegister={(e) => {
          e.preventDefault();
          handleLogin('register', email, password);
        }}
        handleAnonymousLogin={() => {
          handleLogin('anonymous');
        }}
        handlePasswordReset={handlePasswordReset}
        authError={authError || error}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isDarkMode={isDarkMode}
        isLoading={authLoading}
        onToggleDarkMode={toggleDarkMode}
      />
    );
  }
  
  // Convert flashcards to calendar dates format
  const getCalendarDates = () => {
    const dateMap = new Map();
    const completionMap = new Map();
    const now = new Date();
    const todayString = now.toDateString();
    
    // First, count all cards that are due now or earlier and group them by date
    flashcards.forEach(card => {
      // Track completion dates
      if (card.lastReviewed && card.active !== false) {
        const lastReviewDate = card.lastReviewed instanceof Date ? card.lastReviewed : card.lastReviewed.toDate();
        const reviewDateKey = lastReviewDate.toDateString();
        
        if (completionMap.has(reviewDateKey)) {
          completionMap.get(reviewDateKey).completedCount++;
        } else {
          completionMap.set(reviewDateKey, {
            date: new Date(lastReviewDate.getFullYear(), lastReviewDate.getMonth(), lastReviewDate.getDate()),
            completedCount: 1
          });
        }
      }
      
      // Only include active cards with due dates
      if (card.dueDate && card.active !== false) {
        const dueDate = card.dueDate instanceof Date ? card.dueDate : card.dueDate.toDate();
        const dateKey = dueDate.toDateString();
        const isPastDate = dueDate < now && dateKey !== todayString;
        
        // For past dates, preserve historical accuracy by showing what was incomplete
        if (isPastDate) {
          // Past date logic: show what was actually incomplete on that day
          if (dateMap.has(dateKey)) {
            dateMap.get(dateKey).cardCount++;
          } else {
            dateMap.set(dateKey, {
              date: new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()),
              cardCount: 1,
              isPastDate: true
            });
          }
          
          // For past incomplete cards, also count them in today's due cards
          if (dateMap.has(todayString)) {
            if (!dateMap.get(todayString).overdueFromPast) {
              dateMap.get(todayString).overdueFromPast = 0;
            }
            dateMap.get(todayString).overdueFromPast++;
            dateMap.get(todayString).cardCount++;
          } else {
            dateMap.set(todayString, {
              date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              cardCount: 1,
              overdueFromPast: 1
            });
          }
        } else {
          // Current/future date logic: show actual current state
          if (dateMap.has(dateKey)) {
            dateMap.get(dateKey).cardCount++;
          } else {
            dateMap.set(dateKey, {
              date: new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()),
              cardCount: 1,
              isPastDate: false
            });
          }
        }
      }
    });
    
    // Merge completion data into calendar dates
    const allDates = Array.from(dateMap.values());
    completionMap.forEach((completion, dateKey) => {
      const existingDate = allDates.find(d => d.date.toDateString() === dateKey);
      if (existingDate) {
        existingDate.completedCount = completion.completedCount;
        
        // For past dates: adjust cardCount to show historical incomplete count
        // This ensures past days show what was actually incomplete, not current state
        if (existingDate.isPastDate) {
          // For past dates, the cardCount represents what was incomplete on that day
          // Don't subtract completions as they represent historical reality
          // The cardCount already represents what was incomplete on that specific day
        }
      } else {
        // Add completion-only dates (days with completions but no current due cards)
        allDates.push({
          date: completion.date,
          cardCount: 0,
          completedCount: completion.completedCount,
          isPastDate: completion.date < now
        });
      }
    });
    
    
    return allDates;
  };
  
  const calendarDates = getCalendarDates();

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      
      {/* Header */}
      <header className={`app-header ${isHeaderCollapsed ? 'collapsed' : ''}`}>
        <div className={`header-layout ${isHeaderCollapsed ? 'hidden' : ''}`}>
          {/* Left Section - User Welcome */}
          <div className="header-left">
            {userId && userDisplayName && (
              <div className="user-welcome-box">
                <div className="welcome-text">Welcome back!</div>
                <div className="user-email">{userDisplayName}</div>
                <div className="streak-info">
                  🔥 {streakDays} day{streakDays !== 1 ? 's' : ''} streak
                </div>
              </div>
            )}
          </div>

          {/* Left Section - Logo */}
          <div 
            className="header-left-logo clickable-logo"
            onClick={() => {
              setShowSettingsModal(true);
              // Toggle interval settings to show FSRS explanation
              if (!showIntervalSettings) {
                toggleIntervalSettings();
              }
            }}
            title="Click to learn about FSRS algorithm"
          >
            <h1 className="app-logo">FSRS Flashcards</h1>
            <p className="app-subtitle">AI Learning Platform</p>
          </div>

          {/* Right Section - Actions */}
          <div className="header-right">
            <div className="actions-toggle-section">
              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowManageCardsModal(true)}
                  title="Manage cards (M)"
                >
                  📋 Manage Cards
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCalendarModal(true)}
                  title="View calendar"
                >
                  📅 Calendar
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSettingsModal(true)}
                  title="Settings (S)"
                >
                  ⚙️ Settings
                </button>

                {/* Debug button for troubleshooting */}
              </div>

              {/* Card Filter Toggle - Line under action buttons */}
              <div className="toggle-controls-row">
                <div className="card-filter-toggle">
                  <button
                    className={`toggle-btn ${!showDueTodayOnly ? 'active' : ''}`}
                    onClick={() => {
                      setShowDueTodayOnly(false);
                      // Keep current filters when switching to all cards
                    }}
                  >
                    All Cards ({flashcards.length})
                  </button>
                  <button
                    className={`toggle-btn ${showDueTodayOnly ? 'active' : ''}`}
                    onClick={() => {
                      setShowDueTodayOnly(true);
                      // Category and subcategory filters are still applied to due cards
                    }}
                    title={`Filtered Due Cards: ${filteredDueCards.length} | Total Due (All Categories): ${allDueCards.length}`}
                  >
                    Due Cards ({filteredDueCards.length})
                  </button>
                  <button
                    className={`toggle-btn star-toggle ${showStarredOnly ? 'active' : ''}`}
                    onClick={() => {
                      setShowStarredOnly(!showStarredOnly);
                    }}
                    title={`Show only starred cards: ${showStarredOnly ? 'ON' : 'OFF'}`}
                  >
                    ⭐
                  </button>
                </div>
                
                {/* Header Toggle Arrow */}
                <button 
                  className="header-arrow-toggle"
                  onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                  aria-label="Collapse header"
                  title="Hide header controls"
                >
                  ▲
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Show toggle button when header is collapsed */}
        {isHeaderCollapsed && (
          <div className="collapsed-header-controls">
            <button
              className="header-toggle-btn-collapsed collapse-toggle header-collapse-toggle"
              onClick={() => setIsHeaderCollapsed(false)}
              aria-label="Expand header"
              title="Show header controls"
            >
              ▼
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      {(message || error || flashcardsError || settingsError) && (
        <div className="message-bar">
          {message && (
            <div className="success-message">
              ✅ {message}
            </div>
          )}
          {(error || flashcardsError || settingsError) && (
            <div className="error-message">
              ❌ {error || flashcardsError || settingsError}
              <button className="close-message" onClick={clearError}>×</button>
            </div>
          )}
        </div>
      )}


      {/* Main Content */}
      <main className="app-main">
        
        {/* Anonymous User Warning */}
        {isAnonymous && !isAnonymousWarningDismissed && (
          <div className="anonymous-warning">
            <div className="warning-content">
              <span className="warning-icon">⚠️</span>
              <div className="warning-text">
                <strong>Anonymous Session</strong>
                <p>You're using anonymous mode. Your flashcards and progress will not be saved permanently. Consider creating an account to save your progress.</p>
              </div>
              <div className="warning-actions">
                <button 
                  className="warning-dismiss-btn"
                  onClick={() => setShowLoginScreen(true)}
                  title="Switch to account login"
                >
                  Sign In
                </button>
                <button 
                  className="warning-close-btn"
                  onClick={() => setIsAnonymousWarningDismissed(true)}
                  title="Close this warning"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredFlashcards.length === 0 ? (
          <div className="no-cards-state">
            {showDueTodayOnly && flashcards.length > 0 && allDueCards.length === 0 ? (
              // All cards completed for today!
              <>
                <div className="completion-celebration">
                  <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'bounce 1s ease-in-out' }}>
                    😊
                  </div>
                  <h2 style={{ color: 'var(--success-color, #4caf50)', marginBottom: '0.5rem' }}>
                    🎉 Congratulations! 🎉
                  </h2>
                  <h3>All cards completed for today!</h3>
                  <p style={{ fontSize: '1.1rem', margin: '1rem 0' }}>
                    You've successfully reviewed all your due cards. 
                    Great work on staying consistent! 💪
                  </p>
                  <div className="completion-stats" style={{ 
                    margin: '1.5rem 0',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px'
                  }}>
                    <p>📊 Today's Stats:</p>
                    <p>✅ Cards reviewed today: {cardsReviewedToday.length}</p>
                    <p>📖 Total cards: {flashcards.length}</p>
                    <p>🎯 Streak maintained!</p>
                  </div>
                  <div className="no-cards-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setShowDueTodayOnly(false)}
                    >
                      View All Cards
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowCreateCardForm(true)}
                    >
                      Create New Card
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Regular no cards message
              <>
                <h2>No flashcards available</h2>
                <p>
                  {selectedCategory === 'All' 
                    ? 'Get started by managing your flashcards - create new ones or import existing collections!'
                    : `No cards found in "${selectedCategory}" category${showDueTodayOnly ? ' that are due today' : ''}.`
                  }
                </p>
                <div className="no-cards-actions">
                  {selectedCategory !== 'All' && showDueTodayOnly && (
                    <>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          const nextCategory = getNextCategoryWithLeastCards(selectedCategory);
                          if (nextCategory) {
                            console.log(`🔄 Manual navigation to next category: ${nextCategory}`);
                            setSelectedCategory(nextCategory);
                            setSelectedSubCategory('All');
                            setMessage(`Switched to "${nextCategory}" category`);
                            setTimeout(() => setMessage(''), 3000);
                          } else {
                            setMessage('No other categories with due cards available');
                            setTimeout(() => setMessage(''), 3000);
                          }
                        }}
                      >
                        ⏭️ Next Category
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => {
                          setSelectedCategory('All');
                          setSelectedSubCategory('All');
                          setMessage('Switched to All categories');
                          setTimeout(() => setMessage(''), 3000);
                        }}
                      >
                        📂 All Categories
                      </button>
                    </>
                  )}
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowManageCardsModal(true)}
                  >
                    📋 Manage Cards
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flashcard-area">
            <div className="flashcard-with-notes-container">
              {/* Filters Section - Left of flashcard */}
              <div className="filters-section-left">
                <div className="filters-group">
                  <div className="filters-content">
                    {/* Category Filter Buttons */}
                    {(filteredDisplayCategories.length > 0) && (
                      <div className={`filter-section ${isCategoriesCollapsed ? 'collapsed' : ''}`}>
                        <button
                          className="collapse-toggle panel-collapse-toggle"
                          onClick={() => {
                            console.log('Categories collapse clicked, current state:', isCategoriesCollapsed);
                            setIsCategoriesCollapsed(!isCategoriesCollapsed);
                          }}
                          aria-label={isCategoriesCollapsed ? "Expand categories" : "Collapse categories"}
                        >
                          {isCategoriesCollapsed ? '▼' : '▲'}
                        </button>
                        <div className="filter-section-header">
                          <label className="filter-label">Categories</label>
                        </div>
                        <div className="filter-buttons-container">
                          <button
                            className={`filter-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('All')}
                          >
                            All ({(() => {
                              // Calculate total count by summing up the actual counts shown for each individual category
                              // This ensures the "All" count matches the sum of individual category counts
                              let totalCount = 0;

                              filteredDisplayCategories.forEach(category => {
                                // Use the EXACT same logic as individual category buttons below
                                let categoryCards = flashcards.filter(card => {
                                  // Only count active cards
                                  if (card.active === false) return false;
                                  // Match the category
                                  return (card.category || 'Uncategorized') === category;
                                });
                                
                                // Apply level filter for bottom-up filtering (if specific level selected)
                                if (selectedLevel !== 'All') {
                                  categoryCards = categoryCards.filter(card => {
                                    const cardLevel = card.level || inferLevelFromFSRS(card);
                                    return cardLevel === selectedLevel;
                                  });
                                }

                                // Calculate count based on showDueTodayOnly and showStarredOnly
                                let actualCardsInCategory;
                                
                                if (showDueTodayOnly && showStarredOnly) {
                                  // When both filters are on, count actual starred due cards
                                  // Apply starred filter
                                  categoryCards = categoryCards.filter(card => card.starred === true);
                                  
                                  // Apply due date filter
                                  const now = new Date();
                                  categoryCards = categoryCards.filter(card => {
                                    // Skip cards without valid due dates (but allow Firestore Timestamps)
                                    if (!card.dueDate && card.dueDate !== 0) return false;
                                    let dueDate = card.dueDate;
                                    if (dueDate && typeof dueDate.toDate === 'function') {
                                      dueDate = dueDate.toDate();
                                    } else if (typeof dueDate === 'number' || typeof dueDate === 'string') {
                                      dueDate = new Date(dueDate);
                                    }
                                    // Skip invalid dates
                                    if (!dueDate || isNaN(dueDate.getTime())) return false;
                                    return dueDate <= now;
                                  });
                                  
                                  actualCardsInCategory = categoryCards.length;
                                } else if (showDueTodayOnly) {
                                  // Use real-time counting for "All" button
                                  const now = new Date();
                                  categoryCards = categoryCards.filter(card => {
                                    // Skip cards without valid due dates (but allow Firestore Timestamps)
                                    if (!card.dueDate && card.dueDate !== 0) return false;
                                    let dueDate = card.dueDate;
                                    if (dueDate && typeof dueDate.toDate === 'function') {
                                      dueDate = dueDate.toDate();
                                    } else if (typeof dueDate === 'number' || typeof dueDate === 'string') {
                                      dueDate = new Date(dueDate);
                                    }
                                    // Skip invalid dates
                                    if (!dueDate || isNaN(dueDate.getTime())) return false;
                                    return dueDate <= now;
                                  });
                                  actualCardsInCategory = categoryCards.length;
                                } else {
                                  // For non-due mode, count actual cards with filters
                                  // If showing starred only, filter by starred
                                  if (showStarredOnly) {
                                    categoryCards = categoryCards.filter(card => card.starred === true);
                                  }
                                  actualCardsInCategory = categoryCards.length;
                                }

                                // Only add to total if category has cards (same logic as individual buttons)
                                if (actualCardsInCategory > 0) {
                                  totalCount += actualCardsInCategory;
                                }
                              });
                              
                              console.log(`All category TOTAL (corrected): ${totalCount}`);
                              return totalCount;
                            })()})
                          </button>
                          {(() => {
                            // Use filteredDisplayCategories which only includes categories with actual cards

                            return filteredDisplayCategories.map(category => {
                              // Count actual cards in this category from ALL flashcards (not filtered)
                              // Apply the same base filters as the main filtering logic
                              let categoryCards = flashcards.filter(card => {
                                // Only count active cards
                                if (card.active === false) return false;
                                // Match the category
                                return (card.category || 'Uncategorized') === category;
                              });
                              
                              // Apply level filter for bottom-up filtering (if specific level selected)
                              if (selectedLevel !== 'All') {
                                categoryCards = categoryCards.filter(card => {
                                  const cardLevel = card.level || inferLevelFromFSRS(card);
                                  return cardLevel === selectedLevel;
                                });
                              }

                              // Calculate count based on showDueTodayOnly and showStarredOnly
                              let actualCardsInCategory;
                              
                              if (showDueTodayOnly && showStarredOnly) {
                                // When both filters are on, count actual starred due cards
                                // Apply starred filter
                                categoryCards = categoryCards.filter(card => card.starred === true);
                                
                                // Apply due date filter (match useFlashcards logic)
                                const now = new Date();
                                categoryCards = categoryCards.filter(card => {
                                  // Skip cards without valid due dates
                                  if (!card.dueDate) return false;
                                  let dueDate = card.dueDate;
                                  if (dueDate && typeof dueDate.toDate === 'function') {
                                    dueDate = dueDate.toDate();
                                  }
                                  return dueDate <= now; // Match useFlashcards logic exactly
                                });
                                
                                actualCardsInCategory = categoryCards.length;
                              } else if (showDueTodayOnly) {
                                // Use real-time counting for categories (match useFlashcards logic)
                                const now = new Date();
                                categoryCards = categoryCards.filter(card => {
                                  // Skip cards without valid due dates
                                  if (!card.dueDate) return false;
                                  let dueDate = card.dueDate;
                                  if (dueDate && typeof dueDate.toDate === 'function') {
                                    dueDate = dueDate.toDate();
                                  }
                                  return dueDate <= now; // Match useFlashcards logic exactly
                                });
                                actualCardsInCategory = categoryCards.length;
                              } else {
                                // For non-due mode, count actual cards with filters
                                // If showing starred only, filter by starred
                                if (showStarredOnly) {
                                  categoryCards = categoryCards.filter(card => card.starred === true);
                                }
                                actualCardsInCategory = categoryCards.length;
                              }

                              // Debug logging
                              // console.log(`Individual category DEBUG - ${category}: ${actualCardsInCategory} cards`);
                              
                              // Skip categories with no actual cards
                              if (actualCardsInCategory === 0) {
                                return null;
                              }
                              
                              return (
                                <button
                                  key={category}
                                  className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                                  onClick={() => setSelectedCategory(category)}
                                >
                                  {category} ({actualCardsInCategory})
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Sub-Category Filter Buttons */}
                    {subCategories.length > 0 && (
                      <div className={`filter-section subcategory-section ${isSubCategoriesCollapsed ? 'collapsed' : ''}`}>
                        <button
                          className="collapse-toggle panel-collapse-toggle"
                          onClick={() => {
                            console.log('Subcategories collapse clicked, current state:', isSubCategoriesCollapsed);
                            setIsSubCategoriesCollapsed(!isSubCategoriesCollapsed);
                          }}
                          aria-label={isSubCategoriesCollapsed ? "Expand subcategories" : "Collapse subcategories"}
                        >
                          {isSubCategoriesCollapsed ? '▼' : '▲'}
                        </button>
                        <div className="filter-section-header">
                          <label className="filter-label">Sub-Categories</label>
                        </div>
                        <div className="filter-buttons-container">
                          <button
                            className={`filter-btn ${selectedSubCategory === 'All' ? 'active' : ''}`}
                            onClick={() => setSelectedSubCategory('All')}
                          >
                            All
                          </button>
                          {(() => {
                            // Debug sub-categories
                            console.log('🔍 App.js subCategories DEBUG:', {
                              selectedCategory,
                              subCategories: subCategories,
                              subCategoriesLength: subCategories.length
                            });
                            
                            // Use filtered subcategories from getSubCategories()
                            return subCategories.map(subCategory => {
                              // Count actual cards in this subcategory from ALL flashcards (not filtered)
                              // Apply the same base filters as the main filtering logic
                              let subCategoryCards = flashcards.filter(card => {
                                // Only count active cards
                                if (card.active === false) return false;
                                // Match the selected category (if not 'All')
                                if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
                                // Match the subcategory
                                const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
                                return cardSubCategory === subCategory;
                              });
                              
                              // Apply level filter for bottom-up filtering (if specific level selected)
                              if (selectedLevel !== 'All') {
                                subCategoryCards = subCategoryCards.filter(card => {
                                  const cardLevel = card.level || inferLevelFromFSRS(card);
                                  return cardLevel === selectedLevel;
                                });
                              }

                              // If showing due cards only, filter by due date (match logic from useFlashcards)
                              if (showDueTodayOnly) {
                                const now = new Date();
                                subCategoryCards = subCategoryCards.filter(card => {
                                  // Skip cards without valid due dates
                                  if (!card.dueDate) return false;
                                  let dueDate = card.dueDate;
                                  if (dueDate && typeof dueDate.toDate === 'function') {
                                    dueDate = dueDate.toDate();
                                  }
                                  return dueDate <= now; // Match useFlashcards logic exactly
                                });
                              }

                              // If showing starred only, filter by starred
                              if (showStarredOnly) {
                                subCategoryCards = subCategoryCards.filter(card => card.starred === true);
                              }

                              const actualCardsInSubCategory = subCategoryCards.length;

                              // Debug: Show count calculation for this subcategory
                              if (subCategory === 'Spring Rest') {
                                console.log(`🔍 SUBCATEGORY COUNT DEBUG for "${subCategory}":`, {
                                  beforeFiltering: flashcards.filter(card => {
                                    if (card.active === false) return false;
                                    if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
                                    const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
                                    return cardSubCategory === subCategory;
                                  }).length,
                                  afterDueFilter: actualCardsInSubCategory,
                                  showDueTodayOnly,
                                  selectedCategory
                                });
                              }

                              // Skip subcategories with no actual cards
                              if (actualCardsInSubCategory === 0) {
                                return null;
                              }
                              
                              return (
                                <button
                                  key={subCategory}
                                  className={`filter-btn ${selectedSubCategory === subCategory ? 'active' : ''}`}
                                  onClick={() => setSelectedSubCategory(subCategory)}
                                >
                                  {subCategory} ({actualCardsInSubCategory})
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Level Filter Buttons */}
                    {levels.length > 0 && (
                      <div className={`filter-section level-section ${isLevelsCollapsed ? 'collapsed' : ''}`}>
                        <button
                          className="collapse-toggle panel-collapse-toggle"
                          onClick={() => {
                            console.log('Levels collapse clicked, current state:', isLevelsCollapsed);
                            setIsLevelsCollapsed(!isLevelsCollapsed);
                          }}
                          aria-label={isLevelsCollapsed ? "Expand levels" : "Collapse levels"}
                        >
                          {isLevelsCollapsed ? '▼' : '▲'}
                        </button>
                        <div className="filter-section-header">
                          <label className="filter-label">Levels</label>
                        </div>
                        <div className="filter-buttons-container">
                          <button
                            className={`filter-btn ${selectedLevel === 'All' ? 'active' : ''}`}
                            onClick={() => setSelectedLevel('All')}
                          >
                            All
                          </button>
                          {levels.map(level => {
                            const count = levelStats[level] || 0;
                            console.log(`🔍 LEVEL-BUTTON: ${level} = ${count} cards`);
                            return (
                              <button
                                key={level}
                                className={`filter-btn ${selectedLevel === level ? 'active' : ''}`}
                                onClick={() => setSelectedLevel(level)}
                              >
                                {level.charAt(0).toUpperCase() + level.slice(1)} ({count})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Review Panel - Always visible when there's a current card */}
                {currentCard && (
                  <div className="review-panel-below-categories">
                    <div className="review-panel-frame" title="Rate Your Knowledge">
                      <div className="review-button-grid">
                        <button 
                          className="review-btn again-btn"
                          onClick={() => handleReviewCard('again')}
                          title="Completely forgot (1)"
                        >
                          <span className="btn-number">1</span>
                          <span className="btn-emoji">😵</span>
                          <span className="btn-text">Again</span>
                        </button>
                        
                        <button 
                          className="review-btn hard-btn"
                          onClick={() => handleReviewCard('hard')}
                          title="Hard to remember (2)"
                        >
                          <span className="btn-number">2</span>
                          <span className="btn-emoji">😓</span>
                          <span className="btn-text">Hard</span>
                        </button>
                        
                        <button 
                          className="review-btn good-btn"
                          onClick={() => handleReviewCard('good')}
                          title="Remembered with effort (3)"
                        >
                          <span className="btn-number">3</span>
                          <span className="btn-emoji">😊</span>
                          <span className="btn-text">Good</span>
                        </button>
                        
                        <button 
                          className="review-btn easy-btn"
                          onClick={() => handleReviewCard('easy')}
                          title="Easy to remember (4)"
                        >
                          <span className="btn-number">4</span>
                          <span className="btn-emoji">😎</span>
                          <span className="btn-text">Easy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar - Shows daily completion progress */}
                {(persistentDueCardsCount > 0 || cardsCompletedToday > 0) && (
                  <div className="daily-progress-section-wide">
                    <div className="progress-header">
                      <h4>Due Cards Progress</h4>
                      <span className="progress-stats">
                        {persistentDueCardsCount} cards remaining
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min(100, ((cardsCompletedToday) / (cardsCompletedToday + persistentDueCardsCount)) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="progress-percentage">
                      {Math.round(Math.min(100, ((cardsCompletedToday) / (cardsCompletedToday + persistentDueCardsCount)) * 100))}%
                    </div>
                  </div>
                )}
              </div>

              <div className="flashcard-main-content">
                <FlashcardDisplay
                  card={currentCard}
                  showAnswer={showAnswer}
                  onShowAnswer={() => setShowAnswer(true)}
                  onToggleAnswer={() => setShowAnswer(!showAnswer)}
                  onPreviousCard={prevCard}
                  onNextCard={nextCard}
                  onReviewCard={handleReviewCard}
                  currentIndex={currentCardIndex}
                  totalCards={filteredFlashcards.length}
                  isDarkMode={isDarkMode}
                  onToggleStarCard={toggleStarCard}
                  onEditCard={handleEditCard}
                  onGenerateQuestions={() => setShowGenerateModal(true)}
                />
              </div>
              
              {/* Right Side Content - Notes and Review Panel */}
              <div className="right-side-content">
                {/* Session Notes - Always visible */}
                <div className={`notes-section-permanent ${isNotesCollapsed ? 'collapsed' : ''}`}>
                  <div className="notes-header">
                    <h4>📝 Notes</h4>
                    <button
                      className="collapse-toggle notes-collapse-toggle"
                      onClick={() => {
                        console.log('Notes collapse clicked, current state:', isNotesCollapsed);
                        setIsNotesCollapsed(!isNotesCollapsed);
                      }}
                      aria-label={isNotesCollapsed ? "Expand notes" : "Collapse notes"}
                    >
                      {isNotesCollapsed ? '▼' : '▲'}
                    </button>
                  </div>
                  
                  <div className="notes-content">
                    <div className="notes-content-wrapper">
                      <div className="notes-editor-container">
                        <RichTextEditor
                          value={notes}
                          onChange={handleNotesChange}
                          placeholder="Take notes for your study session..."
                          className="notes-textarea-permanent"
                          minHeight="700px"
                          hideToolbar={areNotesToolbarHidden}
                        />
                        {/* Notes Toolbar Toggle Arrow - positioned at top right of editor */}
                        <button 
                          className="notes-buttons-toggle"
                          onClick={() => setAreNotesToolbarHidden(!areNotesToolbarHidden)}
                          aria-label={areNotesToolbarHidden ? "Show toolbar" : "Hide toolbar"}
                          title={areNotesToolbarHidden ? "Show text edit buttons" : "Hide text edit buttons"}
                        >
                          {areNotesToolbarHidden ? '▼' : '▲'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="notes-footer">
                      <button 
                        className="notes-footer-btn copy-btn"
                        onClick={() => {
                          // Copy notes content to clipboard
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = notes;
                          const textContent = tempDiv.textContent || tempDiv.innerText || '';
                          navigator.clipboard.writeText(textContent).then(() => {
                            setNotesCopied(true);
                            setTimeout(() => setNotesCopied(false), 2000);
                          }).catch(err => {
                            console.error('Failed to copy notes:', err);
                          });
                        }}
                        disabled={notes.length === 0}
                        title="Copy notes to clipboard"
                      >
                        {notesCopied ? '✅ Copied!' : '📋 Copy'}
                      </button>
                      <button 
                        className="notes-footer-btn save-btn"
                        onClick={() => {
                          // Save notes to local storage or trigger save
                          if (userId) {
                            localStorage.setItem(`flashcard_notes_${userId}`, notes);
                            setNotesSaved(true);
                            setTimeout(() => setNotesSaved(false), 2000);
                          }
                        }}
                        title="Save notes"
                      >
                        {notesSaved ? '✅ Saved!' : '💾 Save'}
                      </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-stats">
          <span>Total Cards: {flashcards.length}</span>
          <span>Filtered: {filteredFlashcards.length}</span>
          <span>Categories: {categories.length}</span>
          <span style={{ color: pastDueCards.length > 0 ? '#ff6b6b' : 'inherit' }}>
            Past Due: {pastDueCards.length}
          </span>
          <span style={{ color: cardsDueToday.length > 0 ? '#feca57' : 'inherit' }}>
            Due Today: {cardsDueToday.length}
          </span>
        </div>
        <div className="footer-shortcuts">
          <small>
            Shortcuts: <kbd>Space</kbd> Show Answer | <kbd>←/→</kbd> Navigate | 
            <kbd>1-4</kbd> Rate Card | <kbd>C</kbd> Create | <kbd>S</kbd> Settings | <kbd>E</kbd> Export | <kbd>M</kbd> Manage
          </small>
        </div>
      </footer>

      {/* Modals */}
      <FlashcardForm
        isVisible={showCreateCardForm}
        onClose={() => {
          setShowCreateCardForm(false);
          setIsEditingCard(false);
          setEditCardData(null);
        }}
        onSubmit={isEditingCard ? handleUpdateCard : handleCreateCard}
        onDelete={handleDeleteCard}
        editCard={editCardData}
        categories={categories}
        isDarkMode={isDarkMode}
        isLoading={flashcardsLoading}
        apiKeys={apiKeys}
        selectedProvider={selectedProvider}
      />

      <SettingsModal
        isVisible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        fsrsParams={fsrsParams}
        onUpdateFsrsParams={updateFsrsParams}
        showIntervalSettings={showIntervalSettings}
        onToggleIntervalSettings={toggleIntervalSettings}
        onSignOut={handleSignOut}
        userDisplayName={userDisplayName}
        flashcards={flashcards}
        apiKeys={apiKeys}
        selectedProvider={selectedProvider}
        onApiKeysUpdate={handleApiKeysUpdate}
      />

      <ImportExportModal
        isVisible={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        flashcards={flashcards}
        onImport={handleImport}
        isDarkMode={isDarkMode}
      />

      <Calendar
        isVisible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        calendarDates={calendarDates}
        isDarkMode={isDarkMode}
      />

      <GenerateQuestionsModal
        isVisible={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        currentCard={currentCard}
        onGenerateQuestions={handleGenerateQuestions}
        isDarkMode={isDarkMode}
        apiKeys={apiKeys}
        selectedProvider={selectedProvider}
      />

      <ManageCardsModal
        isVisible={showManageCardsModal}
        onClose={() => setShowManageCardsModal(false)}
        flashcards={flashcards}
        onToggleActive={handleToggleCardActive}
        onCreateCard={() => {
          setShowManageCardsModal(false);
          setShowCreateCardForm(true);
        }}
        onImportExport={() => {
          setShowManageCardsModal(false);
          setShowImportExportModal(true);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Loading Overlay */}
      {(authLoading || flashcardsLoading || settingsLoading) && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
}

export default App;