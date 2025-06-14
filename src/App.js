import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, updateDoc, doc, getDoc, setDoc, deleteDoc, getDocs, where, Timestamp } from 'firebase/firestore';
import LoginScreen from './LoginScreen.jsx';
import * as XLSX from 'xlsx';
import Calendar from './Calendar';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Main App component for the flashcard application
function App() {
  // State variables for Firebase, user authentication, and flashcards
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [flashcards, setFlashcards] = useState([]); // All flashcards from Firestore
  const [filteredFlashcards, setFilteredFlashcards] = useState([]); // Flashcards after category filter
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showCreateCardForm, setShowCreateCardForm] = useState(false); // State for toggling create card form
  const [showUploadCsvForm, setShowUploadCsvForm] = useState(false); // State for toggling CSV upload form
  const [uploadMessage, setUploadMessage] = useState(''); // Message for CSV upload success
  const [uploadError, setUploadError] = useState('');     // Message for CSV upload errors
  const [showCalendarModal, setShowCalendarModal] = useState(false); // State for calendar modal visibility
  const [calendarDates, setCalendarDates] = useState([]); // State for calendar dates and card counts
  const [showLoginModal, setShowLoginModal] = useState(false); // State for login modal visibility
  const [selectedCategory, setSelectedCategory] = useState('All'); // State for selected category filter
  const [authError, setAuthError] = useState(''); // New state for Firebase authentication errors
  const [userDisplayName, setUserDisplayName] = useState(''); // New state for user display name

  // Login screen states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDueTodayOnly, setShowDueTodayOnly] = useState(true); // Show only cards due today when logged in
  const [showLoginScreen, setShowLoginScreen] = useState(true); // Always show login screen first

  // Settings states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false); // To ensure settings are loaded before saving/using them
  const [fsrsParams, setFsrsParams] = useState({
    easyFactor: 1.5,
    goodFactor: 1.0,
    hardFactor: 0.7,
    againFactor: 0.3,
    initialDifficulty: 5,
    initialStability: 1,
  });
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false); // State for Gemini API loading (Suggest Answer)
  const [isGeneratingExample, setIsGeneratingExample] = useState(false); // State for Gemini API loading (Generate Example)
  const [generatedExample, setGeneratedExample] = useState(''); // State to store generated example
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false); // State for Gemini API loading (Generate Questions)
  const [generatedQuestions, setGeneratedQuestions] = useState([]); // State to store generated questions for selection
  const [selectedQuestions, setSelectedQuestions] = useState([]); // State to track which questions are selected
  const [showGeneratedQuestionsModal, setShowGeneratedQuestionsModal] = useState(false); // State for related questions modal
  const [isExplainingConcept, setIsExplainingConcept] = useState(false); // State for Gemini API loading (Explain Concept)
  const [geminiExplanation, setGeminiExplanation] = useState(''); // State to store generated explanation

  const [showCsvGuide, setShowCsvGuide] = useState(false); // State for toggling CSV guide visibility in settings
  const [showAboutFsrs, setShowAboutFsrs] = useState(false); // State for About FSRS dropdown
  const [showUserInfo, setShowUserInfo] = useState(false); // State for User Info dropdown
  const [showFsrsFactors, setShowFsrsFactors] = useState(false); // State for FSRS Factors dropdown - closed by default
  const [showGenerationPrompt, setShowGenerationPrompt] = useState(false); // State for Generation Prompt dropdown
  const [showApiKeys, setShowApiKeys] = useState(false); // State for API Keys dropdown

  // API Keys state
  const [apiKeys, setApiKeys] = useState({
    gemini: process.env.REACT_APP_GEMINI_API_KEY || '',
    anthropic: process.env.REACT_APP_ANTHROPIC_API_KEY || '',
    openai: process.env.REACT_APP_OPENAI_API_KEY || ''
  });
  const [selectedApiProvider, setSelectedApiProvider] = useState('gemini'); // Default to Gemini

  // Edit Card states
  const [isEditingCard, setIsEditingCard] = useState(false); // State for edit mode
  const [editCardData, setEditCardData] = useState(null); // Data for the card being edited
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); // State for delete confirmation
  const [isGeneratingSelectedCards, setIsGeneratingSelectedCards] = useState(false); // New state for batch generation loading
  const [copyFeedback, setCopyFeedback] = useState(''); // State for copy button feedback

  // Refs for new card input fields and file input
  const newCardQuestionRef = useRef(null);
  const newCardAnswerRef = useRef(null);
  const newCardCategoryRef = useRef(null); // Ref for new card category input
  const newCardAdditionalInfoRef = useRef(null); // New ref for additional info
  const fileInputRef = useRef(null); // Ref for the CSV file input
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]); // State to hold selected file objects (array)

  // Refs for edit card inputs
  const editQuestionRef = useRef(null);
  const editAnswerRef = useRef(null);
  const editCategoryRef = useRef(null);
  const editAdditionalInfoRef = useRef(null);


  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    try {
      // Your web app's Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyC3R7pV3mXqg2-kY9xvH126BoF5KQDQDls",
        authDomain: "flashcard-app-3f2a3.firebaseapp.com",
        projectId: "flashcard-app-3f2a3",
        storageBucket: "flashcard-app-3f2a3.firebasestorage.app",
        messagingSenderId: "399745541062",
        appId: "1:399745541062:web:958a2cfbd7c6c9c78988c7",
        measurementId: "G-6LJ19R2ZTZ"
      };

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authentication = getAuth(app);
      
      setDb(firestore);
      setAuth(authentication);

      const unsubscribe = onAuthStateChanged(authentication, async (user) => {
        if (user) {
          setUserId(user.uid);
          setAuthError(''); // Clear auth error on successful sign-in
          setUserDisplayName(user.displayName || user.email || user.uid); // Set user display name
          setShowLoginScreen(false); // Hide login screen when user is authenticated
        } else {
          setUserId(null);
          setUserDisplayName('');
          setShowLoginScreen(true); // Show login screen when no user is authenticated
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase app:", error);
      setAuthError("Failed to initialize Firebase. Check console for details.");
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      setAuthError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in successfully:", userCredential.user.uid);
    } catch (error) {
      console.error("Login error:", error);
      setAuthError(`Login failed: ${error.message}`);
    }
  };

  // Function to handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      setAuthError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User registered successfully:", userCredential.user.uid);
    } catch (error) {
      console.error("Registration error:", error);
      setAuthError(`Registration failed: ${error.message}`);
    }
  };

  // Function to handle anonymous login
  const handleAnonymousLogin = async () => {
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      setAuthError('');
      const userCredential = await signInAnonymously(auth);
      console.log("User logged in anonymously:", userCredential.user.uid);
    } catch (error) {
      console.error("Anonymous login error:", error);
      setAuthError(`Anonymous login failed: ${error.message}`);
    }
  };

  // Function to handle logout
  const handleLogout = async () => {
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      await signOut(auth);
      setUserId(null);
      setUserDisplayName('');
      setAuthError('');
      setShowSettingsModal(false);
      setEmail('');
      setPassword('');
      setShowLoginScreen(true);
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
      setAuthError(`Logout failed: ${error.message}`);
    }
  };

  // Fetch/Set FSRS settings and dark mode from Firestore
  useEffect(() => {
    if (db && userId && isAuthReady) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');

      const fetchSettings = async () => {
        try {
          const docSnap = await getDoc(settingsDocRef);
          if (docSnap.exists()) {
            const fetchedSettings = docSnap.data();
            setFsrsParams(prev => ({ ...prev, ...fetchedSettings.fsrsParams }));
            setIsDarkMode(fetchedSettings.isDarkMode || false);
            setApiKeys(prev => ({ ...prev, ...fetchedSettings.apiKeys }));
            setSelectedApiProvider(fetchedSettings.selectedApiProvider || 'gemini');
          } else {
            // Set initial settings if they don't exist
            await setDoc(settingsDocRef, {
              fsrsParams: fsrsParams, // use default initial state
              isDarkMode: false,
              apiKeys: { gemini: '', anthropic: '', openai: '' },
              selectedApiProvider: 'gemini'
            });
          }
          setSettingsLoaded(true); // Mark settings as loaded
        } catch (error) {
          console.error("Error fetching/setting app settings:", error);
          if (error.code && error.code === 'unavailable' || error.message.includes('offline')) {
            setAuthError("Firestore connection failed: You appear to be offline or there's a network issue. Please check your internet connection.");
          } else {
            setAuthError(`Error loading settings: ${error.message}`);
          }
          setSettingsLoaded(true); // Still set to true to proceed even if fetch fails
        }
      };
      fetchSettings();
    }
  }, [db, userId, isAuthReady]);

  // Effect to apply dark mode class to HTML element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Also save the dark mode preference to Firestore if settings are already loaded
    if (db && userId && settingsLoaded) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
      updateDoc(settingsDocRef, { isDarkMode: isDarkMode }).catch(error => console.error("Error updating dark mode setting:", error));
    }
  }, [isDarkMode, db, userId, settingsLoaded]);

  // Function to update FSRS parameters and save to Firestore
  const updateFsrsParameter = (paramName, value) => {
    setFsrsParams(prev => {
      const newParams = { ...prev, [paramName]: parseFloat(value) }; // Ensure float
      // Save to Firestore if settings are already loaded
      if (db && userId && settingsLoaded) {
        const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
        const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
        updateDoc(settingsDocRef, { fsrsParams: newParams }).catch(error => console.error("Error updating FSRS settings:", error));
      }
      return newParams;
    });
  };

  // Function to check if API keys are configured
  const checkApiKeys = () => {
    const missingKeys = [];
    if (!apiKeys.gemini) missingKeys.push('Gemini');
    if (!apiKeys.anthropic) missingKeys.push('Anthropic');
    if (!apiKeys.openai) missingKeys.push('OpenAI');
    
    if (missingKeys.length > 0) {
      console.warn(`Missing API keys for: ${missingKeys.join(', ')}. Please configure them in your .env file.`);
      return false;
    }
    return true;
  };

  // Function to update API keys and save to Firestore
  const updateApiKey = (provider, key) => {
    setApiKeys(prev => {
      const newApiKeys = { ...prev, [provider]: key };
      // Save to Firestore if settings are already loaded
      if (db && userId && settingsLoaded) {
        const appId = "flashcard-app-3f2a3";
        const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
        updateDoc(settingsDocRef, { apiKeys: newApiKeys }).catch(error => console.error("Error updating API keys:", error));
      }
      return newApiKeys;
    });
  };

  // Function to update selected API provider and save to Firestore
  const updateSelectedApiProvider = (provider) => {
    setSelectedApiProvider(provider);
    // Save to Firestore if settings are already loaded
    if (db && userId && settingsLoaded) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
      updateDoc(settingsDocRef, { selectedApiProvider: provider }).catch(error => console.error("Error updating selected API provider:", error));
    }
  };

  // Fetch flashcards from Firestore when DB and auth are ready
  useEffect(() => {
    if (db && auth && userId) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      const flashcardsColRef = collection(db, `/artifacts/${appId}/users/${userId}/flashcards`);
      const q = query(flashcardsColRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cards = [];
        snapshot.forEach(doc => {
          cards.push({ id: doc.id, ...doc.data() });
        });
        cards.sort((a, b) => (a.nextReview?.toMillis() || 0) - (b.nextReview?.toMillis() || 0));
        setFlashcards(cards);
        if (currentCardIndex >= cards.length && cards.length > 0) {
          setCurrentCardIndex(0);
        }
      }, (error) => {
        console.error("Error fetching flashcards:", error);
        if (error.code && error.code === 'unavailable' || error.message.includes('offline')) {
          setAuthError("Firestore connection failed: You appear to be offline or there's a network issue. Please check your internet connection.");
        } else {
          setAuthError(`Error fetching flashcards: ${error.message}`);
        }
      });

      return () => unsubscribe();
    }
  }, [db, auth, userId]);

  // Effect to filter flashcards whenever `flashcards`, `selectedCategory`, or `showDueTodayOnly` changes
  useEffect(() => {
    let filtered = flashcards;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(card => card.category === selectedCategory);
    }

    // Filter by due date if user is logged in and showDueTodayOnly is true
    if (userId && showDueTodayOnly) {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      filtered = filtered.filter(card => {
        if (!card.nextReview) return true; // Include cards without nextReview date
        const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
        return nextReviewDate <= today;
      });
    }

    setFilteredFlashcards(filtered);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setGeneratedExample(''); // Clear generated example when filtering cards
    setGeminiExplanation(''); // Clear generated explanation when filtering cards
    setGeneratedQuestions([]); // Clear generated questions when filtering cards
  }, [flashcards, selectedCategory, userId, showDueTodayOnly]);

  const nextCard = React.useCallback(() => {
    setShowAnswer(false);
    setGeneratedExample(''); // Clear generated example on next card
    setGeneratedQuestions([]); // Clear generated questions on next card
    setGeminiExplanation(''); // Clear generated explanation on next card
    setShowGeneratedQuestionsModal(false); // Close modal on card change
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % filteredFlashcards.length);
  }, [filteredFlashcards.length, setShowAnswer, setGeneratedExample, setGeneratedQuestions, setGeminiExplanation, setShowGeneratedQuestionsModal, setCurrentCardIndex]);

  const prevCard = () => {
    setShowAnswer(false);
    setGeneratedExample(''); // Clear generated example on prev card
    setGeneratedQuestions([]); // Clear generated questions on prev card
    setGeminiExplanation(''); // Clear generated explanation on prev card
    setShowGeneratedQuestionsModal(false); // Close modal on card change
    setCurrentCardIndex((prevIndex) =>
      (prevIndex - 1 + filteredFlashcards.length) % filteredFlashcards.length
    );
  };

  const handleAddCard = async (e) => {
    e.preventDefault();

    const question = newCardQuestionRef.current.value.trim();
    const answer = newCardAnswerRef.current.value.trim();
    const category = newCardCategoryRef.current.value.trim() || 'Uncategorized';
    const additionalInfo = newCardAdditionalInfoRef.current.value.trim() || null; // Capture additional info

    if (!question || !answer) {
      console.log("Please enter both question and answer.");
      return;
    }

    if (db && userId) {
      try {
        const appId = "flashcard-app-3f2a3"; // Hardcoding appId
        const now = new Date();

        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), {
          question,
          answer,
          category,
          additional_info: additionalInfo, // Save additional info
          difficulty: fsrsParams.initialDifficulty, // Use initial difficulty from settings
          stability: fsrsParams.initialStability,   // Use initial stability from settings
          lastReview: serverTimestamp(),
          nextReview: now,
          createdAt: serverTimestamp(),
        });
        console.log("Flashcard added successfully!");
        newCardQuestionRef.current.value = '';
        newCardAnswerRef.current.value = '';
        newCardCategoryRef.current.value = '';
        newCardAdditionalInfoRef.current.value = ''; // Clear additional info
        setShowCreateCardForm(false);
      } catch (error) {
        console.error("Error adding flashcard:", error);
        if (error.code && error.code === 'unavailable' || error.message.includes('offline')) {
          setAuthError("Firestore write failed: You appear to be offline or there's a network issue. Please check your internet connection.");
        } else {
          setAuthError(`Error adding flashcard: ${error.message}`);
        }
      }
    } else {
      console.log("Database not initialized or user not authenticated.");
      setAuthError("Database not initialized or user not authenticated.");
    }
  };

  /**
   * Applies a simplified FSRS-like algorithm to update flashcard parameters.
   * Uses customizable factors from fsrsParams state.
   * Wrapped in useCallback to avoid dependency issues in useEffect
   */
  const reviewCard = React.useCallback(async (quality, card) => {
    console.log("reviewCard called with:", { quality, cardId: card?.id });
    
    if (!db || !userId || !card || !settingsLoaded) {
      console.error("Missing dependencies:", { db: !!db, userId: !!userId, card: !!card, settingsLoaded });
      return;
    }

    try {
      const appId = "flashcard-app-3f2a3";
      const now = new Date();
      console.log("Processing review for card:", card.id);

      // Get current card data
      const cardRef = doc(db, `artifacts/${appId}/users/${userId}/flashcards`, card.id);
      const cardDoc = await getDoc(cardRef);
      
      if (!cardDoc.exists()) {
        console.error("Card not found in database:", card.id);
        return;
      }

      const cardData = cardDoc.data();
      console.log("Retrieved card data:", cardData);
      
      // Calculate next review date based on quality rating using FSRS factors
      const nextReview = new Date(now);
      let daysToAdd = 0;
      
      // Get the current interval from card data, or use default if first review
      const currentInterval = cardData.interval || 1;
      
      switch (quality) {
        case 1: // Again
          daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.againFactor));
          break;
        case 2: // Hard
          daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.hardFactor));
          break;
        case 3: // Good
          daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.goodFactor));
          break;
        case 4: // Easy
          daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.easyFactor));
          break;
        default:
          console.warn("Invalid quality rating:", quality);
          return;
      }

      nextReview.setDate(now.getDate() + daysToAdd);
      // Set time to end of day (23:59:59) to ensure card appears on the correct day
      nextReview.setHours(23, 59, 59, 999);

      console.log("Updating card with new values:", {
        nextReview: nextReview
      });

      // Update card in database with new interval and review data
      await updateDoc(cardRef, {
        lastReview: serverTimestamp(),
        nextReview: nextReview,
        interval: daysToAdd,
        lastQuality: quality,
        reviewCount: (cardData.reviewCount || 0) + 1
      });

      console.log(`Card ${card.id} reviewed with quality ${quality}. Next review in ${daysToAdd} days.`);
      
      // Update calendar dates to reflect the new review schedule
      if (showCalendarModal) {
        updateCalendarDates();
      }
      
      // Always move to next card after updating
      nextCard();
      
    } catch (error) {
      console.error("Error updating flashcard:", error);
      if (error.code && (error.code === 'unavailable' || error.message.includes('offline'))) {
        setAuthError("Firestore write failed: You appear to be offline or there's a network issue. Please check your internet connection.");
      } else {
        setAuthError(`Error updating flashcard: ${error.message}`);
      }
    }
  }, [db, userId, settingsLoaded, nextCard, setAuthError]);

  // Function to get cards due on a specific date
  const getCardsDueOnDate = React.useCallback(async (date) => {
    if (!db || !userId) {
      console.log("getCardsDueOnDate: db or userId not available");
      return 0;
    }

    try {
      // Create proper Firestore Timestamp objects for query
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get all flashcards and filter them in memory
      const cardsRef = collection(db, `artifacts/flashcard-app-3f2a3/users/${userId}/flashcards`);
      const querySnapshot = await getDocs(cardsRef);
      
      // Filter cards due on the specified date
      // For today: include overdue cards (cards due today or earlier)
      // For future dates: only include cards due exactly on that date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const specifiedDate = new Date(date);
      specifiedDate.setHours(0, 0, 0, 0);
      const isToday = today.getTime() === specifiedDate.getTime();
      
      const dueCards = querySnapshot.docs.filter(doc => {
        const card = doc.data();
        if (!card.nextReview) return false;
        
        const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
        const reviewDate = new Date(nextReviewDate);
        reviewDate.setHours(0, 0, 0, 0);
        
        if (isToday) {
          // For today's date: include all cards due today or earlier (overdue)
          return reviewDate.getTime() <= specifiedDate.getTime();
        } else {
          // For future dates: only include cards due exactly on that date
          return reviewDate.getTime() === specifiedDate.getTime();
        }
      });
      
      return dueCards.length;
    } catch (error) {
      console.error("Error getting cards due on date:", error);
      return 0;
    }
  }, [db, userId]);

  // Update calendar dates with correct card counts
  const updateCalendarDates = React.useCallback(async () => {
    if (!db || !userId) return;

    try {
      // Get current date in Central Time
      const now = new Date();
      const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const today = new Date(centralTime.getFullYear(), centralTime.getMonth(), centralTime.getDate());
      
      const dates = [];
      
      // Generate dates for the next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const cardCount = await getCardsDueOnDate(date);
        dates.push({
          date: date,
          cardCount: cardCount
        });
      }

      setCalendarDates(dates);
    } catch (error) {
      console.error("Error updating calendar dates:", error);
    }
  }, [db, userId, getCardsDueOnDate]);

  // Effect to update calendar when cards change or when calendar modal is shown
  useEffect(() => {
    if (db && userId && showCalendarModal) {
      updateCalendarDates();
    }
  }, [db, userId, showCalendarModal, updateCalendarDates, flashcards]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle keyboard shortcuts when not in input fields or modals
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || 
          showCreateCardForm || showUploadCsvForm || showSettingsModal || showCalendarModal || showLoginModal) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          prevCard();
          break;
        case 'ArrowRight':
          event.preventDefault();
          nextCard();
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          if (filteredFlashcards.length > 0) {
            setShowAnswer(!showAnswer);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAnswer, showCreateCardForm, showUploadCsvForm, showSettingsModal, showCalendarModal, showLoginModal, filteredFlashcards.length]);

  // Helper function to calculate estimated next review days based on FSRS factors
  const calculateEstimatedReviewDays = (factor, baseInterval = 3) => {
    return Math.round(baseInterval * factor);
  };

  /**
   * Parses a CSV string into an array of flashcard objects.
   * Handles quoted fields, including multiline content, commas within quotes, and code comments.
   * Expected format: id,number,category,question,answer,additional_info
   */
  const parseCSV = (csvString) => {
    try {
      // Validate input
      if (!csvString || typeof csvString !== 'string') {
        throw new Error('CSV file appears to be empty or corrupted. Please check the file and try again.');
      }

      if (csvString.trim().length === 0) {
        throw new Error('CSV file is empty. Please add flashcard data and try again.');
      }

      // Check for common file format issues
      if (csvString.includes('\0') || csvString.includes('\uFFFD')) {
        throw new Error('CSV file contains invalid characters. This might be a binary file. Please save as CSV format and try again.');
      }

    // Split the CSV into rows carefully handling quoted content which may contain newlines
    const getRows = (text) => {
      const rows = [];
      let row = '';
      let inQuote = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        // Handle escaped quotes ("")
        if (char === '"' && nextChar === '"') {
          row += '"';
          i++;
          continue;
        }
        
        // Toggle quote state
        if (char === '"') {
          inQuote = !inQuote;
          row += char;
          continue;
        }
        
        // Handle newline
        if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuote) {
          if (char === '\r') i++; // Skip \n of CRLF
          rows.push(row);
          row = '';
          continue;
        }
        
        row += char;
      }
      
      if (row) rows.push(row);
      return rows;
    };
    
    // Parse a single row into fields
    const parseRow = (row) => {
      const fields = [];
      let field = '';
      let inQuote = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        // Handle escaped quotes ("")
        if (char === '"' && nextChar === '"') {
          field += '"';
          i++;
          continue;
        }
        
        // Toggle quote state
        if (char === '"') {
          inQuote = !inQuote;
          continue;
        }
        
        // Field delimiter
        if (char === ',' && !inQuote) {
          fields.push(field);
          field = '';
          continue;
        }
        
        field += char;
      }
      
      fields.push(field);
      return fields;
    };
    
    // Get and process rows
    const rows = getRows(csvString);
    rows.shift(); // Remove header row (first row is headers)
    const cards = [];
    
    rows.forEach((row, index) => {
      if (!row.trim()) return; // Skip empty rows
      
      const fields = parseRow(row);
      while (fields.length < 6) fields.push('');
      
      const id = fields[0].trim();
      const csvNumber = fields[1].trim();
      const category = fields[2].trim() || 'Uncategorized';
      const question = fields[3]; // Don't trim to preserve formatting
      const answer = fields[4];   // Don't trim to preserve formatting
      const additional_info = fields[5]; // Don't trim to preserve formatting
      
      if (question && answer) {
        cards.push({
          id: id || null,
          csvNumber: csvNumber || null,
          category,
          question,
          answer,
          additional_info: additional_info || null,
        });
      } else {
        console.warn(`Skipping row ${index + 1} due to missing Question or Answer`);
      }
    });

    // Validate that we parsed some cards
    if (cards.length === 0) {
      throw new Error('No valid flashcards found in CSV. Please check that your file has the correct format: id,number,category,question,answer,additional_info');
    }
    
    return cards;

    } catch (error) {
      console.error('CSV parsing error:', error);
      // Re-throw with context if it's not already a detailed error
      if (error.message.includes('CSV file') || error.message.includes('No valid flashcards')) {
        throw error;
      } else {
        throw new Error(`CSV parsing failed: ${error.message}. Please check that your file is in proper CSV format.`);
      }
    }
  };

  // Function to parse Excel file
  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { 
            type: 'array', 
            cellText: true, 
            cellFormula: false,
            cellHTML: false,
            cellStyles: true,
            raw: false
          });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Get the range and access cells directly to preserve exact formatting
          const range = XLSX.utils.decode_range(firstSheet['!ref']);
          const rawData = [];
          
          for (let row = 0; row <= range.e.r; row++) {
            const rowData = [];
            for (let col = 0; col <= Math.min(4, range.e.c); col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = firstSheet[cellAddress];
              
              if (cell) {
                // Use the formatted text value (w) which preserves Excel's display formatting
                rowData[col] = cell.w || cell.v || '';
              } else {
                rowData[col] = '';
              }
            }
            rawData.push(rowData);
          }
          
          const jsonData = rawData;
          
          console.log('Raw Excel data:', jsonData); // Debug logging
          
          const cards = [];
          
          // Helper function to get complete cell content
          const getCompleteContent = (cellValue) => {
            if (cellValue === null || cellValue === undefined) return '';
            return String(cellValue);
          };
          
          // Process rows and group them into complete flashcards
          let currentCard = null;
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            console.log(`Processing row ${i}:`, row); // Debug logging
            
            const csvNumber = getCompleteContent(row[0]);
            const category = getCompleteContent(row[1]);
            const question = getCompleteContent(row[2]);
            const answer = getCompleteContent(row[3]);
            const additional_info = getCompleteContent(row[4]);
            
            // Check if this is a new flashcard (has csvNumber and question) or continuation of previous
            if (csvNumber && question) {
              // This is a new flashcard - save the previous one if it exists
              if (currentCard && currentCard.question && currentCard.answer) {
                cards.push(currentCard);
              }
              
              // Start new flashcard
              currentCard = {
                csvNumber: csvNumber,
                category: category ? category.trim() : 'Uncategorized',
                question: question,
                answer: answer,
                additional_info: additional_info || null,
              };
              
              console.log(`New flashcard started: ${question.substring(0, 100)}...`);
            } else if (currentCard && answer) {
              // This is a continuation row - append to current card's answer with proper spacing
              // Preserve existing spacing and only add newline if answer doesn't start with whitespace
              const separator = answer.match(/^\s/) ? '' : '\n';
              currentCard.answer += separator + answer;
              
              // Also append additional_info if present
              if (additional_info) {
                if (currentCard.additional_info) {
                  const infoSeparator = additional_info.match(/^\s/) ? '' : '\n';
                  currentCard.additional_info += infoSeparator + additional_info;
                } else {
                  currentCard.additional_info = additional_info;
                }
              }
              
              console.log(`Answer continued, new length: ${currentCard.answer.length}`);
            }
          }
          
          // Don't forget to add the last card
          if (currentCard && currentCard.question && currentCard.answer) {
            cards.push(currentCard);
            console.log(`Final card added, total answer length: ${currentCard.answer.length}`);
          }
          
          console.log(`Total flashcards created: ${cards.length}`);
          
          resolve(cards);
        } catch (error) {
          console.error('Excel parsing error:', error);
          if (error.message.includes('Unsupported file')) {
            reject(new Error('This Excel file format is not supported. Please save as .xlsx format and try again.'));
          } else if (error.message.includes('password')) {
            reject(new Error('Password-protected Excel files are not supported. Please remove password protection and try again.'));
          } else if (error.message.includes('corrupted')) {
            reject(new Error('The Excel file appears to be corrupted. Please check the file and try again.'));
          } else {
            reject(new Error(`Excel file parsing failed: ${error.message}. Please check that the file is a valid Excel (.xlsx) file.`));
          }
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Function to parse Numbers file (.numbers)
  const parseNumbers = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          // Numbers files are actually zip archives containing XML/protobuf files
          // XLSX.js can handle Numbers files similarly to Excel files
          const workbook = XLSX.read(data, { 
            type: 'array', 
            cellText: true, 
            cellFormula: false,
            cellHTML: false,
            cellStyles: true,
            raw: false
          });
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Get the range and access cells directly to preserve exact formatting
          const range = XLSX.utils.decode_range(firstSheet['!ref']);
          const rawData = [];
          
          for (let row = 0; row <= range.e.r; row++) {
            const rowData = [];
            for (let col = 0; col <= Math.min(4, range.e.c); col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = firstSheet[cellAddress];
              
              if (cell) {
                // Use the formatted text value (w) which preserves Numbers' display formatting
                rowData[col] = cell.w || cell.v || '';
              } else {
                rowData[col] = '';
              }
            }
            rawData.push(rowData);
          }
          
          const jsonData = rawData;
          
          console.log('Raw Numbers data:', jsonData); // Debug logging
          
          const cards = [];
          
          // Helper function to get complete cell content
          const getCompleteContent = (cellValue) => {
            if (cellValue === null || cellValue === undefined) return '';
            return String(cellValue);
          };
          
          // Process rows and group them into complete flashcards
          let currentCard = null;
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            console.log(`Processing Numbers row ${i}:`, row); // Debug logging
            
            const csvNumber = getCompleteContent(row[0]);
            const category = getCompleteContent(row[1]);
            const question = getCompleteContent(row[2]);
            const answer = getCompleteContent(row[3]);
            const additional_info = getCompleteContent(row[4]);
            
            // Check if this is a new flashcard (has csvNumber and question) or continuation of previous
            if (csvNumber && question) {
              // This is a new flashcard - save the previous one if it exists
              if (currentCard && currentCard.question && currentCard.answer) {
                cards.push(currentCard);
              }
              
              // Start new flashcard
              currentCard = {
                csvNumber: csvNumber,
                category: category ? category.trim() : 'Uncategorized',
                question: question,
                answer: answer,
                additional_info: additional_info || null,
              };
              
              console.log(`New Numbers flashcard started: ${question.substring(0, 100)}...`);
            } else if (currentCard && answer) {
              // This is a continuation row - append to current card's answer with proper spacing
              // Preserve existing spacing and only add newline if answer doesn't start with whitespace
              const separator = answer.match(/^\s/) ? '' : '\n';
              currentCard.answer += separator + answer;
              
              // Also append additional_info if present
              if (additional_info) {
                if (currentCard.additional_info) {
                  const infoSeparator = additional_info.match(/^\s/) ? '' : '\n';
                  currentCard.additional_info += infoSeparator + additional_info;
                } else {
                  currentCard.additional_info = additional_info;
                }
              }
              
              console.log(`Numbers answer continued, new length: ${currentCard.answer.length}`);
            }
          }
          
          // Don't forget to add the last card
          if (currentCard && currentCard.question && currentCard.answer) {
            cards.push(currentCard);
            console.log(`Final Numbers card added, total answer length: ${currentCard.answer.length}`);
          }
          
          console.log(`Total Numbers flashcards created: ${cards.length}`);
          
          resolve(cards);
        } catch (error) {
          console.error('Numbers parsing error:', error);
          if (error.message.includes('Unsupported file')) {
            reject(new Error('This Numbers file format is not supported. Please export as Excel (.xlsx) or CSV format and try again.'));
          } else if (error.message.includes('password')) {
            reject(new Error('Password-protected Numbers files are not supported. Please remove password protection and try again.'));
          } else if (error.message.includes('corrupted')) {
            reject(new Error('The Numbers file appears to be corrupted. Please check the file and try again.'));
          } else if (error.message.includes('ENOENT') || error.message.includes('not found')) {
            reject(new Error('Numbers file could not be read. Please check the file path and permissions.'));
          } else {
            reject(new Error(`Numbers file parsing failed: ${error.message}. Please export as Excel (.xlsx) or CSV format for better compatibility.`));
          }
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Handles the CSV file selection (for multiple files)
  const handleFileSelect = (event) => {
    setSelectedUploadFiles(Array.from(event.target.files)); // Store FileList as an array
    setUploadMessage(''); // Clear previous messages
    setUploadError('');
  };

  // Handles the actual CSV upload when the button is clicked
  const handleUploadButtonClick = async () => {
    if (selectedUploadFiles.length === 0) {
      setUploadError('Please select at least one file first.');
      return;
    }

    if (!db || !userId) {
      setUploadError('Database not initialized or user not authenticated. Please try again.');
      return;
    }

    setUploadMessage('Processing files...');
    setUploadError('');

    let totalCardsAdded = 0;
    let totalCardsUpdated = 0;
    let totalFilesProcessed = 0;
    let errorsFound = false;

    // Function to sanitize text for Firestore
    const sanitizeText = (text) => {
      if (!text) return text;
      // We no longer need to replace all forward slashes as this breaks code examples
      // Firestore document content can include forward slashes, only document paths have restrictions
      return text;
    };

    for (const file of selectedUploadFiles) {
      const isExcel = file.name.endsWith('.xlsx');
      const isCsv = file.name.endsWith('.csv');
      const isNumbers = file.name.endsWith('.numbers');

      // File type validation
      if (!isExcel && !isCsv && !isNumbers) {
        setUploadError((prev) => prev + `${file.name}: Invalid file type. Only CSV, Excel (.xlsx), and Numbers (.numbers) files are supported.\n`);
        errorsFound = true;
        continue;
      }

      // File size validation (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setUploadError((prev) => prev + `${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.\n`);
        errorsFound = true;
        continue;
      }

      // Empty file validation
      if (file.size === 0) {
        setUploadError((prev) => prev + `${file.name}: File is empty. Please check the file and try again.\n`);
        errorsFound = true;
        continue;
      }

      try {
        let parsedCards;
        if (isExcel) {
          parsedCards = await parseExcel(file);
        } else if (isNumbers) {
          parsedCards = await parseNumbers(file);
        } else {
          const csvContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (!e.target.result) {
                reject(new Error('Could not read file content. The file might be empty or corrupted.'));
                return;
              }
              resolve(e.target.result);
            };
            reader.onerror = (e) => {
              reject(new Error(`Failed to read CSV file: ${file.name}. The file might be corrupted or in use by another application.`));
            };
            reader.readAsText(file, 'UTF-8');
          });
          parsedCards = parseCSV(csvContent);
        }

        if (parsedCards.length === 0) {
          setUploadError((prev) => prev + `No valid flashcards found in ${file.name}.\n`);
          errorsFound = true;
          continue;
        }

        for (const cardData of parsedCards) {
          if (db && userId) {
            const appId = "flashcard-app-3f2a3";
            const now = new Date();

            // Sanitize the data to prevent Firestore path issues
            const sanitizedData = {
              question: sanitizeText(cardData.question),
              answer: sanitizeText(cardData.answer),
              category: sanitizeText(cardData.category),
              additional_info: cardData.additional_info ? sanitizeText(cardData.additional_info) : null,
              csvNumber: cardData.csvNumber,
              difficulty: fsrsParams.initialDifficulty,
              stability: fsrsParams.initialStability,
              lastReview: serverTimestamp(),
              nextReview: now,
              createdAt: serverTimestamp(),
            };

            try {
              if (cardData.id) {
                // If card has an ID, try to update existing card
                const existingCardRef = doc(db, `/artifacts/${appId}/users/${userId}/flashcards`, cardData.id);
                const existingCard = await getDoc(existingCardRef);
                
                if (existingCard.exists()) {
                  // Update existing card
                  await updateDoc(existingCardRef, sanitizedData);
                  totalCardsUpdated++;
                } else {
                  // Add new card with specified ID
                  await setDoc(existingCardRef, sanitizedData);
                  totalCardsAdded++;
                }
              } else {
                // Add new card without ID
                await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), sanitizedData);
                totalCardsAdded++;
              }
            } catch (error) {
              console.error(`Error processing card: ${error.message}`);
              setUploadError((prev) => prev + `Failed to process card: ${error.message}\n`);
              errorsFound = true;
            }
          }
        }
        totalFilesProcessed++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        
        // Provide specific error messages based on error type
        let errorMessage = '';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name === 'NotReadableError') {
          errorMessage = `Cannot read ${file.name}. The file might be in use by another application or corrupted.`;
        } else if (error.name === 'SecurityError') {
          errorMessage = `Access denied to ${file.name}. Please check file permissions.`;
        } else if (error.name === 'AbortError') {
          errorMessage = `Upload of ${file.name} was cancelled.`;
        } else if (error.name === 'NetworkError') {
          errorMessage = `Network error while uploading ${file.name}. Please check your connection.`;
        } else if (error.toString().includes('QuotaExceeded')) {
          errorMessage = `Storage quota exceeded while processing ${file.name}. Please free up space.`;
        } else {
          errorMessage = `Unknown error processing ${file.name}. Please try again or use a different file format.`;
        }
        
        setUploadError((prev) => prev + `${file.name}: ${errorMessage}\n`);
        errorsFound = true;
      }
    }

    let message = '';
    if (totalCardsUpdated > 0) {
      message += `Updated ${totalCardsUpdated} existing card(s). `;
    }
    if (!errorsFound && totalFilesProcessed > 0) {
      message += `Successfully added ${totalCardsAdded} new flashcard(s) from ${totalFilesProcessed} file(s).`;
    } else if (errorsFound && totalFilesProcessed > 0) {
      message += `Processed ${totalFilesProcessed} file(s). Added ${totalCardsAdded} new cards, updated ${totalCardsUpdated} cards. Some errors occurred.`;
    } else if (errorsFound && totalFilesProcessed === 0) {
      message = "No files were successfully processed.";
    }
    setUploadMessage(message);
    
    setSelectedUploadFiles([]); // Clear selected files after upload attempt
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input visual
  };

  // Function to handle answer suggestion using Gemini API
  const handleSuggestAnswer = async () => {
    const question = newCardQuestionRef.current.value.trim();
    if (!question) {
      console.log("Please enter a question to get a suggestion.");
      return;
    }

    if (!checkApiKeys()) {
      newCardAnswerRef.current.value = "Please configure your API keys in the .env file.";
      return;
    }

    setIsGeneratingAnswer(true);
    try {
      let chatHistory = [];
      const prompt = `Provide a concise and accurate answer for the Java flashcard question: "${question}"`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = apiKeys.gemini;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        newCardAnswerRef.current.value = text.trim();
      } else {
        console.error("Gemini API response did not contain expected text:", result);
        newCardAnswerRef.current.value = "Error generating answer. Please try again.";
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      newCardAnswerRef.current.value = "Error generating answer. Please check your API key and try again.";
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Function to handle generating code example using Gemini API
  const handleGenerateExample = async (question, answer) => {
    if (!question || !answer) {
      console.log("Question and Answer are required to generate an example.");
      return;
    }

    setIsGeneratingExample(true);
    setGeneratedExample(''); // Clear previous example

    try {
      let chatHistory = [];
      const prompt = `Provide a concise Java code example or a clear real-world scenario that illustrates the concept from this flashcard. 
      Question: "${question}"
      Answer: "${answer}"
      Focus on providing a direct, illustrative example. Output only the example, no conversational text.`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = apiKeys.gemini;
      if (!apiKey) {
        console.error("Gemini API key not configured");
        setGeneratedExample("Please configure your Gemini API key in Settings.");
        return;
      }
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setGeneratedExample(text.trim()); // Store the generated example
      } else {
        console.error("Gemini API response for example did not contain expected text:", result);
        setGeneratedExample("Could not generate example. Please try again.");
      }
    } catch (error) {
      console.error("Error calling Gemini API for example:", error);
      setGeneratedExample("Error generating example. Check console for details.");
    } finally {
      setIsGeneratingExample(false);
    }
  };

  // Function to handle generating related questions using Gemini API
  const handleGenerateQuestions = async (question, answer) => {
    if (!question || !answer) {
      console.log("Question and Answer are required to generate related questions.");
      return;
    }

    setIsGeneratingQuestions(true);
    setGeneratedQuestions([]); // Clear previous questions before generating

    try {
      let chatHistory = [];
      const prompt = `Based on the following Java flashcard:\nQuestion: "${question}"\nAnswer: "${answer}"\n\nGenerate 3-5 concise, related follow-up questions to test deeper understanding. Provide them as a numbered list.`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = apiKeys.gemini;
      if (!apiKey) {
        console.error("Gemini API key not configured");
        setGeneratedQuestions([{ id: 'error', text: "Please configure your Gemini API key in Settings.", selected: false }]);
        setShowGeneratedQuestionsModal(true);
        return;
      }
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        // Simple parsing for numbered list, adjust as needed for robust parsing
        const questionsArray = text.split('\n').filter(line => line.match(/^\d+\./)).map(line => ({
            id: crypto.randomUUID(), // Unique ID for each generated question
            text: line.replace(/^\d+\.\s*/, '').trim(),
            selected: true // Default to selected
        }));
        setGeneratedQuestions(questionsArray);
        setShowGeneratedQuestionsModal(true); // Open the modal
      } else {
        console.error("Gemini API response for questions did not contain expected text:", result);
        setGeneratedQuestions([{ id: 'error', text: "Could not generate questions. Please try again.", selected: false }]);
        setShowGeneratedQuestionsModal(true); // Open modal even on error to show message
      }
    } catch (error) {
      console.error("Error calling Gemini API for questions:", error);
      setGeneratedQuestions([{ id: 'error', text: "Error generating questions. Check console for details.", selected: false }]);
      setShowGeneratedQuestionsModal(true); // Open modal even on error to show message
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Handle checkbox change for generated questions
  const handleGeneratedQuestionCheckboxChange = (id) => {
    setGeneratedQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === id ? { ...q, selected: !q.selected } : q
      )
    );
  };

  // Handle generating new cards from selected questions WITH AI-generated answers
  const handleGenerateSelectedCards = async () => {
    if (!db || !userId) return;

    const selectedQ = generatedQuestions.filter(q => q.selected);
    if (selectedQ.length === 0) {
      alert("Please select at least one question to generate a card.");
      return;
    }

    setIsGeneratingSelectedCards(true); // Start loading for batch generation
    let cardsAdded = 0;
    const appId = "flashcard-app-3f2a3"; // Hardcoding appId
    const now = new Date();
    const currentCategory = filteredFlashcards[currentCardIndex]?.category || 'Uncategorized';

    for (const qData of selectedQ) {
      try {
        // Generate answer for the new question
        let answerText = "";
        try {
          const currentApiKey = apiKeys[selectedApiProvider];
          if (!currentApiKey) {
            answerText = "API key not configured for answer generation.";
          } else {
            const chatHistory = [{ role: "user", parts: [{ text: `Provide a concise answer for the flashcard question: "${qData.text}"` }] }];
            const payload = { contents: chatHistory };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentApiKey}`;
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
              answerText = result.candidates[0].content.parts[0].text.trim();
            } else {
              console.warn(`Could not generate answer for question: ${qData.text}`);
              answerText = "Answer could not be generated.";
            }
          }
        } catch (apiError) {
          console.error(`Error generating answer for question "${qData.text}":`, apiError);
          answerText = "Error generating answer.";
        }

        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), {
          question: qData.text,
          answer: answerText, // Use the generated answer
          category: currentCategory, // Inherit category or default
          additional_info: "", // Empty additional info for new cards
          difficulty: fsrsParams.initialDifficulty,
          stability: fsrsParams.initialStability,
          lastReview: serverTimestamp(),
          nextReview: now,
          createdAt: serverTimestamp(),
        });
        cardsAdded++;
      } catch (error) {
        console.error("Error adding generated card:", error);
      }
    }

    alert(`Successfully generated ${cardsAdded} new flashcard(s)!`); // Provide feedback
    setShowGeneratedQuestionsModal(false); // Close the modal
    setGeneratedQuestions([]); // Clear generated questions
    setIsGeneratingSelectedCards(false); // End loading for batch generation
  };


  // Function to handle explaining a concept using Gemini API
  const handleExplainConcept = async (question, answer) => {
    if (!question || !answer) {
      console.log("Question and Answer are required to explain the concept.");
      return;
    }

    setIsExplainingConcept(true);
    setGeminiExplanation(''); // Clear previous explanation

    try {
      let chatHistory = [];
      const prompt = `Explain the core concept or provide more context for the following Java flashcard:\nQuestion: "${question}"\nAnswer: "${answer}"\n\nKeep the explanation concise and beginner-friendly.`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = apiKeys.gemini;
      if (!apiKey) {
        console.error("Gemini API key not configured");
        setGeminiExplanation("Please configure your Gemini API key in Settings.");
        return;
      }
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setGeminiExplanation(text.trim()); // Store the generated explanation
      } else {
        console.error("Gemini API response for explanation did not contain expected text:", result);
        setGeminiExplanation("Could not generate explanation. Please try again.");
      }
    } catch (error) {
      console.error("Error calling Gemini API for explanation:", error);
      setGeminiExplanation("Error generating explanation. Check console for details.");
    } finally {
      setIsExplainingConcept(false);
    }
  };


  // Function to enter edit mode for a card
  const handleEditCard = (card) => {
    setEditCardData({ ...card }); // Copy card data to edit state
    setGeneratedQuestions([]); // Clear any old generated questions when opening edit from button
    setIsEditingCard(true);
  };

  // Function to save changes to a card
  const handleSaveCardChanges = async () => {
    if (!db || !userId || !editCardData) return;

    const updatedQuestion = editQuestionRef.current.value.trim();
    const updatedAnswer = editAnswerRef.current.value.trim();
    const updatedCategory = editCategoryRef.current.value.trim() || 'Uncategorized';
    const updatedAdditionalInfo = editAdditionalInfoRef.current.value.trim() || null;

    if (!updatedQuestion || !updatedAnswer) {
      alert("Question and Answer cannot be empty."); // Using alert for simplicity, replace with custom modal for production
      return;
    }

    const appId = "flashcard-app-3f2a3"; // Hardcoding appId
    try {
      await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/flashcards`, editCardData.id), {
        question: updatedQuestion,
        answer: updatedAnswer,
        category: updatedCategory,
        additional_info: updatedAdditionalInfo,
      });
      console.log(`Card ${editCardData.id} updated successfully!`);
      setIsEditingCard(false); // Exit edit mode
      setEditCardData(null); // Clear edit data
      setGeneratedQuestions([]); // Clear generated questions after saving
    } catch (error) {
      console.error("Error updating flashcard:", error);
    }
  };

  // Function to delete a card
  const handleDeleteCard = async () => {
    if (!db || !userId || !editCardData) return;

    // Show confirmation dialog before deleting
    setShowConfirmDelete(true);
  };

  // Confirmed delete action
  const confirmDelete = async () => {
    setShowConfirmDelete(false); // Close confirmation modal
    if (!db || !editCardData?.id) return;

    const appId = "flashcard-app-3f2a3"; // Hardcoding appId
    try {
      await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/flashcards`, editCardData.id));
      console.log(`Card ${editCardData.id} deleted successfully!`);
      setIsEditingCard(false); // Exit edit mode
      setEditCardData(null); // Clear edit data
      setGeneratedQuestions([]); // Clear generated questions after deleting
      // Navigate to the next card or default view if current card was deleted
      if (filteredFlashcards.length > 0) {
        setCurrentCardIndex(0); // Reset to first card
      } else {
        setCurrentCardIndex(0); // No cards left
      }
    } catch (error) {
      console.error("Error deleting flashcard:", error);
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setShowConfirmDelete(false);
  };

  const handleCopyPrompt = () => {
    // Uses the Clipboard API for modern browsers
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(generationPromptContent.trim())
        .then(() => {
          setCopyFeedback('Copied!');
          setTimeout(() => setCopyFeedback(''), 2000); // Clear feedback after 2 seconds
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          setCopyFeedback('Failed to copy.');
          setTimeout(() => setCopyFeedback(''), 2000);
        });
    } else {
      // Fallback for older browsers (e.g., execCommand)
      // Note: execCommand is deprecated, but useful for broader compatibility in some limited environments
      const textArea = document.createElement("textarea");
      textArea.value = generationPromptContent.trim();
      textArea.style.position = "fixed";  // Avoid scrolling to bottom
      textArea.style.left = "-9999px"; // Hide element
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback('Copied!');
        setTimeout(() => setCopyFeedback(''), 2000);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        setCopyFeedback('Failed to copy (fallback).');
        setTimeout(() => setCopyFeedback(''), 2000);
      }
      document.body.removeChild(textArea);
    }
  };


  // Calculate reviewed and yet-to-review counts for FILTERED cards
  const now = new Date(); // Use current time for more precise "due" calculation

  // Cards that are due for review (nextReview is now or in the past, or not set for new cards)
  const yetToReviewCards = filteredFlashcards.filter(card => {
    const nextReviewDate = card.nextReview ? card.nextReview.toDate() : null;
    // A card is due if it has no nextReview date (new card) or if its nextReview date is now or in the past
    return !nextReviewDate || nextReviewDate <= now;
  });

  // Cards that have been reviewed and are not yet due again (nextReview is in the future)
  const reviewedCards = filteredFlashcards.filter(card => {
    const nextReviewDate = card.nextReview ? card.nextReview.toDate() : null;
    // A card is reviewed if it has a nextReview date AND that date is in the future
    return nextReviewDate && nextReviewDate > now;
  });

  const totalCardsCount = filteredFlashcards.length;
  const reviewedCount = reviewedCards.length;
  const toReviewCount = yetToReviewCards.length;

  // Calculate cards actually due today
  // If showDueTodayOnly is true, filteredFlashcards already contains only cards due today
  // If showDueTodayOnly is false, we need to calculate cards due today from all cards
  const cardsDueToday = showDueTodayOnly ? 
    totalCardsCount : 
    flashcards.filter(card => {
      // Apply category filter first
      if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
      
      if (!card.nextReview) return false;
      const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today to match the filtering logic
      return nextReviewDate <= today;
    }).length;

  // Calculate cards reviewed today
  const cardsReviewedToday = flashcards.filter(card => {
    // Apply category filter first
    if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
    
    if (!card.lastReview) return false;
    const lastReviewDate = card.lastReview.toDate ? card.lastReview.toDate() : new Date(card.lastReview);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
    return lastReviewDate >= today && lastReviewDate < tomorrow;
  }).length;


  // Function to get daily due counts for the next 30 days (for ALL flashcards, not just filtered)
  const getDailyDueCounts = () => {
    const dailyCounts = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dailyCounts[dateString] = 0;
    }

    flashcards.forEach(card => {
      const nextReviewDate = card.nextReview ? card.nextReview.toDate() : null;
      if (nextReviewDate) {
        const cardDueDate = new Date(nextReviewDate);
        cardDueDate.setHours(0, 0, 0, 0);

        if (cardDueDate <= today) {
          const todayString = today.toISOString().split('T')[0];
          dailyCounts[todayString] = (dailyCounts[todayString] || 0) + 1;
        } else {
          const futureDateString = cardDueDate.toISOString().split('T')[0];
          if (dailyCounts.hasOwnProperty(futureDateString)) {
            dailyCounts[futureDateString] = (dailyCounts[futureDateString] || 0) + 1;
          }
        }
      } else {
        const todayString = today.toISOString().split('T')[0];
        dailyCounts[todayString] = (dailyCounts[todayString] || 0) + 1;
      }
    });

    return dailyCounts;
  };

  const dailyDueCounts = getDailyDueCounts();

  // Get unique categories for the dropdown
  const uniqueCategories = ['All', ...new Set(flashcards.map(card => card.category || 'Uncategorized'))].sort();

  // Effect to handle keyboard events for navigation and review
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only trigger if no modals or forms are open and there are filtered flashcards
      const isStudyViewActive = !showCreateCardForm && !showUploadCsvForm && !showCalendarModal && !showSettingsModal && !isEditingCard && !showGeneratedQuestionsModal;
      if (!isStudyViewActive || filteredFlashcards.length === 0) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault(); // Prevent scrolling down the page
        setShowAnswer(prev => !prev); // Toggle the answer visibility
        setGeneratedExample(''); // Clear generated example when flipping
        setGeneratedQuestions([]); // Clear generated questions when flipping
        setGeminiExplanation(''); // Clear generated explanation when flipping
      } else if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        reviewCard(1, filteredFlashcards[currentCardIndex]);
      } else if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        reviewCard(2, filteredFlashcards[currentCardIndex]);
      } else if (event.key === 'g' || event.key === 'G') {
        event.preventDefault();
        reviewCard(3, filteredFlashcards[currentCardIndex]);
      } else if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        reviewCard(4, filteredFlashcards[currentCardIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener when the component unmounts or dependencies change
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showCreateCardForm,
    showUploadCsvForm,
    showCalendarModal,
    showSettingsModal,
    isEditingCard,
    showGeneratedQuestionsModal,
    filteredFlashcards,
    currentCardIndex,
    reviewCard
  ]);

  // Content for the File Upload Guide in Settings
  const csvUploadGuideContent = `
### Understanding the File Upload Format

Your flashcard application supports CSV, Excel (.xlsx), and Numbers (.numbers) files. All formats expect the same column structure to correctly parse the data. Here's a breakdown of each field and how to handle special characters:

**Format:** \`number,category,question,answer,additional_info\`

1.  **\`number\` (Optional):**
    * This field is for an arbitrary numerical identifier.
    * **If you don't provide a number, leave this field completely empty.** Do not put \`""\` or \` \` (a space).
    * Example (empty number): \`,,Spring Security,What is CSRF protection?,...\`

2.  **\`category\` (Optional):**
    * This field allows you to group your flashcards.
    * **If you don't provide a category, leave this field completely empty.** It will default to 'Uncategorized' in the app.
    * Example (empty category): \`,,What is a binary tree?,...\`

3.  **\`question\` (Required):**
    * The question for your flashcard. This field cannot be empty.

4.  **\`answer\` (Required):**
    * The answer to your flashcard. This field cannot be empty.

5.  **\`additional_info\` (Optional):**
    * This field is for any extra notes, context, or code examples related to the flashcard.
    * **If you don't provide additional info, leave this field completely empty.**

#### Handling Special Characters within Fields

The most critical aspect of CSV is correctly handling content that contains delimiters (commas), line breaks, or quotation marks within a field's data.

* **Commas (\`,\`) within a field:**
    * If a field's content contains a comma, the **entire field must be enclosed in double quotes (\`"\`)\`.**
    * Example: \`,,What are the three core principles of OOP?,"Encapsulation, Inheritance, Polymorphism",...\`

* **Newline characters (line breaks) within a field:**
    * If a field's content spans multiple lines, the **entire field must be enclosed in double quotes (\`"\`)\`.** The newlines within the quotes will be preserved.
    * Example: \`,,Explain @Transactional annotation,"@Transactional annotation provides:\\n1. Transaction management\\n2. Rollback capabilities\\n3. Isolation levels",...\`
    * *Note:* The \`\\n\` here represents a newline character.

* **Double Quotes (\`"\`) within a quoted field:**
    * If a field is enclosed in double quotes (because it contains commas or newlines), and the field * itself* contains a double quote, that **internal double quote must be escaped by preceding it with another double quote (\`""\`)\`.**
    * Example: \`,,What does ""immutable"" mean?,"It means the object's state cannot be changed after it is created.",...\`

#### Example of a Complete CSV File

\`\`\`
number,category,question,answer,additional_info
,Spring Security,What is CSRF protection?,"CSRF protection prevents unauthorized commands from being transmitted from a user's browser to a web application. It uses a token to ensure requests are legitimate.","More details on synchronizer token pattern, often involves a hidden token."
10,Spring Data,Explain @Transactional annotation,"@Transactional annotation provides:\\n1. Transaction management\\n2. Rollback capabilities\\n3. Isolation levels","Useful for ensuring data consistency in database operations."
,Java Basics,What is the difference between \`==\` and \`.equals()\`?,"\`==\` compares object references (memory addresses) for primitive types or if two variables refer to the exact same object instance.
\`.equals()\` compares the actual content/value of objects, as defined by the class's implementation (e.g., String, Integer classes override it to compare content).","Primitive types always use \`==\`."
20,Algorithms,What is Big O notation?,"Big O notation describes the upper bound of the growth rate of an algorithm's running time or space requirements in terms of the input size. It helps classify algorithms according to how their run time or space requirements grow as the input size grows.","Common Big O notations: O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n), O(n!)."
\`\`\`
`;

  // Content for the Prompt for Generating Flashcards
  const generationPromptContent = `
Please generate 20 flashcards about [Subject].
For each flashcard, provide the following information in CSV format:
number,category,question,answer,additional_info

Constraints:
- Number is optional; if omitted, leave it empty.
- Category is optional; if omitted, default to 'Uncategorized'.
- Question and Answer are required and should not be empty.
- Use quotes for multiline content or content that contains commas.
- Ensure the CSV content is UTF-8 encoded.
- Additional_info is optional; if omitted, leave it empty.

Example with multiline answer and additional info:
,Spring Security,What is CSRF protection?,"CSRF protection prevents unauthorized commands from being transmitted from a user's browser to a web application. It uses a token to ensure requests are legitimate.",More details on synchronizer token pattern.

Example with no number, category, or additional_info:
,,What is a binary tree?,A tree data structure in which each node has at most two children, which are referred to as the left child and the right child.
`;


  // Show loading screen while authentication is being determined
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 font-inter bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Loading...</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Show login screen first on app load or when explicitly requested
  if (showLoginScreen || !userId) {
    return (
      <LoginScreen
        authError={authError}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        handleAnonymousLogin={handleAnonymousLogin}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
      />
    );
  }

  // Show loading state if settings aren't loaded yet (only after user is logged in)
  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 font-inter dark:from-gray-800 dark:to-gray-900 transition-colors duration-500">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading user settings...</p>
      </div>
    );
  }

  // Determine the current flashcard to display
  const currentCard = filteredFlashcards[currentCardIndex];

  // Function to export cards as CSV
  const handleExportCards = () => {
    if (!filteredFlashcards || filteredFlashcards.length === 0) {
      alert('No cards to export!');
      return;
    }

    // Create CSV content
    const headers = ['id', 'number', 'category', 'question', 'answer', 'additional_info'];
    const csvContent = [
      headers.join(','),
      ...filteredFlashcards.map((card, index) => {
        // Function to properly escape and quote CSV fields
        const escapeField = (field) => {
          if (!field) return '';
          // Replace double quotes with double double quotes and wrap in quotes
          return `"${field.replace(/"/g, '""')}"`;
        };

        const row = [
          card.id || '',
          card.csvNumber || '',
          card.category || '',
          escapeField(card.question),
          escapeField(card.answer),
          escapeField(card.additional_info)
        ];
        return row.join(',');
      })
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    // Format the date as 'Wednesday, June 11, 2025'
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);
    
    // Use both formats in filename for clarity
    link.setAttribute('download', `flashcards_export_${formattedDate.replace(/,/g, '').replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <div className="min-h-screen flex flex-col items-center justify-center p-6 font-inter bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-gray-900 dark:to-indigo-950 text-slate-800 dark:text-slate-100 transition-all duration-700 ease-out backdrop-blur-sm"
         style={{
           background: 'linear-gradient(135deg, #ffffff 0%, #fefeff 25%, #fdfdff 50%, #fefffe 75%, #ffffff 100%)',
           backgroundSize: '400% 400%',
           animation: 'gradientShift 15s ease infinite',
           paddingTop: '300px'
         }}>
      {/* Combined Header Panel */}
      <div className="fixed top-6 left-6 right-6 z-50" style={{ position: 'fixed', top: '24px', left: '24px', right: '24px', zIndex: 9999 }}>
        <div className="backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-700/50 dark:border-blue-700/50 p-8 relative" style={{ backgroundColor: 'rgba(147, 197, 253, 0.7)' }}>
          {/* Top Row - Navigation and Logo */}
          <div className="flex items-center justify-between mb-6">
            
            {/* Left Section - Navigation Buttons */}
            <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setShowCreateCardForm(false);
              setShowUploadCsvForm(false);
            }}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Study Cards
            </span>
          </button>
          <button
            onClick={() => {
              setShowCreateCardForm(true);
              setShowUploadCsvForm(false);
            }}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Card
            </span>
          </button>
          <button
            onClick={() => {
              setShowUploadCsvForm(true);
              setShowCreateCardForm(false);
            }}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload File
            </span>
          </button>
          <button
            onClick={handleExportCards}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </span>
          </button>

          {/* Login Button - Only show when not logged in */}
          {!userId && (
            <button
              onClick={() => setShowLoginModal(true)}
              className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-800 dark:to-green-800 text-emerald-700 dark:text-emerald-200 hover:from-emerald-200 hover:to-green-200 dark:hover:from-emerald-700 dark:hover:to-green-700 focus:ring-emerald-400 shadow-md hover:shadow-lg"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </span>
            </button>
          )}

            </div>
            
            {/* Center Section - FSRS Logo */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700 dark:from-blue-400 dark:to-purple-500">
                FSRS Flashcards
              </h1>
            </div>
            
            {/* Right Section - Statistics */}
            <div className="flex items-center">
              {/* Statistics */}
              <div className="flex flex-col space-y-3 text-right">
                {showDueTodayOnly ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📅</span>
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">Today's Progress</p>
                        <p className="text-amber-600 dark:text-amber-400 text-lg font-bold">{cardsReviewedToday}/{cardsDueToday}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">Reviewed</p>
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">{reviewedCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⏳</span>
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">To Review</p>
                        <p className="text-orange-600 dark:text-orange-400 text-sm font-semibold">{toReviewCount}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Bottom Right */}
          <div className="absolute bottom-6 right-6" style={{ position: 'absolute', bottom: '24px', right: '24px' }}>
            <div className="flex items-center gap-2">
              {/* Calendar Button */}
              <button
                onClick={() => setShowCalendarModal(true)}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg border border-blue-700 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Show calendar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              {/* Settings Icon Button */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg border border-blue-700 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Open settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.942 3.33.83 2.891 2.673a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.942 1.543-.83 3.33-2.673 2.891a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.942-3.33-.83-2.891-2.673a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.942-1.543.83-3.33 2.673-2.891a1.724 1.724 0 002.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Logout Button - Only show when logged in */}
              {userId && (
                <button
                  onClick={handleLogout}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg border border-blue-700 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Category Filter - Full width below */}
          {flashcards.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300/50 dark:border-gray-600/50">
              <label htmlFor="category-filter" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                Filter by Category:
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full max-w-xs py-2 px-3 border-0 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold cursor-pointer text-slate-700 dark:text-slate-200 transition-all duration-300"
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat} className="py-1">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
          
        </div>
      </div>


      {showCreateCardForm ? (
        // Create New Card Form
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 mb-8 transition-all duration-500 ease-in-out transform scale-100 opacity-100 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center dark:text-gray-200">Add New Flashcard</h2>
          <form onSubmit={handleAddCard} className="space-y-6">
            <div>
              <label htmlFor="question" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Question:
              </label>
              <textarea
                id="question"
                ref={newCardQuestionRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows="4"
                placeholder="Enter the question for the flashcard..."
              ></textarea>
            </div>
            <div>
              <label htmlFor="answer" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Answer:
              </label>
              <textarea
                id="answer"
                ref={newCardAnswerRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows="4"
                placeholder="Enter the answer for the flashcard..."
              ></textarea>
              {/* Gemini API Suggest Answer Button */}
              <button
                type="button"
                onClick={handleSuggestAnswer}
                disabled={isGeneratingAnswer}
                className={`w-full mt-3 py-2 px-4 rounded-lg font-semibold transition-all duration-300 transform shadow-md
                           ${isGeneratingAnswer ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                           text-black focus:outline-none focus:ring-4 focus:ring-purple-300 dark:bg-purple-800 dark:hover:bg-purple-700`}
              >
                {isGeneratingAnswer ? 'Suggesting...' : 'Suggest Answer ✨'}
              </button>
            </div>
            <div>
              <label htmlFor="category" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Category (Optional):
              </label>
              <input
                id="category"
                type="text"
                ref={newCardCategoryRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="e.g., Spring, Algorithms, Databases"
              />
            </div>
            {/* New Additional Info section */}
            <div>
              <label htmlFor="additional-info" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Additional Information (Optional):
              </label>
              <textarea
                id="additional-info"
                ref={newCardAdditionalInfoRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows="3"
                placeholder="Add extra notes, context, or code examples here..."
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-black font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
            >
              Add Card
            </button>
          </form>
        </div>
      ) : showUploadCsvForm ? (
        // New CSV Upload Form
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 mb-8 transition-all duration-500 ease-in-out transform scale-100 opacity-100 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center dark:text-gray-200">Upload Flashcards from File</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="csv-upload" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Select File(s) (CSV, Excel, Numbers):
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,.xlsx,.numbers"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="block w-full text-sm text-gray-500
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100 cursor-pointer
                           dark:file:bg-blue-800 dark:file:text-blue-100 dark:hover:file:bg-blue-700 dark:text-gray-300"
              />
              {selectedUploadFiles.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-h-20 overflow-y-auto">
                  Files selected:
                  <ul className="list-disc list-inside ml-2">
                    {selectedUploadFiles.map((file, index) => (
                      <li key={index} className="font-semibold">{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleUploadButtonClick} // New upload button
              disabled={selectedUploadFiles.length === 0 || uploadMessage.startsWith('Processing')}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform shadow-md hover:shadow-lg active:shadow-inner
                         ${selectedUploadFiles.length === 0 || uploadMessage.startsWith('Processing') ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                         text-black focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95`}
            >
              {uploadMessage.startsWith('Processing') ? 'Uploading...' : `Upload Selected File${selectedUploadFiles.length > 1 ? 's' : ''}`}
            </button>

            {uploadMessage && !uploadMessage.startsWith('Processing') && (
              <p className="text-green-600 text-center font-bold">{uploadMessage}</p>
            )}
            {uploadError && (
              <p className="text-red-600 text-center font-bold">{uploadError}</p>
            )}

            {/* Prompt for Generating Flashcards - Now a collapsible dropdown */}
            <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300 overflow-auto max-h-60">
              <div className="flex justify-between items-center w-full focus:outline-none">
                <button
                  onClick={() => setShowGenerationPrompt(!showGenerationPrompt)}
                  className="flex items-center w-full focus:outline-none"
                >
                  <h3 className="font-bold mr-2">Prompt for Generating Flashcards:</h3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-700 dark:text-gray-200 transition-transform duration-300 ${
                      showGenerationPrompt ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleCopyPrompt}
                  className="ml-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-semibold shadow-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
                  title="Copy prompt to clipboard"
                >
                  {copyFeedback || 'Copy'}
                </button>
              </div>
              {showGenerationPrompt && (
                <pre className="whitespace-pre-wrap font-mono text-xs p-2 bg-gray-200 rounded-md dark:bg-gray-900 dark:text-gray-100 mt-2">
                  {generationPromptContent.trim()}
                </pre>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Flashcard Study View
        <div className="flex flex-col md:flex-row items-start justify-center w-full max-w-7xl gap-4"> {/* Outer wrapper for side-by-side layout */}
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 w-full" role="alert">
              <strong className="font-bold">Firebase Authentication Error:</strong>
              <span className="block sm:inline ml-2">{authError}</span>
            </div>
          )}
          {filteredFlashcards.length > 0 && currentCard ? (
            <>
              <div className="flex items-center justify-center w-full md:w-3/4 flex-col"> {/* Main card wrapper and AI buttons container */}
                <div className="flex items-center justify-center w-full"> {/* Card container */}
                  {/* Flashcard Panel Container with navigation layout */}
                  <div className="relative backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-700/50 dark:border-blue-700/50 p-16" style={{ backgroundColor: 'rgba(147, 197, 253, 0.7)', borderRadius: '1.5rem', overflow: 'visible', minHeight: '56rem', minWidth: '80rem' }}>
                    
                    {/* Spacer for top */}
                    <div className="h-8"></div>
                    
                    {/* Main content area with arrows positioned in space between card and panel edges */}
                    <div className="relative flex items-center justify-center">
                      
                      {/* Left Arrow Button - Positioned just outside card edge within panel */}
                      <button
                        onClick={prevCard}
                        className="absolute top-1/2 transform -translate-y-1/2 group flex items-center justify-center p-3 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-900/90 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
                        style={{ left: '2rem' }}
                        aria-label="Previous card (Left Arrow)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Flashcard Container */}
                      <div className="flex justify-center items-center">
                    {/* Flashcard (main content area) */}
                    <div
                      className="relative w-full max-w-7xl h-[58rem] backdrop-blur-2xl bg-gradient-to-br from-white/90 via-blue-50/80 to-indigo-100/90 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-indigo-900/90 rounded-3xl shadow-2xl border border-white/30 dark:border-slate-600/30 flex flex-col items-center justify-center text-center p-14 cursor-pointer transform transition-all duration-700 ease-out hover:scale-[1.02] hover:shadow-3xl"
                      onClick={() => setShowAnswer(!showAnswer)}
                      style={{ 
                        minHeight: '58rem', 
                        minWidth: '1050px',
                        borderRadius: '1.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240, 249, 255, 0.8) 25%, rgba(224, 231, 255, 0.8) 75%, rgba(255,255,255,0.9) 100%)',
                        overflow: 'hidden'
                      }}
                    >
                    <div className="absolute inset-0 backdrop-blur-sm bg-white dark:bg-slate-100 flex flex-col justify-start p-10 text-slate-800 dark:text-slate-900 transition-all duration-700 ease-out backface-hidden border-2 border-slate-200 dark:border-slate-600 shadow-lg" style={{ borderRadius: '2rem' }}
                         style={{ transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                      <div className="text-4xl font-bold mb-8 overflow-auto max-h-full leading-relaxed text-center mt-8">
                        <div className="text-3xl text-blue-600 dark:text-blue-400 mb-4 font-bold">Question</div>
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-2xl">
                          {currentCard.question}
                        </p>
                      </div>
                    </div>

                    <div className="absolute inset-0 backdrop-blur-sm bg-white dark:bg-slate-100 flex flex-col justify-between p-10 text-slate-800 dark:text-slate-900 transition-all duration-700 ease-out backface-hidden border-2 border-slate-200 dark:border-slate-600 shadow-lg" style={{ borderRadius: '2rem' }}
                         style={{ transform: showAnswer ? 'rotateY(0deg)' : 'rotateY(-180deg)', backfaceVisibility: 'hidden' }}>
                      {/* Display answer with improved formatting */}
                      <div className="mb-6 overflow-y-auto w-full flex-grow mt-8" style={{ maxHeight: 'calc(100% - 200px)' }}>
                        <div className="text-3xl text-emerald-600 dark:text-emerald-400 mb-6 font-bold text-center">Answer</div>
                        <div className="prose prose-lg max-w-none dark:prose-invert">
                          <div className="text-2xl leading-relaxed font-bold text-slate-700 dark:text-slate-200">
                            {(() => {
                              const lines = currentCard.answer.split('\n');
                              const result = [];
                              let i = 0;
                              
                              while (i < lines.length) {
                                const line = lines[i];
                                
                                // Handle multi-line code blocks with ```
                                if (line.trim().startsWith('```')) {
                                  let language = line.replace('```', '').trim();
                                  if (!language) {
                                    // Auto-detect language based on content
                                    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
                                    if (nextLine.includes('def ') || nextLine.includes('print(')) language = 'python';
                                    else if (nextLine.includes('function') || nextLine.includes('const ') || nextLine.includes('=>')) language = 'javascript';
                                    else if (nextLine.includes('public class') || nextLine.includes('System.out')) language = 'java';
                                    else if (nextLine.includes('#include') || nextLine.includes('int main')) language = 'cpp';
                                    else language = 'javascript'; // default
                                  }
                                  const codeLines = [];
                                  i++; // Skip the opening ```
                                  
                                  while (i < lines.length && !lines[i].trim().startsWith('```')) {
                                    codeLines.push(lines[i]);
                                    i++;
                                  }
                                  
                                  // Format code content with proper line breaks
                                  const formatCode = (code) => {
                                    return code
                                      .replace(/\s*{\s*/g, ' {\n    ') // Opening braces
                                      .replace(/\s*}\s*/g, '\n}\n') // Closing braces
                                      .replace(/;\s*(?![}])/g, ';\n    ') // Semicolons (except before closing brace)
                                      .replace(/\n\s*\n/g, '\n') // Remove empty lines
                                      .replace(/^\s+/gm, (match) => '    '.repeat(Math.floor(match.length / 4))) // Normalize indentation
                                      .trim();
                                  };
                                  
                                  const rawCodeContent = codeLines.join('\n');
                                  const codeContent = rawCodeContent.includes('\n') ? rawCodeContent : formatCode(rawCodeContent);
                                  result.push(
                                    <div key={`code-${i}`} className="my-4">
                                      <SyntaxHighlighter 
                                        language={language}
                                        style={vscDarkPlus}
                                        customStyle={{
                                          borderRadius: '8px',
                                          fontSize: '14px',
                                          padding: '16px',
                                          margin: '0',
                                          whiteSpace: 'pre-wrap',
                                          overflow: 'auto'
                                        }}
                                        PreTag="div"
                                        wrapLines={true}
                                        wrapLongLines={true}
                                        showLineNumbers={true}
                                      >
                                        {codeContent}
                                      </SyntaxHighlighter>
                                    </div>
                                  );
                                  i++; // Skip the closing ```
                                  continue;
                                }
                                
                                // Handle single-line code (lines that look like code)
                                if (line.trim().match(/^(function|const|let|var|if|for|while|class|import|export|return|console\.|def |print\(|#include|public |private |void |int |string )/) ||
                                    line.trim().match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=\(\{]/) ||
                                    line.trim().includes('->') || 
                                    line.trim().includes('=>') ||
                                    line.trim().includes('System.out') ||
                                    line.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)\s*[{;]/) ||
                                    (line.trim().includes('(') && line.trim().includes(')') && line.trim().includes(';'))) {
                                  // Auto-detect language for single line
                                  let singleLineLanguage = 'javascript';
                                  if (line.includes('def ') || line.includes('print(')) singleLineLanguage = 'python';
                                  else if (line.includes('System.out') || line.includes('public ')) singleLineLanguage = 'java';
                                  else if (line.includes('#include') || line.includes('std::')) singleLineLanguage = 'cpp';
                                  
                                  // Format single line code if it's too long or has multiple statements
                                  const formatSingleLine = (code) => {
                                    if (code.length < 80 && !code.includes('{') && !code.includes('}')) {
                                      return code; // Keep short, simple lines as-is
                                    }
                                    return code
                                      .replace(/\s*{\s*/g, ' {\n    ') // Opening braces
                                      .replace(/\s*}\s*/g, '\n}') // Closing braces
                                      .replace(/;\s*(?![}])/g, ';\n    ') // Semicolons
                                      .replace(/\n\s*\n/g, '\n') // Remove empty lines
                                      .trim();
                                  };
                                  
                                  const formattedLine = formatSingleLine(line);
                                  
                                  result.push(
                                    <div key={i} className="my-3">
                                      <SyntaxHighlighter 
                                        language={singleLineLanguage}
                                        style={vscDarkPlus}
                                        customStyle={{
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          padding: '12px',
                                          margin: '0',
                                          whiteSpace: 'pre-wrap',
                                          overflow: 'auto'
                                        }}
                                        PreTag="div"
                                        wrapLines={true}
                                        wrapLongLines={true}
                                      >
                                        {formattedLine}
                                      </SyntaxHighlighter>
                                    </div>
                                  );
                                  i++;
                                  continue;
                                }
                                
                                // Handle headers (lines that start with #)
                                if (line.trim().startsWith('#')) {
                                  const headerLevel = line.match(/^#+/)?.[0].length || 1;
                                  const headerText = line.replace(/^#+\s*/, '');
                                  const headerClass = headerLevel === 1 ? 'text-2xl font-bold mt-4 mb-2' : 
                                                    headerLevel === 2 ? 'text-xl font-semibold mt-3 mb-2' : 
                                                    'text-lg font-bold mt-2 mb-1';
                                  result.push(
                                    <h3 key={i} className={`${headerClass} text-blue-700 dark:text-blue-300`}>
                                      {headerText}
                                    </h3>
                                  );
                                  i++;
                                  continue;
                                }
                                
                                // Handle bullet points
                                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                                  result.push(
                                    <div key={i} className="flex items-start my-1">
                                      <span className="text-blue-500 font-bold mr-2 mt-1">•</span>
                                      <span className="flex-1">{line.replace(/^[-*]\s*/, '')}</span>
                                    </div>
                                  );
                                  i++;
                                  continue;
                                }
                                
                                // Handle numbered lists
                                if (line.trim().match(/^\d+\.\s/)) {
                                  const number = line.match(/^(\d+)\./)?.[1];
                                  const text = line.replace(/^\d+\.\s*/, '');
                                  result.push(
                                    <div key={i} className="flex items-start my-1">
                                      <span className="text-blue-500 font-semibold mr-2 min-w-[1.5rem]">{number}.</span>
                                      <span className="flex-1">{text}</span>
                                    </div>
                                  );
                                  i++;
                                  continue;
                                }
                                
                                // Handle inline code (text within backticks)
                                if (line.includes('`')) {
                                  const parts = line.split(/(`[^`]+`)/);
                                  result.push(
                                    <p key={i} className="my-2 leading-relaxed">
                                      {parts.map((part, partIndex) => 
                                        part.startsWith('`') && part.endsWith('`') ? (
                                          <code key={partIndex} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono text-blue-600 dark:text-blue-400">
                                            {part.slice(1, -1)}
                                          </code>
                                        ) : (
                                          <span key={partIndex}>{part}</span>
                                        )
                                      )}
                                    </p>
                                  );
                                  i++;
                                  continue;
                                }
                                
                                // Handle empty lines
                                if (line.trim() === '') {
                                  result.push(<div key={i} className="h-3"></div>);
                                  i++;
                                  continue;
                                }
                                
                                // Regular text paragraphs
                                result.push(
                                  <p key={i} className="my-2 leading-relaxed">
                                    {line}
                                  </p>
                                );
                                i++;
                              }
                              
                              return result;
                            })()}
                          </div>
                        </div>
                      </div>
                      {/* Additional Info / Generated Content within the card */}
                      {currentCard.additional_info && (
                        <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-100 rounded-lg max-h-20 overflow-auto w-full dark:bg-gray-600 dark:text-gray-300">
                          **Additional Info:** {currentCard.additional_info}
                        </div>
                      )}
                      {generatedExample && (
                        <div className="mt-3 p-2 bg-gray-100 rounded-lg text-sm text-gray-700 text-left overflow-auto w-full dark:bg-gray-600 dark:text-gray-200">
                          <h4 className="font-bold mb-1">Example:</h4>
                          <pre className="whitespace-pre-wrap font-mono text-xs dark:text-gray-100 p-2 bg-gray-200 dark:bg-gray-800 rounded-md">
                            <code>{generatedExample}</code>
                          </pre>
                        </div>
                      )}
                      {geminiExplanation && (
                        <div className="mt-3 p-2 bg-gray-100 rounded-lg text-sm text-gray-700 text-left overflow-auto w-full dark:bg-gray-600 dark:text-gray-200">
                          <h4 className="font-bold mb-1">Explanation:</h4>
                          <pre className="whitespace-pre-wrap font-mono text-xs dark:text-gray-100">
                            {geminiExplanation}
                          </pre>
                        </div>
                      )}

                      {/* AI Buttons aligned at the very bottom inside the card */}
                      <div className="w-full flex justify-around space-x-2 mt-auto pt-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleGenerateExample(currentCard.question, currentCard.answer); }}
                          disabled={isGeneratingExample}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isGeneratingExample ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}
                                     text-black focus:outline-none focus:ring-4 focus:ring-teal-300 active:scale-95`}
                        >
                          {isGeneratingExample ? 'Generating...' : 'Example ✨'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleGenerateQuestions(currentCard.question, currentCard.answer); }}
                          disabled={isGeneratingQuestions}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isGeneratingQuestions ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}
                                     text-black focus:outline-none focus:ring-4 focus:ring-orange-300 active:scale-95`}
                        >
                          {isGeneratingQuestions ? 'Generating...' : 'Related Questions ✨'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleExplainConcept(currentCard.question, currentCard.answer); }}
                          disabled={isExplainingConcept}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isExplainingConcept ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700'}
                                     text-black focus:outline-none focus:ring-4 focus:ring-pink-300 active:scale-95`}
                        >
                          {isExplainingConcept ? 'Explaining...' : 'Explain ✨'}
                        </button>
                      </div>
                    </div>
                    </div>
                      </div>

                      {/* Right Arrow Button - Positioned just outside card edge within panel */}
                      <button
                        onClick={nextCard}
                        className="absolute top-1/2 transform -translate-y-1/2 group flex items-center justify-center p-3 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-900/90 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
                        style={{ right: '2rem' }}
                        aria-label="Next card (Right Arrow)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Spacer for bottom */}
                    <div className="h-8"></div>
                    
                    {/* Edit Card Button - Bottom right of panel */}
                    <button
                      onClick={() => handleEditCard(currentCard)}
                      className="absolute bottom-4 right-4 group flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-900/90 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-semibold z-10"
                      aria-label="Edit card"
                      style={{ position: 'absolute', bottom: '16px', right: '16px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                      </svg>
                      Edit Card
                    </button>
                  </div>
                </div>

                {filteredFlashcards.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center w-full">
                    Click card or press SPACE to flip.
                  </p>
                )}

                <div className="flex mt-4 space-x-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard) {
                        reviewCard(1, currentCard);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-black font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-800 dark:hover:bg-red-700"
                  >
                    Again (1)
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard) {
                        reviewCard(2, currentCard);
                      }
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700"
                  >
                    Hard (2)
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard) {
                        reviewCard(3, currentCard);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-black font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300 dark:bg-green-800 dark:hover:bg-green-700"
                  >
                    Good (3)
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard) {
                        reviewCard(4, currentCard);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-black font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
                  >
                    Easy (4)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="w-full max-w-lg bg-white rounded-lg shadow-xl p-8 mb-8 text-center text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {(() => {
                  // Check if there are cards in the selected category (ignoring due date filter)
                  const cardsInCategory = selectedCategory === 'All' 
                    ? flashcards 
                    : flashcards.filter(card => card.category === selectedCategory);
                  
                  if (cardsInCategory.length === 0) {
                    return (
                      <div>
                        <p className="text-xl mb-4">No flashcards available in this category.</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Please add some cards or change the category filter.</p>
                      </div>
                    );
                  } else {
                    return (
                      <div>
                        <div className="text-6xl mb-4">🎉</div>
                        <p className="text-xl mb-4 font-semibold text-green-600 dark:text-green-400">Congratulations!</p>
                        <p className="text-lg mb-2">You've completed all cards due today!</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Check back tomorrow for more cards to review.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Card Edit Modal */}
      {isEditingCard && editCardData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100 dark:bg-gray-800">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center dark:text-gray-100">Edit Flashcard</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="edit-question" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                  Question:
                </label>
                <textarea
                  id="edit-question"
                  ref={editQuestionRef}
                  defaultValue={editCardData.question}
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  rows="6"
                ></textarea>
              </div>
              <div>
                <label htmlFor="edit-answer" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                  Answer:
                </label>
                <textarea
                  id="edit-answer"
                  ref={editAnswerRef}
                  defaultValue={editCardData.answer}
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  rows="8"
                ></textarea>
              </div>
              <div>
                <label htmlFor="edit-category" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                  Category:
                </label>
                <input
                  id="edit-category"
                  type="text"
                  ref={editCategoryRef}
                  defaultValue={editCardData.category || 'Uncategorized'}
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="edit-additional-info" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                  Additional Information:
                </label>
                <textarea
                  id="edit-additional-info"
                  ref={editAdditionalInfoRef}
                  defaultValue={editCardData.additional_info || ''}
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  rows="6"
                ></textarea>
              </div>

              {/* Display Generated Questions here */}
              {editCardData.generatedQuestions && editCardData.generatedQuestions.length > 0 && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg dark:bg-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2 dark:text-gray-100">Generated Related Questions:</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm dark:text-gray-300">
                    {editCardData.generatedQuestions.map((q, i) => (
                      <li key={i}>{q.text}</li> // Displaying text directly
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-2 italic dark:text-gray-400">
                    Copy and paste these into Question, Answer, or Additional Information as needed.
                  </p>
                </div>
              )}

              <div className="flex justify-between space-x-4 mt-6">
                <button
                  onClick={handleSaveCardChanges}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-black font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => { setIsEditingCard(false); setGeneratedQuestions([]); }} // Clear on cancel
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-black font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-800 dark:hover:bg-red-700"
                >
                  Delete Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 dark:text-gray-100">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6 dark:text-gray-300">Are you sure you want to delete this flashcard? This action cannot be undone.</p>
            <div className="flex justify-around space-x-4">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-black font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 dark:bg-red-800 dark:hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[400px] max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Review Schedule</h2>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <Calendar calendarDates={calendarDates} onClose={() => setShowCalendarModal(false)} isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>
      )}

      {/* Generated Questions Modal */}
      {showGeneratedQuestionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Related Questions</h2>
              <button
                onClick={() => {
                  setShowGeneratedQuestionsModal(false);
                  setGeneratedQuestions([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isGeneratingQuestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-300">Generating related questions...</span>
                </div>
              ) : generatedQuestions.length > 0 ? (
                <div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Select the questions you'd like to create new flashcards for:
                  </p>
                  <div className="space-y-3">
                    {generatedQuestions.map((question) => (
                      <div key={question.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <input
                          type="checkbox"
                          id={`question-${question.id}`}
                          checked={question.selected || false}
                          onChange={() => handleGeneratedQuestionCheckboxChange(question.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`question-${question.id}`}
                          className="flex-1 text-gray-800 dark:text-gray-200 cursor-pointer"
                        >
                          {question.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">No questions generated yet.</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            {generatedQuestions.length > 0 && !isGeneratingQuestions && (
              <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {generatedQuestions.filter(q => q.selected).length} of {generatedQuestions.length} selected
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowGeneratedQuestionsModal(false);
                      setGeneratedQuestions([]);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateSelectedCards}
                    disabled={isGeneratingSelectedCards || generatedQuestions.filter(q => q.selected).length === 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    {isGeneratingSelectedCards ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating Cards...</span>
                      </>
                    ) : (
                      <span>Create {generatedQuestions.filter(q => q.selected).length} Card(s)</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal - Popout Style */}
      {showSettingsModal && (
        <>
          {/* Invisible backdrop for click-to-close */}
          <div className="fixed inset-0 z-50" onClick={() => setShowSettingsModal(false)}></div>
          {/* Settings panel */}
          <div 
            className="fixed top-24 right-6 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 backdrop-blur-xl bg-white/95 dark:bg-gray-800/95"
            style={{ zIndex: 10001 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.942 3.33.83 2.891 2.673a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.942 1.543-.83 3.33-2.673 2.891a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.942-3.33-.83-2.891-2.673a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.942-1.543.83-3.33 2.673-2.891a1.724 1.724 0 002.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-white hover:bg-opacity-50 transition-all duration-200 dark:text-gray-400 dark:hover:bg-gray-600"
                aria-label="Close settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <div className="p-6 space-y-5">
              {/* User Information Section */}
              <section className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl shadow-sm border border-purple-100 dark:border-gray-600">
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Your Information</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showUserInfo ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserInfo && (
                  <div className="mt-5">
                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                      {userId ? (
                        <div className="space-y-4">
                          {/* Login Name */}
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg border border-purple-200 dark:border-purple-600">
                            <div className="flex items-center">
                              <div className="p-2 bg-purple-100 dark:bg-purple-800/80 rounded-full mr-3 ring-2 ring-purple-200 dark:ring-purple-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <span className="text-gray-700 dark:text-gray-200 font-medium">Login Name</span>
                            </div>
                            <span className="text-purple-700 dark:text-purple-200 font-bold text-lg">{userDisplayName}</span>
                          </div>

                          {/* Total Cards */}
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg border border-blue-200 dark:border-blue-600">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 dark:bg-blue-800/80 rounded-full mr-3 ring-2 ring-blue-200 dark:ring-blue-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <span className="text-gray-700 dark:text-gray-200 font-medium">Total Cards</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-blue-700 dark:text-blue-200 font-bold text-2xl mr-2">{flashcards.length}</span>
                              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-800/80 rounded-full ring-1 ring-blue-200 dark:ring-blue-700">
                                <span className="text-blue-700 dark:text-blue-200 text-xs font-medium">cards</span>
                              </div>
                            </div>
                          </div>

                          {/* User ID */}
                          <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/60 dark:to-slate-800/60 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center mb-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full mr-3 ring-2 ring-gray-200 dark:ring-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                                </svg>
                              </div>
                              <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">User ID</span>
                            </div>
                            <span className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md text-gray-800 dark:text-gray-100 block border border-gray-200 dark:border-gray-600">{userId}</span>
                            <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                              🔒 This unique identifier securely stores your flashcards and settings
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg border border-red-200 dark:border-red-600">
                          <div className="p-3 bg-red-100 dark:bg-red-800/80 rounded-full mr-3 ring-2 ring-red-200 dark:ring-red-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <span className="text-red-700 dark:text-red-200 font-semibold">Not logged in</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* API Keys Configuration Section */}
              <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl shadow-sm border border-blue-100 dark:border-gray-600">
                <button
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">AI API Configuration</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showApiKeys ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showApiKeys && (
                  <div className="mt-5 space-y-4">
                    <p className="text-gray-600 text-sm dark:text-gray-300">
                      Configure your AI API keys to enable features like answer suggestions, examples, and explanations.
                    </p>

                    {/* API Provider Selection */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <label htmlFor="apiProvider" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        Primary AI Provider:
                      </label>
                      <select
                        id="apiProvider"
                        value={selectedApiProvider}
                        onChange={(e) => updateSelectedApiProvider(e.target.value)}
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100 transition-all"
                      >
                        <option value="gemini">🤖 Google Gemini</option>
                        <option value="anthropic">🧠 Anthropic Claude</option>
                        <option value="openai">⚡ OpenAI GPT</option>
                      </select>
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        Currently only Gemini is implemented. Other providers coming soon.
                      </p>
                    </div>

                    {/* Gemini API Key */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <label htmlFor="geminiApiKey" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        🤖 Google Gemini API Key:
                      </label>
                      <input
                        type="password"
                        id="geminiApiKey"
                        value={apiKeys.gemini}
                        onChange={(e) => updateApiKey('gemini', e.target.value)}
                        placeholder="Enter your Gemini API key"
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100 transition-all"
                      />
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 underline">Google AI Studio</a>
                      </p>
                    </div>

                    {/* Anthropic API Key */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 opacity-60">
                      <label htmlFor="anthropicApiKey" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        🧠 Anthropic Claude API Key:
                      </label>
                      <input
                        type="password"
                        id="anthropicApiKey"
                        value={apiKeys.anthropic}
                        onChange={(e) => updateApiKey('anthropic', e.target.value)}
                        placeholder="Coming soon..."
                        disabled
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        🚧 Integration in development
                      </p>
                    </div>

                    {/* OpenAI API Key */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 opacity-60">
                      <label htmlFor="openaiApiKey" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        ⚡ OpenAI API Key:
                      </label>
                      <input
                        type="password"
                        id="openaiApiKey"
                        value={apiKeys.openai}
                        onChange={(e) => updateApiKey('openai', e.target.value)}
                        placeholder="Coming soon..."
                        disabled
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        🚧 Integration in development
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                        </svg>
                        <p className="text-blue-800 text-xs dark:text-blue-200">
                          <strong>Security:</strong> API keys are encrypted and stored securely in your user settings. They are only used for direct AI feature requests and never shared with third parties.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* FSRS Configuration Section */}
              <section className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl shadow-sm border border-green-100 dark:border-gray-600">
                <button
                  onClick={() => setShowFsrsFactors(!showFsrsFactors)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 012-2zm0 0h2a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">FSRS Review Factors</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showFsrsFactors ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showFsrsFactors && (
                  <div className="mt-5 space-y-4">
                    <p className="text-gray-600 text-sm dark:text-gray-300">
                      Adjust these factors to customize how aggressively intervals change based on your recall performance.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Easy Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="easyFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Easy Factor: <span className="text-green-600 dark:text-green-400 font-bold">{fsrsParams.easyFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="easyFactor"
                          min="1.0"
                          max="3.0"
                          step="0.1"
                          value={fsrsParams.easyFactor}
                          onChange={(e) => updateFsrsParameter('easyFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-green"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval growth after "Easy" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{calculateEstimatedReviewDays(fsrsParams.easyFactor, 10)} days
                          </span>
                        </div>
                      </div>

                      {/* Good Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="goodFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Good Factor: <span className="text-blue-600 dark:text-blue-400 font-bold">{fsrsParams.goodFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="goodFactor"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={fsrsParams.goodFactor}
                          onChange={(e) => updateFsrsParameter('goodFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-blue"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval growth after "Good" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{calculateEstimatedReviewDays(fsrsParams.goodFactor, 3)} days
                          </span>
                        </div>
                      </div>

                      {/* Hard Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="hardFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Hard Factor: <span className="text-yellow-600 dark:text-yellow-400 font-bold">{fsrsParams.hardFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="hardFactor"
                          min="0.3"
                          max="1.0"
                          step="0.1"
                          value={fsrsParams.hardFactor}
                          onChange={(e) => updateFsrsParameter('hardFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-yellow"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval growth after "Hard" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{Math.max(1, calculateEstimatedReviewDays(fsrsParams.hardFactor, 1))} day{Math.max(1, calculateEstimatedReviewDays(fsrsParams.hardFactor, 1)) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Again Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="againFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Again Factor: <span className="text-red-600 dark:text-red-400 font-bold">{fsrsParams.againFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="againFactor"
                          min="0.1"
                          max="0.5"
                          step="0.05"
                          value={fsrsParams.againFactor}
                          onChange={(e) => updateFsrsParameter('againFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-red"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval reduction after "Again" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{Math.max(1, calculateEstimatedReviewDays(fsrsParams.againFactor, 1))} day{Math.max(1, calculateEstimatedReviewDays(fsrsParams.againFactor, 1)) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Initial Difficulty Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="initialDifficulty" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Initial Difficulty: <span className="text-purple-600 dark:text-purple-400 font-bold">{fsrsParams.initialDifficulty.toFixed(0)}</span>
                        </label>
                        <input
                          type="range"
                          id="initialDifficulty"
                          min="1"
                          max="10"
                          step="1"
                          value={fsrsParams.initialDifficulty}
                          onChange={(e) => updateFsrsParameter('initialDifficulty', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-purple"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Default difficulty for new cards</p>
                      </div>

                      {/* Initial Stability Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="initialStability" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Initial Stability: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{fsrsParams.initialStability.toFixed(1)} days</span>
                        </label>
                        <input
                          type="range"
                          id="initialStability"
                          min="0.1"
                          max="5.0"
                          step="0.1"
                          value={fsrsParams.initialStability}
                          onChange={(e) => updateFsrsParameter('initialStability', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-indigo"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Base stability for new cards</p>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-800 text-xs dark:text-green-200">
                          <strong>FSRS Algorithm:</strong> Free Spaced Repetition Scheduler calculates optimal review intervals based on your performance. Higher factors = longer intervals.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* CSV Upload Guide Section */}
              <section className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl shadow-sm border border-orange-100 dark:border-gray-600">
                <button
                  onClick={() => setShowCsvGuide(!showCsvGuide)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">File Upload Format Guide</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showCsvGuide ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCsvGuide && (
                  <div className="mt-5">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 max-h-96 overflow-auto">
                      <pre className="whitespace-pre-wrap font-mono text-xs text-gray-700 dark:text-gray-300">
                        {csvUploadGuideContent.trim()}
                      </pre>
                    </div>
                  </div>
                )}
              </section>

              {/* Theme Section - Moved to bottom */}
              <section className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Theme</h3>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform shadow-md focus:outline-none focus:ring-4 active:scale-95 ${
                      isDarkMode
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900 focus:ring-yellow-300'
                        : 'bg-gray-800 hover:bg-gray-900 text-black focus:ring-gray-300'
                    }`}
                  >
                    {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                  </button>
                </div>
              </section>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}

export default App;
