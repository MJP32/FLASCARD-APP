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
import { SUCCESS_MESSAGES, DEFAULT_FSRS_PARAMS } from './utils/constants';
import { debugDueCards } from './debug/utils/debugDueCards';
import { addDebugAutoAdvanceToWindow } from './debug/utils/debugAutoAdvance';
import { addDebugCountingToWindow } from './debug/utils/debugCounting';
import { debugCategories } from './debug/utils/debugCategories';
import { debugAmazonLP } from './debug/utils/debugAmazonLP';

// Styles
import './App.css';
import './ai-explanation-dropdown.css';

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
 * ContentEditable component that preserves cursor position
 */
const ContentEditableNotes = ({ content, onChange, className, style }) => {
  const contentRef = React.useRef(null);
  const lastContent = React.useRef(content);
  const isUpdating = React.useRef(false);
  
  // Only set initial content
  React.useEffect(() => {
    if (contentRef.current && !contentRef.current.innerHTML) {
      contentRef.current.innerHTML = content;
    }
  }, []);
  
  // Handle external content changes (but not while user is typing)
  React.useEffect(() => {
    if (contentRef.current && content !== lastContent.current && !isUpdating.current) {
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      
      // Save cursor position
      let cursorPosition = 0;
      if (range && contentRef.current.contains(range.startContainer)) {
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(contentRef.current);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        cursorPosition = preCaretRange.toString().length;
      }
      
      // Update content
      contentRef.current.innerHTML = content;
      lastContent.current = content;
      
      // Restore cursor position
      try {
        const textNodes = [];
        const walker = document.createTreeWalker(
          contentRef.current,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }
        
        let charCount = 0;
        for (const textNode of textNodes) {
          const nodeLength = textNode.textContent.length;
          if (charCount + nodeLength >= cursorPosition) {
            const newRange = document.createRange();
            newRange.setStart(textNode, cursorPosition - charCount);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            break;
          }
          charCount += nodeLength;
        }
      } catch (e) {
        console.log('Could not restore cursor position');
      }
    }
  }, [content]);
  
  const handleInput = (e) => {
    isUpdating.current = true;
    const html = e.currentTarget.innerHTML;
    lastContent.current = html;
    onChange(html);
    setTimeout(() => { isUpdating.current = false; }, 0);
  };
  
  return (
    <div
      ref={contentRef}
      contentEditable
      className={className}
      style={style}
      onInput={handleInput}
      suppressContentEditableWarning={true}
    />
  );
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
    if (isNavigating || navigationComplete) return;

    const performAutoNavigation = async () => {
      setIsNavigating(true);
      
      // Step 1: Find the category with the least total cards that has due cards
      const bestCategory = getNextCategoryWithLeastCards(currentCategory);
      
      if (bestCategory) {
        console.log(`🚀 AUTO-NAVIGATE: Found optimal category: "${bestCategory}"`);
        
        // Step 2: Within that category, find the subcategory with least total cards that has due cards
        const bestSubCategory = getNextSubCategoryWithLeastCards(bestCategory, 'All');
        
        if (bestSubCategory) {
          console.log(`🚀 AUTO-NAVIGATE: Found optimal subcategory: "${bestSubCategory}" in category "${bestCategory}"`);
          
          // Navigate to the optimal category and subcategory
          setSelectedCategory(bestCategory);
          setSelectedSubCategory(bestSubCategory);
          setMessage(`Auto-navigated to "${bestCategory}" → "${bestSubCategory}"`);
          
          setTimeout(() => setMessage(''), 2500);
        } else {
          console.log(`🚀 AUTO-NAVIGATE: No subcategories with due cards in "${bestCategory}", showing all subcategories`);
          
          // Navigate to the category but show all subcategories
          setSelectedCategory(bestCategory);
          setSelectedSubCategory('All');
          setMessage(`Auto-navigated to "${bestCategory}" category`);
          
          setTimeout(() => setMessage(''), 2500);
        }
        
        setNavigationComplete(true);
      } else {
        console.log('🚀 AUTO-NAVIGATE: No categories with due cards found');
        setNavigationComplete(true);
      }
      
      setIsNavigating(false);
    };

    // Add a small delay to prevent immediate navigation
    const timer = setTimeout(performAutoNavigation, 500);
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
  
  // Notes window drag states
  const [isNotesDragging, setIsNotesDragging] = useState(false);
  const [isNotesResizing, setIsNotesResizing] = useState(false);
  const [notesResizeDirection, setNotesResizeDirection] = useState('');
  const [notesDragOffset, setNotesDragOffset] = useState({ x: 0, y: 0 });
  const [notesResizeStart, setNotesResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

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

  // Local API key state for the dropdown
  const [localApiKeys, setLocalApiKeys] = useState({
    openai: apiKeys.openai || '',
    anthropic: apiKeys.anthropic || '',
    gemini: apiKeys.gemini || ''
  });
  const [localSelectedProvider, setLocalSelectedProvider] = useState(selectedProvider);

  // Session-wide notes states
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem('flashcard_session_notes') || '';
    // Convert any existing HTML notes to plain text
    if (savedNotes && savedNotes.includes('<')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = savedNotes;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    return savedNotes;
  });
  const [notesCopied, setNotesCopied] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [isNotesEditMode, setIsNotesEditMode] = useState(false);

  // Streak tracking state
  const [streakDays, setStreakDays] = useState(0);
  
  // Track if we've checked for default cards creation
  const [hasCheckedForDefaults, setHasCheckedForDefaults] = useState(false);
  
  // Track if anonymous warning has been dismissed
  const [isAnonymousWarningDismissed, setIsAnonymousWarningDismissed] = useState(false);
  
  // Track initial due cards count for the day
  const [initialDueCardsCount, setInitialDueCardsCount] = useState(0);
  const [initialTotalCardsCount, setInitialTotalCardsCount] = useState(0); // Track initial total active cards count
  const [cardsCompletedToday, setCardsCompletedToday] = useState(0);
  // Removed unused initialCategoryStats
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
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(window.innerWidth <= 768);
  const [isNotesHidden, setIsNotesHidden] = useState(false);
  const [isNotesPopouted, setIsNotesPopouted] = useState(false);
  const [notesWindowPosition, setNotesWindowPosition] = useState({ x: 100, y: 100 });
  const [notesWindowSize, setNotesWindowSize] = useState({ width: 600, height: 700 });
  
  // View mode state for cycling through different display options
  const [viewModeIndex, setViewModeIndex] = useState(0);
  
  // Explain functionality state
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainPrompt, setExplainPrompt] = useState('');
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [addExplanationToQuestion, setAddExplanationToQuestion] = useState(true);
  const [addToStudyNotes, setAddToStudyNotes] = useState(true);
  const [studyNotesText, setStudyNotesText] = useState('');
  const [explanationCount, setExplanationCount] = useState(0);
  
  // Note editing modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteText, setCurrentNoteText] = useState('');
  
  // Track API key errors
  // Removed unused hasApiKeyError and setHasApiKeyError

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
    debugSubCategoryTracking
  } = useFlashcards(firebaseApp, userId);

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
    // Close the dropdown
    setShowApiKeyModal(false);
    setMessage('API keys saved successfully!');
  }, [localApiKeys, localSelectedProvider, handleApiKeysUpdate, setSelectedProvider, setMessage]);

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
  }, [flashcards, userId, filteredFlashcards, selectedCategory, selectedSubCategory, selectedLevel, showDueTodayOnly, categoryStats, debugCurrentFilterState, debugSubCategoryTracking, getSubCategories, getSubCategoryStats, manualTriggerAutoAdvance]);

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

  // Clear API keys from state for anonymous users (but keep them in localStorage)
  useEffect(() => {
    if (isAuthReady && isAnonymous) {
      // Clear API keys from state for anonymous users
      setApiKeys({
        openai: '',
        anthropic: '',
        gemini: ''
      });
      console.log('Cleared API keys from state for anonymous user');
    }
  }, [isAuthReady, isAnonymous]);

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
  }, [isAuthReady, userId, addFlashcard, flashcards.length, hasCheckedForDefaults, createDefaultFlashcards]);

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
  }, [getCurrentCard, fsrsParams, addToNavigationHistory, updateFlashcard, setMessage, cardsCompletedToday, setCardsCompletedToday, userId, categoryCompletedCounts, setCategoryCompletedCounts, subCategoryCompletedCounts, setSubCategoryCompletedCounts, setLastCardCompletion, setShowAnswer, nextCard, clearMessage, setError]);

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

  // Handle edit card
  const handleEditCard = useCallback((card) => {
    setEditCardData(card);
    setIsEditingCard(true);
    setShowCreateCardForm(true);
  }, []);

  // View mode configuration and handler
  const viewModes = [
    { 
      name: 'Normal', 
      icon: '👁️', 
      description: 'Normal view with notes panel',
      apply: () => {
        setIsNotesHidden(false);
        setIsMaximized(false);
        setIsPopouted(false);
        setIsNotesPopouted(false);
      }
    },
    { 
      name: 'Focus', 
      icon: '🔍', 
      description: 'Focus mode without notes panel',
      apply: () => {
        setIsNotesHidden(true);
        setIsMaximized(false);
        setIsPopouted(false);
        setIsNotesPopouted(false);
      }
    },
    { 
      name: 'Fullscreen', 
      icon: '⬜', 
      description: 'Maximized fullscreen view',
      apply: () => {
        setIsNotesHidden(false);
        setIsMaximized(true);
        setIsPopouted(false);
        setIsNotesPopouted(false);
      }
    },
    { 
      name: 'Popout', 
      icon: '⧉', 
      description: 'Popout window view',
      apply: () => {
        setIsNotesHidden(false);
        setIsMaximized(false);
        setIsPopouted(true);
        setIsNotesPopouted(false);
      }
    }
  ];

  const handleViewModeToggle = () => {
    const nextModeIndex = (viewModeIndex + 1) % viewModes.length;
    setViewModeIndex(nextModeIndex);
    viewModes[nextModeIndex].apply();
  };

  // Sync viewModeIndex with current state
  useEffect(() => {
    let currentModeIndex = 0;
    if (isMaximized) {
      currentModeIndex = 2; // Fullscreen
    } else if (isPopouted) {
      currentModeIndex = 3; // Popout
    } else if (isNotesHidden) {
      currentModeIndex = 1; // Focus
    } else {
      currentModeIndex = 0; // Normal
    }
    
    if (currentModeIndex !== viewModeIndex) {
      setViewModeIndex(currentModeIndex);
    }
  }, [isMaximized, isPopouted, isNotesHidden, viewModeIndex]);

  // Window management functions
  const handleMaximize = () => {
    setIsMaximized(true);
    setIsPopouted(false); // Don't use popout positioning for true fullscreen
    setWindowPosition({ x: 0, y: 0 });
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    // Removed direct DOM manipulation. Use React state and conditional rendering for fullscreen mode.
  };

  const handleRestore = () => {
    // Reset all window states to default embedded view
    setIsMaximized(false);
    setIsPopouted(false);
    setWindowPosition({ x: 0, y: 0 });
    setWindowSize({ width: 1400, height: 900 });
  };

  const handlePopout = () => {
    setIsPopouted(true);
    setIsMaximized(false);
    // Center the window and make it larger - use 90% of screen size or minimum size
    const newWidth = Math.min(1800, Math.max(1400, window.innerWidth * 0.9));
    const newHeight = Math.min(1200, Math.max(900, window.innerHeight * 0.9));
    setWindowPosition({ 
      x: (window.innerWidth - newWidth) / 2, 
      y: Math.max(20, (window.innerHeight - newHeight) / 2)
    });
    setWindowSize({ width: newWidth, height: newHeight });
  };

  const handleClosePopout = () => {
    setIsPopouted(false);
    setIsMaximized(false);
    setWindowPosition({ x: 0, y: 0 });
    setWindowSize({ width: 1400, height: 900 });
  };

  // Notes popout handlers
  const handleNotesPopout = () => {
    setIsNotesPopouted(true);
    setIsNotesCollapsed(false); // Ensure notes are expanded when popped out
    // Center the notes window
    const newWidth = 600;
    const newHeight = 700;
    setNotesWindowPosition({ 
      x: (window.innerWidth - newWidth) / 2, 
      y: Math.max(20, (window.innerHeight - newHeight) / 2)
    });
    setNotesWindowSize({ width: newWidth, height: newHeight });
    // No direct DOM manipulation
  };

  const handleCloseNotesPopout = () => {
    setIsNotesPopouted(false);
    setNotesWindowPosition({ x: 100, y: 100 });
    setNotesWindowSize({ width: 600, height: 700 });
    // No direct DOM manipulation
  };

  // Explain functionality handlers
  const handleOpenExplain = () => {
    // Only set default prompt if the textbox is empty
    if (!explainPrompt.trim()) {
      if (currentCard) {
        const defaultPrompt = `Explain "${currentCard.question?.replace(/<[^>]*>/g, '') || 'this question'}" including concepts and why it is important to know`;
        setExplainPrompt(defaultPrompt);
      } else {
        setExplainPrompt('Explain the current topic including concepts and why it is important to know');
      }
    }
    setShowExplainModal(true);
    setExplainError('');
  };

  const handleCloseExplain = () => {
    setShowExplainModal(false);
    setExplainError('');
    // Don't clear the prompt so users can reuse or modify their input
  };

  // Helper function to add notes with color grouping and proper formatting
  const addToNotes = (content, type = 'explanation') => {
    const timestamp = new Date().toLocaleString();
    
    // Define different color palettes for explanations to distinguish them
    const explanationColors = [
      { 
        color: '#3b82f6', 
        bg: isDarkMode ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)', 
        icon: '💡' 
      }, // Blue
      { 
        color: '#10b981', 
        bg: isDarkMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)', 
        icon: '🌟' 
      }, // Green
      { 
        color: '#f59e0b', 
        bg: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)', 
        icon: '✨' 
      }, // Amber
      { 
        color: '#8b5cf6', 
        bg: isDarkMode ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)', 
        icon: '🔍' 
      }, // Purple
      { 
        color: '#ef4444', 
        bg: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)', 
        icon: '🎯' 
      }, // Red
      { 
        color: '#06b6d4', 
        bg: isDarkMode ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.08)', 
        icon: '💎' 
      }, // Cyan
      { 
        color: '#84cc16', 
        bg: isDarkMode ? 'rgba(132, 204, 22, 0.12)' : 'rgba(132, 204, 22, 0.08)', 
        icon: '🚀' 
      }, // Lime
      { 
        color: '#ec4899', 
        bg: isDarkMode ? 'rgba(236, 72, 153, 0.12)' : 'rgba(236, 72, 153, 0.08)', 
        icon: '⭐' 
      }  // Pink
    ];
    
    // Define color styles for different types of content
    const colorStyles = {
      explanation: explanationColors[explanationCount % explanationColors.length],
      question: { 
        color: '#10b981', 
        bg: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)', 
        icon: '❓' 
      },
      answer: { 
        color: '#f59e0b', 
        bg: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)', 
        icon: '✅' 
      },
      note: { 
        color: '#8b5cf6', 
        bg: isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)', 
        icon: '📝' 
      },
      review: { 
        color: '#ef4444', 
        bg: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)', 
        icon: '🔍' 
      }
    };
    
    const style = colorStyles[type] || colorStyles.note;
    
    // Increment explanation count for next explanation
    if (type === 'explanation') {
      setExplanationCount(prev => prev + 1);
    }
    
    // Create formatted content with color and timestamp
    // Check if content already contains HTML
    const isHTML = /<[^>]+>/.test(content);
    const processedContent = isHTML ? content : content.replace(/\n/g, '<br/>');
    
    let formattedContent;
    
    if (type === 'explanation') {
      // For explanations, preserve HTML formatting and wrap in styled container
      const questionContext = currentCard?.question?.replace(/<[^>]*>/g, '') || 'Current Topic';
      formattedContent = `<div style="
        background: ${style.bg || 'rgba(59, 130, 246, 0.08)'};
        border: 1px solid ${style.color}40;
        border-left: 4px solid ${style.color}; 
        border-radius: 8px;
        padding: 20px; 
        margin-bottom: 24px; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      ">
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 1.1em; display: inline-block; margin-bottom: 4px; color: ${style.color};">${style.icon} ${questionContext}</strong><br/>
          <small style="color: #666; font-size: 0.85em; opacity: 0.7;">${timestamp}</small>
        </div>
        <div style="margin-top: 16px; line-height: 1.6;">
          ${content}
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; opacity: 0.3;"/>

      `;
    } else {
      // For other types, use plain text formatting
      const plainContent = isHTML ? htmlToPlainText(content) : content;
      const header = `${style.icon} ${type.toUpperCase()}`;
      const separator = '━'.repeat(50);
      formattedContent = `${separator}
${header}
${timestamp}
${separator}
${plainContent}

`;
    }
    
    const currentNotes = notes.trim();
    // Prepend new content instead of append
    const newNotes = currentNotes ? `${formattedContent}${currentNotes}` : formattedContent;
    
    setNotes(newNotes);
    
    // Save to localStorage
    setTimeout(() => {
      localStorage.setItem('flashcard_session_notes', newNotes);
    }, 100);
    
    return newNotes;
  };

  const handleGenerateExplanation = async () => {
    if (!explainPrompt.trim()) {
      setExplainError('Please enter a prompt for the explanation');
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setExplainError(`No ${selectedProvider.toUpperCase()} API key configured. Please click the 🔑 API Key button to add your API key, or try a different AI provider if you have one configured.`);
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
      
      console.log('Raw AI response:', response);
      
      // Remove any markdown code block formatting if present
      cleanResponse = cleanResponse.replace(/```html\s*/g, '').replace(/```\s*$/g, '');
      cleanResponse = cleanResponse.replace(/```\s*/g, '').replace(/```\s*$/g, '');
      
      console.log('After markdown cleanup:', cleanResponse);
      
      // Extract content from full HTML document structure if present
      if (cleanResponse.includes('<!DOCTYPE') || cleanResponse.includes('<html>') || cleanResponse.includes('<body>')) {
        console.log('Detected HTML document structure, cleaning...');
        
        // Try to extract body content first
        const bodyMatch = cleanResponse.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          cleanResponse = bodyMatch[1].trim();
          console.log('Extracted from body tags:', cleanResponse);
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
          console.log('After aggressive cleanup:', cleanResponse);
        }
      } else {
        console.log('No HTML document structure detected');
      }
      
      // Ensure we have HTML tags, if not wrap in paragraph
      if (!cleanResponse.includes('<') && cleanResponse.length > 0) {
        cleanResponse = `<p>${cleanResponse}</p>`;
      }
      
      // Convert HTML to formatted HTML for better display in notes
      const formatExplanationHTML = (html) => {
        if (!html) return '';
        
        // Clean and enhance the HTML formatting
        let formatted = html
          // First, clean up any messy formatting
          .replace(/\s+/g, ' ') // Normalize spaces
          .replace(/>\s+</g, '><') // Remove spaces between tags
          .trim();
        
        // Enhance formatting for better section separation and readability
        formatted = formatted
          // Convert headers to colored styled sections with better spacing
          .replace(/<h1>/gi, '<div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 12px 16px; border-radius: 8px; margin: 1.5em 0 1em 0; font-weight: bold; font-size: 1.3em; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);"><h1 style="margin: 0; color: white;">')
          .replace(/<\/h1>/gi, '</h1></div>')
          
          .replace(/<h2>/gi, '<div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 10px 14px; border-radius: 6px; margin: 1.2em 0 0.8em 0; font-weight: bold; font-size: 1.2em; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);"><h2 style="margin: 0; color: white;">')
          .replace(/<\/h2>/gi, '</h2></div>')
          
          .replace(/<h3>/gi, '<div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 8px 12px; border-radius: 5px; margin: 1em 0 0.6em 0; font-weight: bold; font-size: 1.1em; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);"><h3 style="margin: 0; color: white;">')
          .replace(/<\/h3>/gi, '</h3></div>')
          
          .replace(/<h([4-6])>/gi, '<div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 6px 10px; border-radius: 4px; margin: 0.8em 0 0.5em 0; font-weight: bold; font-size: 1em; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);"><h$1 style="margin: 0; color: white;">')
          .replace(/<\/h([4-6])>/gi, '</h$1></div>')
          
          // Add proper spacing to paragraphs with subtle background
          .replace(/<p>/gi, '<p style="margin: 1.2em 0; line-height: 1.7; padding: 12px; background: rgba(248, 250, 252, 0.7); border-left: 3px solid #e2e8f0; border-radius: 4px;">')
          
          // Style lists with colored containers
          .replace(/<ul>/gi, '<div style="background: rgba(239, 246, 255, 0.8); padding: 16px; border-radius: 6px; margin: 1em 0; border-left: 4px solid #3b82f6;"><ul style="margin: 0; padding-left: 1.5em;">')
          .replace(/<\/ul>/gi, '</ul></div>')
          
          .replace(/<ol>/gi, '<div style="background: rgba(236, 253, 245, 0.8); padding: 16px; border-radius: 6px; margin: 1em 0; border-left: 4px solid #10b981;"><ol style="margin: 0; padding-left: 1.5em;">')
          .replace(/<\/ol>/gi, '</ol></div>')
          
          .replace(/<li>/gi, '<li style="margin: 0.6em 0; line-height: 1.6; padding: 4px 0;">')
          
          // Highlight important words with colored backgrounds
          .replace(/\b(important|key|note|remember|critical|essential|must|should)\b/gi, '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-weight: bold;">$1</span>')
          .replace(/\b(warning|caution|alert|danger)\b/gi, '<span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 3px; font-weight: bold;">$1</span>')
          
          // Style strong/bold text with colors
          .replace(/<strong>/gi, '<strong style="color: #dc2626; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 1px 3px; border-radius: 2px;">')
          .replace(/<b>/gi, '<strong style="color: #dc2626; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 1px 3px; border-radius: 2px;">')
          .replace(/<\/b>/gi, '</strong>')
          
          // Style emphasis with colors
          .replace(/<em>/gi, '<em style="color: #0891b2; font-style: italic; background: rgba(6, 182, 212, 0.1); padding: 1px 3px; border-radius: 2px;">')
          .replace(/<i>/gi, '<em style="color: #0891b2; font-style: italic; background: rgba(6, 182, 212, 0.1); padding: 1px 3px; border-radius: 2px;">')
          .replace(/<\/i>/gi, '</em>')
          
          // Enhanced code blocks with better styling
          .replace(/<code>/gi, '<code style="background: linear-gradient(135deg, #374151, #1f2937); color: #f9fafb; padding: 4px 8px; border-radius: 4px; font-family: \'Monaco\', \'Consolas\', monospace; font-size: 0.9em; border: 1px solid #4b5563;">')
          
          // Add section breaks between major elements
          .replace(/<\/(div)>\s*<(div)/gi, '</$1><div style="height: 16px;"></div><$2')
          .replace(/<\/(p)>\s*<(div)/gi, '</$1><div style="height: 12px;"></div><$2')
          .replace(/<\/(div)>\s*<(p)/gi, '</$1><div style="height: 12px;"></div><$2');
        
        // If there's no HTML structure, convert plain text to HTML
        if (!formatted.includes('<')) {
          const lines = formatted.split('\n');
          formatted = lines
            .map(line => {
              line = line.trim();
              if (!line) return '<br/>';
              
              // Check if line is a list item
              if (line.match(/^[\-\*•]\s+/)) {
                return `<li style="margin: 0.4em 0; line-height: 1.5;">${line.replace(/^[\-\*•]\s+/, '')}</li>`;
              }
              // Check if line is numbered list
              else if (line.match(/^\d+[\.\)]\s+/)) {
                return `<li style="margin: 0.4em 0; line-height: 1.5;">${line.replace(/^\d+[\.\)]\s+/, '')}</li>`;
              }
              // Regular paragraph
              else {
                return `<p style="margin: 0.8em 0; line-height: 1.6;">${line}</p>`;
              }
            })
            .join('\n');
          
          // Wrap consecutive list items in ul
          formatted = formatted.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
            return `<ul style="margin: 0.8em 0; padding-left: 1.5em;">${match}</ul>`;
          });
        }
        
        return formatted;
      };
      
      // Format the HTML for better display in notes
      const formattedExplanation = formatExplanationHTML(cleanResponse);
      
      // Convert HTML to plain text for tooltip
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanResponse;
      const explanationText = tempDiv.textContent || tempDiv.innerText || cleanResponse;
      
      // Debug logging
      console.log('Clean Response (HTML):', cleanResponse);
      console.log('Formatted Explanation:', formattedExplanation);
      console.log('Plain Text Explanation:', explanationText);
      
      // Use the new helper function to add formatted content
      const newNotes = addToNotes(formattedExplanation, 'explanation');
      
      // Debug logging to see what we're getting
      console.log('AI Response:', response);
      console.log('Clean Response:', cleanResponse);
      console.log('Final Notes Content:', newNotes);
      
      // Add explanation to question as dropdown if checkbox is checked
      if (addExplanationToQuestion && currentCard) {
        // Create a brief version of the explanation for the dropdown
        
        // Simple lightbulb icon with hover tooltip at the beginning of question
        // Limit explanation text for tooltip and escape properly
        const tooltipText = explanationText.length > 500 
          ? explanationText.substring(0, 500) + '...' 
          : explanationText;
        
        // Make sure tooltip text is clean plain text
        const cleanTooltipText = tooltipText
          .replace(/\n/g, ' ') // Convert newlines to spaces
          .replace(/\r/g, '') // Remove carriage returns
          .replace(/\s+/g, ' ') // Multiple spaces to single space
          .trim();
        
        const escapedTooltip = cleanTooltipText
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        
        const explanationIcon = `<span class="ai-explanation-lightbulb" title="${escapedTooltip}">💡</span> `;
        
        // Debug logging for tooltip
        console.log('Tooltip Text (Raw):', tooltipText);
        console.log('Tooltip Text (Clean):', cleanTooltipText);
        console.log('Tooltip Text (Escaped):', escapedTooltip);

        // Check if there's already a lightbulb in the question and replace it
        let baseQuestion = currentCard.question || '';
        
        // Remove any existing lightbulb spans
        // This regex matches the lightbulb span with any title attribute content
        baseQuestion = baseQuestion.replace(/<span class="ai-explanation-lightbulb"[^>]*>💡<\/span>\s*/g, '');
        
        // Prepend the new lightbulb to the cleaned question
        const updatedQuestion = `${explanationIcon}${baseQuestion}`;

        console.log('Current question:', currentCard.question);
        console.log('Base question (lightbulb removed):', baseQuestion);
        console.log('Explanation icon HTML:', explanationIcon);
        console.log('Updated question:', updatedQuestion);

        // Update the card using the hook function - this will handle state updates automatically
        if (currentCard.id) {
          try {
            await updateFlashcard(currentCard.id, { question: updatedQuestion });
            console.log('Question updated with explanation dropdown (replaced existing if present)');
          } catch (error) {
            console.error('Error updating card question:', error);
          }
        }
      }
      
      handleCloseExplain();
    } catch (error) {
      console.error('Explanation generation error:', error);
      
      // Provide user-friendly error messages based on error type
      let userMessage = 'Unable to generate explanation. ';
      
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Invalid API')) {
        userMessage += 'Please check your API key configuration - it may be invalid or expired.';
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        userMessage += 'API rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage += 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('quota') || error.message.includes('billing')) {
        userMessage += 'API quota exceeded or billing issue. Please check your API account.';
      } else {
        userMessage += 'The AI service is currently unavailable. Please try again later or try a different AI provider.';
      }
      
      setExplainError(userMessage);
      
      // Also add a note to the notes section about the failure
      addToNotes(`Could not generate explanation: ${userMessage}`, 'note');
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
          { role: 'system', content: 'You are an educational expert who provides clear, comprehensive explanations. Structure your response with HTML headers (h1, h2, h3) to organize different sections like "Overview", "Key Concepts", "Examples", "Important Points", etc. Use paragraphs, lists, and emphasis for clarity.' },
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
          { role: 'user', content: `You are an educational expert who provides clear, comprehensive explanations. Structure your response with HTML headers (h1, h2, h3) to organize different sections like "Overview", "Key Concepts", "Examples", "Important Points", etc. Use paragraphs, lists, and emphasis for clarity.\n\n${prompt}` }
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `You are an educational expert who provides clear, comprehensive explanations. Structure your response with HTML headers (h1, h2, h3) to organize different sections like "Overview", "Key Concepts", "Examples", "Important Points", etc. Use paragraphs, lists, and emphasis for clarity.\n\n${prompt}` }]
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

  const handleRestorePosition = () => {
    // This function should restore to default embedded view, same as handleRestore
    handleRestore();
  };

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

  // Notes window drag handlers
  const handleNotesMouseDown = (e) => {
    if (isNotesResizing) return;
    setIsNotesDragging(true);
    setNotesDragOffset({
      x: e.clientX - notesWindowPosition.x,
      y: e.clientY - notesWindowPosition.y
    });
  };

  const handleNotesResizeStart = (e, direction) => {
    e.stopPropagation();
    setIsNotesResizing(true);
    setNotesResizeDirection(direction);
    setNotesResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: notesWindowSize.width,
      height: notesWindowSize.height
    });
  };

  const handleNotesMouseMove = useCallback((e) => {
    if (isNotesDragging && isNotesPopouted) {
      const newX = e.clientX - notesDragOffset.x;
      const newY = e.clientY - notesDragOffset.y;
      
      // Keep window within viewport
      const maxX = window.innerWidth - notesWindowSize.width;
      const maxY = window.innerHeight - notesWindowSize.height;
      
      setNotesWindowPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
    
    if (isNotesResizing) {
      const deltaX = e.clientX - notesResizeStart.x;
      const deltaY = e.clientY - notesResizeStart.y;
      let newWidth = notesWindowSize.width;
      let newHeight = notesWindowSize.height;
      let newX = notesWindowPosition.x;
      let newY = notesWindowPosition.y;

      if (notesResizeDirection.includes('e')) newWidth = notesResizeStart.width + deltaX;
      if (notesResizeDirection.includes('w')) {
        newWidth = notesResizeStart.width - deltaX;
        newX = notesWindowPosition.x + deltaX;
      }
      if (notesResizeDirection.includes('s')) newHeight = notesResizeStart.height + deltaY;
      if (notesResizeDirection.includes('n')) {
        newHeight = notesResizeStart.height - deltaY;
        newY = notesWindowPosition.y + deltaY;
      }

      // Minimum size constraints
      newWidth = Math.max(400, Math.min(newWidth, window.innerWidth - 50));
      newHeight = Math.max(300, Math.min(newHeight, window.innerHeight - 50));

      setNotesWindowSize({ width: newWidth, height: newHeight });
      if (notesResizeDirection.includes('w') || notesResizeDirection.includes('n')) {
        setNotesWindowPosition({ x: newX, y: newY });
      }
    }
  }, [isNotesDragging, notesDragOffset, isNotesPopouted, isNotesResizing, notesResizeDirection, notesResizeStart, notesWindowPosition, notesWindowSize]);

  const handleNotesMouseUp = useCallback(() => {
    setIsNotesDragging(false);
    setIsNotesResizing(false);
    setNotesResizeDirection('');
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

  useEffect(() => {
    if (isNotesDragging || isNotesResizing) {
      document.addEventListener('mousemove', handleNotesMouseMove);
      document.addEventListener('mouseup', handleNotesMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleNotesMouseMove);
        document.removeEventListener('mouseup', handleNotesMouseUp);
      };
    }
  }, [isNotesDragging, isNotesResizing, handleNotesMouseMove, handleNotesMouseUp]);

  // ESC key handling is now integrated into main keyboard shortcuts handler

  // Focus the flashcard window when maximized to ensure keyboard events work
  useEffect(() => {
    if (isMaximized) {
      const flashcardWindow = document.querySelector('.flashcard-window.maximized');
      console.log('🎯 Maximized mode focus debug:', {
        isMaximized: isMaximized,
        flashcardWindow: flashcardWindow,
        canFocus: flashcardWindow && typeof flashcardWindow.focus === 'function',
        tabIndex: flashcardWindow?.tabIndex
      });
      
      if (flashcardWindow) {
        // Small delay to ensure the element is fully rendered
        setTimeout(() => {
          try {
            flashcardWindow.focus();
            console.log('🎯 Focus attempt completed. Active element:', document.activeElement?.tagName, document.activeElement?.className);
          } catch (error) {
            console.error('🎯 Focus failed:', error);
          }
        }, 100);
        
        // Also add a direct keydown listener to the maximized window as backup
        const directKeyHandler = (event) => {
          if (['1', '2', '3', '4'].includes(event.key) && showAnswer && getCurrentCard()) {
            console.log('🎯 Direct key handler triggered:', event.key);
            event.preventDefault();
            event.stopPropagation();
            
            const ratingMap = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
            handleReviewCard(ratingMap[event.key]);
          }
        };
        
        flashcardWindow.addEventListener('keydown', directKeyHandler);
        
        // Return cleanup function
        return () => {
          flashcardWindow.removeEventListener('keydown', directKeyHandler);
        };
      }
    }
  }, [isMaximized, showAnswer, getCurrentCard, handleReviewCard]);

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
      // Debug keyboard events in maximized mode
      if (isMaximized && ['1', '2', '3', '4'].includes(event.key)) {
        console.log('🎯 Max mode key debug:', {
          key: event.key,
          target: event.target.tagName,
          showAnswer: showAnswer,
          hasCard: !!getCurrentCard(),
          activeElement: document.activeElement?.tagName,
          focusedElement: document.activeElement?.className
        });
      }
      
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
          // Handle maximized mode exit first
          if (isMaximized) {
            handleRestore();
          } else {
            // Handle modal closures
            setShowCreateCardForm(false);
            setShowSettingsModal(false);
            setShowImportExportModal(false);
            setShowCalendarModal(false);
            setShowManageCardsModal(false);
            setShowGenerateModal(false);
            setShowAccountModal(false);
            setShowNoteModal(false);
            setIsEditingCard(false);
            setEditCardData(null);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, nextCard, prevCard, setShowAnswer, handleReviewCard, getCurrentCard, handleEditCard, isMaximized, handleRestore]);

  // Computed values now declared earlier in the component

  // Save notes to localStorage when changed
  useEffect(() => {
    localStorage.setItem('flashcard_session_notes', notes);
  }, [notes]);

  // Clear explain prompt when card changes so default text updates
  useEffect(() => {
    setExplainPrompt('');
  }, [currentCardIndex]);

  // Handle notes text change
  const handleNotesChange = (value) => {
    setNotes(value);
  };

  // Clear notes
  const handleClearNotes = () => {
    setNotes('');
    setExplanationCount(0); // Reset explanation color counter
  };

  // Note modal handlers
  const handleOpenNoteModal = () => {
    setCurrentNoteText('');
    setShowNoteModal(true);
  };

  // Helper function to convert HTML to plain text
  const htmlToPlainText = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Notes edit mode handler
  const handleEditNotes = () => {
    setIsNotesEditMode(true);
    
    // Focus the editor after state update
    setTimeout(() => {
      const editor = document.querySelector('.notes-html-editor');
      if (editor) {
        editor.focus();
        // Place cursor at the end of the content
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 100);
  };

  // Notes preview mode handler
  const handlePreviewNotes = () => {
    setIsNotesEditMode(false);
    // Notes content is already preserved in the notes state
    // No need to restore from originalNotesBeforeEdit unless the user wants to cancel changes
  };

  const handleCloseNoteModal = () => {
    setShowNoteModal(false);
    setCurrentNoteText('');
  };

  const handleSaveNote = () => {
    if (currentNoteText.trim()) {
      addToNotes(currentNoteText.trim(), 'note');
      handleCloseNoteModal();
    }
  };

  // Auto-focus the note editor when modal opens
  useEffect(() => {
    if (showNoteModal) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        const noteEditor = document.querySelector('.note-editor textarea');
        if (noteEditor) {
          noteEditor.focus();
        }
      }, 100);
    }
  }, [showNoteModal]);
  
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

  // Debug helper for progress bar
  useEffect(() => {
    window.debugProgressBar = {
      checkValues: () => {
        console.log('Progress Bar Debug Info:', {
          cardsCompletedToday,
          initialDueCardsCount,
          initialTotalCardsCount,
          cardsDueTodayLength: cardsDueToday.length,
          flashcardsLength: flashcards.length,
          showDueTodayOnly,
          storedInitialCount: localStorage.getItem(`flashcard_initial_due_${userId}`),
          storedInitialTotal: localStorage.getItem(`flashcard_initial_total_${userId}`),
          storedDate: localStorage.getItem(`flashcard_due_date_${userId}`),
          todayDate: new Date().toDateString()
        });
      },
      resetToday: () => {
        if (userId) {
          localStorage.removeItem(`flashcard_due_date_${userId}`);
          localStorage.removeItem(`flashcard_initial_due_${userId}`);
          localStorage.removeItem(`flashcard_completed_today_${userId}`);
          console.log('Daily counts reset. Refresh the page to recalculate.');
        }
      }
    };
  }, [cardsCompletedToday, initialDueCardsCount, initialTotalCardsCount, cardsDueToday.length, flashcards.length, showDueTodayOnly, userId]);

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
      const storedTotalCount = localStorage.getItem(`flashcard_initial_total_${userId}`);
      const storedCompleted = localStorage.getItem(`flashcard_completed_today_${userId}`);
      // Removed unused storedCategoryStats
      const storedCategoryCompleted = localStorage.getItem(`flashcard_category_completed_${userId}`);
      const storedSubCategoryStats = localStorage.getItem(`flashcard_initial_subcategory_stats_${userId}`);
      const storedSubCategoryCompleted = localStorage.getItem(`flashcard_subcategory_completed_${userId}`);
      
      // If it's a new day or first time, reset counts
      if (storedDate !== today) {
        const newInitialCount = cardsDueToday.length;
        const newInitialTotalCount = flashcards.filter(card => card.active !== false).length; // Count all active cards
        const newCategoryStats = categoryStats;
        const newSubCategoryStats = getAllSubCategoryStats();

        console.log('🔄 COUNTING-INIT: Setting initial stats for new day');
        console.log('🔄 Initial category stats:', newCategoryStats);
        console.log('🔄 Initial subcategory stats keys:', Object.keys(newSubCategoryStats));
        console.log('🔄 Total due cards today:', newInitialCount);
        console.log('🔄 Total active cards:', newInitialTotalCount);

        setInitialDueCardsCount(newInitialCount);
        setInitialTotalCardsCount(newInitialTotalCount);
        setCardsCompletedToday(0);
        // setInitialCategoryStats(newCategoryStats); // Removed: variable not defined and not used
        setCategoryCompletedCounts({});
        setInitialSubCategoryStats(newSubCategoryStats);
        setSubCategoryCompletedCounts({});
        localStorage.setItem(`flashcard_due_date_${userId}`, today);
        localStorage.setItem(`flashcard_initial_due_${userId}`, newInitialCount.toString());
        localStorage.setItem(`flashcard_initial_total_${userId}`, newInitialTotalCount.toString());
        localStorage.setItem(`flashcard_completed_today_${userId}`, '0');
        localStorage.setItem(`flashcard_initial_category_stats_${userId}`, JSON.stringify(newCategoryStats));
        localStorage.setItem(`flashcard_category_completed_${userId}`, JSON.stringify({}));
        localStorage.setItem(`flashcard_initial_subcategory_stats_${userId}`, JSON.stringify(newSubCategoryStats));
        localStorage.setItem(`flashcard_subcategory_completed_${userId}`, JSON.stringify({}));
      } else {
        // Restore counts from localStorage
        setInitialDueCardsCount(parseInt(storedCount) || cardsDueToday.length);
        setInitialTotalCardsCount(parseInt(storedTotalCount) || flashcards.filter(card => card.active !== false).length);
        setCardsCompletedToday(parseInt(storedCompleted) || 0);
        setCategoryCompletedCounts(storedCategoryCompleted ? JSON.parse(storedCategoryCompleted) : {});
        setInitialSubCategoryStats(storedSubCategoryStats ? JSON.parse(storedSubCategoryStats) : getAllSubCategoryStats());
        setSubCategoryCompletedCounts(storedSubCategoryCompleted ? JSON.parse(storedSubCategoryCompleted) : {});
      }
    }
  }, [userId, cardsDueToday.length, categoryStats, getAllSubCategoryStats, subCategoryStats]);

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
  }, [pastDueCards.length, cardsDueToday.length, allDueCards.length, filteredDueCards.length, filteredFlashcards.length, showDueTodayOnly, selectedCategory, selectedSubCategory, flashcards]);
  // Added cardsDueToday and pastDueCards to dependency array

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
        switch(card.level.toLowerCase()) {
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
      <header className={`app-header ${isHeaderCollapsed ? 'collapsed' : ''}`}>
        <div className={`header-layout ${isHeaderCollapsed ? 'hidden' : ''}`}>
          {/* Left Section - User Welcome */}
          <div className="header-left">
            {/* Welcome panel removed */}
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

                {/* API Key Dropdown Button */}
                <div className="api-key-dropdown-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowApiKeyModal(true)}
                    title={(!apiKeys.openai && !apiKeys.anthropic && !apiKeys.gemini) 
                      ? "⚠️ No valid API key configured - Click to add one" 
                      : "Show API Keys"}
                    style={{ 
                      minWidth: '110px',
                      border: (!apiKeys.openai && !apiKeys.anthropic && !apiKeys.gemini) ? '3px solid #ef4444' : undefined,
                      boxShadow: (!apiKeys.openai && !apiKeys.anthropic && !apiKeys.gemini) ? '0 0 0 2px rgba(239, 68, 68, 0.3)' : undefined
                    }}
                  >
                    🔑 API Key
                  </button>
                  {/* API Key Modal will be moved to end of component */}
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={handleViewModeToggle}
                  title={`View: ${viewModes[viewModeIndex].description} (Click to cycle)`}
                >
                  {viewModes[viewModeIndex].icon} {viewModes[viewModeIndex].name} ⇄
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSettingsModal(true)}
                  title="Settings (S)"
                >
                  ⚙️ Settings
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAccountModal(true)}
                  title="Account Information"
                >
                  👤 Account
                </button>

                {/* Right-centered section for progress bar and toggle arrow */}
                <div className="header-right-center">
                  {/* Daily Progress Bar - Compact header version */}
                  {(flashcards.length > 0 || cardsCompletedToday > 0) && (
                    <div className="header-progress-bar">
                      <div className="progress-text">
                        {(() => {
                          const denominator = showDueTodayOnly ? initialDueCardsCount : initialTotalCardsCount;
                          console.log('🔢 PROGRESS BAR VALUES:');
                          console.log('  cardsCompletedToday:', cardsCompletedToday);
                          console.log('  showDueTodayOnly:', showDueTodayOnly);
                          console.log('  initialDueCardsCount:', initialDueCardsCount);
                          console.log('  initialTotalCardsCount:', initialTotalCardsCount);
                          console.log('  cardsDueToday.length:', cardsDueToday.length);
                          console.log('  flashcards.length:', flashcards.length);
                          console.log('  filteredFlashcards.length:', filteredFlashcards.length);
                          console.log('  DENOMINATOR USED:', denominator);
                          console.log('  DISPLAY:', `${cardsCompletedToday}/${denominator}`);
                          return null;
                        })()}
                        {cardsCompletedToday}/{showDueTodayOnly ? initialDueCardsCount : initialTotalCardsCount}
                      </div>
                      <div className="progress-bar-container-header">
                        <div 
                          className="progress-bar-fill" 
                          style={{
                            width: `${Math.min(100, showDueTodayOnly ?
                              (initialDueCardsCount > 0 ? (cardsCompletedToday / initialDueCardsCount) * 100 : 0) :
                              (initialTotalCardsCount > 0 ? (cardsCompletedToday / initialTotalCardsCount) * 100 : 0))}%`
                          }}
                        />
                      </div>
                      <div className="progress-percentage-header">
                        {Math.round(Math.min(100, showDueTodayOnly ?
                          (initialDueCardsCount > 0 ? (cardsCompletedToday / initialDueCardsCount) * 100 : 0) :
                          (initialTotalCardsCount > 0 ? (cardsCompletedToday / initialTotalCardsCount) * 100 : 0)))}%
                      </div>
                    </div>
                  )}

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
          <div className="flashcard-area">
            <div className={`flashcard-with-notes-container ${isNotesHidden ? 'notes-hidden' : ''}`}>
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
              // Regular no cards message with auto-navigation
              <>
                {/* Auto-navigate to optimal category/subcategory when no cards available */}
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
                <div className="no-cards-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowManageCardsModal(true)}
                  >
                    📋 Manage Cards
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
                    📂 View All Categories
                  </button>
                </div>
              </>
            )}
            </div>
            </div>
          </div>
        ) : (
          <div className="flashcard-area">
            <div className={`flashcard-with-notes-container ${isNotesHidden ? 'notes-hidden' : ''}`}>
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
                            if (count === 0) return null;
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

                {/* Progress Bar moved to header */}
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
                  tabIndex={isMaximized ? 0 : -1}
                  onClick={isMaximized ? (e) => {
                    // Ensure the flashcard window gets focus when clicked in maximized mode
                    if (e.currentTarget === e.target || e.target.closest('.flashcard-window.maximized')) {
                      e.currentTarget.focus();
                      console.log('🎯 Flashcard window clicked and focused in max mode');
                    }
                  } : undefined}
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
                    borderRadius: '8px',
                    overflow: 'visible', // Changed from 'hidden' to allow resize handles
                    cursor: isDragging ? 'move' : 'default',
                    margin: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                  } : {
                    position: 'relative',
                    width: '100%',
                    height: 'auto',
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
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
                    {/* Exit Button for Maximized Mode */}
                    {isMaximized && (
                      <>
                        {/* EXIT BUTTON - DO NOT REMOVE */}
                        <button
                          onClick={handleRestore}
                          className="notes-close-btn"
                          style={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            zIndex: 100003,
                          }}
                          title="Exit Fullscreen (ESC)"
                        >
                          ✕
                        </button>
                        
                        {/* NAVIGATION ARROWS - REMOVED IN MAX VIEW */}
                        {/* Navigation arrows removed as requested */}
                      </>
                    )}

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
                      windowControlButtons={
                        !showApiKeyModal && (isMaximized ? (
                          /* No buttons in maximized mode - exit button is fixed positioned */
                          null
                        ) : isPopouted ? (
                          /* Popout mode - Close and Maximize buttons */
                          <>
                            <button
                              onClick={handleRestorePosition}
                              className="window-control-btn"
                              title="Close popout and restore to normal view"
                              style={{
                                backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(147, 197, 253, 0.9)',
                                color: isDarkMode ? '#d1d5db' : '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '4px 8px',
                                marginLeft: '8px',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              ⊡
                            </button>
                            <button
                              onClick={handleMaximize}
                              className="flashcard-maximize-btn"
                              title="Maximize to fullscreen"
                            >
                              ⬛
                            </button>
                          </>
                        ) : (
                          /* Normal mode - Popout and Maximize buttons */
                          <>
                            <button
                              onClick={handlePopout}
                              className="flashcard-popout-btn"
                              title="Popout window"
                            >
                              ⬜
                            </button>
                            <button
                              onClick={handleMaximize}
                              className="flashcard-maximize-btn"
                              title="Maximize to fullscreen"
                            >
                              ⬛
                            </button>
                          </>
                        ))
                      }
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
              
              {/* Right Side Content - Notes and Review Panel */}
              <div className="right-side-content">
                {/* Session Notes - Always visible (unless popped out or hidden) */}
                {!isNotesPopouted && !isNotesHidden && (
                <div className="notes-section-permanent">
                  <div className="notes-header">
                    <h4>📝 Notes</h4>
                    <div className="notes-header-controls">
                      <button
                        className="explain-btn notes-explain-btn"
                        onClick={handleOpenExplain}
                        aria-label="Generate note"
                        title="Generate AI note about the current question"
                      >
                        💡 Explain
                      </button>
                      <button
                        className="explain-btn notes-edit-btn"
                        onClick={() => handleEditCard(currentCard)}
                        aria-label="Edit card"
                        title="Edit this card"
                      >
                        ✏️ Edit Card
                      </button>
                      <button
                        className="explain-btn notes-generate-btn"
                        onClick={() => setShowGenerateModal(true)}
                        aria-label="Generate questions"
                        title="Generate similar questions"
                      >
                        🤖 Similar Questions
                      </button>
                      <button
                        className="popout-btn notes-popout-btn"
                        onClick={handleNotesPopout}
                        aria-label="Pop out notes"
                        title="Pop out notes to separate window"
                      >
                        ⬜
                      </button>
                      <button
                        className="close-btn notes-close-btn"
                        onClick={() => setIsNotesHidden(true)}
                        aria-label="Close notes completely"
                        title="Close notes panel completely"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <div className="notes-content">
                    <div className="notes-content-wrapper">
                      <div className="notes-editor-container">
                        {isNotesEditMode ? (
                          // Use RichTextEditor with HTML content support
                          <RichTextEditor
                            value={notes}
                            onChange={setNotes}
                            placeholder="Type your notes here... Use the toolbar above for formatting options."
                            className="notes-textarea-permanent"
                            minHeight="700px"
                            enableRichText={true}
                          />
                        ) : (
                          <div
                            className="notes-html-content notes-textarea-permanent"
                            style={{ width: '100%', minHeight: '700px', background: 'white', borderRadius: '0.375rem', padding: '12px', fontSize: '14px', lineHeight: '1.5', fontFamily: 'inherit', border: '1px solid #d1d5db', overflowY: 'auto' }}
                            dangerouslySetInnerHTML={{ __html: notes }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="notes-footer">
                      {/* Quick add buttons for different note types */}
                      <div style={{ display: 'flex', gap: '0.25rem', marginRight: '1rem' }}>
                        <button 
                          className="notes-footer-btn"
                          onClick={handleOpenNoteModal}
                          title="Add a note with text editing options"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          📝 Note
                        </button>
                        <button 
                          className="notes-footer-btn"
                          onClick={handleEditNotes}
                          title="Edit notes with formatting toolbar"
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: isNotesEditMode ? '#3b82f6' : '',
                            color: isNotesEditMode ? 'white' : ''
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="notes-footer-btn"
                          onClick={handlePreviewNotes}
                          title="Preview notes (read-only view)"
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: !isNotesEditMode ? '#10b981' : '',
                            color: !isNotesEditMode ? 'white' : ''
                          }}
                        >
                          👁️ Preview
                        </button>
                      </div>
                      
                      <button 
                        className="notes-footer-btn copy-btn"
                        onClick={() => {
                          // Copy notes content to clipboard (convert HTML to plain text if needed)
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = notes;
                          const textContent = tempDiv.textContent || tempDiv.innerText || notes;
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
                      <button 
                        className="notes-footer-btn clear-btn"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to clear all notes? This action cannot be undone.')) {
                            handleClearNotes();
                          }
                        }}
                        disabled={notes.length === 0}
                        title="Clear all notes"
                      >
                        🗑️ Clear
                      </button>
                  </div>
                </div>
                )}
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

      {/* Notes Popout Window */}
      {isNotesPopouted && (
        <>
          {/* Overlay for notes popout */}
          <div 
            className="notes-popout-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 9990
            }}
            onClick={handleCloseNotesPopout}
          />
          
          {/* Notes popout window */}
          <div 
            className="notes-popout-window"
            style={{
              position: 'fixed',
              left: `${notesWindowPosition.x}px`,
              top: `${notesWindowPosition.y}px`,
              width: `${notesWindowSize.width}px`,
              height: `${notesWindowSize.height}px`,
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
              zIndex: 9991,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Drag handle */}
            <div 
              className="notes-drag-handle"
              onMouseDown={handleNotesMouseDown}
              style={{
                height: '40px',
                background: isDarkMode ? '#334155' : '#f8fafc',
                borderBottom: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                cursor: 'move',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                userSelect: 'none'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                📝 Notes
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="explain-btn notes-explain-btn-popout"
                  onClick={handleOpenExplain}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease'
                  }}
                  aria-label="Generate note"
                  title="Generate AI note about the current question"
                >
                  💡 Explain
                </button>
                <button
                  className="close-btn"
                  onClick={handleCloseNotesPopout}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    padding: '0 0.5rem'
                  }}
                  aria-label="Close notes window"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Notes content */}
            <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
              {isNotesEditMode ? (
                // Use RichTextEditor with HTML content support
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  placeholder="Type your notes here... Use the toolbar above for formatting options."
                  className="notes-textarea-popout"
                  minHeight="100%"
                  enableRichText={true}
                />
              ) : (
                <div
                  className="notes-html-content notes-textarea-popout"
                  style={{ width: '100%', minHeight: '100%', background: isDarkMode ? '#1e293b' : 'white', borderRadius: '0.375rem', padding: '12px', fontSize: '14px', lineHeight: '1.5', fontFamily: 'inherit', border: `1px solid ${isDarkMode ? '#475569' : '#d1d5db'}`, overflowY: 'auto', color: isDarkMode ? '#f1f5f9' : '#374151' }}
                  dangerouslySetInnerHTML={{ __html: notes }}
                />
              )}
            </div>
            
            {/* Notes actions */}
            <div style={{
              padding: '1rem',
              borderTop: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Quick add buttons */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  onClick={() => {
                    const noteContent = prompt('Enter your note:');
                    if (noteContent?.trim()) {
                      addToNotes(noteContent.trim(), 'note');
                    }
                  }}
                  title="Add a quick note"
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                    background: isDarkMode ? '#475569' : '#f3f4f6',
                    color: isDarkMode ? '#f1f5f9' : '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  📝
                </button>
                <button 
                  onClick={() => {
                    if (currentCard) {
                      const questionText = currentCard.question?.replace(/<[^>]*>/g, '') || 'Current question';
                      addToNotes(questionText, 'question');
                    }
                  }}
                  title="Add current question to notes"
                  disabled={!currentCard}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                    background: isDarkMode ? '#475569' : '#f3f4f6',
                    color: isDarkMode ? '#f1f5f9' : '#374151',
                    cursor: currentCard ? 'pointer' : 'not-allowed',
                    fontSize: '0.8rem',
                    opacity: currentCard ? 1 : 0.5
                  }}
                >
                  ❓
                </button>
                <button 
                  onClick={() => {
                    if (currentCard) {
                      const answerText = currentCard.answer?.replace(/<[^>]*>/g, '') || 'Current answer';
                      addToNotes(answerText, 'answer');
                    }
                  }}
                  title="Add current answer to notes"
                  disabled={!currentCard}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                    background: isDarkMode ? '#475569' : '#f3f4f6',
                    color: isDarkMode ? '#f1f5f9' : '#374151',
                    cursor: currentCard ? 'pointer' : 'not-allowed',
                    fontSize: '0.8rem',
                    opacity: currentCard ? 1 : 0.5
                  }}
                >
                  ✅
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="notes-action-btn"
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
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  background: isDarkMode ? '#475569' : '#f3f4f6',
                  color: isDarkMode ? '#f1f5f9' : '#374151',
                  cursor: 'pointer'
                }}
              >
                {notesCopied ? '✅ Copied!' : '📋 Copy'}
              </button>
              <button 
                className="notes-action-btn"
                onClick={() => {
                  // Save notes to local storage or trigger save
                  if (userId) {
                    localStorage.setItem(`flashcard_notes_${userId}`, notes);
                    setNotesSaved(true);
                    setTimeout(() => setNotesSaved(false), 2000);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  background: isDarkMode ? '#475569' : '#f3f4f6',
                  color: isDarkMode ? '#f1f5f9' : '#374151',
                  cursor: 'pointer'
                }}
              >
                {notesSaved ? '✅ Saved!' : '💾 Save'}
              </button>
              <button 
                className="notes-action-btn"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all notes? This action cannot be undone.')) {
                    handleClearNotes();
                  }
                }}
                disabled={notes.length === 0}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  background: notes.length === 0 ? (isDarkMode ? '#374151' : '#f9fafb') : (isDarkMode ? '#dc2626' : '#fee2e2'),
                  color: notes.length === 0 ? (isDarkMode ? '#6b7280' : '#9ca3af') : (isDarkMode ? '#fecaca' : '#dc2626'),
                  cursor: notes.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: notes.length === 0 ? 0.5 : 1
                }}
                title="Clear all notes"
              >
                🗑️ Clear
              </button>
            </div>
            
            {/* Resize handles */}
            <div className="resize-handle resize-n" onMouseDown={(e) => handleNotesResizeStart(e, 'n')} />
            <div className="resize-handle resize-ne" onMouseDown={(e) => handleNotesResizeStart(e, 'ne')} />
            <div className="resize-handle resize-e" onMouseDown={(e) => handleNotesResizeStart(e, 'e')} />
            <div className="resize-handle resize-se" onMouseDown={(e) => handleNotesResizeStart(e, 'se')} />
            <div className="resize-handle resize-s" onMouseDown={(e) => handleNotesResizeStart(e, 's')} />
            <div className="resize-handle resize-sw" onMouseDown={(e) => handleNotesResizeStart(e, 'sw')} />
            <div className="resize-handle resize-w" onMouseDown={(e) => handleNotesResizeStart(e, 'w')} />
            <div className="resize-handle resize-nw" onMouseDown={(e) => handleNotesResizeStart(e, 'nw')} />
          </div>
          </div>
        </>
      )}

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
                  placeholder={currentCard ? 
                    `Explain "${currentCard.question?.replace(/<[^>]*>/g, '') || 'this question'}" including concepts and why it is important to know...` : 
                    "Explain the current topic including concepts and why it is important to know..."}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '0.75rem',
                    border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                    borderRadius: '0.5rem',
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

              {/* Checkbox to add explanation to study notes */}
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
                    checked={addToStudyNotes}
                    onChange={(e) => setAddToStudyNotes(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  Add to study Notes
                </label>
              </div>

              {/* Study notes textarea - shown when checkbox is checked */}
              {addToStudyNotes && (
                <div style={{ marginBottom: '1rem' }}>
                  <label 
                    htmlFor="study-notes-text" 
                    style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontWeight: '600',
                      color: isDarkMode ? '#f1f5f9' : '#374151'
                    }}
                  >
                    Study Notes
                  </label>
                  <textarea
                    id="study-notes-text"
                    value={studyNotesText}
                    onChange={(e) => setStudyNotesText(e.target.value)}
                    placeholder="Enter additional study notes that will be added to the explanation..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '0.75rem',
                      border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                      borderRadius: '0.5rem',
                      backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                      color: isDarkMode ? '#f1f5f9' : '#374151',
                      fontSize: '0.95rem',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    rows={3}
                  />
                </div>
              )}

              {explainError && (
                <div style={{
                  color: '#dc2626',
                  backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.05)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>
                  ❌ {explainError}
                  {(explainError.toLowerCase().includes('api key') || 
                    explainError.toLowerCase().includes('configure')) && (
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        onClick={() => {
                          setShowExplainModal(false);
                          setShowApiKeyModal(true);
                        }}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🔑 Configure API Keys
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="modal-actions" style={{ 
              padding: '1rem 1.5rem', 
              borderTop: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'space-between'
            }}>
              <button 
                className="btn btn-outline"
                onClick={() => setExplainPrompt('')}
                disabled={isGeneratingExplanation || !explainPrompt.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#f1f5f9' : '#374151',
                  cursor: isGeneratingExplanation || !explainPrompt.trim() ? 'not-allowed' : 'pointer'
                }}
                title="Clear the input text"
              >
                Clear
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={handleCloseExplain}
                  disabled={isGeneratingExplanation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
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
                  borderRadius: '0.5rem',
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

      <SettingsModal
        isVisible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        fsrsParams={fsrsParams}
        onUpdateFsrsParams={updateFsrsParams}
        showIntervalSettings={showIntervalSettings}
        onToggleIntervalSettings={toggleIntervalSettings}
        userDisplayName={userDisplayName}
        flashcards={flashcards}
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

      {/* API Key Configuration Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            border: '3px solid #2563eb'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px 24px 0 24px',
              borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              paddingBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}>
                  🔑 API Configuration
                </h2>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px'
            }}>
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                Configure your AI providers for question generation, notes, and other AI features. Your API keys enable direct communication with AI services.
              </p>
              
              {/* Currently Selected Provider Display */}
              <div style={{
                backgroundColor: isDarkMode ? '#1e40af' : '#3b82f6',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                border: '3px solid #60a5fa',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '24px', 
                      marginRight: '12px',
                      animation: 'pulse 2s infinite'
                    }}>
                      {localSelectedProvider === 'openai' ? '⚡' : 
                       localSelectedProvider === 'anthropic' ? '🧠' : '🤖'}
                    </span>
                    <div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: 'white',
                        marginBottom: '4px'
                      }}>
                        Currently Selected: {
                          localSelectedProvider === 'openai' ? 'OpenAI (GPT)' :
                          localSelectedProvider === 'anthropic' ? 'Anthropic (Claude)' :
                          'Google Gemini'
                        }
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#dbeafe',
                        opacity: 0.9
                      }}>
                        {localSelectedProvider === 'openai' ? 'Most versatile AI for creative content and explanations' :
                         localSelectedProvider === 'anthropic' ? 'Superior reasoning and analysis for educational content' :
                         'Fast and efficient with great balance of performance and cost'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: localApiKeys[localSelectedProvider] ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{localApiKeys[localSelectedProvider] ? '✓' : '⚠️'}</span>
                    {localApiKeys[localSelectedProvider] ? 'API Key Configured' : 'API Key Missing'}
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div style={{
                backgroundColor: isDarkMode ? '#1e3a8a' : '#dbeafe',
                border: `1px solid ${isDarkMode ? '#3b82f6' : '#2563eb'}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <span style={{ 
                  fontSize: '18px', 
                  marginRight: '10px', 
                  color: isDarkMode ? '#60a5fa' : '#1d4ed8' 
                }}>🔒</span>
                <div>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    color: isDarkMode ? '#93c5fd' : '#1e40af',
                    fontWeight: '700'
                  }}>
                    <strong>Zero Server Storage Policy</strong>
                  </p>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: isDarkMode ? '#bfdbfe' : '#1e40af',
                    lineHeight: '1.4'
                  }}>
                    <strong>We NEVER store your API keys on our servers.</strong> Your keys are saved only in your browser's local storage and are encrypted for security.
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: isDarkMode ? '#bfdbfe' : '#1e40af',
                    lineHeight: '1.4'
                  }}>
                    All AI requests are made directly from your browser to the AI provider's servers. This app acts as a secure interface only.
                  </p>
                </div>
              </div>

              {/* How API Keys Are Used */}
              <div style={{
                backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
                border: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ 
                    fontSize: '18px', 
                    marginRight: '10px', 
                    color: isDarkMode ? '#94a3b8' : '#475569' 
                  }}>🔄</span>
                  <div>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '14px',
                      color: isDarkMode ? '#e2e8f0' : '#334155',
                      fontWeight: '700'
                    }}>
                      <strong>How This App Uses Your API Keys</strong>
                    </p>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#cbd5e1' : '#475569', lineHeight: '1.4' }}>
                      <p style={{ margin: '0 0 6px 0' }}>
                        <strong>📝 Question Generation:</strong> When you click "Generate Questions", your API key is used to create new flashcard questions based on your content.
                      </p>
                      <p style={{ margin: '0 0 6px 0' }}>
                        <strong>💡 Note:</strong> The "Explain" feature uses your key to provide detailed notes about flashcard content.
                      </p>
                      <p style={{ margin: '0 0 6px 0' }}>
                        <strong>📚 Study Guide Creation:</strong> Your key enables AI-powered study guide generation from your difficult cards.
                      </p>
                      <p style={{ margin: '0 0 0 0' }}>
                        <strong>🔍 Content Analysis:</strong> AI features for analyzing and improving your flashcard content use your configured provider.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* OpenAI Section */}
              <div 
                onClick={() => handleProviderChange('openai')}
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: localSelectedProvider === 'openai' ? (isDarkMode ? '#064e3b' : '#d1fae5') : (isDarkMode ? '#065f46' : '#ecfdf5'),
                  borderRadius: '8px',
                  border: localSelectedProvider === 'openai' ? `3px solid ${isDarkMode ? '#34d399' : '#10b981'}` : `2px solid ${isDarkMode ? '#059669' : '#6ee7b7'}`,
                  boxShadow: localSelectedProvider === 'openai' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                  transform: localSelectedProvider === 'openai' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (localSelectedProvider !== 'openai') {
                    e.target.style.transform = 'scale(1.01)';
                    e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (localSelectedProvider !== 'openai') {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {localSelectedProvider === 'openai' && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    ACTIVE
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="provider"
                      value="openai"
                      checked={localSelectedProvider === 'openai'}
                      onChange={() => {}} // Handled by card click
                      style={{ marginRight: '8px', pointerEvents: 'none' }}
                    />
                    <div>
                      <strong style={{ color: isDarkMode ? '#f9fafb' : '#111827' }}>⚡ OpenAI (GPT-4/GPT-3.5)</strong>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                        Most versatile AI, excellent for creative content, coding, and detailed explanations
                      </div>
                      <div style={{ fontSize: '11px', color: isDarkMode ? '#6b7280' : '#9ca3af', marginTop: '2px' }}>
                        <strong>Features:</strong> Question generation, answer explanations, content analysis
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: localApiKeys.openai ? (isDarkMode ? '#065f46' : '#d1fae5') : (isDarkMode ? '#7f1d1d' : '#fee2e2'),
                    color: localApiKeys.openai ? (isDarkMode ? '#34d399' : '#059669') : (isDarkMode ? '#fca5a5' : '#dc2626')
                  }}>
                    {localApiKeys.openai ? '✅ Connected' : '✗ Not Set'}
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={localApiKeys.openai || ''}
                  onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                    backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    marginBottom: '4px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  Get your key from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: isDarkMode ? '#60a5fa' : '#3b82f6' }}>OpenAI API Keys</a>
                </small>
              </div>

              {/* Anthropic Section */}
              <div 
                onClick={() => handleProviderChange('anthropic')}
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: localSelectedProvider === 'anthropic' ? (isDarkMode ? '#7c2d12' : '#fed7aa') : (isDarkMode ? '#9a3412' : '#ffedd5'),
                  borderRadius: '8px',
                  border: localSelectedProvider === 'anthropic' ? `3px solid ${isDarkMode ? '#fb923c' : '#ea580c'}` : `2px solid ${isDarkMode ? '#ea580c' : '#fdba74'}`,
                  boxShadow: localSelectedProvider === 'anthropic' ? '0 4px 12px rgba(234, 88, 12, 0.3)' : 'none',
                  transform: localSelectedProvider === 'anthropic' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (localSelectedProvider !== 'anthropic') {
                    e.target.style.transform = 'scale(1.01)';
                    e.target.style.boxShadow = '0 2px 8px rgba(234, 88, 12, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (localSelectedProvider !== 'anthropic') {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {localSelectedProvider === 'anthropic' && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#ea580c',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    ACTIVE
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="provider"
                      value="anthropic"
                      checked={localSelectedProvider === 'anthropic'}
                      onChange={() => {}} // Handled by card click
                      style={{ marginRight: '8px', pointerEvents: 'none' }}
                    />
                    <div>
                      <strong style={{ color: isDarkMode ? '#f9fafb' : '#111827' }}>🧠 Anthropic (Claude)</strong>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                        Superior reasoning and analysis, excellent for educational content and complex explanations
                      </div>
                      <div style={{ fontSize: '11px', color: isDarkMode ? '#6b7280' : '#9ca3af', marginTop: '2px' }}>
                        <strong>Features:</strong> Advanced reasoning, study guides, detailed breakdowns
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: localApiKeys.anthropic ? (isDarkMode ? '#065f46' : '#d1fae5') : (isDarkMode ? '#7f1d1d' : '#fee2e2'),
                    color: localApiKeys.anthropic ? (isDarkMode ? '#34d399' : '#059669') : (isDarkMode ? '#fca5a5' : '#dc2626')
                  }}>
                    {localApiKeys.anthropic ? '✅ Connected' : '✗ Not Set'}
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={localApiKeys.anthropic || ''}
                  onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                    backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    marginBottom: '4px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  Get your key from: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: isDarkMode ? '#60a5fa' : '#3b82f6' }}>Anthropic Console</a>
                </small>
              </div>

              {/* Google Gemini Section */}
              <div 
                onClick={() => handleProviderChange('gemini')}
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: localSelectedProvider === 'gemini' ? (isDarkMode ? '#581c87' : '#ddd6fe') : (isDarkMode ? '#6b21a8' : '#ede9fe'),
                  borderRadius: '8px',
                  border: localSelectedProvider === 'gemini' ? `3px solid ${isDarkMode ? '#a855f7' : '#8b5cf6'}` : `2px solid ${isDarkMode ? '#8b5cf6' : '#c4b5fd'}`,
                  boxShadow: localSelectedProvider === 'gemini' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                  transform: localSelectedProvider === 'gemini' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (localSelectedProvider !== 'gemini') {
                    e.target.style.transform = 'scale(1.01)';
                    e.target.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (localSelectedProvider !== 'gemini') {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {localSelectedProvider === 'gemini' && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    ACTIVE
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="provider"
                      value="gemini"
                      checked={localSelectedProvider === 'gemini'}
                      onChange={() => {}} // Handled by card click
                      style={{ marginRight: '8px', pointerEvents: 'none' }}
                    />
                    <div>
                      <strong style={{ color: isDarkMode ? '#f9fafb' : '#111827' }}>🤖 Google Gemini</strong>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                        Fast and efficient, great balance of performance and cost-effectiveness
                      </div>
                      <div style={{ fontSize: '11px', color: isDarkMode ? '#6b7280' : '#9ca3af', marginTop: '2px' }}>
                        <strong>Features:</strong> Quick responses, multimodal capabilities, cost-efficient
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: localApiKeys.gemini ? (isDarkMode ? '#065f46' : '#d1fae5') : (isDarkMode ? '#7f1d1d' : '#fee2e2'),
                    color: localApiKeys.gemini ? (isDarkMode ? '#34d399' : '#059669') : (isDarkMode ? '#fca5a5' : '#dc2626')
                  }}>
                    {localApiKeys.gemini ? '✅ Connected' : '✗ Not Set'}
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="AI..."
                  value={localApiKeys.gemini || ''}
                  onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                    backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    marginBottom: '4px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  Get your key from: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: isDarkMode ? '#60a5fa' : '#3b82f6' }}>Google AI Studio</a>
                </small>
              </div>

              {/* Usage Tips */}
              <div style={{
                backgroundColor: isDarkMode ? '#065f46' : '#ecfdf5',
                border: `1px solid ${isDarkMode ? '#059669' : '#10b981'}`,
                borderRadius: '8px',
                padding: '12px',
                marginTop: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ 
                    fontSize: '16px', 
                    marginRight: '8px', 
                    color: isDarkMode ? '#34d399' : '#059669' 
                  }}>💡</span>
                  <div>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '13px',
                      color: isDarkMode ? '#10b981' : '#065f46',
                      fontWeight: '600'
                    }}>
                      <strong>Usage Tips:</strong>
                    </p>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '16px',
                      fontSize: '12px',
                      color: isDarkMode ? '#6ee7b7' : '#047857'
                    }}>
                      <li><strong>Local Storage Only:</strong> Your API keys are stored exclusively in your browser's local storage</li>
                      <li><strong>Direct Communication:</strong> API requests go directly from your browser to AI providers (OpenAI, Anthropic, Google)</li>
                      <li><strong>No Server Transit:</strong> This app's servers never see, store, or have access to your API keys</li>
                      <li><strong>Switch Anytime:</strong> You can change providers or update keys anytime - changes are immediate</li>
                      <li><strong>Secure by Design:</strong> Even if our servers were compromised, your API keys would remain safe</li>
                      <li><strong>Keep Keys Private:</strong> Never share your API keys in screenshots, support requests, or publicly</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Model Information */}
              <div style={{
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                border: `1px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '12px',
                marginTop: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ 
                    fontSize: '16px', 
                    marginRight: '8px', 
                    color: isDarkMode ? '#94a3b8' : '#64748b' 
                  }}>ℹ️</span>
                  <div>
                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '13px',
                      color: isDarkMode ? '#e2e8f0' : '#334155',
                      fontWeight: '600'
                    }}>
                      <strong>Current AI Features:</strong>
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: isDarkMode ? '#cbd5e1' : '#475569',
                      lineHeight: '1.4'
                    }}>
                      Question generation, answer notes, study guide creation, content analysis, and interactive learning assistance. More features coming soon!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKeys}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            border: '3px solid #3b82f6'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px 24px 0 24px',
              borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              paddingBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}>
                  👤 Account Information
                </h2>
                <button
                  onClick={() => setShowAccountModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px'
            }}>

              {/* Account Details */}
              <div style={{
                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isDarkMode ? '#f9fafb' : '#111827'
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
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Email:</span>
                    <span style={{ color: isDarkMode ? '#f3f4f6' : '#374151', fontWeight: '500' }}>
                      {userDisplayName || 'Not available'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>User ID:</span>
                    <span style={{ 
                      color: isDarkMode ? '#f3f4f6' : '#374151', 
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
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Account Type:</span>
                    <span style={{ color: isDarkMode ? '#f3f4f6' : '#374151', fontWeight: '500' }}>
                      {userId?.startsWith('anon-') ? 'Anonymous' : 'Registered'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div style={{
                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}>
                  Study Statistics
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: isDarkMode ? '#f9fafb' : '#111827'
                    }}>
                      {flashcards.length}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      Total Cards
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: isDarkMode ? '#f9fafb' : '#111827'
                    }}>
                      {cardsCompletedToday}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      Completed Today
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#10b981'
                    }}>
                      {categories.length}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      Categories
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#f59e0b'
                    }}>
                      {streakDays}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      Day Streak
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Performance */}
              <div style={{
                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isDarkMode ? '#f9fafb' : '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📊</span>
                  Card Performance
                </h4>
                
                {/* Performance Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px 8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🆕</div>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280', marginBottom: '2px' }}>New</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                      {performanceStats.new}
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px 8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>😵</div>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280', marginBottom: '2px' }}>Again</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                      {performanceStats.again}
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px 8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>😰</div>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280', marginBottom: '2px' }}>Hard</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                      {performanceStats.hard}
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px 8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>😊</div>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280', marginBottom: '2px' }}>Good</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                      {performanceStats.good}
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                    borderRadius: '6px',
                    padding: '12px 8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>😎</div>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#9ca3af' : '#6b7280', marginBottom: '2px' }}>Easy</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>
                      {performanceStats.easy}
                    </div>
                  </div>
                </div>
                
                {/* Summary Stats */}
                <div style={{
                  borderTop: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                  paddingTop: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Reviewed:</span>
                    <span style={{ 
                      color: isDarkMode ? '#f3f4f6' : '#374151', 
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      {performanceStats.reviewed}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Mastery Rate:</span>
                    <span style={{ 
                      color: performanceStats.masteryRate >= 70 ? '#10b981' : performanceStats.masteryRate >= 50 ? '#f59e0b' : '#ef4444',
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      {performanceStats.masteryRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* FSRS Settings Summary */}
              <div style={{
                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isDarkMode ? '#f9fafb' : '#111827'
                }}>
                  Learning Settings
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '14px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Algorithm:</span>
                    <span style={{ color: isDarkMode ? '#f3f4f6' : '#374151', fontWeight: '500' }}>
                      FSRS (Free Spaced Repetition Scheduler)
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>Theme:</span>
                    <span style={{ color: isDarkMode ? '#f3f4f6' : '#374151', fontWeight: '500' }}>
                      {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              display: 'flex',
              gap: '12px',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={handleSignOut}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{
                  backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <GenerateQuestionsModal
        isVisible={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        currentCard={currentCard}
        onGenerateQuestions={handleGenerateQuestions}
        isDarkMode={isDarkMode}
        apiKeys={apiKeys}
        selectedProvider={selectedProvider}
        onOpenApiConfig={() => setShowApiKeyModal(true)}
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

      {/* Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={handleCloseNoteModal}>
          <div className="modal-content note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 Add Note</h3>
              <button 
                className="modal-close-btn"
                onClick={handleCloseNoteModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <RichTextEditor
                value={currentNoteText}
                onChange={setCurrentNoteText}
                placeholder="Type your note here... Use the toolbar above for formatting options."
                className="note-editor"
                minHeight="300px"
                enableRichText={true}
              />
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={handleCloseNoteModal}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveNote}
                disabled={!currentNoteText.trim()}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

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