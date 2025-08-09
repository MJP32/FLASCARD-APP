import { useState, useEffect, useCallback } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  getDoc, 
  deleteDoc, 
  where, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Custom hook for flashcard management with Firestore
 * @param {Object} firebaseApp - Initialized Firebase app instance
 * @param {string} userId - Current user ID
 * @returns {Object} Flashcard state and methods
 */
export const useFlashcards = (firebaseApp, userId) => {
  const [db, setDb] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [filteredFlashcards, setFilteredFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [historyPosition, setHistoryPosition] = useState(-1);
  // Remove internal selectedCategory state - use the one passed from App.js


  const [selectedSubCategory, setSelectedSubCategory] = useState('All');


  const [lastManualSubCategoryChange, setLastManualSubCategoryChange] = useState(0);
  const [lastCardCompletionTime, setLastCardCompletionTime] = useState(0);

  // Connect to window object for communication with App.js
  useEffect(() => {
    if (window.flashcardHook) {
      window.flashcardHook.setLastCardCompletionTime = setLastCardCompletionTime;
    }
  }, []);
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [showDueTodayOnly, setShowDueTodayOnly] = useState(true);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [categorySortBy, setCategorySortBy] = useState('alphabetical');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Debug utility to check current filter state
  const debugCurrentFilterState = useCallback((selectedCategory = 'All') => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // console.log('🔍 FILTER-DEBUG: Current filter state:', {
    //   selectedCategory,
    //   selectedSubCategory,
    //   selectedLevel,
    //   showDueTodayOnly,
    //   showStarredOnly,
    //   totalFlashcards: flashcards.length,
    //   activeFlashcards: flashcards.filter(c => c.active !== false).length
    // });
    
    // Check cards in current category
    const categoryCards = flashcards.filter(card => {
      if (card.active === false) return false;
      return selectedCategory === 'All' || card.category === selectedCategory;
    });
    // console.log('🔍 FILTER-DEBUG: Cards in category:', categoryCards.length);
    
    // Check cards in current subcategory
    const subCategoryCards = categoryCards.filter(card => {
      if (selectedSubCategory === 'All') return true;
      const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      return cardSubCategory === selectedSubCategory;
    });
    // console.log('🔍 FILTER-DEBUG: Cards in subcategory:', subCategoryCards.length);
    
    // Check due cards in subcategory
    const dueCards = subCategoryCards.filter(card => {
      if (!showDueTodayOnly) return true;
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate < endOfToday;
    });
    // console.log('🔍 FILTER-DEBUG: Due cards in subcategory:', dueCards.length);
    
    // Sample some cards for debugging
    // console.log('🔍 FILTER-DEBUG: Sample subcategory cards:', subCategoryCards.slice(0, 3).map(card => ({
    //   question: card.question?.substring(0, 30),
    //   category: card.category,
    //   sub_category: card.sub_category,
    //   dueDate: card.dueDate,
    //   active: card.active,
    //   isDue: showDueTodayOnly ? ((card.dueDate || new Date(0)) < endOfToday) : 'N/A'
    // })));
    
    return { categoryCards: categoryCards.length, subCategoryCards: subCategoryCards.length, dueCards: dueCards.length };
  }, [flashcards, selectedSubCategory, showDueTodayOnly]);

  // Wrapper for manual subcategory selection
  const setSelectedSubCategoryManual = useCallback((subCategory) => {
    setSelectedSubCategory(subCategory);
    setLastManualSubCategoryChange(Date.now());
  }, []);

  // Initialize Firestore when Firebase app is ready
  useEffect(() => {
    if (!firebaseApp) {
      console.log('⚠️ Firebase app not available yet');
      return;
    }
    
    try {
      console.log('🔥 Initializing Firestore with app:', firebaseApp);
      const dbInstance = getFirestore(firebaseApp);
      console.log('✅ Firestore initialized successfully:', dbInstance);
      setDb(dbInstance);
    } catch (error) {
      console.error('❌ Failed to initialize Firestore:', error);
      setError(`Failed to initialize database: ${error.message}`);
    }
  }, [firebaseApp]);

  // Load anonymous cards from localStorage
  const loadAnonymousCards = useCallback(() => {
    try {
      const storedCards = JSON.parse(localStorage.getItem('anonymous_flashcards') || '[]');
      console.log('📱 Loading anonymous cards from localStorage:', storedCards.length, 'cards');
      
      // Convert dates back from strings
      const processedCards = storedCards.map(card => ({
        ...card,
        createdAt: new Date(card.createdAt),
        nextReviewAt: new Date(card.nextReviewAt),
        lastReviewedAt: card.lastReviewedAt ? new Date(card.lastReviewedAt) : null,
        dueDate: new Date(card.nextReviewAt) // Use nextReviewAt as dueDate
      }));
      
      setFlashcards(processedCards);
      setIsLoading(false);
      return processedCards;
    } catch (error) {
      console.error('❌ Failed to load anonymous cards:', error);
      setFlashcards([]);
      setIsLoading(false);
      return [];
    }
  }, []);

  // Add card to localStorage for anonymous users
  const addLocalFlashcard = useCallback((cardData) => {
    console.log('📱 Adding card to localStorage for anonymous user:', cardData);
    try {
      const existingCards = JSON.parse(localStorage.getItem('anonymous_flashcards') || '[]');
      existingCards.push(cardData);
      localStorage.setItem('anonymous_flashcards', JSON.stringify(existingCards));
      
      // Update state immediately
      setFlashcards(prev => [...prev, {
        ...cardData,
        dueDate: new Date(cardData.nextReviewAt)
      }]);
      
      console.log('✅ Successfully added card to localStorage');
    } catch (error) {
      console.error('❌ Failed to add card to localStorage:', error);
    }
  }, []);

  // Expose addLocalFlashcard to window for access from App.js
  useEffect(() => {
    window.addLocalFlashcard = addLocalFlashcard;
    return () => {
      delete window.addLocalFlashcard;
    };
  }, [addLocalFlashcard]);

  // Listen for custom event when anonymous cards are added
  useEffect(() => {
    const handleAnonymousCardAdded = () => {
      console.log('🔄 Anonymous card added event received, reloading cards');
      loadAnonymousCards();
    };

    window.addEventListener('anonymous-card-added', handleAnonymousCardAdded);
    return () => {
      window.removeEventListener('anonymous-card-added', handleAnonymousCardAdded);
    };
  }, [loadAnonymousCards]);

  // Set up real-time listener for flashcards
  useEffect(() => {
    if (!db) {
      console.log('📦 No database available, checking for anonymous cards...');
      if (!userId) {
        // Anonymous user - load from localStorage
        loadAnonymousCards();
      }
      return;
    }

    if (!userId) {
      console.log('📦 No userId, loading anonymous cards from localStorage');
      loadAnonymousCards();
      return;
    }

    console.log('🔍 Setting up flashcards listener for userId:', userId);
    console.log('🔍 Database instance:', db);
    setIsLoading(true);
    
    try {
      console.log('🔍 About to create collection reference with db:', db);
      const flashcardsRef = collection(db, 'flashcards');
      console.log('✅ Collection reference created:', flashcardsRef);
      const q = query(flashcardsRef, where('userId', '==', userId));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const cards = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          dueDate: data.dueDate?.toDate?.() || new Date(),
          lastReviewed: data.lastReviewed?.toDate?.() || null
        });
      });
      
      console.log('📚 Loaded flashcards:', cards.length, 'cards for user:', userId);
      console.log('First few cards:', cards.slice(0, 2));
      
      // Debug: Check active status of cards
      const activeCards = cards.filter(card => card.active !== false);
      const inactiveCards = cards.filter(card => card.active === false);
      console.log(`📊 Card status: ${activeCards.length} active, ${inactiveCards.length} inactive`);
      
      // Debug: Check due dates
      const now = new Date();
      const dueCards = cards.filter(card => {
        const dueDate = card.dueDate || new Date(0);
        return dueDate <= now;
      });
      console.log(`📅 Due cards: ${dueCards.length} cards are due now`);
      
      // More detailed debug for first few cards
      console.log('🔍 Sample card due dates:');
      cards.slice(0, 3).forEach(card => {
        const dueDate = card.dueDate || new Date(0);
        console.log({
          question: card.question?.substring(0, 30),
          dueDate: dueDate,
          dueDateString: dueDate.toString(),
          isDue: dueDate <= now,
          hoursUntilDue: (dueDate - now) / (1000 * 60 * 60),
          active: card.active
        });
      });
      
      setFlashcards(cards);
      setIsLoading(false);
    }, (error) => {
      console.error('❌ Error fetching flashcards:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // Provide more specific error messages based on error code
      let errorMessage = 'Failed to load flashcards';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied: Please check Firestore security rules';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Firebase service unavailable. Please check your internet connection';
      } else if (error.code === 'unauthenticated') {
        errorMessage = 'Authentication required. Please log in again';
      } else if (error.message) {
        errorMessage = `Failed to load flashcards: ${error.message}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    });

      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Error setting up flashcards listener:', error);
      setError(`Failed to initialize flashcards: ${error.message}`);
      setIsLoading(false);
    }
  }, [db, userId, loadAnonymousCards]);

  /**
   * Infer level from FSRS parameters
   * @param {Object} card - Flashcard object
   * @returns {string} Inferred level
   */
  const inferLevelFromFSRS = useCallback((card) => {
    if (card.level) return card.level;
    
    const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
    
    if (difficulty >= 8) return 'again';
    if (difficulty >= 7) return 'hard';
    if (difficulty <= 3 && easeFactor >= 2.8) return 'easy';
    if (interval >= 4) return 'good';
    return 'new';
  }, []);

  /**
   * Get subcategory with least due cards (for automatic progression)
   * Always returns the subcategory with the fewest due cards, excluding the current one
   * @param {string} currentCategory - Current category
   * @param {string} currentSubCategory - Current subcategory
   * @returns {string|null} Subcategory with least due cards or null if none available
   */
  const getNextSubCategoryWithLeastCards = useCallback((currentCategory, currentSubCategory) => {
    //     console.log('🔍 GET-NEXT-SUBCATEGORY: Starting with params:', { currentCategory, currentSubCategory });
    
    // Calculate real-time subcategory stats for the specified category
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const subCategoryStats = {};
    
    // First, let's see all cards in this category
    //     console.log(`🔍 GET-NEXT-SUBCATEGORY: Found active cards in category '${currentCategory}'`);
    
    flashcards.forEach(card => {
      // Only consider cards from the specified category
      if (card.category !== currentCategory) {
        return;
      }
      
      // Only count active cards
      if (card.active === false) return;
      
      const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      
      if (!subCategoryStats[subCategory]) {
        subCategoryStats[subCategory] = { total: 0, due: 0 };
      }
      
      subCategoryStats[subCategory].total++;
      
      // Ensure dueDate is a proper Date object for comparison
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate < endOfToday) {
        subCategoryStats[subCategory].due++;
      }
    });
    
    //     console.log('🔍 GET-NEXT-SUBCATEGORY: ALL subcategory stats in category:', subCategoryStats);
    
    // Show ALL subcategories, not just those with due cards
    
    //     console.log('🔍 GET-NEXT-SUBCATEGORY: ALL subcategories sorted by due count:', 
      // allSubcategoriesWithCounts.map(([subCat, stats]) => `${subCat}: ${stats.due} due, ${stats.total} total`));
    
    // Get available subcategories with due cards, excluding the current one, sorted by total cards (least to most)
    const availableSubCategoriesWithCounts = Object.entries(subCategoryStats)
      .filter(([subCat, stats]) => {
        const hasDueCards = stats.due > 0;
        const notCurrentSubCategory = subCat !== currentSubCategory;
        //         console.log(`🔍 GET-NEXT-SUBCATEGORY: Checking ${subCat}: hasDueCards=${hasDueCards}, notCurrentSubCategory=${notCurrentSubCategory}, due=${stats.due}`);
        return hasDueCards && notCurrentSubCategory;
      })
      .sort((a, b) => {
        const countA = a[1].total; // Changed from .due to .total
        const countB = b[1].total; // Changed from .due to .total
        //         console.log(`🔍 GET-NEXT-SUBCATEGORY: Sorting ${a[0]} (${countA} total) vs ${b[0]} (${countB} total)`);
        return countA - countB; // Sort ascending (least to most total cards)
      });
    
    const availableSubCategories = availableSubCategoriesWithCounts.map(([subCat]) => subCat);
    
    //     console.log('🔍 GET-NEXT-SUBCATEGORY: Available subcategories with due cards (real-time):', availableSubCategories);
    //     console.log('🔍 GET-NEXT-SUBCATEGORY: Sorted subcategories with counts:', availableSubCategoriesWithCounts);
    //     console.log('🔍 GET-NEXT-SUBCATEGORY: Current subcategory (excluded from selection):', currentSubCategory);
    //     console.log('🔍 GET-NEXT-SUBCATEGORY: Current subcategory due count:', subCategoryStats[currentSubCategory]?.due || 0);
    
    // If no subcategories have due cards, return null
    if (availableSubCategories.length === 0) {
      //       console.log('🔍 GET-NEXT-SUBCATEGORY: ❌ No subcategories with due cards found');
      return null;
    }
    
    // Return the subcategory with the least cards
    // The list is already sorted by count (ascending), so the first item has the least cards
    // console.log('🔍 Selection process:');
    // console.log('🔍 - Available subcategories (sorted by total count, least to most):', availableSubCategories);
    // console.log('🔍 - Current subcategory:', currentSubCategory);
    // console.log('🔍 - Subcategory total counts:', availableSubCategoriesWithCounts.map(([subCat, stats]) => `${subCat}: ${stats.total}`));
    
    if (availableSubCategories.length > 0) {
      const nextSubCategory = availableSubCategories[0]; // First in sorted list = least total cards
      const nextSubCategoryCount = subCategoryStats[nextSubCategory].total;
      
      // Verify this is actually the minimum
      const allCounts = availableSubCategoriesWithCounts.map(([, stats]) => stats.total);
      const minCount = Math.min(...allCounts);
      const isActuallyMinimum = nextSubCategoryCount === minCount;
      
      //       console.log(`🔍 GET-NEXT-SUBCATEGORY: ✅ Selected subcategory: ${nextSubCategory} (${nextSubCategoryCount} total cards)`);
      //       console.log(`🔍 GET-NEXT-SUBCATEGORY: 📊 Verification: minCount=${minCount}, selected=${nextSubCategoryCount}, isMinimum=${isActuallyMinimum}`);
      //       console.log('🔍 GET-NEXT-SUBCATEGORY: 📊 All available options with total counts:', availableSubCategoriesWithCounts.map(([subCat, stats]) => `${subCat}: ${stats.total}`));
      if (!isActuallyMinimum) {
        console.error('🚨 ERROR: Selected subcategory does not have the minimum count!');
      }
      
      return nextSubCategory;
    } else {
      //       console.log('🔍 GET-NEXT-SUBCATEGORY: ❌ No subcategories with due cards found');
      return null;
    }
  }, [flashcards]);

  /**
   * Get next category with least due cards (for automatic progression)
   * Excludes the current category and returns the category with the fewest due cards
   * @param {string} currentCategory - Current category to exclude
   * @returns {string|null} Category with least due cards or null if none available
   */
  const getNextCategoryWithLeastCards = useCallback((currentCategory) => {
    console.log('🔍 GET-NEXT-CATEGORY: Starting with current category:', currentCategory);

    // Calculate real-time category stats
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const categoryStats = {};

    flashcards.forEach(card => {
      // Only count active cards
      if (card.active === false) return;

      const category = card.category || 'Uncategorized';

      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, due: 0 };
      }

      categoryStats[category].total++;

      // Check if card is due
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate < endOfToday) {
        categoryStats[category].due++;
      }
    });

    console.log('🔍 GET-NEXT-CATEGORY: All category stats:', categoryStats);

    // Get available categories with due cards, excluding the current one, sorted by count (least to most)
    const availableCategoriesWithCounts = Object.entries(categoryStats)
      .filter(([category, stats]) => {
        const hasDueCards = stats.due > 0;
        const notCurrentCategory = category !== currentCategory;
        console.log(`🔍 GET-NEXT-CATEGORY: Checking ${category}: hasDueCards=${hasDueCards}, notCurrentCategory=${notCurrentCategory}, due=${stats.due}`);
        return hasDueCards && notCurrentCategory;
      })
      .sort((a, b) => {
        const countA = a[1].due;
        const countB = b[1].due;
        console.log(`🔍 GET-NEXT-CATEGORY: Sorting ${a[0]} (${countA}) vs ${b[0]} (${countB})`);
        return countA - countB; // Sort ascending (least to most)
      });

    const availableCategories = availableCategoriesWithCounts.map(([category]) => category);

    console.log('🔍 GET-NEXT-CATEGORY: Available categories with due cards (sorted by count):',
      availableCategoriesWithCounts.map(([cat, stats]) => `${cat}: ${stats.due} due`));

    // If no categories have due cards, return null
    if (availableCategories.length === 0) {
      console.log('🔍 GET-NEXT-CATEGORY: ❌ No categories with due cards found');
      return null;
    }

    // Return the category with the least cards
    const nextCategory = availableCategories[0]; // First in sorted list = least cards
    const nextCategoryCount = categoryStats[nextCategory].due;

    console.log(`🔍 GET-NEXT-CATEGORY: ✅ Selected category: ${nextCategory} (${nextCategoryCount} due cards)`);

    return nextCategory;
  }, [flashcards]);

  // Filter flashcards based on category, sub-category, level, and due date
  useEffect(() => {
    // Skip filtering if flashcards is empty or if we don't have the selectedCategory yet
    if (!flashcards || flashcards.length === 0) {
      console.log('🔍 FILTERING EFFECT: Skipping filter - no flashcards available');
      setFilteredFlashcards([]);
      return;
    }

    const previousFilteredLength = filteredFlashcards.length;
    const currentCard = filteredFlashcards[currentCardIndex];
    const currentCardId = currentCard?.id;

    console.log('🔍 FILTERING EFFECT: Starting filter process');
    console.log('🔍 FILTERING EFFECT: Previous filtered length:', previousFilteredLength);
    console.log('🔍 FILTERING EFFECT: Current card ID before filtering:', currentCardId);
    console.log('🔍 FILTERING EFFECT: Current card index:', currentCardIndex);
    console.log('🔍 FILTERING EFFECT: Total flashcards:', flashcards.length);
    
    let filtered = [...flashcards];

    // Filter out inactive cards (unless explicitly showing all)
    // Note: cards without 'active' field are considered active (backward compatibility)
    const beforeActiveFilter = filtered.length;
    filtered = filtered.filter(card => card.active !== false);
    const afterActiveFilter = filtered.length;
    
    if (beforeActiveFilter !== afterActiveFilter) {
      console.log(`🔍 Active filter: ${beforeActiveFilter} → ${afterActiveFilter} cards (removed ${beforeActiveFilter - afterActiveFilter} inactive)`);
    }

    // Always apply category and subcategory filters
    // Get selectedCategory from window.flashcardHook since it's managed in App.js
    const currentSelectedCategory = window.flashcardHook?.selectedCategory || 'All';
    console.log('🔍 Current selected category from window:', currentSelectedCategory);
    if (currentSelectedCategory !== 'All') {
      const beforeCategoryFilter = filtered.length;
      filtered = filtered.filter(card => card.category === currentSelectedCategory);
      console.log(`🔍 Category filter ("${currentSelectedCategory}"): ${beforeCategoryFilter} → ${filtered.length} cards`);
    }

    // Filter by sub-category
    if (selectedSubCategory !== 'All') {
      const beforeSubCategoryFilter = filtered.length;
      filtered = filtered.filter(card => {
        const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
        return cardSubCategory === selectedSubCategory;
      });
      console.log(`🔍 Sub-category filter ("${selectedSubCategory}"): ${beforeSubCategoryFilter} → ${filtered.length} cards`);
    }

    // Filter by level
    if (selectedLevel !== 'All') {
      const beforeLevelFilter = filtered.length;
      filtered = filtered.filter(card => {
        // Get level from card or infer from FSRS parameters
        const cardLevel = card.level || inferLevelFromFSRS(card);
        return cardLevel === selectedLevel;
      });
      console.log(`🔍 Level filter ("${selectedLevel}"): ${beforeLevelFilter} → ${filtered.length} cards`);
    }

    // Filter by due date if enabled
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const beforeDueFilter = filtered.length;
      console.log('📅 Filtering by due date. Current time:', now);
      console.log('📅 End of today:', endOfToday);
      console.log('📅 Cards before due filter:', beforeDueFilter);
      console.log('📅 Selected filters:', { selectedSubCategory, selectedLevel });
      
      filtered = filtered.filter(card => {
        // Ensure dueDate is a proper Date object for comparison
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        const isDue = dueDate < endOfToday; // Check if due before end of today (consistent with other methods)
        if (!isDue) {
          console.log('Card not due today:', { 
            question: card.question?.substring(0, 30), 
            dueDate: dueDate,
            active: card.active,
            hoursUntilDue: (dueDate - now) / (1000 * 60 * 60)
          });
        }
        return isDue;
      });
      console.log('📊 After due date filter:', filtered.length, 'cards are due today (removed', beforeDueFilter - filtered.length, 'future cards)');
      console.log('📊 Note: Category and subcategory filters are still applied to due cards');
    }

    // Filter by starred status if enabled
    if (showStarredOnly) {
      const beforeStarredFilter = filtered.length;
      console.log('⭐ STAR-FILTER: showStarredOnly is TRUE, filtering for starred cards...');
      console.log('⭐ STAR-FILTER: Cards before filter:', beforeStarredFilter);
      
      // Debug: Show which cards are starred
      const starredCards = filtered.filter(card => card.starred === true);
      console.log('⭐ STAR-FILTER: Found starred cards:', starredCards.map(card => ({
        id: card.id,
        question: card.question?.substring(0, 50) + '...',
        starred: card.starred
      })));
      
      filtered = filtered.filter(card => card.starred === true);
      console.log('⭐ STAR-FILTER: After starred filter:', filtered.length, 'cards are starred (removed', beforeStarredFilter - filtered.length, 'non-starred cards)');
    } else {
      console.log('⭐ STAR-FILTER: showStarredOnly is FALSE, showing all cards');
    }

    // Sort based on selected criteria
    switch (categorySortBy) {
      case 'most-due':
        filtered.sort((a, b) => (a.dueDate || new Date(0)) - (b.dueDate || new Date(0)));
        break;
      case 'least-due':
        filtered.sort((a, b) => (b.dueDate || new Date(0)) - (a.dueDate || new Date(0)));
        break;
      case 'alphabetical':
      default:
        filtered.sort((a, b) => (a.question || '').localeCompare(b.question || ''));
        break;
    }

    // Check if current card is no longer in the filtered list (e.g., after review)
    const currentCardStillAvailable = currentCardId && filtered.some(card => card.id === currentCardId);
    
    // Find the current card's new position in the filtered list
    const currentCardNewIndex = currentCardId ? filtered.findIndex(card => card.id === currentCardId) : -1;

    console.log('🔍 FILTERING EFFECT: After filtering');
    console.log('🔍 FILTERING EFFECT: New filtered length:', filtered.length);
    console.log('🔍 FILTERING EFFECT: Current card still available:', currentCardStillAvailable);
    console.log('🔍 FILTERING EFFECT: Current card ID:', currentCardId);
    console.log('🔍 FILTERING EFFECT: Current card new index:', currentCardNewIndex);

    setFilteredFlashcards(filtered);
    
    // Smart index management
    if (filtered.length > 0) {
      // If current card is still available, maintain its position
      if (currentCardStillAvailable && currentCardNewIndex !== -1) {
        // Card is still in the list, update to its new position
        if (currentCardNewIndex !== currentCardIndex) {
          setCurrentCardIndex(currentCardNewIndex);
          console.log(`📍 Current card moved to new index: ${currentCardNewIndex}`);
        }
      } else if (!currentCardStillAvailable && previousFilteredLength > 0) {
        // Current card was removed (due to review or deletion)
        let newIndex = currentCardIndex;

        console.log(`🔄 CARD NAVIGATION: Current card removed, calculating new index`);
        console.log(`🔄 CARD NAVIGATION: currentCardIndex=${currentCardIndex}, filtered.length=${filtered.length}, previousFilteredLength=${previousFilteredLength}`);

        // If we're at or past the end, wrap to beginning
        if (newIndex >= filtered.length) {
          newIndex = 0;
          console.log(`🔄 CARD NAVIGATION: Index ${currentCardIndex} >= ${filtered.length}, wrapping to 0`);
        } else {
          // Stay at the same index, which will show the next card that moved into this position
          console.log(`🔄 CARD NAVIGATION: Staying at index ${newIndex}, which now shows a different card`);
        }

        setCurrentCardIndex(newIndex);
        setShowAnswer(false); // Ensure answer is hidden for the new card

        // Different messages for different scenarios
        if (filtered.length < previousFilteredLength) {
          console.log(`🔄 Card removed (likely completed/deleted), moved to index ${newIndex}`);
        } else {
          console.log(`🔄 Current card filtered out after review, moved to index ${newIndex}`);
        }
      } else if (currentCardIndex >= filtered.length) {
        // Current index is out of bounds, reset to beginning
        setCurrentCardIndex(0);
        console.log('📍 Index out of bounds, resetting to 0');
      }
    } else {
      // No cards available, reset to 0
      setCurrentCardIndex(0);
      console.log('🚫 No cards available after filtering');
      
      // Auto-advance to next subcategory ONLY when:
      // 1. We're in due cards mode and have a specific subcategory selected
      // 2. The user hasn't manually selected a subcategory recently
      // 3. There are truly no cards left in the current subcategory
      // 4. This should NOT trigger just from time passing - only from actual card completion
      const timeSinceManualChange = Date.now() - lastManualSubCategoryChange;
      
      // Debug: Check what cards exist in this subcategory (including future due cards)
      const allCardsInSubcategory = flashcards.filter(card => {
        if (card.active === false) return false;
        // TODO: selectedCategory filtering moved to App.js
        // if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
        if (selectedSubCategory !== 'All') {
          const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
          return cardSubCategory === selectedSubCategory;
        }
        return true;
      });

      const dueCardsInSubcategory = allCardsInSubcategory.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        const now = new Date();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return dueDate < endOfToday;
      });

      // Calculate timing variables first
      const timeSinceCardCompletion = Date.now() - lastCardCompletionTime;
      const recentCardCompletion = timeSinceCardCompletion < 10000; // 10 seconds

      console.log('🔍 AUTO-ADVANCE DEBUG: Subcategory analysis:', {
        selectedSubCategory,
        totalCardsInSubcategory: allCardsInSubcategory.length,
        dueCardsInSubcategory: dueCardsInSubcategory.length,
        filteredCardsShowing: filtered.length,
        lastCardCompletionTime: new Date(lastCardCompletionTime).toLocaleTimeString(),
        timeSinceCardCompletion: timeSinceCardCompletion,
        recentCardCompletion
      });

      console.log('🔍 AUTO-ADVANCE DEBUG: Checking conditions:', {
        showDueTodayOnly,
        selectedSubCategory,
        timeSinceManualChange,
        filteredLength: filtered.length,
        condition1_dueTodayOnly: showDueTodayOnly,
        condition2_categoryNotAll: true, // TODO: selectedCategory moved to App.js
        condition3_subCategoryNotAll: selectedSubCategory !== 'All',
        condition4_timeDelay: timeSinceManualChange > 2000,
        condition5_noCards: filtered.length === 0,
        allConditionsMet: showDueTodayOnly && true && selectedSubCategory !== 'All' && timeSinceManualChange > 2000 && filtered.length === 0 // TODO: selectedCategory moved to App.js
      });
      
      // Check if we should skip the time delay for debugging
      const skipTimeDelay = window.debugFlashcards?.skipTimeDelay || false;
      const timeConditionMet = skipTimeDelay || timeSinceManualChange > 2000;
      
      // Additional safety checks: Only auto-advance if:
      // 1. There are truly no due cards in the current subcategory
      // 2. A card was completed recently (within last 10 seconds) - prevents auto-advance from just time passing
      // (timeSinceCardCompletion and recentCardCompletion already defined above)

      const shouldAutoAdvance = showDueTodayOnly &&
                                // selectedCategory !== 'All' &&
                                selectedSubCategory !== 'All' &&
                                timeConditionMet &&
                                filtered.length === 0 &&
                                dueCardsInSubcategory.length === 0 &&
                                recentCardCompletion;

      // Disable auto-advance in useFlashcards - now handled in App.js with enhanced logic
      const autoAdvanceDisabled = true;

      if (shouldAutoAdvance && !autoAdvanceDisabled) {
        if (skipTimeDelay) {
          console.log('🔍 AUTO-ADVANCE: ⚠️ Time delay skipped for debugging');
        }
        console.log('🔄 AUTO-ADVANCE: All conditions met, triggering auto-advance logic');
        console.log('🔄 AUTO-ADVANCE: Current state:', {
          selectedSubCategory,
          timeSinceManualChange,
          filteredLength: filtered.length,
          dueCardsInSubcategory: dueCardsInSubcategory.length,
          totalCardsInSubcategory: allCardsInSubcategory.length
        });

        // Use a timeout to prevent infinite loops and ensure state stability
        // NEW BEHAVIOR: When subcategory is finished, find another subcategory with least cards within the SAME category
        setTimeout(() => {
          console.log('🔄 SUBCATEGORY FINISHED: Current subcategory has no more due cards, finding next subcategory within same category');

          // First, try to find another subcategory with due cards in the SAME category
          // Get current category from window.flashcardHook which is set by App.js
          const currentCategory = window.flashcardHook?.selectedCategory;
          if (currentCategory && currentCategory !== 'All') {
            const nextSubCategoryInSameCategory = getNextSubCategoryWithLeastCards(currentCategory, selectedSubCategory);
            console.log(`🔄 AUTO-ADVANCE: Next subcategory in "${currentCategory}":`, nextSubCategoryInSameCategory);
            
            if (nextSubCategoryInSameCategory) {
              console.log(`🔄 AUTO-ADVANCE: Switching to subcategory "${nextSubCategoryInSameCategory}" within category "${currentCategory}"`);
              setSelectedSubCategory(nextSubCategoryInSameCategory);
              // Signal to App.js that subcategory changed due to auto-advance
              if (window.flashcardHook?.onSubCategoryAutoAdvance) {
                window.flashcardHook.onSubCategoryAutoAdvance(nextSubCategoryInSameCategory);
              }
            } else {
              console.log(`🔄 AUTO-ADVANCE: No more subcategories with due cards in "${currentCategory}"`);
              // Let App.js handle category switching if needed
            }
          } else {
            console.log('🔄 AUTO-ADVANCE: Current category is "All", not switching subcategories');
          }
        }, 50);
      } else if (shouldAutoAdvance && autoAdvanceDisabled) {
        console.log('🚫 AUTO-ADVANCE: DISABLED FOR DEBUGGING - Would have auto-advanced but it\'s disabled');
      } else {
        console.log('🔄 AUTO-ADVANCE: ❌ Conditions not met, skipping auto-advance');
        console.log('🔄 AUTO-ADVANCE: Condition details:', {
          showDueTodayOnly,
          categoryNotAll: true, // TODO: selectedCategory moved to App.js
          subCategoryNotAll: selectedSubCategory !== 'All',
          timeConditionMet,
          timeSinceManualChange,
          skipTimeDelay,
          filteredLength: filtered.length,
          dueCardsInSubcategory: dueCardsInSubcategory.length,
          recentCardCompletion,
          timeSinceCardCompletion,
          lastCardCompletionTime: new Date(lastCardCompletionTime).toLocaleTimeString(),
          allConditionsMet: shouldAutoAdvance
        });
      }
    }
  }, [flashcards, selectedSubCategory, selectedLevel, showDueTodayOnly, showStarredOnly, categorySortBy, lastManualSubCategoryChange, currentCardIndex, filteredFlashcards, getNextSubCategoryWithLeastCards, inferLevelFromFSRS, lastCardCompletionTime]);

  /**
   * Get available categories from flashcards
   * When showDueTodayOnly is true, only returns categories that have due cards
   * @returns {Array<string>} Array of unique categories
   */
  const getCategories = useCallback(() => {
    let filteredCards = flashcards;
    
    // Apply the same filtering logic as main filteredFlashcards to ensure consistency
    
    // 1. Filter out inactive cards
    filteredCards = filteredCards.filter(card => card.active !== false);
    
    // 2. If showing due cards only, include categories that have due cards in any subcategory
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      // Find all categories that have at least one due card
      const categoriesWithDueCards = new Set();
      
      filteredCards.forEach(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        
        if (dueDate < endOfToday) { // If this card is due
          const category = card.category || 'Uncategorized';
          categoriesWithDueCards.add(category);
        }
      });
      
      // Only include categories that have at least one due card
      const categories = Array.from(categoriesWithDueCards);
      
      // Sort by count of due cards (most to least)
      const categoryStats = {};
      categories.forEach(category => {
        const dueCardsInCategory = filteredCards.filter(card => {
          if ((card.category || 'Uncategorized') !== category) return false;
          let dueDate = card.dueDate || new Date(0);
          if (dueDate && typeof dueDate.toDate === 'function') {
            dueDate = dueDate.toDate();
          }
          return dueDate < endOfToday;
        }).length;
        categoryStats[category] = dueCardsInCategory;
      });
      
      return categories.sort((a, b) => {
        const countA = categoryStats[a] || 0;
        const countB = categoryStats[b] || 0;
        return countB - countA; // Sort descending (most to least)
      });
    }
    
    // 3. For non-due mode, return all categories with active cards
    const categories = [...new Set(filteredCards.map(card => card.category || 'Uncategorized'))];
    
    // Sort categories by count (most to least)
    const categoryStats = {};
    filteredCards.forEach(card => {
      const category = card.category || 'Uncategorized';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    return categories.sort((a, b) => {
      const countA = categoryStats[a] || 0;
      const countB = categoryStats[b] || 0;
      return countB - countA; // Sort descending (most to least)
    });
  }, [flashcards, showDueTodayOnly]);

  /**
   * Get available sub-categories from flashcards (filtered by selected category and due date)
   * @param {string} selectedCategory - Currently selected category
   * @returns {Array<string>} Array of unique sub-categories that have available cards
   */
  const getSubCategories = useCallback((selectedCategory = 'All') => {
    let filteredCards = flashcards;
    
    console.log('🔍 getSubCategories called with:', {
      selectedCategory,
      showDueTodayOnly,
      totalFlashcards: flashcards.length
    });
    
    // Apply the same filtering logic as main filteredFlashcards to ensure consistency
    
    // 1. Filter out inactive cards
    filteredCards = filteredCards.filter(card => card.active !== false);
    console.log(`After active filter: ${filteredCards.length} cards`);
    
    // 2. If a specific category is selected, only show sub-categories from that category
    if (selectedCategory !== 'All') {
      const beforeCategoryFilter = filteredCards.length;
      filteredCards = filteredCards.filter(card => card.category === selectedCategory);
      console.log(`After category filter (${selectedCategory}): ${filteredCards.length} cards (was ${beforeCategoryFilter})`);
    }
    
    // 3. If due today filter is enabled, only consider cards that are due
    if (showDueTodayOnly) {
      const beforeDueFilter = filteredCards.length;
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      filteredCards = filteredCards.filter(card => {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate < endOfToday;
      });
      console.log(`After due date filter: ${filteredCards.length} cards (was ${beforeDueFilter})`);
    }
    
    // 4. Note: Starred filter is handled by main filtering logic, not here
    // This prevents double-filtering that causes count mismatches
    
    const subCategoriesSet = new Set();
    const subCategoryStats = {};
    
    filteredCards.forEach(card => {
      const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      subCategoriesSet.add(subCategory);
      subCategoryStats[subCategory] = (subCategoryStats[subCategory] || 0) + 1;
    });
    
    const subCategories = [...subCategoriesSet];
    
    console.log('🔍 getSubCategories result:', {
      subCategories,
      subCategoryStats,
      finalCardCount: filteredCards.length
    });
    
    return subCategories.sort((a, b) => {
      const countA = subCategoryStats[a] || 0;
      const countB = subCategoryStats[b] || 0;
      return countB - countA; // Sort descending (most to least)
    });
  }, [flashcards, showDueTodayOnly]);

  /**
   * Get ALL sub-category statistics without filtering (for initial stats)
   * @returns {Object} All sub-category statistics with due counts
   */
  const getAllSubCategoryStats = useCallback(() => {
    const stats = {};
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    flashcards.forEach(card => {
      // Only count active cards
      if (card.active === false) return;
      
      const category = card.category || 'Uncategorized';
      const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      const key = `${category}::${subCategory}`; // Use category::subcategory as key
      
      if (!stats[key]) {
        stats[key] = { total: 0, due: 0, category, subCategory };
      }
      
      stats[key].total++;
      
      // Ensure dueDate is a proper Date object for comparison (consistent with getCategoryStats)
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate < endOfToday) {
        stats[key].due++;
      }
    });
    
    console.log('📊 getAllSubCategoryStats result:', Object.keys(stats).length, 'subcategories');
    return stats;
  }, [flashcards]);

  /**
   * Get sub-category statistics including due counts (filtered by selected category)
   * @param {string} selectedCategory - Currently selected category
   * @returns {Object} Sub-category statistics with due counts
   */
  const getSubCategoryStats = useCallback((selectedCategory = 'All') => {
    const stats = {};
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    flashcards.forEach(card => {
      // Apply category filter if needed
      if (selectedCategory !== 'All' && card.category !== selectedCategory) {
        return;
      }
      
      // Only count active cards
      if (card.active === false) return;
      
      const subCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
      
      if (!stats[subCategory]) {
        stats[subCategory] = { total: 0, due: 0 };
      }
      
      stats[subCategory].total++;
      
      // Ensure dueDate is a proper Date object for comparison (consistent with getCategoryStats)
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate < endOfToday) {
        stats[subCategory].due++;
      }
    });
    
    return stats;
  }, [flashcards]);

  /**
   * Get available levels from flashcards (filtered by selected category, sub-category, and due date)
   * @param {string} selectedCategory - The selected category to filter by
   * @returns {Array<string>} Array of unique levels that have available cards
   */
  const getLevels = useCallback((selectedCategory = 'All') => {
    let filteredCards = flashcards;

    // Filter by category
    if (selectedCategory !== 'All') {
      filteredCards = filteredCards.filter(card => card.category === selectedCategory);
    }

    // Filter by sub-category
    if (selectedSubCategory !== 'All') {
      filteredCards = filteredCards.filter(card => card.sub_category === selectedSubCategory);
    }

    // If due today filter is enabled, only consider cards that are due
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      filteredCards = filteredCards.filter(card => {
        const dueDate = card.dueDate || new Date(0);
        return dueDate < endOfToday;
      });
    }

    const levels = [...new Set(
      filteredCards
        .map(card => {
          // Get level from card or infer from FSRS parameters
          return card.level || inferLevelFromFSRS(card);
        })
        .filter(level => level && level.trim() !== '')
    )];

    return levels.sort();
  }, [flashcards, selectedSubCategory, showDueTodayOnly, inferLevelFromFSRS]);

  /**
   * Get level statistics (card counts) for each level
   * @param {string} selectedCategory - The selected category to filter by
   * @returns {Object} Object with level names as keys and card counts as values
   */
  const getLevelStats = useCallback((selectedCategory = 'All') => {
    // Start with only active cards
    let filteredCards = flashcards.filter(card => card.active !== false);

    // Filter by category
    if (selectedCategory !== 'All') {
      filteredCards = filteredCards.filter(card => card.category === selectedCategory);
    }

    // Filter by sub-category
    if (selectedSubCategory !== 'All') {
      filteredCards = filteredCards.filter(card => {
        const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
        return cardSubCategory === selectedSubCategory;
      });
    }

    // If due today filter is enabled, only consider cards that are due
    if (showDueTodayOnly) {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      filteredCards = filteredCards.filter(card => {
        const dueDate = card.dueDate || new Date(0);
        return dueDate < endOfToday;
      });
    }

    // Filter by starred status
    if (showStarredOnly) {
      filteredCards = filteredCards.filter(card => card.starred === true);
    }

    const levelStats = {};

    filteredCards.forEach(card => {
      const level = card.level || inferLevelFromFSRS(card);
      if (level && level.trim() !== '') {
        levelStats[level] = (levelStats[level] || 0) + 1;
      }
    });

    return levelStats;
  }, [flashcards, selectedSubCategory, showDueTodayOnly, showStarredOnly, inferLevelFromFSRS]);

  // Auto-manage sub-category filter when options change - simplified since category is managed in App.js
  useEffect(() => {
    const availableSubCategories = getSubCategories();

    console.log('🔍 AUTO-MANAGE SUBCATEGORY: Checking conditions:', {
      selectedSubCategory,
      availableSubCategories,
      availableSubCategoriesLength: availableSubCategories.length,
      isCurrentSubCategoryAvailable: availableSubCategories.includes(selectedSubCategory)
    });

    if (availableSubCategories.length === 0) {
      // No sub-categories available, reset to All
      if (selectedSubCategory !== 'All') {
        console.log('🔄 AUTO-MANAGE: No sub-categories available, resetting to All');
        setSelectedSubCategory('All');
      }
    } else if (selectedSubCategory !== 'All' && !availableSubCategories.includes(selectedSubCategory)) {
      // Current sub-category no longer available, move to first available or All
      const nextSubCategory = availableSubCategories.length > 0 ? availableSubCategories[0] : 'All';
      console.log(`🔄 AUTO-MANAGE: Sub-category "${selectedSubCategory}" no longer available, moving to "${nextSubCategory}"`);
      setSelectedSubCategory(nextSubCategory);
    }
    // Note: Don't include selectedSubCategory in dependencies to prevent overriding manual selections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSubCategories]);

  // Auto-manage level filter when options change
  useEffect(() => {
    const availableLevels = getLevels();
    
    if (availableLevels.length === 0) {
      // No levels available, reset to All
      if (selectedLevel !== 'All') {
        setSelectedLevel('All');
        console.log('🔄 No levels available, resetting to All');
      }
    } else if (selectedLevel !== 'All' && !availableLevels.includes(selectedLevel)) {
      // Current level no longer available, move to first available or All
      const nextLevel = availableLevels.length > 0 ? availableLevels[0] : 'All';
      setSelectedLevel(nextLevel);
      console.log(`🔄 Level "${selectedLevel}" no longer available, moving to "${nextLevel}"`);
    }
  }, [selectedSubCategory, showDueTodayOnly, getLevels, selectedLevel]);

  /**
   * Get category statistics
   * @returns {Object} Category statistics
   */
  const getCategoryStats = useCallback(() => {
    const stats = {};
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    flashcards.forEach(card => {
      // Only count active cards
      if (card.active === false) return;
      
      const category = card.category || 'Uncategorized';
      if (!stats[category]) {
        stats[category] = { total: 0, due: 0 };
      }
      stats[category].total++;
      
      // Ensure dueDate is a proper Date object for comparison
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      
      
      if (dueDate < endOfToday) { // Count cards due today or earlier
        stats[category].due++;
      }
    });
    
    console.log('📊 getCategoryStats result:', stats);
    return stats;
  }, [flashcards]);

  /**
   * Add a new flashcard
   * @param {Object} cardData - Flashcard data
   * @returns {Promise<string>} Document ID of created card
   */
  const addFlashcard = async (cardData) => {
    if (!db || !userId) throw new Error('Database or user not available');

    setIsLoading(true);
    setError('');

    try {
      const docRef = await addDoc(collection(db, 'flashcards'), {
        ...cardData,
        userId,
        createdAt: serverTimestamp(),
        dueDate: Timestamp.fromDate(new Date()),
        lastReviewed: null,
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        difficulty: 5,
        stability: 2,
        active: true,
        notes: cardData.notes || '',
        starred: cardData.starred || false
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding flashcard:', error);
      setError('Failed to add flashcard');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update an existing flashcard
   * @param {string} cardId - Flashcard ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<void>}
   */
  const updateFlashcard = async (cardId, updates) => {
    if (!db) throw new Error('Database not available');
    if (!cardId) {
      console.error('updateFlashcard called without cardId:', { cardId, updates });
      throw new Error('Card ID is required');
    }

    // console.log('🔄 useFlashcards: Updating card', cardId, 'with updates:', updates);
    
    setIsLoading(true);
    setError('');

    try {
      const cardRef = doc(db, 'flashcards', cardId);
      
      // Check if document exists first
      const docSnap = await getDoc(cardRef);
      if (!docSnap.exists()) {
        throw new Error(`Card with ID ${cardId} not found`);
      }
      
      await updateDoc(cardRef, {
        ...updates,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ useFlashcards: Error updating flashcard:', error);
      console.error('Error code:', error.code);
      console.error('Error type:', error.constructor.name);
      console.error('Card ID:', cardId);
      console.error('Updates:', updates);
      
      // More specific error handling
      let errorMessage;
      if (error.code === 'permission-denied') {
        errorMessage = `Permission denied: Check Firestore security rules. Error: ${error.message}`;
      } else if (error.code === 'not-found') {
        errorMessage = `Card not found: ${cardId}. Error: ${error.message}`;
      } else if (error.code === 'unauthenticated') {
        errorMessage = `User not authenticated. Error: ${error.message}`;
      } else {
        errorMessage = `Failed to update flashcard: ${error.message}`;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete a flashcard
   * @param {string} cardId - Flashcard ID
   * @returns {Promise<void>}
   */
  const deleteFlashcard = async (cardId) => {
    if (!db) throw new Error('Database not available');

    setIsLoading(true);
    setError('');

    try {
      await deleteDoc(doc(db, 'flashcards', cardId));
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      setError('Failed to delete flashcard');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Bulk import flashcards
   * @param {Array<Object>} cardsData - Array of flashcard data
   * @returns {Promise<Array<string>>} Array of created document IDs
   */
  const bulkImportFlashcards = async (cardsData) => {
    if (!db || !userId) throw new Error('Database or user not available');

    setIsLoading(true);
    setError('');

    try {
      const promises = cardsData.map(cardData => 
        addDoc(collection(db, 'flashcards'), {
          ...cardData,
          userId,
          createdAt: serverTimestamp(),
          dueDate: Timestamp.fromDate(new Date()),
          lastReviewed: null,
          reviewCount: 0,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          difficulty: cardData.difficulty || 5,
          stability: cardData.stability || 2,
          active: cardData.active !== undefined ? cardData.active : true,
          notes: cardData.notes || '',
          starred: cardData.starred || false
        })
      );

      const results = await Promise.all(promises);
      return results.map(result => result.id);
    } catch (error) {
      console.error('Error bulk importing flashcards:', error);
      setError('Failed to import flashcards');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add current card to navigation history
   */
  const addToNavigationHistory = useCallback((card) => {
    if (!card || !card.id) return;
    
    setNavigationHistory(prev => {
      // Remove any existing entry of this card to avoid duplicates
      const filtered = prev.filter(historyCard => historyCard.id !== card.id);
      // Add current card to the end of history
      return [...filtered, card];
    });
    setHistoryPosition(-1); // Reset position when adding new card
  }, []);

  /**
   * Navigate to next card
   */
  const nextCard = useCallback(() => {
    console.log('🔄 nextCard() called');
    console.log('🔄 filteredFlashcards.length:', filteredFlashcards.length);
    console.log('🔄 currentCardIndex:', currentCardIndex);
    
    if (filteredFlashcards.length === 0) {
      console.log('🔄 nextCard() returning early - no filtered flashcards');
      return;
    }
    
    // Add current card to history before moving
    const currentCard = filteredFlashcards[currentCardIndex];
    if (currentCard) {
      addToNavigationHistory(currentCard);
    }
    
    const newIndex = currentCardIndex >= filteredFlashcards.length - 1 ? 0 : currentCardIndex + 1;
    console.log('🔄 nextCard() setting index from', currentCardIndex, 'to', newIndex);
    
    setCurrentCardIndex(newIndex);
    setShowAnswer(false);
  }, [filteredFlashcards, currentCardIndex, addToNavigationHistory]);

  /**
   * Navigate to previous card - now uses navigation history if available
   */
  const prevCard = useCallback(() => {
    if (filteredFlashcards.length === 0) return;
    
    // If we have navigation history and we're not already browsing it
    if (navigationHistory.length > 0 && historyPosition === -1) {
      // Start browsing history from the most recent card
      setHistoryPosition(navigationHistory.length - 1);
      
      // Find the most recent card and display it
      const lastViewedCard = navigationHistory[navigationHistory.length - 1];
      
      // Try to find this card in current filtered set
      const cardIndex = filteredFlashcards.findIndex(card => card.id === lastViewedCard.id);
      
      if (cardIndex !== -1) {
        // Card is still in filtered set, navigate to it normally
        setCurrentCardIndex(cardIndex);
      } else {
        // Card is not in current filtered set, we need to handle this differently
        // For now, temporarily add it to the display
        setFilteredFlashcards(prev => [lastViewedCard, ...prev]);
        setCurrentCardIndex(0);
      }
      
      setShowAnswer(false);
      return;
    }
    
    // If we're already browsing history, go back further
    if (historyPosition > 0) {
      const newPosition = historyPosition - 1;
      setHistoryPosition(newPosition);
      
      const historyCard = navigationHistory[newPosition];
      const cardIndex = filteredFlashcards.findIndex(card => card.id === historyCard.id);
      
      if (cardIndex !== -1) {
        setCurrentCardIndex(cardIndex);
      } else {
        // Handle card not in current filtered set
        setFilteredFlashcards(prev => [historyCard, ...prev]);
        setCurrentCardIndex(0);
      }
      
      setShowAnswer(false);
      return;
    }
    
    // Default behavior - standard previous in current filtered set
    setCurrentCardIndex(prev => 
      prev <= 0 ? filteredFlashcards.length - 1 : prev - 1
    );
    setShowAnswer(false);
  }, [filteredFlashcards, navigationHistory, historyPosition]);

  /**
   * Get current card
   * @returns {Object|null} Current flashcard or null
   */
  const getCurrentCard = useCallback(() => {
    if (filteredFlashcards.length === 0 || currentCardIndex >= filteredFlashcards.length) {
      return null;
    }
    return filteredFlashcards[currentCardIndex];
  }, [filteredFlashcards, currentCardIndex]);

  /**
   * Get cards due today (from start of today to end of today)
   * @returns {Array<Object>} Array of active flashcards due today
   */
  const getCardsDueToday = useCallback(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    return flashcards.filter(card => {
      // Only include active cards
      if (card.active === false) return false;
      // Ensure dueDate is a proper Date object for comparison
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      // Changed to match getCategoryStats - count all cards due before end of today
      return dueDate < endOfToday;
    });
  }, [flashcards]);

  /**
   * Get past due cards (due before today)
   * @returns {Array<Object>} Array of active overdue flashcards
   */
  const getPastDueCards = useCallback(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return flashcards.filter(card => {
      // Only include active cards
      if (card.active === false) return false;
      // Ensure dueDate is a proper Date object for comparison
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate < startOfToday;
    });
  }, [flashcards]);

  /**
   * Get all due cards (due now or earlier)
   * @returns {Array<Object>} Array of all active due flashcards
   */
  const getAllDueCards = useCallback(() => {
    const now = new Date();
    
    const dueCards = flashcards.filter(card => {
      // Only include active cards
      if (card.active === false) return false;
      // Ensure dueDate is a proper Date object for comparison
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate <= now;
    });
    
    console.log('🔍 getAllDueCards debug:', {
      now: now,
      totalCards: flashcards.length,
      dueCards: dueCards.length,
      sampleDueDates: dueCards.slice(0, 3).map(card => ({
        question: card.question?.substring(0, 30),
        dueDate: card.dueDate,
        hoursUntilDue: (card.dueDate - now) / (1000 * 60 * 60)
      }))
    });
    
    return dueCards;
  }, [flashcards]);

  /**
   * Get cards that were reviewed today
   * @returns {Array<Object>} Array of flashcards reviewed today
   */
  const getCardsReviewedToday = useCallback(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    return flashcards.filter(card => {
      if (!card.lastReviewed) return false;
      const reviewDate = card.lastReviewed instanceof Date ? card.lastReviewed : card.lastReviewed.toDate();
      return reviewDate >= startOfToday && reviewDate < endOfToday;
    });
  }, [flashcards]);

  /**
   * Get due cards that match current filters (category, subcategory)
   * @param {string} selectedCategory - The selected category to filter by
   * @returns {Array<Object>} Array of filtered due flashcards
   */
  const getFilteredDueCards = useCallback((selectedCategory = 'All') => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    let filtered = flashcards.filter(card => {
      // Only include active cards
      if (card.active === false) return false;
      
      // Check if card is due before end of today (consistent with getCardsDueToday)
      // Ensure dueDate is a proper Date object for comparison
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate >= endOfToday) return false; // Exclude cards due after today
      
      return true;
    });

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(card => card.category === selectedCategory);
    }

    // Apply sub-category filter
    if (selectedSubCategory !== 'All') {
      filtered = filtered.filter(card => card.sub_category === selectedSubCategory);
    }

    return filtered;
  }, [flashcards, selectedSubCategory]);

  /**
   * Get next category with due cards
   * @param {string} currentCategory - Current category
   * @returns {string|null} Next category with due cards or null
   */
  const getNextCategoryWithDueCards = useCallback((currentCategory) => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const categoriesWithDue = {};
    
    // Build a map of categories with due cards
    flashcards.forEach(card => {
      if (card.active === false) return;
      
      // Ensure dueDate is a proper Date object for comparison
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      if (dueDate < endOfToday) { // Include all cards due today or earlier
        const category = card.category || 'Uncategorized';
        categoriesWithDue[category] = true;
      }
    });
    
    // Get sorted list of categories with due cards
    const dueCategories = Object.keys(categoriesWithDue).sort();
    
    // If no categories have due cards, return null
    if (dueCategories.length === 0) return null;
    
    // If current category is 'All' or not in the list, return first category with due cards
    if (currentCategory === 'All' || !dueCategories.includes(currentCategory)) {
      return dueCategories[0];
    }
    
    // Find current category index and return next one
    const currentIndex = dueCategories.indexOf(currentCategory);
    const nextIndex = (currentIndex + 1) % dueCategories.length;
    
    // If we've wrapped around to the beginning, return null to indicate completion
    if (nextIndex === 0) {
      return null;
    }
    
    return dueCategories[nextIndex];
  }, [flashcards]);

  /**
   * Toggle star status for a flashcard
   * @param {string} cardId - Flashcard ID
   * @returns {Promise<void>}
   */
  const toggleStarCard = async (cardId) => {
    if (!db) throw new Error('Database not available');
    if (!cardId) throw new Error('Card ID is required');

    const currentCard = flashcards.find(card => card.id === cardId);
    if (!currentCard) throw new Error('Card not found');

    const newStarredStatus = !currentCard.starred;
    
    console.log('🌟 useFlashcards: Toggling star for card', cardId, 'to', newStarredStatus);
    
    try {
      await updateFlashcard(cardId, { starred: newStarredStatus });
      console.log('✅ useFlashcards: Star status updated successfully');
    } catch (error) {
      console.error('❌ useFlashcards: Error toggling star:', error);
      throw error;
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError('');
  };
  
  /**
   * Manual trigger for auto-advance (for debugging)
   */
  const manualTriggerAutoAdvance = useCallback((selectedCategory = 'All') => {
    console.log('🔧 MANUAL-TRIGGER: Forcing auto-advance logic...');
    const nextSubCategory = getNextSubCategoryWithLeastCards(selectedCategory, selectedSubCategory);
    
    console.log('🔧 MANUAL-TRIGGER: Next subcategory result:', nextSubCategory);
    
    if (nextSubCategory) {
      console.log(`🔧 MANUAL-TRIGGER: ✅ Moving to: ${nextSubCategory}`);
      setSelectedSubCategory(nextSubCategory);
      return true;
    } else {
      console.log('🔧 MANUAL-TRIGGER: ❌ No next subcategory found');
      return false;
    }
  }, [selectedSubCategory, getNextSubCategoryWithLeastCards]);
  
  /**
   * Debug utility to inspect localStorage subcategory tracking
   */
  const debugSubCategoryTracking = useCallback((selectedCategory = 'All') => {
    if (!userId) return null;
    
    const storedInitialStats = localStorage.getItem(`flashcard_initial_subcategory_stats_${userId}`);
    const storedCompleted = localStorage.getItem(`flashcard_subcategory_completed_${userId}`);
    
    const initialStats = storedInitialStats ? JSON.parse(storedInitialStats) : {};
    const completedCounts = storedCompleted ? JSON.parse(storedCompleted) : {};
    
    console.log('🔍 SUBCATEGORY-TRACKING DEBUG:');
    console.log('🔍 Initial stats:', initialStats);
    console.log('🔍 Completed counts:', completedCounts);
    
    // Calculate current remaining counts
    const currentStats = {};
    Object.keys(initialStats).forEach(key => {
      const completed = completedCounts[key] || 0;
      const remaining = Math.max(0, (initialStats[key]?.due || 0) - completed);
      currentStats[key] = {
        initial: initialStats[key]?.due || 0,
        completed,
        remaining
      };
    });
    
    console.log('🔍 Current remaining counts:', currentStats);
    
    // Filter for current category
    const categoryStats = {};
    Object.keys(currentStats).forEach(key => {
      if (key.startsWith(`${selectedCategory}::`)) {
        categoryStats[key] = currentStats[key];
      }
    });
    
    console.log(`🔍 Stats for category "${selectedCategory}":`, categoryStats);
    
    return { initialStats, completedCounts, currentStats, categoryStats };
  }, [userId]);

  return {
    // State
    flashcards,
    filteredFlashcards,
    currentCardIndex,
    showAnswer,
    selectedSubCategory,
    selectedLevel,
    showDueTodayOnly,
    showStarredOnly,
    categorySortBy,
    isLoading,
    error,

    // Computed values
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

    // Actions
    setShowAnswer,
    // Note: setSelectedCategory removed - now handled by App.js
    setSelectedSubCategory: setSelectedSubCategoryManual,
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

    // Database operations
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    bulkImportFlashcards,
    toggleStarCard,
    clearError,
    
    // Debug functions
    manualTriggerAutoAdvance,
    debugCurrentFilterState,
    debugSubCategoryTracking
  };
};