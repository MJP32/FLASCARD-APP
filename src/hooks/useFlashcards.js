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
  setDoc, 
  deleteDoc, 
  getDocs, 
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [showDueTodayOnly, setShowDueTodayOnly] = useState(false);
  const [categorySortBy, setCategorySortBy] = useState('alphabetical');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize Firestore when Firebase app is ready
  useEffect(() => {
    if (!firebaseApp) return;
    const dbInstance = getFirestore(firebaseApp);
    setDb(dbInstance);
  }, [firebaseApp]);

  // Set up real-time listener for flashcards
  useEffect(() => {
    if (!db || !userId) {
      console.log('📦 Flashcards hook waiting for:', { db: !!db, userId });
      return;
    }

    console.log('🔍 Setting up flashcards listener for userId:', userId);
    setIsLoading(true);
    
    const flashcardsRef = collection(db, 'flashcards');
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
      
      setFlashcards(cards);
      setIsLoading(false);
    }, (error) => {
      console.error('❌ Error fetching flashcards:', error);
      setError('Failed to load flashcards');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId]);

  // Filter flashcards based on category, sub-category, level, and due date
  useEffect(() => {
    const previousFilteredLength = filteredFlashcards.length;
    const currentCard = filteredFlashcards[currentCardIndex];
    const currentCardId = currentCard?.id;
    
    let filtered = [...flashcards];

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(card => card.category === selectedCategory);
    }

    // Filter by sub-category
    if (selectedSubCategory !== 'All') {
      filtered = filtered.filter(card => card.sub_category === selectedSubCategory);
    }

    // Filter by level
    if (selectedLevel !== 'All') {
      filtered = filtered.filter(card => {
        // Get level from card or infer from FSRS parameters
        const cardLevel = card.level || inferLevelFromFSRS(card);
        return cardLevel === selectedLevel;
      });
    }

    // Filter by due date if enabled
    if (showDueTodayOnly) {
      const now = new Date();
      console.log('📅 Filtering by due date. Current time:', now);
      filtered = filtered.filter(card => {
        const dueDate = card.dueDate || new Date(0);
        const isDue = dueDate <= now;
        console.log('Card due check:', { 
          question: card.question?.substring(0, 30), 
          dueDate: dueDate, 
          isDue 
        });
        return isDue;
      });
      console.log('📊 After due date filter:', filtered.length, 'of', flashcards.length, 'cards showing');
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
    
    setFilteredFlashcards(filtered);
    
    // Smart index management
    if (filtered.length > 0) {
      if (!currentCardStillAvailable && previousFilteredLength > 0) {
        // Current card was removed (due to review or deletion)
        let newIndex = currentCardIndex;
        
        // If we're at or past the end, wrap to beginning or go to previous card
        if (newIndex >= filtered.length) {
          newIndex = Math.max(0, filtered.length - 1);
        }
        
        setCurrentCardIndex(newIndex);
        
        // Different messages for different scenarios
        if (filtered.length < previousFilteredLength) {
          console.log(`🔄 Card removed (likely deleted), moving to index ${newIndex}`);
        } else {
          console.log(`🔄 Current card filtered out after review, moving to index ${newIndex}`);
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
    }
  }, [flashcards, selectedCategory, selectedSubCategory, selectedLevel, showDueTodayOnly, categorySortBy, currentCardIndex]);


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
   * Get available categories from flashcards
   * @returns {Array<string>} Array of unique categories
   */
  const getCategories = useCallback(() => {
    const categories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
    return categories.sort();
  }, [flashcards]);

  /**
   * Get available sub-categories from flashcards (filtered by selected category and due date)
   * @returns {Array<string>} Array of unique sub-categories that have available cards
   */
  const getSubCategories = useCallback(() => {
    let filteredCards = flashcards;
    
    // If a specific category is selected, only show sub-categories from that category
    if (selectedCategory !== 'All') {
      filteredCards = flashcards.filter(card => card.category === selectedCategory);
    }
    
    // If due today filter is enabled, only consider cards that are due
    if (showDueTodayOnly) {
      const now = new Date();
      filteredCards = filteredCards.filter(card => {
        const dueDate = card.dueDate || new Date(0);
        return dueDate <= now;
      });
    }
    
    const subCategories = [...new Set(
      filteredCards
        .map(card => card.sub_category)
        .filter(subCat => subCat && subCat.trim() !== '')
    )];
    
    return subCategories.sort();
  }, [flashcards, selectedCategory, showDueTodayOnly]);

  /**
   * Get available levels from flashcards (filtered by selected category, sub-category, and due date)
   * @returns {Array<string>} Array of unique levels that have available cards
   */
  const getLevels = useCallback(() => {
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
      filteredCards = filteredCards.filter(card => {
        const dueDate = card.dueDate || new Date(0);
        return dueDate <= now;
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
  }, [flashcards, selectedCategory, selectedSubCategory, showDueTodayOnly, inferLevelFromFSRS]);

  // Auto-manage sub-category filter when options change
  useEffect(() => {
    const availableSubCategories = getSubCategories();
    
    if (selectedCategory === 'All') {
      setSelectedSubCategory('All');
    } else if (availableSubCategories.length === 0) {
      // No sub-categories available, reset to All
      setSelectedSubCategory('All');
      console.log('🔄 No sub-categories available, resetting to All');
    } else if (selectedSubCategory !== 'All' && !availableSubCategories.includes(selectedSubCategory)) {
      // Current sub-category no longer available, move to first available or All
      const nextSubCategory = availableSubCategories.length > 0 ? availableSubCategories[0] : 'All';
      setSelectedSubCategory(nextSubCategory);
      console.log(`🔄 Sub-category "${selectedSubCategory}" no longer available, moving to "${nextSubCategory}"`);
    }
  }, [selectedCategory, getSubCategories, selectedSubCategory]);

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
  }, [selectedCategory, selectedSubCategory, showDueTodayOnly, getLevels, selectedLevel]);

  /**
   * Get category statistics
   * @returns {Object} Category statistics
   */
  const getCategoryStats = useCallback(() => {
    const stats = {};
    const now = new Date();
    
    flashcards.forEach(card => {
      const category = card.category || 'Uncategorized';
      if (!stats[category]) {
        stats[category] = { total: 0, due: 0 };
      }
      stats[category].total++;
      if ((card.dueDate || new Date(0)) <= now) {
        stats[category].due++;
      }
    });
    
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
        stability: 2
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
    if (!cardId) throw new Error('Card ID is required');

    console.log('🔄 useFlashcards: Updating card', cardId, 'with updates:', updates);
    
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
      
      console.log('✅ useFlashcards: Card updated successfully');
    } catch (error) {
      console.error('❌ useFlashcards: Error updating flashcard:', error);
      console.error('Card ID:', cardId);
      console.error('Updates:', updates);
      const errorMessage = `Failed to update flashcard: ${error.message}`;
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
          stability: cardData.stability || 2
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
   * Navigate to next card
   */
  const nextCard = useCallback(() => {
    if (filteredFlashcards.length === 0) return;
    
    setCurrentCardIndex(prev => 
      prev >= filteredFlashcards.length - 1 ? 0 : prev + 1
    );
    setShowAnswer(false);
  }, [filteredFlashcards.length]);

  /**
   * Navigate to previous card
   */
  const prevCard = useCallback(() => {
    if (filteredFlashcards.length === 0) return;
    
    setCurrentCardIndex(prev => 
      prev <= 0 ? filteredFlashcards.length - 1 : prev - 1
    );
    setShowAnswer(false);
  }, [filteredFlashcards.length]);

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
   * Clear error state
   */
  const clearError = () => {
    setError('');
  };

  return {
    // State
    flashcards,
    filteredFlashcards,
    currentCardIndex,
    showAnswer,
    selectedCategory,
    selectedSubCategory,
    selectedLevel,
    showDueTodayOnly,
    categorySortBy,
    isLoading,
    error,

    // Computed values
    getCurrentCard,
    getCategories,
    getSubCategories,
    getLevels,
    getCategoryStats,

    // Actions
    setShowAnswer,
    setSelectedCategory,
    setSelectedSubCategory,
    setSelectedLevel,
    setShowDueTodayOnly,
    setCategorySortBy,
    setCurrentCardIndex,
    nextCard,
    prevCard,

    // Database operations
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    bulkImportFlashcards,
    clearError
  };
};