import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';

// Components
import LoginScreen from './LoginScreen.jsx';
import FlashcardDisplay from './components/FlashcardDisplay';
import FlashcardForm from './components/FlashcardForm';
import SettingsModal from './components/SettingsModal';
import ImportExportModal from './components/ImportExportModal';
import GenerateQuestionsModal from './components/GenerateQuestionsModal';
import Calendar from './Calendar';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useFlashcards } from './hooks/useFlashcards';
import { useSettings } from './hooks/useSettings';

// Utils and Constants
import { SUCCESS_MESSAGES, ERROR_MESSAGES, DEFAULT_FSRS_PARAMS } from './utils/constants';

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

  // Edit card states
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editCardData, setEditCardData] = useState(null);


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
    selectedCategory,
    selectedSubCategory,
    selectedLevel,
    showDueTodayOnly,
    categorySortBy,
    isLoading: flashcardsLoading,
    error: flashcardsError,
    getCurrentCard,
    getCategories,
    getSubCategories,
    getLevels,
    getCategoryStats,
    setShowAnswer,
    setSelectedCategory,
    setSelectedSubCategory,
    setSelectedLevel,
    setShowDueTodayOnly,
    setCategorySortBy,
    setCurrentCardIndex,
    nextCard,
    prevCard,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    bulkImportFlashcards,
    clearError: clearFlashcardsError
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
    resetFsrsParams,
    clearError: clearSettingsError
  } = useSettings(firebaseApp, userId);

  // Sync login screen visibility with authentication state
  useEffect(() => {
    if (isAuthReady) {
      if (userId) {
        // User is authenticated, hide login screen
        setShowLoginScreen(false);
        console.log('User authenticated, hiding login screen');
      } else {
        // No user, show login screen
        setShowLoginScreen(true);
        console.log('No user found, showing login screen');
      }
    }
  }, [isAuthReady, userId]);

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

    console.log('🔄 Reviewing card:', card.id, 'Rating:', rating);

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
      
      console.log('📝 Updating card with data:', updateData);
      console.log(`📅 Next review: ${interval} days from now (${dueDate.toLocaleDateString()})`);
      
      // Update the card
      await updateFlashcard(card.id, updateData);
      
      console.log('✅ Card review successful!');
      setMessage(`Card reviewed as ${rating.toUpperCase()}! Next review in ${interval} day${interval !== 1 ? 's' : ''}.`);
      
      // Hide answer and move to next card
      setShowAnswer(false);
      
      // Add a small delay before moving to next card for better UX
      setTimeout(() => {
        nextCard();
      }, 500);
      
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


  // Handle edit card
  const handleEditCard = (card) => {
    setEditCardData(card);
    setIsEditingCard(true);
    setShowCreateCardForm(true);
  };

  // Clear messages after delay
  const clearMessage = () => {
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

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
          if (!showAnswer) {
            setShowAnswer(true);
          }
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
          event.preventDefault();
          setShowImportExportModal(true);
          break;
        case 'Escape':
          event.preventDefault();
          setShowCreateCardForm(false);
          setShowSettingsModal(false);
          setShowImportExportModal(false);
          setShowCalendarModal(false);
          setIsEditingCard(false);
          setEditCardData(null);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, nextCard, prevCard, setShowAnswer, handleReviewCard, getCurrentCard]);

  // Debug logging for loading state
  console.log('App loading state:', {
    isFirebaseInitialized,
    isAuthReady,
    settingsLoaded,
    userId,
    showLoginScreen
  });

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

  const currentCard = getCurrentCard();
  const categories = getCategories();
  const subCategories = getSubCategories();
  const levels = getLevels();
  const categoryStats = getCategoryStats();
  
  // Convert flashcards to calendar dates format
  const getCalendarDates = () => {
    const dateMap = new Map();
    
    flashcards.forEach(card => {
      if (card.dueDate) {
        const dueDate = card.dueDate instanceof Date ? card.dueDate : card.dueDate.toDate();
        const dateKey = dueDate.toDateString(); // Groups by day, ignoring time
        
        if (dateMap.has(dateKey)) {
          dateMap.get(dateKey).cardCount++;
        } else {
          dateMap.set(dateKey, {
            date: new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()),
            cardCount: 1
          });
        }
      }
    });
    
    return Array.from(dateMap.values());
  };
  
  const calendarDates = getCalendarDates();

  return (
    <div className={`app ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>Flashcard App</h1>
          <span className="user-info">Welcome, {userDisplayName}</span>
        </div>
        
        <div className="header-controls">
          {/* Category Filter */}
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="All">All Categories ({flashcards.length})</option>
              {categories.map(category => {
                const stats = categoryStats[category] || { total: 0, due: 0 };
                return (
                  <option key={category} value={category}>
                    {category} ({stats.due}/{stats.total})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sub-Category Filter */}
          {subCategories.length > 0 && (
            <div className="subcategory-filter">
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="subcategory-select"
              >
                <option value="All">All Sub-Categories</option>
                {subCategories.map(subCategory => (
                  <option key={subCategory} value={subCategory}>
                    {subCategory}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Level Filter */}
          {levels.length > 0 && (
            <div className="level-filter">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="level-select"
              >
                <option value="All">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Card Filter Toggle */}
          <div className="card-filter-toggle">
            <button
              className={`toggle-btn ${!showDueTodayOnly ? 'active' : ''}`}
              onClick={() => setShowDueTodayOnly(false)}
            >
              All Cards ({flashcards.length})
            </button>
            <button
              className={`toggle-btn ${showDueTodayOnly ? 'active' : ''}`}
              onClick={() => setShowDueTodayOnly(true)}
            >
              Due Today ({flashcards.filter(card => {
                const dueDate = card.dueDate || new Date(0);
                return dueDate <= new Date();
              }).length})
            </button>
          </div>

          {/* Action Buttons */}
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateCardForm(true)}
            title="Create new flashcard (C)"
          >
            + New Card
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => setShowImportExportModal(true)}
            title="Import/Export flashcards (E)"
          >
            Import/Export
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
          
        </div>
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
        {filteredFlashcards.length === 0 ? (
          <div className="no-cards-state">
            <h2>No flashcards available</h2>
            <p>
              {selectedCategory === 'All' 
                ? 'Create your first flashcard or import existing ones to get started!'
                : `No cards found in "${selectedCategory}" category${showDueTodayOnly ? ' that are due today' : ''}.`
              }
            </p>
            <div className="no-cards-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateCardForm(true)}
              >
                Create Flashcard
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowImportExportModal(true)}
              >
                Import Flashcards
              </button>
            </div>
          </div>
        ) : (
          <div className="flashcard-area">
            <FlashcardDisplay
              card={currentCard}
              showAnswer={showAnswer}
              onShowAnswer={() => setShowAnswer(true)}
              onPreviousCard={prevCard}
              onNextCard={nextCard}
              onReviewCard={handleReviewCard}
              currentIndex={currentCardIndex}
              totalCards={filteredFlashcards.length}
              isDarkMode={isDarkMode}
            />
            
            {/* Card Actions */}
            {currentCard && (
              <div className="card-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleEditCard(currentCard)}
                >
                  ✏️ Edit Card
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteCard(currentCard.id)}
                >
                  🗑️ Delete Card
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowGenerateModal(true)}
                >
                  🤖 Generate Questions
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-stats">
          <span>Total Cards: {flashcards.length}</span>
          <span>Filtered: {filteredFlashcards.length}</span>
          <span>Categories: {categories.length}</span>
        </div>
        <div className="footer-shortcuts">
          <small>
            Shortcuts: <kbd>Space</kbd> Show Answer | <kbd>←/→</kbd> Navigate | 
            <kbd>1-4</kbd> Rate Card | <kbd>C</kbd> Create | <kbd>S</kbd> Settings | <kbd>E</kbd> Export
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
        editCard={editCardData}
        categories={categories}
        isDarkMode={isDarkMode}
        isLoading={flashcardsLoading}
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