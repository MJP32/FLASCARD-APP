import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';

// Core Components (loaded immediately)
import LoginScreen from './LoginScreen.jsx';
import FlashcardDisplay from './components/FlashcardDisplay';
import FlashcardForm from './components/FlashcardForm';
import Header from './components/Header';
import Footer from './components/Footer';
import MessageBar from './components/MessageBar';
import ReviewButtons from './components/ReviewButtons';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useFlashcards } from './hooks/useFlashcards';
import { useSettings } from './hooks/useSettings';

// Utils and Constants
import { SUCCESS_MESSAGES, DEFAULT_FSRS_PARAMS } from './utils/constants';
import { debugDueCards } from './debug/utils/debugDueCards';
import { addDebugAutoAdvanceToWindow } from './debug/utils/debugAutoAdvance';
import { addDebugCountingToWindow } from './debug/utils/debugCounting';
import { debugCategories } from './debug/utils/debugCategories';
import { debugAmazonLP } from './debug/utils/debugAmazonLP';

// Styles
import './App.css';
import './MobileOptimizations.css';

import './ai-explanation-dropdown.css';

// Lazy-loaded Modal Components (loaded on demand)
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const ImportExportModal = lazy(() => import('./components/ImportExportModal'));
const GenerateQuestionsModal = lazy(() => import('./components/GenerateQuestionsModal'));
const ManageCardsModal = lazy(() => import('./components/ManageCardsModal'));
const Calendar = lazy(() => import('./Calendar'));
const StudyTimer = lazy(() => import('./components/StudyTimer'));
const StudyStats = lazy(() => import('./components/StudyStats'));

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
 * Component that automatically navigates to the optimal category and subcategory
 * when no cards are available in the current selection
 */
const AutoNavigateToOptimalCards = ({
  currentCategory,
  currentSubCategory,
  showDueTodayOnly,
  getNextCategoryWithLeastCards,
  getNextSubCategoryWithLeastCards,
  setSelectedCategory,
  setSelectedSubCategory,
  setMessage
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationComplete, setNavigationComplete] = useState(false);

  useEffect(() => {
    if (!showDueTodayOnly || isNavigating || navigationComplete) return;

    const performAutoNavigation = async () => {
      setIsNavigating(true);

      // Step 1: Find the category with the least total cards that has due cards
      const bestCategory = getNextCategoryWithLeastCards(currentCategory);

      if (bestCategory) {
        // Step 2: Within that category, find the subcategory with least total cards that has due cards
        const bestSubCategory = getNextSubCategoryWithLeastCards(bestCategory, 'All');

        if (bestSubCategory) {
          // Navigate to the optimal category and subcategory
          setSelectedCategory(bestCategory);
          setSelectedSubCategory(bestSubCategory);
          setMessage(`Auto-navigated to "${bestCategory}" → "${bestSubCategory}" (optimal study path)`);

          setTimeout(() => setMessage(''), 4000);
        } else {
          // Navigate to the category but show all subcategories
          setSelectedCategory(bestCategory);
          setSelectedSubCategory('All');
          setMessage(`Auto-navigated to "${bestCategory}" category (optimal study path)`);

          setTimeout(() => setMessage(''), 4000);
        }

        setNavigationComplete(true);
      } else {
        setNavigationComplete(true);
      }

      setIsNavigating(false);
    };

    // Add a small delay to prevent immediate navigation
    const timer = setTimeout(performAutoNavigation, 1000);
    return () => clearTimeout(timer);
  }, [currentCategory, currentSubCategory, showDueTodayOnly, isNavigating, navigationComplete, getNextCategoryWithLeastCards, getNextSubCategoryWithLeastCards, setMessage, setSelectedCategory, setSelectedSubCategory]);

  if (isNavigating) {
    return (
      <>
        <h2>Finding optimal study path...</h2>
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
        <p>Looking for the category and subcategory with the fewest cards to maximize your progress.</p>
      </>
    );
  }

  if (navigationComplete) {
    return (
      <>
        <h2>No cards available in current selection</h2>
        <p>
          No cards found in "{currentCategory}" category
          {currentSubCategory !== 'All' ? ` → "${currentSubCategory}" subcategory` : ''}
          {showDueTodayOnly ? ' that are due today' : ''}.
        </p>
        <p>
          <strong>Auto-navigation has been attempted.</strong> If you're still seeing this message,
          there may be no due cards available in any category/subcategory combination.
        </p>
      </>
    );
  }

  return (
    <>
      <h2>Preparing optimal study session...</h2>
      <p>Analyzing your flashcards to find the best starting point...</p>
    </>
  );
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

  // Clear message function
  const clearMessage = useCallback(() => {
    setMessage('');
  }, []);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showManageCardsModal, setShowManageCardsModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showStudyTimer, setShowStudyTimer] = useState(false);
  const [showStudyStats, setShowStudyStats] = useState(false);

  // Undo deletion state
  const [deletedCards, setDeletedCards] = useState([]);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Edit card states
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editCardData, setEditCardData] = useState(null);

  // Mobile header collapse state
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPopouted, setIsPopouted] = useState(false);
  const [windowPosition, setWindowPosition] = useState({
    x: Math.max(0, (window.innerWidth - 1400) / 2),
    y: Math.max(0, (window.innerHeight - 900) / 2)
  });
  const [windowSize, setWindowSize] = useState({ width: 1400, height: 900 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Message states
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // AI Generation states
  const [apiKeys, setApiKeys] = useState(() => {
    const keys = {
      openai: localStorage.getItem('openai_api_key') || '',
      anthropic: localStorage.getItem('anthropic_api_key') || '',
      gemini: localStorage.getItem('gemini_api_key') || ''
    };
    console.log('Initial API keys from localStorage:', {
      openai: keys.openai ? 'SET' : 'NOT SET',
      anthropic: keys.anthropic ? 'SET' : 'NOT SET',
      gemini: keys.gemini ? 'SET' : 'NOT SET'
    });
    return keys;
  });
  const [selectedProvider, setSelectedProvider] = useState(() => {
    const provider = localStorage.getItem('selected_ai_provider') || 'openai';
    console.log('Initial selectedProvider:', provider);
    return provider;
  });

  // Local API key state for the dropdown
  const [localApiKeys, setLocalApiKeys] = useState({
    openai: apiKeys.openai || '',
    anthropic: apiKeys.anthropic || '',
    gemini: apiKeys.gemini || ''
  });
  const [localSelectedProvider, setLocalSelectedProvider] = useState(selectedProvider);

  // Streak tracking state
  const [streakDays, setStreakDays] = useState(0);

  // Track if we've checked for default cards creation
  const [hasCheckedForDefaults, setHasCheckedForDefaults] = useState(false);

  // Track if anonymous warning has been dismissed
  const [isAnonymousWarningDismissed, setIsAnonymousWarningDismissed] = useState(false);

  // Track initial due cards count for the day
  const [, setInitialDueCardsCount] = useState(0);
  const [cardsCompletedToday, setCardsCompletedToday] = useState(0);
  const [, setInitialCategoryStats] = useState({});
  const [categoryCompletedCounts, setCategoryCompletedCounts] = useState({});
  const [, setInitialSubCategoryStats] = useState({});
  const [subCategoryCompletedCounts, setSubCategoryCompletedCounts] = useState({});
  const [lastManualCategoryChange, setLastManualCategoryChange] = useState(0);
  const [lastManualSubCategoryChange, setLastManualSubCategoryChange] = useState(0);
  const [lastCardCompletion, setLastCardCompletion] = useState(0);
  const [isManualCategorySelection, setIsManualCategorySelection] = useState(false);

  // Category selection state - managed in App.js to avoid circular dependency
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Collapsible sections state - auto-collapse on mobile
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(window.innerWidth <= 768);
  const [isSubCategoriesCollapsed, setIsSubCategoriesCollapsed] = useState(window.innerWidth <= 768);
  const [isLevelsCollapsed, setIsLevelsCollapsed] = useState(window.innerWidth <= 768);

  // Explain functionality state
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainPrompt, setExplainPrompt] = useState('');
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [addExplanationToQuestion, setAddExplanationToQuestion] = useState(true);

  // Card transition state to prevent flicker
  const [isCardTransitioning, setIsCardTransitioning] = useState(false);

  // Search state for main view
  const [searchQuery, setSearchQuery] = useState('');

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
    setCurrentCardIndex,
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
    debugSubCategoryTracking
  } = useFlashcards(firebaseApp, userId);

  const {
    isDarkMode,
    isHighContrast,
    fsrsParams,
    showIntervalSettings,
    settingsLoaded,
    isLoading: settingsLoading,
    error: settingsError,
    toggleDarkMode,
    toggleHighContrast,
    updateFsrsParams,
    toggleIntervalSettings,
    clearError: clearSettingsError
  } = useSettings(firebaseApp, userId);

  // API Key dropdown handlers
  const handleApiKeyChange = useCallback((provider, value) => {
    setLocalApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  }, []);

  const handleProviderChange = useCallback((provider) => {
    setLocalSelectedProvider(provider);
  }, []);

  const handleApiKeysUpdate = useCallback((keys) => {
    setApiKeys(keys);
    // Save to localStorage
    Object.entries(keys).forEach(([provider, key]) => {
      if (key) {
        localStorage.setItem(`${provider}_api_key`, key);
      } else {
        localStorage.removeItem(`${provider}_api_key`);
      }
    });
  }, []);

  const handleSaveApiKeys = useCallback(() => {
    // Update the main API keys state
    handleApiKeysUpdate(localApiKeys);
    // Update the selected provider
    setSelectedProvider(localSelectedProvider);
    localStorage.setItem('selected_ai_provider', localSelectedProvider);
    // Close the dropdown
    setShowApiKeyModal(false);
    setMessage('API keys saved successfully!');
  }, [localApiKeys, localSelectedProvider, handleApiKeysUpdate, setSelectedProvider, setMessage]);

  // Sync localApiKeys when API modal opens
  useEffect(() => {
    if (showApiKeyModal) {
      // Reload from localStorage to ensure we have the latest values
      const freshKeys = {
        openai: localStorage.getItem('openai_api_key') || '',
        anthropic: localStorage.getItem('anthropic_api_key') || '',
        gemini: localStorage.getItem('gemini_api_key') || ''
      };
      setLocalApiKeys(freshKeys);
      setApiKeys(freshKeys);
      setLocalSelectedProvider(localStorage.getItem('selected_ai_provider') || 'openai');
    }
  }, [showApiKeyModal]);

  // Get computed values (must be before any useEffect that uses them)
  const categoryStats = getCategoryStats();
  const currentCard = getCurrentCard();
  const categories = getCategories();
  const subCategories = getSubCategories(selectedCategory);

  const subCategoryStats = getSubCategoryStats(selectedCategory);
  const levels = getLevels(selectedCategory);
  const levelStats = getLevelStats(selectedCategory);

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
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        categoryCards = categoryCards.filter(card => {
          let dueDate = card.dueDate || new Date(0);
          if (dueDate && typeof dueDate.toDate === 'function') {
            dueDate = dueDate.toDate();
          }
          return dueDate < endOfToday;
        });
      } else if (showDueTodayOnly) {
        // Filter by due date only - use end of today like useFlashcards
        const now = new Date();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        categoryCards = categoryCards.filter(card => {
          let dueDate = card.dueDate || new Date(0);
          if (dueDate && typeof dueDate.toDate === 'function') {
            dueDate = dueDate.toDate();
          }
          return dueDate < endOfToday;
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
  }, [displayCategories, flashcards, showDueTodayOnly, showStarredOnly, categories]);

  // Helper function to strip HTML tags for search
  const stripHtml = useCallback((html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }, []);

  // Apply search filter to flashcards
  const searchFilteredFlashcards = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredFlashcards;
    }
    const query = searchQuery.toLowerCase().trim();
    return filteredFlashcards.filter(card => {
      // Strip HTML tags before searching to match visible text
      const question = stripHtml(card.question || '').toLowerCase();
      const answer = stripHtml(card.answer || '').toLowerCase();
      const category = (card.category || '').toLowerCase();
      const subCategory = (card.sub_category || '').toLowerCase();
      return question.includes(query) || answer.includes(query) ||
        category.includes(query) || subCategory.includes(query);
    });
  }, [filteredFlashcards, searchQuery, stripHtml]);

  // Get current card from search-filtered list
  const currentSearchCard = useMemo(() => {
    if (searchFilteredFlashcards.length === 0) return null;
    const index = Math.min(currentCardIndex, searchFilteredFlashcards.length - 1);
    return searchFilteredFlashcards[index];
  }, [searchFilteredFlashcards, currentCardIndex]);

  // Use search card when searching, otherwise use regular current card
  const displayedCard = searchQuery.trim() ? currentSearchCard : currentCard;
  const displayedTotalCards = searchQuery.trim() ? searchFilteredFlashcards.length : filteredFlashcards.length;

  // Search-aware navigation functions
  const searchNextCard = useCallback(() => {
    const cards = searchQuery.trim() ? searchFilteredFlashcards : filteredFlashcards;
    if (cards.length === 0) return;
    setIsCardTransitioning(true);
    setTimeout(() => {
      const newIndex = currentCardIndex >= cards.length - 1 ? 0 : currentCardIndex + 1;
      setCurrentCardIndex(newIndex);
      setShowAnswer(false);
      setIsCardTransitioning(false);
    }, 150);
  }, [searchQuery, searchFilteredFlashcards, filteredFlashcards, currentCardIndex, setCurrentCardIndex, setShowAnswer]);

  const searchPrevCard = useCallback(() => {
    const cards = searchQuery.trim() ? searchFilteredFlashcards : filteredFlashcards;
    if (cards.length === 0) return;
    setIsCardTransitioning(true);
    setTimeout(() => {
      const newIndex = currentCardIndex <= 0 ? cards.length - 1 : currentCardIndex - 1;
      setCurrentCardIndex(newIndex);
      setShowAnswer(false);
      setIsCardTransitioning(false);
    }, 150);
  }, [searchQuery, searchFilteredFlashcards, filteredFlashcards, currentCardIndex, setCurrentCardIndex, setShowAnswer]);

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

      // Log category debug info once when flashcards change
      if (flashcards && flashcards.length > 0 && !window._hasLoggedCategories) {
        // console.log('\n🔍 CATEGORY DEBUG - Check terminal for details\n');
        debugCategories(flashcards);
        window._hasLoggedCategories = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const handleReviewCard = useCallback(async (rating) => {
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
        maximumInterval = 36500,
        w = DEFAULT_FSRS_PARAMS.w,
        againFactor = 0.5,
        hardFactor = 0.8,
        goodFactor = 1.0,
      } = fsrsParams;

      // Calculate elapsed days since last review
      const lastReviewDate = lastReviewed ? (lastReviewed.toDate ? lastReviewed.toDate() : new Date(lastReviewed)) : null;
      const elapsedDays = lastReviewDate ? Math.max(1, Math.round((now - lastReviewDate) / (1000 * 60 * 60 * 24))) : 0;

      // FSRS-4.5 algorithm implementation
      if (numRating === 1) { // Again
        repetitions = 0;

        // For first review or after a lapse
        if (card.repetitions === 0) {
          interval = 1 / (24 * 60); // Convert minutes to days
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
          interval = 1 / (24 * 60); // Convert minutes to days
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
          interval = 4;
        } else if (repetitions === 1) {
          interval = 4 * 1.5;
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
          interval = 15;
        } else {
          // Apply easy bonus to interval
          const newInterval = interval * easeFactor;
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

      // Increment completed cards count
      const newCompletedCount = cardsCompletedToday + 1;
      setCardsCompletedToday(newCompletedCount);

      // Save updated completed count to localStorage
      localStorage.setItem(`flashcard_completed_today_${userId}`, newCompletedCount.toString());

      // Mark that a card was just completed (for auto-advance logic)
      // This is passed to the useFlashcards hook to prevent auto-advance without user activity
      if (window.flashcardHook && window.flashcardHook.setLastCardCompletionTime) {
        window.flashcardHook.setLastCardCompletionTime(Date.now());
      }

      // Track card completion time for App.js auto-advance logic
      setLastCardCompletion(Date.now());

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

      // Start transition - hide card content to prevent flicker
      setIsCardTransitioning(true);
      setShowAnswer(false);

      // Move to next card (search-aware navigation)
      const cards = searchQuery.trim() ? searchFilteredFlashcards : filteredFlashcards;
      if (cards.length > 0) {
        const newIndex = currentCardIndex >= cards.length - 1 ? 0 : currentCardIndex + 1;
        setCurrentCardIndex(newIndex);
      }

      // End transition after a brief delay to allow render
      setTimeout(() => {
        setIsCardTransitioning(false);
      }, 50);

      clearMessage();

    } catch (error) {
      console.error('❌ Error reviewing card:', error);
      console.error('Card ID:', card.id);
      console.error('Rating:', rating);
      setError(`Failed to update card review: ${error.message}`);
    }
  }, [getCurrentCard, fsrsParams, addToNavigationHistory, updateFlashcard, setMessage, cardsCompletedToday, setCardsCompletedToday, userId, categoryCompletedCounts, setCategoryCompletedCounts, subCategoryCompletedCounts, setSubCategoryCompletedCounts, setLastCardCompletion, setShowAnswer, searchQuery, searchFilteredFlashcards, filteredFlashcards, currentCardIndex, setCurrentCardIndex, clearMessage, setError]);

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

  const handleDeleteCard = async (cardId, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('Are you sure you want to delete this flashcard?')) {
      return;
    }

    try {
      // Find and store the card data before deletion for undo
      const cardToDelete = flashcards.find(c => c.id === cardId);
      if (cardToDelete) {
        // Store for potential undo - keep last 5 deletions
        setDeletedCards(prev => [...prev.slice(-4), { ...cardToDelete, deletedAt: Date.now() }]);
        setShowUndoToast(true);
        // Auto-hide toast after 10 seconds
        setTimeout(() => setShowUndoToast(false), 10000);
      }

      // Store current position for smart navigation
      const currentPosition = currentCardIndex;
      const totalCards = filteredFlashcards.length;

      await deleteFlashcard(cardId);

      // Navigate to next available card
      // The filtering system will handle the actual navigation via useEffect
      // But we can help by adjusting the index if we're at the end
      if (currentPosition >= totalCards - 1 && totalCards > 1) {
        // We're deleting the last card, move to the previous one
        setCurrentCardIndex(Math.max(0, currentPosition - 1));
      }
      // For other positions, let the filtering system handle navigation automatically

      setMessage('Card deleted - Click Undo to restore');
      setIsEditingCard(false);
      setEditCardData(null);
    } catch (error) {
      setError(error.message || 'Failed to delete flashcard');
    }
  };

  // Undo card deletion
  const handleUndoDelete = async () => {
    if (deletedCards.length === 0) return;

    const lastDeleted = deletedCards[deletedCards.length - 1];
    try {
      // Remove internal fields before restoring
      const { id, deletedAt, ...cardData } = lastDeleted;
      await addFlashcard(cardData);

      setDeletedCards(prev => prev.slice(0, -1));
      setMessage('Card restored successfully!');

      if (deletedCards.length <= 1) {
        setShowUndoToast(false);
      }
    } catch (error) {
      setError('Failed to restore card');
    }
  };

  // Bulk delete multiple cards
  const handleBulkDelete = async (cardIds) => {
    try {
      let deletedCount = 0;
      for (const cardId of cardIds) {
        await deleteFlashcard(cardId);
        deletedCount++;
      }
      setMessage(`Successfully deleted ${deletedCount} card${deletedCount !== 1 ? 's' : ''}`);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to delete some cards');
    }
  };

  // Bulk update category for multiple cards
  const handleBulkUpdateCategory = async (cardIds, newCategory, newSubCategory) => {
    try {
      let updatedCount = 0;
      for (const cardId of cardIds) {
        const updateData = { category: newCategory };
        if (newSubCategory) {
          updateData.sub_category = newSubCategory;
        }
        await updateFlashcard(cardId, updateData);
        updatedCount++;
      }
      setMessage(`Updated category for ${updatedCount} card${updatedCount !== 1 ? 's' : ''}`);
      clearMessage();
    } catch (error) {
      setError(error.message || 'Failed to update some cards');
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
    if (!currentUserId || !addFlashcard) {
      return;
    }

    // Check if defaults have already been created for this user
    const defaultsKey = `defaultCards_${currentUserId}`;
    const hasDefaults = localStorage.getItem(defaultsKey);

    if (hasDefaults) {
      return;
    }

    // Check if user already has flashcards
    if (flashcards.length > 0) {
      localStorage.setItem(defaultsKey, 'true'); // Mark as having defaults to avoid future checks
      return;
    }

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
      setMessage(`Welcome! We've added ${createdCount} sample cards to get you started.`);
      clearMessage();

    } catch (error) {
      console.error('❌ Error creating default flashcards:', error);
      // Don't show error to user - this is a nice-to-have feature
    }
  };

  // Handle edit card
  const handleEditCard = useCallback((card) => {
    setEditCardData(card);
    setIsEditingCard(true);
    setShowCreateCardForm(true);
  }, []);

  // Window management functions
  const handleRestore = () => {
    // Reset all window states to default embedded view
    setIsMaximized(false);
    setIsPopouted(false);
    setWindowPosition({ x: 0, y: 0 });
    setWindowSize({ width: 1400, height: 900 });
  };

  const handleClosePopout = () => {
    setIsPopouted(false);
    setIsMaximized(false);
    setWindowPosition({ x: 0, y: 0 });
    setWindowSize({ width: 1400, height: 900 });
  };

  // Explain functionality handlers
  // eslint-disable-next-line no-unused-vars
  const _handleOpenExplain = () => {
    if (currentCard) {
      const defaultPrompt = `Explain "${currentCard.question?.replace(/<[^>]*>/g, '') || 'this question'}" including concepts and why it is important to know`;
      setExplainPrompt(defaultPrompt);
    } else {
      setExplainPrompt('Explain the current topic including concepts and why it is important to know');
    }
    setShowExplainModal(true);
    setExplainError('');
  };

  const handleCloseExplain = () => {
    setShowExplainModal(false);
    setExplainPrompt('');
    setExplainError('');
  };

  const handleGenerateExplanation = async () => {
    if (!explainPrompt.trim()) {
      setExplainError('Please enter a prompt for the explanation');
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setExplainError(`Please configure ${selectedProvider.toUpperCase()} API key in settings`);
      return;
    }

    setIsGeneratingExplanation(true);
    setExplainError('');

    try {
      const contextPrompt = `Context Information:
${currentCard ? `Current Question: ${currentCard.question?.replace(/<[^>]*>/g, '') || ''}` : ''}
${currentCard ? `Current Answer: ${currentCard.answer?.replace(/<[^>]*>/g, '') || ''}` : ''}
${currentCard ? `Category: ${currentCard.category || 'General'}` : ''}
${currentCard && currentCard.sub_category ? `Sub-category: ${currentCard.sub_category}` : ''}

User Request: ${explainPrompt}

Instructions:
1. Provide a comprehensive explanation based on the user's request
2. Include key concepts and definitions
3. Explain why this knowledge is important
4. Use clear, educational language
5. Format your response as HTML using these tags: <p>, <strong>, <em>, <ul>, <li>, <ol>
6. Include examples when appropriate
7. Start directly with HTML content - no markdown, no code blocks, no backticks

EXAMPLE FORMAT:
<p>This is a paragraph with <strong>important concepts</strong> and <em>emphasis</em>.</p>
<ul>
<li><strong>Concept 1:</strong> Explanation here</li>
<li><strong>Concept 2:</strong> Another explanation</li>
</ul>
<p>Why this is important: explanation here.</p>

IMPORTANT: Return ONLY HTML content, no markdown formatting, no code blocks.`;

      const response = await callAI(contextPrompt, selectedProvider, apiKey);

      // Check if response is valid
      if (!response || typeof response !== 'string') {
        throw new Error('AI response was empty or invalid');
      }

      // Clean up the response to ensure it's proper HTML
      let cleanResponse = response.trim();

      // Remove any markdown code block formatting if present
      cleanResponse = cleanResponse.replace(/```html\s*/g, '').replace(/```\s*$/g, '');
      cleanResponse = cleanResponse.replace(/```\s*/g, '').replace(/```\s*$/g, '');

      // Extract content from full HTML document structure if present
      if (cleanResponse.includes('<!DOCTYPE') || cleanResponse.includes('<html>') || cleanResponse.includes('<body>')) {
        // Try to extract body content first
        const bodyMatch = cleanResponse.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          cleanResponse = bodyMatch[1].trim();
        } else {
          // More aggressive fallback: remove all document structure
          cleanResponse = cleanResponse
            .replace(/<!DOCTYPE[^>]*>\s*/gi, '')
            .replace(/<html[^>]*>\s*/gi, '')
            .replace(/<\/html>\s*/gi, '')
            .replace(/<head[\s\S]*?<\/head>\s*/gi, '')
            .replace(/<body[^>]*>\s*/gi, '')
            .replace(/<\/body>\s*/gi, '')
            .trim();
        }
      }

      // Ensure we have HTML tags, if not wrap in paragraph
      if (!cleanResponse.includes('<') && cleanResponse.length > 0) {
        cleanResponse = `<p>${cleanResponse}</p>`;
      }

      // Convert HTML to plain text since notes use a textarea
      const htmlToText = (html) => {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Convert common HTML elements to text equivalents
        const processNode = (node) => {
          let text = '';
          for (let child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              text += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const tagName = child.tagName.toLowerCase();
              switch (tagName) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                  text += '\n\n' + child.textContent.toUpperCase() + '\n';
                  break;
                case 'p':
                  text += '\n\n' + processNode(child) + '\n';
                  break;
                case 'br':
                  text += '\n';
                  break;
                case 'li':
                  text += '\n• ' + processNode(child);
                  break;
                case 'ul':
                case 'ol':
                  text += '\n' + processNode(child) + '\n';
                  break;
                case 'strong':
                case 'b':
                  text += '**' + child.textContent + '**';
                  break;
                case 'em':
                case 'i':
                  text += '*' + child.textContent + '*';
                  break;
                default:
                  text += processNode(child);
              }
            }
          }
          return text;
        };

        return processNode(tempDiv).trim();
      };

      // Create explanation text for the tooltip
      const explanationText = htmlToText(cleanResponse);

      // Debug logging
      console.log('AI Response:', response);
      console.log('Clean Response:', cleanResponse);

      // Add explanation to question as dropdown if checkbox is checked
      if (addExplanationToQuestion && currentCard) {
        // Create a brief version of the explanation for the dropdown

        // Simple lightbulb icon with hover tooltip at the beginning of question
        // Limit explanation text for tooltip and escape properly
        const tooltipText = explanationText.length > 500
          ? explanationText.substring(0, 500) + '...'
          : explanationText;
        const escapedTooltip = tooltipText
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/\n/g, ' ')
          .replace(/\r/g, '');

        const explanationIcon = `<span class="ai-explanation-lightbulb" title="${escapedTooltip}">💡</span> `;

        // Prepend to question, not append
        const updatedQuestion = `${explanationIcon}${currentCard.question || ''}`;

        console.log('Current question:', currentCard.question);
        console.log('Explanation icon HTML:', explanationIcon);
        console.log('Updated question:', updatedQuestion);

        // Update the card using the hook function - this will handle state updates automatically
        if (currentCard.id) {
          try {
            await updateFlashcard(currentCard.id, { question: updatedQuestion });
            console.log('Question updated with explanation dropdown');
          } catch (error) {
            console.error('Error updating card question:', error);
          }
        }
      }

      handleCloseExplain();
    } catch (error) {
      console.error('Explanation generation error:', error);
      setExplainError('Failed to generate explanation: ' + error.message);
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  // AI calling function for explanations
  const callAI = async (prompt, provider, apiKey) => {
    switch (provider) {
      case 'openai':
        return await callOpenAI(prompt, apiKey);
      case 'anthropic':
        return await callAnthropic(prompt, apiKey);
      case 'gemini':
        return await callGemini(prompt, apiKey);
      default:
        throw new Error('Unsupported AI provider');
    }
  };

  const callOpenAI = async (prompt, apiKey) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an educational expert who provides clear, comprehensive explanations of concepts. Always format your responses with proper HTML for readability.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI API');
    }
    return content;
  };

  const callAnthropic = async (prompt, apiKey) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;
    if (!content) {
      throw new Error('No content received from Anthropic API');
    }
    return content;
  };

  const callGemini = async (prompt, apiKey) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text;
    if (!content) {
      throw new Error('No content received from Gemini API');
    }
    return content;
  };

  // handleRestorePosition was intentionally removed (previously unused)

  const handleMouseDown = (e) => {
    if (isMaximized || isResizing) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - windowPosition.x,
      y: e.clientY - windowPosition.y
    });
  };

  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: windowSize.width,
      height: windowSize.height
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging && !isMaximized && isPopouted) {
      setWindowPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = windowPosition.x;
      let newY = windowPosition.y;

      if (resizeDirection.includes('e')) newWidth = Math.max(400, resizeStart.width + deltaX);
      if (resizeDirection.includes('w')) {
        newWidth = Math.max(400, resizeStart.width - deltaX);
        newX = windowPosition.x + (resizeStart.width - newWidth);
      }
      if (resizeDirection.includes('s')) newHeight = Math.max(300, resizeStart.height + deltaY);
      if (resizeDirection.includes('n')) {
        newHeight = Math.max(300, resizeStart.height - deltaY);
        newY = windowPosition.y + (resizeStart.height - newHeight);
      }

      setWindowSize({ width: newWidth, height: newHeight });
      if (resizeDirection.includes('w') || resizeDirection.includes('n')) {
        setWindowPosition({ x: newX, y: newY });
      }
    }
  }, [isDragging, dragOffset, isMaximized, isPopouted, isResizing, resizeDirection, resizeStart, windowPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection('');
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        handleRestore();
      }
    };

    if (isMaximized) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMaximized]);

  // Clear messages after delay

  const clearError = () => {
    setError('');
    clearAuthError();
    clearFlashcardsError();
    clearSettingsError();
  };

  // API Key dropdown event handlers



  // Sync local state with main state when they change
  useEffect(() => {
    setLocalApiKeys(apiKeys);
  }, [apiKeys]);

  useEffect(() => {
    setLocalSelectedProvider(selectedProvider);
  }, [selectedProvider]);

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
          searchPrevCard();
          break;
        case 'ArrowRight':
        case 'n':
          event.preventDefault();
          searchNextCard();
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
          setShowAccountModal(false);
          setIsEditingCard(false);
          setEditCardData(null);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, searchNextCard, searchPrevCard, setShowAnswer, handleReviewCard, getCurrentCard, handleEditCard]);

  // Computed values now declared earlier in the component

  // Get due cards for easy access
  const pastDueCards = getPastDueCards();
  const cardsDueToday = getCardsDueToday();
  const allDueCards = getAllDueCards();
  const filteredDueCards = getFilteredDueCards();
  const cardsReviewedToday = getCardsReviewedToday();

  // Get starred cards
  const starredCards = useMemo(() => {
    if (!flashcards || !Array.isArray(flashcards)) return [];
    return flashcards.filter(card => card.active !== false && card.starred === true);
  }, [flashcards]);

  // Get starred cards count based on current view mode
  const starredCardsCount = useMemo(() => {
    if (!flashcards || !Array.isArray(flashcards)) return 0;

    if (showDueTodayOnly) {
      // Show only starred cards that are also due
      const starredDueCards = filteredDueCards.filter(card => card.starred === true);
      return starredDueCards.length;
    } else {
      // Show all starred cards
      return starredCards.length;
    }
  }, [flashcards, showDueTodayOnly, filteredDueCards, starredCards]);

  // Load streak from localStorage on mount
  useEffect(() => {
    if (userId) {
      const savedStreak = localStorage.getItem(`streak_${userId}`) || '0';
      setStreakDays(parseInt(savedStreak, 10));
    }
  }, [userId]);

  // Initialize daily due cards count
  useEffect(() => {
    if (userId && allDueCards.length > 0 && categoryStats && subCategoryStats) {
      const today = new Date().toDateString();
      const storedDate = localStorage.getItem(`flashcard_due_date_${userId}`);
      const storedCount = localStorage.getItem(`flashcard_initial_due_${userId}`);
      const storedCompleted = localStorage.getItem(`flashcard_completed_today_${userId}`);
      // eslint-disable-next-line no-unused-vars
      const _storedCategoryStats = localStorage.getItem(`flashcard_initial_category_stats_${userId}`);
      const storedCategoryCompleted = localStorage.getItem(`flashcard_category_completed_${userId}`);
      const storedSubCategoryStats = localStorage.getItem(`flashcard_initial_subcategory_stats_${userId}`);
      const storedSubCategoryCompleted = localStorage.getItem(`flashcard_subcategory_completed_${userId}`);

      // If it's a new day or first time, reset counts
      if (storedDate !== today) {
        const newInitialCount = allDueCards.length;
        const newCategoryStats = categoryStats;
        const newSubCategoryStats = getAllSubCategoryStats();

        console.log('🔄 COUNTING-INIT: Setting initial stats for new day');
        console.log('🔄 Initial category stats:', newCategoryStats);
        console.log('🔄 Initial subcategory stats keys:', Object.keys(newSubCategoryStats));
        console.log('🔄 Total due cards:', newInitialCount);

        setInitialDueCardsCount(newInitialCount);
        setCardsCompletedToday(0);
        setInitialCategoryStats(newCategoryStats);
        setCategoryCompletedCounts({});
        setInitialSubCategoryStats(newSubCategoryStats);
        setSubCategoryCompletedCounts({});
        localStorage.setItem(`flashcard_due_date_${userId}`, today);
        localStorage.setItem(`flashcard_initial_due_${userId}`, newInitialCount.toString());
        localStorage.setItem(`flashcard_completed_today_${userId}`, '0');
        localStorage.setItem(`flashcard_initial_category_stats_${userId}`, JSON.stringify(newCategoryStats));
        localStorage.setItem(`flashcard_category_completed_${userId}`, JSON.stringify({}));
        localStorage.setItem(`flashcard_initial_subcategory_stats_${userId}`, JSON.stringify(newSubCategoryStats));
        localStorage.setItem(`flashcard_subcategory_completed_${userId}`, JSON.stringify({}));
      } else {
        // Restore counts from localStorage
        setInitialDueCardsCount(parseInt(storedCount) || allDueCards.length);
        setCardsCompletedToday(parseInt(storedCompleted) || 0);
        setCategoryCompletedCounts(storedCategoryCompleted ? JSON.parse(storedCategoryCompleted) : {});
        setInitialSubCategoryStats(storedSubCategoryStats ? JSON.parse(storedSubCategoryStats) : getAllSubCategoryStats());
        setSubCategoryCompletedCounts(storedSubCategoryCompleted ? JSON.parse(storedSubCategoryCompleted) : {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, allDueCards.length, categoryStats, getAllSubCategoryStats]);

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
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const categoryDueCards = flashcards.filter(card => {
      if (card.active === false) return false;
      if ((card.category || 'Uncategorized') !== selectedCategory) return false;
      let dueDate = card.dueDate || new Date(0);
      if (dueDate && typeof dueDate.toDate === 'function') {
        dueDate = dueDate.toDate();
      }
      return dueDate < endOfToday;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Re-enable auto-navigation now that filtering is fixed
    const categoryAutoNavigationDisabled = false;

    // Enhanced auto-advance logic: Only auto-navigate when:
    // 1. We're showing due cards only (showDueTodayOnly mode is active)
    // 2. We have a specific category selected (not "All")
    // 3. We have a specific subcategory selected (not "All") - current subcategory is finished
    // 4. There are no filtered cards left in the current subcategory
    // 5. There are still due cards somewhere in the system
    // 6. User hasn't manually selected a category/subcategory recently
    const timeSinceManualCategoryChange = Date.now() - lastManualCategoryChange;
    const timeSinceManualSubCategoryChange = Date.now() - lastManualSubCategoryChange;
    const timeSinceLastCardCompletion = Date.now() - lastCardCompletion;

    // Calculate due cards specifically in the current subcategory from ALL flashcards
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const currentSubcategoryDueCards = flashcards.filter(card => {
      // Must be active
      if (card.active === false) return false;

      // Must match current category
      if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;

      // Must match current subcategory  
      if (selectedSubCategory !== 'All') {
        const cardSubCategory = card.sub_category && card.sub_category.trim() ? card.sub_category : 'Uncategorized';
        if (cardSubCategory !== selectedSubCategory) return false;
      }

      // Must be due (if in due cards mode)
      if (showDueTodayOnly) {
        let dueDate = card.dueDate || new Date(0);
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate();
        }
        return dueDate < endOfToday;
      }

      return true;
    });

    // Trigger auto-advance when current subcategory has no more due cards
    // IMPORTANT: Both filteredFlashcards and currentSubcategoryDueCards must be empty
    // This prevents auto-advance when there are still cards available in the current view
    const shouldTriggerAutoAdvance = (
      showDueTodayOnly &&
      selectedCategory !== 'All' &&
      selectedSubCategory !== 'All' &&
      currentSubcategoryDueCards.length === 0 && // No due cards in current subcategory
      filteredFlashcards.length === 0 && // No cards currently displayed 
      allDueCards.length > 0 && // But due cards exist elsewhere
      !isManualCategorySelection &&
      timeSinceManualCategoryChange > 5000 && // 5s delay for category changes
      timeSinceManualSubCategoryChange > 3000 && // 3s delay for subcategory changes
      timeSinceLastCardCompletion > 500 && // 0.5s delay after card completion to avoid immediate trigger
      !categoryAutoNavigationDisabled
    );

    // Add debugging to understand the state
    if (selectedSubCategory !== 'All' && selectedCategory !== 'All') {
      console.log('🔍 SUBCATEGORY DEBUG:', {
        selectedCategory,
        selectedSubCategory,
        currentSubcategoryDueCards: currentSubcategoryDueCards.length,
        filteredFlashcardsLength: filteredFlashcards.length,
        allDueCardsLength: allDueCards.length,
        shouldTriggerAutoAdvance,
        showDueTodayOnly,
        timeSinceManualCategoryChange,
        timeSinceManualSubCategoryChange,
        timeSinceLastCardCompletion
      });
    }

    if (shouldTriggerAutoAdvance) {
      console.log('🔄 Subcategory auto-advance triggered:', {
        selectedCategory,
        selectedSubCategory,
        currentSubcategoryDueCards: currentSubcategoryDueCards.length,
        filteredFlashcardsLength: filteredFlashcards.length,
        allDueCardsLength: allDueCards.length
      });

      // Step 1: Check if there are other subcategories with due cards in the current category
      // This function returns the subcategory with the LEAST TOTAL CARDS (not just due cards)
      const nextSubCategory = getNextSubCategoryWithLeastCards(selectedCategory, selectedSubCategory);
      const hasSubcategoriesWithDueCards = nextSubCategory !== null;

      console.log('🔄 Subcategory auto-advance analysis:', {
        currentCategory: selectedCategory,
        currentSubCategory: selectedSubCategory,
        nextSubCategoryWithLeastCards: nextSubCategory,
        hasOtherSubcategoriesWithDueCards: hasSubcategoriesWithDueCards
      });

      // Step 2: If there are other subcategories with due cards, switch to the one with least total cards
      if (hasSubcategoriesWithDueCards) {
        console.log(`🔄 SUBCATEGORY AUTO-ADVANCE: Switching from "${selectedSubCategory}" to "${nextSubCategory}" within category "${selectedCategory}" (subcategory with least total cards)`);

        // Get total card counts for user feedback
        const subCategoryStats = getSubCategoryStats(selectedCategory);
        const nextSubCategoryTotalCards = subCategoryStats[nextSubCategory]?.total || 0;
        const nextSubCategoryDueCards = subCategoryStats[nextSubCategory]?.due || 0;

        setTimeout(() => {
          setSelectedSubCategory(nextSubCategory);
          setMessage(`Completed "${selectedSubCategory}"! Switched to "${nextSubCategory}" (${nextSubCategoryTotalCards} cards, ${nextSubCategoryDueCards} due)`);

          // Clear message after 4 seconds to give user time to read the details
          setTimeout(() => setMessage(''), 4000);
        }, 100); // Reduced delay since we want immediate feedback

        return; // Don't switch categories - stay within current category
      }

      // Step 3: Only switch categories if NO subcategories in current category have due cards left
      if (!hasSubcategoriesWithDueCards) {
        console.log(`🔄 CATEGORY AUTO-ADVANCE: No more subcategories with due cards in "${selectedCategory}", looking for next category`);

        const nextCategory = getNextCategoryWithDueCards(selectedCategory);

        if (nextCategory) {
          console.log(`🔄 CATEGORY AUTO-ADVANCE: Switching from category "${selectedCategory}" to "${nextCategory}" (all subcategories in ${selectedCategory} completed)`);
          setSelectedCategory(nextCategory);
          setSelectedSubCategory('All'); // Reset subcategory when switching categories
          // Ensure we stay in due cards mode
          setShowDueTodayOnly(true);
          setMessage(`Category "${selectedCategory}" completed! Switched to "${nextCategory}" category`);

          // Clear message after 4 seconds
          setTimeout(() => setMessage(''), 4000);
        } else {
          console.log('🎉 STUDY SESSION COMPLETE: All categories and subcategories completed!');
          setMessage('🎉 Congratulations! All due cards completed across all categories!');

          // Keep the completion message visible longer
          setTimeout(() => setMessage(''), 6000);
        }
      }
    }
  }, [showDueTodayOnly, selectedCategory, selectedSubCategory, filteredFlashcards, allDueCards.length, getNextCategoryWithDueCards, getNextSubCategoryWithLeastCards, getSubCategoryStats, setSelectedCategory, setSelectedSubCategory, setShowDueTodayOnly, lastManualCategoryChange, lastManualSubCategoryChange, lastCardCompletion, isManualCategorySelection, flashcards]);

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

  // Calculate card performance statistics
  const getPerformanceStats = () => {
    const stats = {
      new: 0,
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
      total: 0
    };

    flashcards.forEach(card => {
      if (card.active === false) return;

      stats.total++;

      // Check review count to determine if card is new
      if (!card.reviewCount || card.reviewCount === 0) {
        stats.new++;
      } else if (card.level) {
        // Count by last rating level
        switch (card.level.toLowerCase()) {
          case 'again':
            stats.again++;
            break;
          case 'hard':
            stats.hard++;
            break;
          case 'good':
            stats.good++;
            break;
          case 'easy':
            stats.easy++;
            break;
          default:
            break;
        }
      }
    });

    // Calculate mastery rate (good + easy) / reviewed cards
    const reviewedCards = stats.again + stats.hard + stats.good + stats.easy;
    const masteryRate = reviewedCards > 0
      ? Math.round(((stats.good + stats.easy) / reviewedCards) * 100)
      : 0;

    return {
      ...stats,
      reviewed: reviewedCards,
      masteryRate
    };
  };

  const performanceStats = getPerformanceStats();

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>

      {/* Header */}
      <Header
        isDarkMode={isDarkMode}
        isHeaderCollapsed={isHeaderCollapsed}
        setIsHeaderCollapsed={setIsHeaderCollapsed}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResultCount={searchFilteredFlashcards.length}
        totalCardCount={filteredFlashcards.length}
        showIntervalSettings={showIntervalSettings}
        toggleIntervalSettings={toggleIntervalSettings}
        cardsCompletedToday={cardsCompletedToday}
        cardsDueToday={cardsDueToday}
        onShowSettings={() => setShowSettingsModal(true)}
        onShowManageCards={() => setShowManageCardsModal(true)}
        onShowCalendar={() => setShowCalendarModal(true)}
        onShowApiKeys={() => setShowApiKeyModal(true)}
        onShowAccount={() => setShowAccountModal(true)}
        onShowStudyTimer={() => setShowStudyTimer(true)}
        onShowStudyStats={() => setShowStudyStats(true)}
      />

      {/* Messages */}
      <MessageBar
        message={message}
        error={error}
        flashcardsError={flashcardsError}
        settingsError={settingsError}
        onClearError={clearError}
      />

      {/* Undo Toast */}
      {showUndoToast && deletedCards.length > 0 && (
        <div
          className="undo-toast"
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: isDarkMode ? '#1e293b' : '#1e293b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 10000,
            animation: 'slideUp 0.3s ease-out'
          }}
          role="alert"
        >
          <span>
            {deletedCards.length === 1
              ? 'Card deleted'
              : `${deletedCards.length} cards deleted`}
          </span>
          <button
            onClick={handleUndoDelete}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
            aria-label="Undo deletion"
          >
            Undo
          </button>
          <button
            onClick={() => setShowUndoToast(false)}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px'
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
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

        {displayedTotalCards === 0 ? (
          <div className="flashcard-area">
            <div className="flashcard-with-notes-container">
              {/* Filters Section - Left panel (same as when cards are available) */}
              <div className="filters-section-left">
                <div className="filters-group">
                  {/* Due Cards Panel - Above categories */}
                  <div className="filter-section">
                    <div className="card-filter-toggle">
                      <div className="toggle-group primary-toggles">
                        <button
                          className={`toggle-btn ${!showDueTodayOnly ? 'active' : ''}`}
                          onClick={() => {
                            setShowDueTodayOnly(false);
                            // Keep current filters when switching to all cards
                          }}
                        >
                          All ({flashcards.length})
                        </button>
                        <button
                          className={`toggle-btn ${showDueTodayOnly ? 'active' : ''}`}
                          onClick={() => {
                            setShowDueTodayOnly(true);
                            // Category and subcategory filters are still applied to due cards
                          }}
                          title={`Filtered Due Cards: ${filteredDueCards.length} | Total Due (All Categories): ${allDueCards.length}`}
                        >
                          Today ({filteredDueCards.length})
                        </button>
                      </div>
                      <div className="toggle-group filter-toggles">
                        <button
                          className={`toggle-btn star-toggle ${showStarredOnly ? 'active' : ''}`}
                          onClick={() => {
                            setShowStarredOnly(!showStarredOnly);
                            // Star filter can be combined with either view mode
                          }}
                          title={`Starred Cards: ${starredCardsCount}`}
                        >
                          <span>⭐ ({starredCardsCount})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* No Cards Content */}
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
                        borderRadius: '4px'
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
                ) : searchQuery.trim() ? (
                  // Search returned no results
                  <>
                    <h2>🔍 No cards match "{searchQuery}"</h2>
                    <p>
                      Try different search terms or clear your search.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setSearchQuery('')}
                      style={{ marginBottom: '1rem' }}
                    >
                      ✕ Clear Search
                    </button>
                  </>
                ) : (
                  // Regular no cards message with auto-navigation
                  <>
                    {selectedCategory === 'All' ? (
                      // When "All" categories selected and no cards
                      <>
                        <h2>No flashcards available for the current filters.</h2>
                        <p>
                          Try adjusting your filters or reset them to see all cards.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setShowDueTodayOnly(false);
                            setShowStarredOnly(false);
                            setSelectedCategory('All');
                            setSelectedSubCategory('All');
                            setSelectedLevel('All');
                            setMessage('Filters reset - showing all cards');
                            setTimeout(() => setMessage(''), 3000);
                          }}
                          style={{ marginBottom: '1rem' }}
                        >
                          🔄 Reset All Filters
                        </button>
                      </>
                    ) : (
                      // When specific category selected but no cards - auto-navigate to optimal category/subcategory
                      <AutoNavigateToOptimalCards
                        currentCategory={selectedCategory}
                        currentSubCategory={selectedSubCategory}
                        showDueTodayOnly={showDueTodayOnly}
                        getNextCategoryWithLeastCards={getNextCategoryWithLeastCards}
                        getNextSubCategoryWithLeastCards={getNextSubCategoryWithLeastCards}
                        setSelectedCategory={setSelectedCategory}
                        setSelectedSubCategory={setSelectedSubCategory}
                        setMessage={setMessage}
                      />
                    )}
                    <div className="no-cards-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setShowDueTodayOnly(false);
                          setShowStarredOnly(false);
                          setSelectedCategory('All');
                          setSelectedSubCategory('All');
                          setSelectedLevel('All');
                          setMessage('Filters reset - showing all cards');
                          setTimeout(() => setMessage(''), 3000);
                        }}
                      >
                        🔄 Reset All Filters
                      </button>

                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowManageCardsModal(true)}
                      >
                        📋 Manage Cards
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flashcard-area">
            <div className="flashcard-with-notes-container">
              {/* Filters Section - Left of flashcard */}
              <div className="filters-section-left">
                <div className="filters-group">

                  {/* Due Cards Panel - Above categories */}
                  <div className="filter-section">
                    <div className="card-filter-toggle">
                      <div className="toggle-group primary-toggles">
                        <button
                          className={`toggle-btn ${!showDueTodayOnly ? 'active' : ''}`}
                          onClick={() => {
                            setShowDueTodayOnly(false);
                            // Keep current filters when switching to all cards
                          }}
                        >
                          All ({flashcards.length})
                        </button>
                        <button
                          className={`toggle-btn ${showDueTodayOnly ? 'active' : ''}`}
                          onClick={() => {
                            setShowDueTodayOnly(true);
                            // Category and subcategory filters are still applied to due cards
                          }}
                          title={`Filtered Due Cards: ${filteredDueCards.length} | Total Due (All Categories): ${allDueCards.length}`}
                        >
                          Today ({filteredDueCards.length})
                        </button>
                      </div>
                      <div className="toggle-group filter-toggles">
                        <button
                          className={`toggle-btn star-toggle ${showStarredOnly ? 'active' : ''}`}
                          onClick={() => {
                            setShowStarredOnly(!showStarredOnly);
                          }}
                          title={`Show only starred cards: ${showStarredOnly ? 'ON' : 'OFF'}`}
                        >
                          <span>⭐ ({starredCardsCount})</span>
                        </button>
                      </div>
                    </div>
                  </div>
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

                                // Calculate count based on showDueTodayOnly and showStarredOnly
                                let actualCardsInCategory;

                                if (showDueTodayOnly && showStarredOnly) {
                                  // When both filters are on, count actual starred due cards
                                  // Apply starred filter
                                  categoryCards = categoryCards.filter(card => card.starred === true);

                                  // Apply due date filter
                                  const now = new Date();
                                  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                                  categoryCards = categoryCards.filter(card => {
                                    let dueDate = card.dueDate || new Date(0);
                                    if (dueDate && typeof dueDate.toDate === 'function') {
                                      dueDate = dueDate.toDate();
                                    }
                                    return dueDate < endOfToday;
                                  });

                                  actualCardsInCategory = categoryCards.length;
                                } else if (showDueTodayOnly) {
                                  // Use real-time counting for "All" button
                                  const now = new Date();
                                  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                                  categoryCards = categoryCards.filter(card => {
                                    let dueDate = card.dueDate || new Date(0);
                                    if (dueDate && typeof dueDate.toDate === 'function') {
                                      dueDate = dueDate.toDate();
                                    }
                                    return dueDate < endOfToday;
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

                              // Calculate count based on showDueTodayOnly and showStarredOnly
                              let actualCardsInCategory;

                              if (showDueTodayOnly && showStarredOnly) {
                                // When both filters are on, count actual starred due cards
                                // Apply starred filter
                                categoryCards = categoryCards.filter(card => card.starred === true);

                                // Apply due date filter
                                const now = new Date();
                                const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                                categoryCards = categoryCards.filter(card => {
                                  let dueDate = card.dueDate || new Date(0);
                                  if (dueDate && typeof dueDate.toDate === 'function') {
                                    dueDate = dueDate.toDate();
                                  }
                                  return dueDate < endOfToday;
                                });

                                actualCardsInCategory = categoryCards.length;
                              } else if (showDueTodayOnly) {
                                // Use real-time counting for categories
                                const now = new Date();
                                const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                                categoryCards = categoryCards.filter(card => {
                                  let dueDate = card.dueDate || new Date(0);
                                  if (dueDate && typeof dueDate.toDate === 'function') {
                                    dueDate = dueDate.toDate();
                                  }
                                  return dueDate < endOfToday;
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
                                  onClick={() => {
                                    console.log(`🔍 Manual category selection: "${category}"`);
                                    console.log(`🔍 Previous selectedCategory: "${selectedCategory}"`);
                                    setSelectedCategory(category);
                                    setLastManualCategoryChange(Date.now());
                                    setIsManualCategorySelection(true);
                                    console.log(`🔍 setSelectedCategory called with: "${category}"`);

                                    // Clear the manual selection flag after 15 seconds
                                    setTimeout(() => {
                                      setIsManualCategorySelection(false);
                                      console.log(`🔍 Manual category selection protection expired for "${category}"`);
                                    }, 15000);
                                  }}
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
                            onClick={() => {
                              console.log('🔍 Manual subcategory selection: "All"');
                              setSelectedSubCategory('All');
                              setLastManualSubCategoryChange(Date.now());
                            }}
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

                              // If showing due cards only, filter by due date
                              if (showDueTodayOnly) {
                                const now = new Date();
                                const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                                subCategoryCards = subCategoryCards.filter(card => {
                                  let dueDate = card.dueDate || new Date(0);
                                  if (dueDate && typeof dueDate.toDate === 'function') {
                                    dueDate = dueDate.toDate();
                                  }
                                  return dueDate < endOfToday;
                                });
                              }

                              // If showing starred only, filter by starred
                              if (showStarredOnly) {
                                subCategoryCards = subCategoryCards.filter(card => card.starred === true);
                              }

                              const actualCardsInSubCategory = subCategoryCards.length;

                              // Skip subcategories with no actual cards
                              if (actualCardsInSubCategory === 0) {
                                return null;
                              }

                              return (
                                <button
                                  key={subCategory}
                                  className={`filter-btn ${selectedSubCategory === subCategory ? 'active' : ''}`}
                                  onClick={() => {
                                    console.log(`🔍 Manual subcategory selection: "${subCategory}"`);
                                    setSelectedSubCategory(subCategory);
                                    setLastManualSubCategoryChange(Date.now());
                                  }}
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
                            All ({Object.values(levelStats).reduce((sum, count) => sum + count, 0)})
                          </button>
                          {levels.map(level => {
                            const count = levelStats[level] || 0;
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


              </div>

              <div className={`flashcard-main-content ${isMaximized || isPopouted ? 'windowed' : ''}`}>
                {/* Overlay for popout mode */}
                {isPopouted && !isMaximized && (
                  <div
                    className="popout-overlay"
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      zIndex: 9998
                    }}
                    onClick={handleClosePopout}
                  />
                )}

                <div
                  className={`flashcard-window${isMaximized ? ' maximized' : ''}${isPopouted && !isMaximized ? ' popout' : ''}`}
                  style={isMaximized ? {
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  } : isPopouted ? {
                    position: 'fixed',
                    top: windowPosition.y,
                    left: windowPosition.x,
                    width: `${windowSize.width}px`,
                    height: `${windowSize.height}px`,
                    zIndex: 9999,
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    overflow: 'visible', // Changed from 'hidden' to allow resize handles
                    cursor: isDragging ? 'move' : 'default',
                    margin: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                  } : {
                    position: 'relative',
                    width: '100%',
                    height: 'auto',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    borderRadius: '0',
                    overflow: 'visible',
                    margin: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Drag Handle - Only for popout windows */}
                  {isPopouted && !isMaximized && (
                    <div
                      className="drag-handle"
                      onMouseDown={handleMouseDown}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '30px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'move',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: '400',
                        userSelect: 'none'
                      }}
                    >
                      ⋮⋮⋮
                    </div>
                  )}

                  {/* Window Control Buttons - Top Right - Hide when API dropdown is open */}
                  {!showApiKeyModal && currentCard && (
                    <div className="window-controls">
                      <button
                        className={`window-btn star-btn ${currentCard.starred ? 'starred' : ''}`}
                        onClick={() => toggleStarCard(currentCard.id)}
                        title={currentCard.starred ? "Remove from starred" : "Add to starred"}
                      >
                        {currentCard.starred ? '★' : '☆'}
                      </button>
                    </div>
                  )}

                  {/* Flashcard Content */}
                  <div
                    className="flashcard-content"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      minWidth: 0,
                      width: '100%',
                      height: '100%',
                      overflow: isMaximized || isPopouted ? 'auto' : 'visible',
                      overflowX: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: isDarkMode ? '#6b7280 #374151' : '#d1d5db #f3f4f6',
                      transition: 'height 0.1s ease',
                    }}
                  >
                    <FlashcardDisplay
                      card={displayedCard}
                      showAnswer={showAnswer}
                      onShowAnswer={() => setShowAnswer(true)}
                      onToggleAnswer={() => setShowAnswer(!showAnswer)}
                      onPreviousCard={searchPrevCard}
                      onNextCard={searchNextCard}
                      onReviewCard={handleReviewCard}
                      currentIndex={currentCardIndex}
                      totalCards={displayedTotalCards}
                      isDarkMode={isDarkMode}
                      onEditCard={handleEditCard}
                      onGenerateQuestions={() => setShowGenerateModal(true)}
                      isTransitioning={isCardTransitioning}
                      searchQuery={searchQuery}
                    />

                    {/* Review Buttons - Below the card, only when answer is shown and not transitioning */}
                    <ReviewButtons
                      onReviewCard={handleReviewCard}
                      isVisible={displayedCard && showAnswer && !isCardTransitioning}
                    />
                  </div>

                  {/* Resize Handles - Only show when popouted */}
                  {isPopouted && !isMaximized && (
                    <>
                      {/* Corner handles */}
                      <div className="resize-handle resize-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                      <div className="resize-handle resize-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                      <div className="resize-handle resize-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                      <div className="resize-handle resize-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />

                      {/* Edge handles */}
                      <div className="resize-handle resize-n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
                      <div className="resize-handle resize-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
                      <div className="resize-handle resize-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
                      <div className="resize-handle resize-w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer
        totalCards={flashcards.length}
        filteredCount={filteredFlashcards.length}
        searchCount={searchFilteredFlashcards.length}
        isSearching={!!searchQuery.trim()}
        categoriesCount={categories.length}
        pastDueCount={pastDueCards.length}
        dueTodayCount={cardsDueToday.length}
      />

      {/* Explain Modal */}
      {showExplainModal && (
        <div className="modal-overlay">
          <div className="modal-content explain-modal" style={{
            backgroundColor: isDarkMode ? '#1e293b' : 'white',
            color: isDarkMode ? '#f1f5f9' : '#1f2937',
            maxWidth: '600px',
            width: '90%'
          }}>
            <div className="modal-header">
              <h2>💡 Generate Explanation</h2>
              <button
                className="close-btn"
                onClick={handleCloseExplain}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="explain-content" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="explain-prompt"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#f1f5f9' : '#374151'
                  }}
                >
                  What would you like me to explain?
                </label>
                <textarea
                  id="explain-prompt"
                  value={explainPrompt}
                  onChange={(e) => setExplainPrompt(e.target.value)}
                  placeholder="Explain the current topic including concepts and why it is important to know..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '0.75rem',
                    border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                    borderRadius: '4px',
                    backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#f1f5f9' : '#374151',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  rows={4}
                />
              </div>

              {/* Checkbox to add explanation to question */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  color: isDarkMode ? '#f1f5f9' : '#374151'
                }}>
                  <input
                    type="checkbox"
                    checked={addExplanationToQuestion}
                    onChange={(e) => setAddExplanationToQuestion(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  Add to question
                </label>
              </div>

              {explainError && (
                <div style={{
                  color: '#dc2626',
                  backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.05)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  borderRadius: '3px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>
                  ❌ {explainError}
                </div>
              )}

            </div>

            <div className="modal-actions" style={{
              padding: '1rem 1.5rem',
              borderTop: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                className="btn btn-secondary"
                onClick={handleCloseExplain}
                disabled={isGeneratingExplanation}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                  color: isDarkMode ? '#f1f5f9' : '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateExplanation}
                disabled={isGeneratingExplanation || !explainPrompt.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isGeneratingExplanation || !explainPrompt.trim() ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  cursor: isGeneratingExplanation || !explainPrompt.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isGeneratingExplanation ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Generating...
                  </>
                ) : (
                  <>🧠 Generate Explanation</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Lazy-loaded modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {showSettingsModal && (
          <SettingsModal
            isVisible={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            isHighContrast={isHighContrast}
            onToggleHighContrast={toggleHighContrast}
            fsrsParams={fsrsParams}
            onUpdateFsrsParams={updateFsrsParams}
            showIntervalSettings={showIntervalSettings}
            onToggleIntervalSettings={toggleIntervalSettings}
            userDisplayName={userDisplayName}
            flashcards={flashcards}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showStudyTimer && (
          <StudyTimer
            isVisible={showStudyTimer}
            onClose={() => setShowStudyTimer(false)}
            isDarkMode={isDarkMode}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showStudyStats && (
          <StudyStats
            flashcards={flashcards}
            isVisible={showStudyStats}
            onClose={() => setShowStudyStats(false)}
            isDarkMode={isDarkMode}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showImportExportModal && (
          <ImportExportModal
            isVisible={showImportExportModal}
            onClose={() => setShowImportExportModal(false)}
            flashcards={flashcards}
            onImport={handleImport}
            isDarkMode={isDarkMode}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showCalendarModal && (
          <Calendar
            isVisible={showCalendarModal}
            onClose={() => setShowCalendarModal(false)}
            calendarDates={calendarDates}
            isDarkMode={isDarkMode}
          />
        )}
      </Suspense>

      {/* API Key Configuration Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            border: '3px solid #2563eb',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              background: '#2563eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'white' }}>
                API Configuration
              </h2>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'white',
                  opacity: 0.8
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#ffffff' }}>
              {/* Provider Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e40af' }}>
                  Select AI Provider
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['openai', 'anthropic', 'gemini'].map(provider => (
                    <button
                      key={provider}
                      onClick={() => handleProviderChange(provider)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: localSelectedProvider === provider ? '2px solid #2563eb' : '2px solid #e5e7eb',
                        borderRadius: '4px',
                        background: localSelectedProvider === provider ? '#dbeafe' : '#f8fafc',
                        cursor: 'pointer',
                        fontWeight: localSelectedProvider === provider ? '600' : '400',
                        color: localSelectedProvider === provider ? '#1e40af' : '#64748b'
                      }}
                    >
                      {provider === 'openai' ? '⚡ OpenAI' : provider === 'anthropic' ? '🧠 Claude' : '🤖 Gemini'}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* OpenAI */}
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#374151' }}>⚡ OpenAI API Key</label>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '2px',
                      background: localApiKeys.openai ? '#dcfce7' : '#fee2e2',
                      color: localApiKeys.openai ? '#16a34a' : '#dc2626'
                    }}>
                      {localApiKeys.openai ? '✓ Set' : '✗ Not Set'}
                    </span>
                  </div>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={localApiKeys.openai || ''}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '4px',
                      border: '2px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2563eb' }}>
                    Get API Key →
                  </a>
                </div>

                {/* Anthropic */}
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#374151' }}>🧠 Anthropic API Key</label>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '2px',
                      background: localApiKeys.anthropic ? '#dcfce7' : '#fee2e2',
                      color: localApiKeys.anthropic ? '#16a34a' : '#dc2626'
                    }}>
                      {localApiKeys.anthropic ? '✓ Set' : '✗ Not Set'}
                    </span>
                  </div>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={localApiKeys.anthropic || ''}
                    onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '4px',
                      border: '2px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2563eb' }}>
                    Get API Key →
                  </a>
                </div>

                {/* Gemini */}
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#374151' }}>🤖 Google Gemini API Key</label>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '2px',
                      background: localApiKeys.gemini ? '#dcfce7' : '#fee2e2',
                      color: localApiKeys.gemini ? '#16a34a' : '#dc2626'
                    }}>
                      {localApiKeys.gemini ? '✓ Set' : '✗ Not Set'}
                    </span>
                  </div>
                  <input
                    type="password"
                    placeholder="AI..."
                    value={localApiKeys.gemini || ''}
                    onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '4px',
                      border: '2px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2563eb' }}>
                    Get API Key →
                  </a>
                </div>
              </div>

              {/* Info Box */}
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: '#dbeafe',
                borderRadius: '4px',
                border: '1px solid #93c5fd'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
                  🔒 Your API keys are stored locally in your browser and never sent to our servers.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f1f5f9',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKeys}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Information Modal */}
      {showAccountModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: '#2563eb',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: 'white'
              }}>
                Account
              </h2>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0 8px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
              background: '#ffffff'
            }}>

              {/* Account Details */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '4px',
                padding: '16px',
                marginBottom: '16px',
                border: '2px solid #e2e8f0'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e40af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Account Details
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#64748b' }}>Email:</span>
                    <span style={{ color: '#1e293b', fontWeight: '500' }}>
                      {userDisplayName || 'Not available'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#64748b' }}>User ID:</span>
                    <span style={{
                      color: '#1e293b',
                      fontWeight: '500',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      {userId || 'Not available'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#64748b' }}>Account Type:</span>
                    <span style={{ color: '#1e293b', fontWeight: '500' }}>
                      {userId?.startsWith('anon-') ? 'Anonymous' : 'Registered'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '16px'
              }}>
                <div style={{
                  backgroundColor: '#eff6ff',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'center',
                  border: '2px solid #bfdbfe'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>
                    {flashcards.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>
                    Total
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'center',
                  border: '2px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>
                    {cardsCompletedToday}
                  </div>
                  <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>
                    Today
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#faf5ff',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'center',
                  border: '2px solid #e9d5ff'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>
                    {categories.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '600' }}>
                    Categories
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fefce8',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'center',
                  border: '2px solid #fde047'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#ca8a04' }}>
                    {streakDays}
                  </div>
                  <div style={{ fontSize: '11px', color: '#eab308', fontWeight: '600' }}>
                    Streak
                  </div>
                </div>
              </div>

              {/* Card Performance */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '4px',
                padding: '16px',
                marginBottom: '16px',
                border: '2px solid #e2e8f0'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e40af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Performance
                </h4>

                {/* Performance Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#dbeafe', borderRadius: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#2563eb' }}>{performanceStats.new}</div>
                    <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '600' }}>New</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#fee2e2', borderRadius: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>{performanceStats.again}</div>
                    <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>Again</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#fef3c7', borderRadius: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#d97706' }}>{performanceStats.hard}</div>
                    <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>Hard</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#dcfce7', borderRadius: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{performanceStats.good}</div>
                    <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '600' }}>Good</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#ede9fe', borderRadius: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#7c3aed' }}>{performanceStats.easy}</div>
                    <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: '600' }}>Easy</div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#e2e8f0',
                  borderRadius: '4px'
                }}>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Reviewed: </span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{performanceStats.reviewed}</span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Mastery: </span>
                    <span style={{
                      fontWeight: '600',
                      color: performanceStats.masteryRate >= 70 ? '#16a34a' : performanceStats.masteryRate >= 50 ? '#d97706' : '#dc2626'
                    }}>
                      {performanceStats.masteryRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* FSRS Settings Summary */}
              <div style={{
                backgroundColor: '#dbeafe',
                borderRadius: '4px',
                padding: '14px 16px',
                border: '2px solid #93c5fd'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px'
                }}>
                  <span style={{ color: '#1e40af' }}>Algorithm:</span>
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>FSRS</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginTop: '6px'
                }}>
                  <span style={{ color: '#1e40af' }}>Theme:</span>
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>
                    {isDarkMode ? 'Dark' : 'Light'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f1f5f9',
              display: 'flex',
              gap: '10px',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={handleSignOut}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{
                  backgroundColor: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {showGenerateModal && (
          <GenerateQuestionsModal
            isVisible={showGenerateModal}
            onClose={() => setShowGenerateModal(false)}
            currentCard={currentCard}
            onGenerateQuestions={handleGenerateQuestions}
            isDarkMode={isDarkMode}
            apiKeys={apiKeys}
            selectedProvider={selectedProvider}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showManageCardsModal && (
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
            onBulkDelete={handleBulkDelete}
            onBulkUpdateCategory={handleBulkUpdateCategory}
            isDarkMode={isDarkMode}
          />
        )}
      </Suspense>

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