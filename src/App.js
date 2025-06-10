import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, updateDoc, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import LoginScreen from './LoginScreen.jsx';

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
    gemini: '',
    anthropic: '',
    openai: ''
  });
  const [selectedApiProvider, setSelectedApiProvider] = useState('gemini'); // Default to Gemini

  // Edit Card states
  const [isEditingCard, setIsEditingCard] = useState(false); // State for edit mode
  const [editCardData, setEditCardData] = useState(null); // Data for the card being edited
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); // State for delete confirmation
  // const [isGeneratingSelectedCards, setIsGeneratingSelectedCards] = useState(false); // New state for batch generation loading
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
      
      // Initialize Firebase Analytics (optional)
      // const analytics = getAnalytics(app); 

      setDb(firestore);
      setAuth(authentication);

      const unsubscribe = onAuthStateChanged(authentication, async (user) => {
        if (user) {
          setUserId(user.uid);
          setAuthError(''); // Clear auth error on successful sign-in
          setUserDisplayName(user.displayName || user.email || user.uid); // Set user display name
        } else {
          setUserId(null);
          setUserDisplayName('');
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
    if (!auth) return;

    try {
      setAuthError('');
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginScreen(false); // Hide login screen after successful login
      console.log("User logged in successfully.");
    } catch (error) {
      console.error("Login error:", error);
      setAuthError(`Login failed: ${error.message}`);
    }
  };

  // Function to handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!auth) return;

    try {
      setAuthError('');
      await createUserWithEmailAndPassword(auth, email, password);
      setShowLoginScreen(false); // Hide login screen after successful registration
      console.log("User registered successfully.");
    } catch (error) {
      console.error("Registration error:", error);
      setAuthError(`Registration failed: ${error.message}`);
    }
  };

  // Function to handle anonymous login
  const handleAnonymousLogin = async () => {
    if (!auth) return;

    try {
      setAuthError('');
      await signInAnonymously(auth);
      setShowLoginScreen(false); // Hide login screen after successful anonymous login
      console.log("User logged in anonymously.");
    } catch (error) {
      console.error("Anonymous login error:", error);
      setAuthError(`Anonymous login failed: ${error.message}`);
    }
  };

  // Function to handle logout
  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUserId(null); // Clear userId on logout
        setUserDisplayName(''); // Clear display name on logout
        setAuthError(''); // Clear any auth errors
        setShowSettingsModal(false); // Close settings modal after logout
        setEmail(''); // Clear email
        setPassword(''); // Clear password
        setShowLoginScreen(true); // Show login screen after logout
        console.log("User logged out successfully.");
      } catch (error) {
        console.error("Error logging out:", error);
        setAuthError(`Logout failed: ${error.message}`);
      }
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

  // Function to update API keys and save to Firestore
  const updateApiKey = (provider, key) => {
    setApiKeys(prev => {
      const newApiKeys = { ...prev, [provider]: key };
      // Save to Firestore if settings are already loaded
      if (db && userId && settingsLoaded) {
        const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
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
  }, [flashcards, selectedCategory, userId, showDueTodayOnly]);

  const nextCard = () => {
    setShowAnswer(false);
    setGeneratedExample(''); // Clear generated example on next card
    setGeneratedQuestions([]); // Clear generated questions on next card
    setGeminiExplanation(''); // Clear generated explanation on next card
    setShowGeneratedQuestionsModal(false); // Close modal on card change
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % filteredFlashcards.length);
  };

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
   */
  const reviewCard = async (quality, card) => {
    if (!db || !userId || !card || !settingsLoaded) return; // Ensure settings are loaded

    const lastReviewDate = card.lastReview ? card.lastReview.toDate() : new Date();
    const now = new Date();
    const elapsedDays = (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24);

    let newDifficulty = card.difficulty;
    let newStability = card.stability;
    let newIntervalDays = 0;

    switch (quality) {
      case 1: // Again
        newDifficulty = Math.min(10, newDifficulty + 1.5);
        newStability = Math.max(0.1, newStability * fsrsParams.againFactor);
        newIntervalDays = 0.5;
        break;
      case 2: // Hard
        newDifficulty = Math.min(10, newDifficulty + 0.8);
        newStability = Math.max(0.5, newStability * fsrsParams.hardFactor);
        newIntervalDays = newStability;
        break;
      case 3: // Good
        newDifficulty = Math.max(1, newDifficulty - 0.5);
        newStability = newStability * (1 + 0.1 * elapsedDays / newDifficulty) * fsrsParams.goodFactor;
        newIntervalDays = newStability;
        break;
      case 4: // Easy
        newDifficulty = Math.max(1, newDifficulty - 1.0);
        newStability = newStability * (1 + 0.2 * elapsedDays / newDifficulty) * fsrsParams.easyFactor;
        newIntervalDays = newStability * 1.5;
        break;
      default:
        console.warn("Invalid quality rating:", quality);
        return;
    }

    newStability = Math.max(0.1, newStability);
    newDifficulty = Math.max(1, Math.min(10, newDifficulty));

    const nextReview = new Date(now.getTime() + newIntervalDays * 24 * 60 * 60 * 1000);

    const appId = "flashcard-app-3f2a3"; // Hardcoding appId
    try {
      await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/flashcards`, card.id), {
        difficulty: newDifficulty,
        stability: newStability,
        lastReview: serverTimestamp(),
        nextReview: nextReview,
      });
      console.log(`Card ${card.id} reviewed with quality ${quality}. Next review in ${newIntervalDays.toFixed(1)} days.`);
      nextCard();
    } catch (error) {
      console.error("Error updating flashcard:", error);
      if (error.code && error.code === 'unavailable' || error.message.includes('offline')) {
          setAuthError("Firestore write failed: You appear to be offline or there's a network issue. Please check your internet connection.");
        } else {
          setAuthError(`Error updating flashcard: ${error.message}`);
        }
    }
  };

  /**
   * Parses a CSV string into an array of flashcard objects.
   * Handles quoted fields, including multiline content and commas within quotes.
   * Expected format: number,category,question,answer,additional_info
   */
  const parseCSV = (csvString) => {
    // Split into lines, filter empty ones, and slice to ignore the header row
    const lines = csvString.split(/\r?\n/).filter(line => line.trim() !== '').slice(1);
    const cards = [];

    lines.forEach((line, index) => {
      let inQuote = false;
      let fieldBuffer = '';
      const rowFields = [];

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            fieldBuffer += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (char === ',' && !inQuote) {
          rowFields.push(fieldBuffer);
          fieldBuffer = '';
        } else {
          fieldBuffer += char;
        }
      }
      rowFields.push(fieldBuffer);

      while (rowFields.length < 5) {
        rowFields.push('');
      }

      const csvNumber = rowFields[0].trim();
      const category = rowFields[1].trim() || 'Uncategorized';
      const question = rowFields[2].trim();
      const answer = rowFields[3].trim();
      const additional_info = rowFields[4].trim();

      if (question && answer) {
        cards.push({
          csvNumber: csvNumber || null,
          category,
          question,
          answer,
          additional_info: additional_info || null,
        });
      } else {
        console.warn(`Skipping row ${index + 1} due to missing Question or Answer: "${line}"`);
      }
    });

    return cards;
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

    setUploadMessage('Processing CSV files...');
    setUploadError('');

    let totalCardsAdded = 0;
    let totalFilesProcessed = 0;
    let errorsFound = false;

    for (const file of selectedUploadFiles) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setUploadError((prev) => prev + `Invalid file type for ${file.name}. Only CSV files are supported.\n`);
        errorsFound = true;
        continue;
      }

      try {
        const csvContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file, 'UTF-8');
        });

        const parsedCards = parseCSV(csvContent);

        if (parsedCards.length === 0) {
          setUploadError((prev) => prev + `No valid flashcards found in ${file.name}.\n`);
          errorsFound = true;
          continue;
        }

        for (const cardData of parsedCards) {
          if (db && userId) {
            const appId = "flashcard-app-3f2a3"; // Hardcoding appId
            const now = new Date();

            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), {
              question: cardData.question,
              answer: cardData.answer,
              category: cardData.category,
              additional_info: cardData.additional_info,
              csvNumber: cardData.csvNumber,
              difficulty: fsrsParams.initialDifficulty,
              stability: fsrsParams.initialStability,
              lastReview: serverTimestamp(),
              nextReview: now,
              createdAt: serverTimestamp(),
            });
            totalCardsAdded++;
          }
        }
        totalFilesProcessed++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        setUploadError((prev) => prev + `Failed to process ${file.name}: ${error.message || error}.\n`);
        errorsFound = true;
      }
    }

    if (!errorsFound && totalFilesProcessed > 0) {
      setUploadMessage(`Successfully added ${totalCardsAdded} flashcard(s) from ${totalFilesProcessed} file(s).`);
    } else if (errorsFound && totalFilesProcessed > 0) {
        setUploadMessage(`Processed ${totalFilesProcessed} file(s). Added ${totalCardsAdded} cards. Some errors occurred.`);
    } else if (errorsFound && totalFilesProcessed === 0) {
        setUploadMessage("No files were successfully processed.");
    }
    
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

    setIsGeneratingAnswer(true);
    try {
      let chatHistory = [];
      const prompt = `Provide a concise and accurate answer for the Java flashcard question: "${question}"`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = apiKeys.gemini;
      if (!apiKey) {
        console.error("Gemini API key not configured");
        newCardAnswerRef.current.value = "Please configure your Gemini API key in Settings.";
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
        newCardAnswerRef.current.value = text.trim(); // Populate the answer field
      } else {
        console.error("Gemini API response did not contain expected text:", result);
        // Optionally display an error message to the user
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Optionally display an error message to the user
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
  // const handleGeneratedQuestionCheckboxChange = (id) => {
  //   setGeneratedQuestions(prevQuestions =>
  //     prevQuestions.map(q =>
  //       q.id === id ? { ...q, selected: !q.selected } : q
  //     )
  //   );
  // };

  // Handle generating new cards from selected questions WITH AI-generated answers
  // const handleGenerateSelectedCards = async () => {
  //   if (!db || !userId) return;

  //   const selectedQ = generatedQuestions.filter(q => q.selected);
  //   if (selectedQ.length === 0) {
  //     alert("Please select at least one question to generate a card.");
  //     return;
  //   }

  //   setIsGeneratingSelectedCards(true); // Start loading for batch generation
  //   let cardsAdded = 0;
  //   const appId = "flashcard-app-3f2a3"; // Hardcoding appId
  //   const now = new Date();
  //   const currentCategory = filteredFlashcards[currentCardIndex]?.category || 'Uncategorized';

  //   for (const qData of selectedQ) {
  //     try {
  //       // Generate answer for the new question
  //       let answerText = "";
  //       try {
  //         const chatHistory = [{ role: "user", parts: [{ text: `Provide a concise answer for the Java flashcard question: "${qData.text}"` }] }];
  //         const payload = { contents: chatHistory };
  //         const apiKey = "";
  //         const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  //         const response = await fetch(apiUrl, {
  //           method: 'POST',
  //           headers: { 'Content-Type': 'application/json' },
  //           body: JSON.stringify(payload)
  //         });
  //         const result = await response.json();
  //         if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
  //           answerText = result.candidates[0].content.parts[0].text.trim();
  //         } else {
  //           console.warn(`Could not generate answer for question: ${qData.text}`);
  //           answerText = "Answer could not be generated.";
  //         }
  //       } catch (apiError) {
  //         console.error(`Error generating answer for question "${qData.text}":`, apiError);
  //         answerText = "Error generating answer.";
  //       }

  //       await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), {
  //         question: qData.text,
  //         answer: answerText, // Use the generated answer
  //         category: currentCategory, // Inherit category or default
  //         additional_info: "", // Empty additional info for new cards
  //         difficulty: fsrsParams.initialDifficulty,
  //         stability: fsrsParams.initialStability,
  //         lastReview: serverTimestamp(),
  //         nextReview: now,
  //         createdAt: serverTimestamp(),
  //       });
  //       cardsAdded++;
  //     } catch (error) {
  //       console.error("Error adding generated card:", error);
  //     }
  //   }

  //   alert(`Successfully generated ${cardsAdded} new flashcard(s)!`); // Provide feedback
  //   setShowGeneratedQuestionsModal(false); // Close the modal
  //   setGeneratedQuestions([]); // Clear generated questions
  //   setIsGeneratingSelectedCards(false); // End loading for batch generation
  // };


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
      } else if (showAnswer) { // Only allow review shortcuts if the answer is shown
        if (event.key === 'a' || event.key === 'A') {
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
    isEditingCard, // Added dependency for edit mode
    showGeneratedQuestionsModal, // Added dependency
    filteredFlashcards, // Dependency for filteredFlashcards[currentCardIndex]
    currentCardIndex,   // Dependency for filteredFlashcards[currentCardIndex]
    showAnswer,         // Dependency for conditional review shortcuts
    reviewCard          // Dependency for reviewCard function
  ]);

  // Content for the CSV Upload Guide in Settings
  const csvUploadGuideContent = `
### Understanding the CSV Format and Escape Characters

Your flashcard application expects a specific CSV format to correctly parse the data. Here's a breakdown of each field and how to handle special characters:

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-inter bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-500">
      {/* Top-Left Buttons and Category Dropdown */}
      <div className="fixed top-4 left-4 flex flex-col space-y-3 z-50" style={{ position: 'fixed', top: '16px', left: '16px', zIndex: 9999 }}>
        <div className="flex flex-wrap gap-2" style={{ zIndex: 9999 }}> {/* Navigation buttons container */}
          <button
            onClick={() => {
              setShowCreateCardForm(false);
              setShowUploadCsvForm(false);
            }}
            className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 transform shadow-lg hover:shadow-xl active:shadow-inner focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300
              ${
                !showCreateCardForm && !showUploadCsvForm
                  ? 'bg-blue-600 text-white scale-105'
                  : 'bg-blue-200 text-blue-700 hover:bg-blue-300 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700'
              }`}
            style={{
              boxShadow: !showCreateCardForm && !showUploadCsvForm
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            Study Cards
          </button>
          <button
            onClick={() => {
              setShowCreateCardForm(true);
              setShowUploadCsvForm(false);
            }}
            className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 transform shadow-lg hover:shadow-xl active:shadow-inner focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-green-300
              ${
                showCreateCardForm
                  ? 'bg-green-600 text-white scale-105'
                  : 'bg-green-200 text-green-700 hover:bg-green-300 dark:bg-green-800 dark:text-white dark:hover:bg-green-700'
              }`}
            style={{
              boxShadow: showCreateCardForm
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            Create New Card
          </button>
          <button
            onClick={() => {
              setShowUploadCsvForm(true);
              setShowCreateCardForm(false);
            }}
            className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 transform shadow-lg hover:shadow-xl active:shadow-inner focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-300
              ${
                showUploadCsvForm
                  ? 'bg-indigo-600 text-white scale-105'
                  : 'bg-indigo-200 text-indigo-700 hover:bg-indigo-300 dark:bg-indigo-800 dark:text-white dark:hover:bg-indigo-700'
              }`}
            style={{
              boxShadow: showUploadCsvForm
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            Upload Cards (CSV)
          </button>

          {/* Login/Logout Button */}
          <button
            onClick={userId ? handleLogout : () => setShowLoginModal(true)}
            className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 transform shadow-lg hover:shadow-xl active:shadow-inner focus:outline-none focus:ring-4 focus:ring-offset-2 ${
              userId
                ? 'focus:ring-red-300 bg-red-200 text-red-700 hover:bg-red-300 dark:bg-red-800 dark:text-white dark:hover:bg-red-700'
                : 'focus:ring-emerald-300 bg-emerald-200 text-emerald-700 hover:bg-emerald-300 dark:bg-emerald-800 dark:text-white dark:hover:bg-emerald-700'
            }`}
            style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            {userId ? 'Logout' : 'Login'}
          </button>

          {/* Due Today Toggle Button - Only show when logged in */}
          {userId && (
            <button
              onClick={() => setShowDueTodayOnly(!showDueTodayOnly)}
              className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 transform shadow-lg hover:shadow-xl active:shadow-inner focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                showDueTodayOnly
                  ? 'focus:ring-orange-300 bg-orange-200 text-orange-700 hover:bg-orange-300 dark:bg-orange-800 dark:text-white dark:hover:bg-orange-700'
                  : 'focus:ring-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
              }`}
              style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              {showDueTodayOnly ? '📅 Due Today' : '📚 All Cards'}
            </button>
          )}
        </div>
        {flashcards.length > 0 && ( // Only show dropdown if there are cards
            <div className="self-start mt-3" style={{ zIndex: 9999 }}>
              <label htmlFor="category-filter" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filter by Category:
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full max-w-[20vw] min-w-[200px] py-2.5 px-4 border-2 border-blue-300 bg-white rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-semibold cursor-pointer
                           dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
      </div>

      {/* Top-Right Card Counts/Calendar/Settings */}
      <div className="fixed top-4 right-4 flex flex-col items-end space-y-3 z-50" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999 }}>
        {/* Card Statistics - Compact Vertical Layout */}
        <div className="bg-white bg-opacity-95 rounded-xl p-4 shadow-2xl border-2 border-blue-300 dark:bg-gray-700 dark:bg-opacity-95 dark:border-gray-600" style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          <div className="flex flex-col space-y-2 text-right">
            {showDueTodayOnly ? (
              <>
                <p className="text-gray-700 font-semibold text-lg dark:text-gray-100">
                  <span className="text-orange-600 dark:text-orange-400">📅 Due Today:</span> {totalCardsCount}
                </p>
                <p className="text-gray-700 font-semibold text-lg dark:text-gray-100">
                  <span className="text-blue-600 dark:text-blue-400">📚 Total Cards:</span> {flashcards.length}
                </p>
                <p className="text-gray-700 font-semibold text-sm text-gray-500 dark:text-gray-400">
                  Showing cards due today
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-700 font-semibold text-lg dark:text-gray-100">
                  <span className="text-blue-600 dark:text-blue-400">Total Cards:</span> {totalCardsCount}
                </p>
                <p className="text-gray-700 font-semibold text-lg dark:text-gray-100">
                  <span className="text-green-600 dark:text-green-400">Reviewed:</span> {reviewedCount}
                </p>
                <p className="text-gray-700 font-semibold text-lg dark:text-gray-100">
                  <span className="text-orange-600 dark:text-orange-400">To Review:</span> {toReviewCount}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3" style={{ zIndex: 9999 }}>
          {/* Calendar Icon Button */}
          <button
            onClick={() => setShowCalendarModal(true)}
            className="p-3 bg-purple-200 hover:bg-purple-300 rounded-full shadow-md transition-all duration-200 transform hover:scale-110 active:scale-90 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:bg-purple-700 dark:hover:bg-purple-600"
            style={{ backgroundColor: '#e9d5ff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            aria-label="Show due cards calendar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-700 dark:text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {/* Settings Icon Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full shadow-md transition-all duration-200 transform hover:scale-110 active:scale-90 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            style={{ backgroundColor: '#e5e7eb', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            aria-label="Open settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.942 3.33.83 2.891 2.673a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.942 1.543-.83 3.33-2.673 2.891a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.942-3.33-.83-2.891-2.673a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.942-1.543.83-3.33 2.673-2.891a1.724 1.724 0 002.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700 shadow-xl p-6 rounded-lg bg-white dark:bg-gray-700 dark:from-blue-400 dark:to-purple-500 mt-12">
        FSRS Flashcards
      </h1>

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
                           text-white focus:outline-none focus:ring-4 focus:ring-purple-300 active:scale-95`}
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
            >
              Add Card
            </button>
          </form>
        </div>
      ) : showUploadCsvForm ? (
        // New CSV Upload Form
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 mb-8 transition-all duration-500 ease-in-out transform scale-100 opacity-100 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center dark:text-gray-200">Upload Flashcards from CSV</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="csv-upload" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Select CSV File(s):
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileSelect} // Changed to handleFileSelect
                multiple // Added multiple attribute
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
                         text-white focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95`}
            >
              {uploadMessage.startsWith('Processing') ? 'Uploading...' : `Upload Selected CSV${selectedUploadFiles.length > 1 ? 's' : ''}`}
            </button>

            {uploadMessage && !uploadMessage.startsWith('Processing') && (
              <p className="text-green-600 text-center font-medium">{uploadMessage}</p>
            )}
            {uploadError && (
              <p className="text-red-600 text-center font-medium">{uploadError}</p>
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
          {filteredFlashcards.length > 0 ? (
            <>
              <div className="flex items-center justify-center w-full md:w-3/4 flex-col"> {/* Main card wrapper and AI buttons container */}
                <div className="flex items-center justify-center w-full"> {/* Card and arrows */}
                  {/* Left Arrow Button */}
                  <button
                    onClick={prevCard}
                    className="p-3 mr-4 bg-gray-300 hover:bg-gray-400 rounded-full shadow-md transition-transform duration-200 transform hover:scale-110 active:scale-90 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
                    aria-label="Previous card"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800 dark:text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Flashcard (main content area) */}
                  <div
                    className="relative w-full max-w-4xl h-[50rem] bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center p-8 cursor-pointer transform transition-all duration-500 ease-in-out hover:scale-105 dark:from-blue-700 dark:to-purple-800"
                    onClick={() => setShowAnswer(!showAnswer)}
                    style={{ minHeight: '50rem', minWidth: '800px' }}
                  >
                    <div className="absolute inset-0 bg-white rounded-2xl flex flex-col justify-start p-8 text-gray-800 transition-all duration-500 ease-in-out backface-hidden dark:bg-gray-700 dark:text-gray-100"
                         style={{ transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                      <p className="text-2xl font-semibold mb-6 overflow-auto max-h-full leading-relaxed">
                        {currentCard.question}
                      </p>
                      {/* Edit Card Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card from flipping
                          handleEditCard(currentCard);
                        }}
                        className="absolute top-3 right-3 p-2 bg-gray-200 hover:bg-gray-300 rounded-full shadow-md text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
                        aria-label="Edit card"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                        </svg>
                      </button>
                    </div>

                    <div className="absolute inset-0 bg-white rounded-2xl flex flex-col justify-between p-8 text-gray-800 transition-all duration-500 ease-in-out backface-hidden dark:bg-gray-700 dark:text-gray-100"
                         style={{ transform: showAnswer ? 'rotateY(0deg)' : 'rotateY(-180deg)', backfaceVisibility: 'hidden' }}>
                      {/* Display answer as plain text */}
                      <div className="text-2xl font-semibold mb-6 overflow-auto w-full leading-relaxed">
                        {currentCard.answer}
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
                                     text-white focus:outline-none focus:ring-4 focus:ring-teal-300 active:scale-95`}
                        >
                          {isGeneratingExample ? 'Generating...' : 'Example ✨'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleGenerateQuestions(currentCard.question, currentCard.answer); }}
                          disabled={isGeneratingQuestions}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isGeneratingQuestions ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}
                                     text-white focus:outline-none focus:ring-4 focus:ring-orange-300 active:scale-95`}
                        >
                          {isGeneratingQuestions ? 'Generating...' : 'Related Questions ✨'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleExplainConcept(currentCard.question, currentCard.answer); }}
                          disabled={isExplainingConcept}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isExplainingConcept ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700'}
                                     text-white focus:outline-none focus:ring-4 focus:ring-pink-300 active:scale-95`}
                        >
                          {isExplainingConcept ? 'Explaining...' : 'Explain ✨'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Arrow Button */}
                  <button
                    onClick={nextCard}
                    className="p-3 ml-4 bg-gray-300 hover:bg-gray-400 rounded-full shadow-md transition-transform duration-200 transform hover:scale-110 active:scale-90 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
                    aria-label="Next card"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800 dark:text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {filteredFlashcards.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center w-full">
                    Click card or press SPACE to flip.
                  </p>
                )}

                <div className="flex mt-8 space-x-4">
                  <button
                    onClick={() => reviewCard(1, currentCard)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-800 dark:hover:bg-red-700"
                  >
                    Again <span className="text-xs ml-1">(A)</span>
                  </button>
                  <button
                    onClick={() => reviewCard(2, currentCard)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700"
                  >
                    Hard <span className="text-xs ml-1">(H)</span>
                  </button>
                  <button
                    onClick={() => reviewCard(3, currentCard)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300 dark:bg-green-800 dark:hover:bg-green-700"
                  >
                    Good <span className="text-xs ml-1">(G)</span>
                  </button>
                  <button
                    onClick={() => reviewCard(4, currentCard)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
                  >
                    Easy <span className="text-xs ml-1">(E)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full max-w-lg bg-white rounded-lg shadow-xl p-8 mb-8 text-center text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <p className="text-xl">No flashcards available in this category. Please add some or change filter.</p>
            </div>
          )}
        </div>
      )}



      {/* Card Edit Modal */}
      {isEditingCard && editCardData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100 dark:bg-gray-800">
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
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  rows="4"
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
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  rows="4"
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
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  rows="3"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
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
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-800 dark:hover:bg-red-700"
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 dark:bg-red-800 dark:hover:bg-red-700"
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

      {/* Calendar Modal - Dropdown Style */}
      {showCalendarModal && (
        <>
          {/* Background overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setShowCalendarModal(false)}
          ></div>

          {/* Calendar dropdown positioned near the button */}
          <div
            className="fixed top-20 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 w-96 z-50 transform transition-all duration-300 scale-100 opacity-100 dark:bg-gray-800 dark:border-gray-600"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              height: '500px',
              maxHeight: '70vh'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upcoming Reviews
              </h2>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors dark:text-gray-400 dark:hover:bg-gray-600"
                aria-label="Close calendar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="p-4"
              style={{
                height: '420px',
                maxHeight: 'calc(70vh - 80px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: '#9ca3af #f3f4f6'
              }}
            >
              <div className="space-y-3 pr-2">
                {Object.entries(dailyDueCounts).map(([dateString, count]) => {
                  const date = new Date(dateString);
                  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                  let displayDate = date.toLocaleDateString(undefined, options);

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(today.getDate() + 1);

                  if (date.getTime() === today.getTime()) {
                    displayDate += " (Today)";
                  } else if (date.getTime() === tomorrow.getTime()) {
                    displayDate += " (Tomorrow)";
                  }

                  return (
                    <div key={dateString} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-650">
                      <span className="text-gray-700 font-medium dark:text-gray-200 text-sm leading-relaxed">{displayDate}</span>
                      <span className={`px-3 py-1 rounded-full text-white font-bold text-sm min-w-[2.5rem] text-center ${count > 0 ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-400'}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer info */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Showing review schedule for the next 30 days
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 opacity-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700">
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      {userId ? (
                        <>
                          <p className="text-gray-700 dark:text-gray-300 mb-3">
                            <strong>User ID:</strong> <span className="font-mono text-sm break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{userId}</span>
                          </p>
                          <p className="text-gray-600 text-xs mb-4 dark:text-gray-400">
                            This unique identifier is used to store your flashcards and settings securely.
                          </p>
                          <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform shadow-md bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-4 focus:ring-red-300 active:scale-95"
                          >
                            🚪 Logout
                          </button>
                        </>
                      ) : (
                        <p className="text-gray-700 dark:text-gray-300">Not logged in.</p>
                      )}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">CSV Upload Format Guide</h3>
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
                        : 'bg-gray-800 hover:bg-gray-900 text-white focus:ring-gray-300'
                    }`}
                  >
                    {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                  </button>
                </div>
              </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
