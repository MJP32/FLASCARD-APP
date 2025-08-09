import { useState, useEffect, useCallback } from 'react';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { DEFAULT_FSRS_PARAMS, STORAGE_KEYS, THEMES } from '../utils/constants';

/**
 * Custom hook for managing application settings
 * @param {Object} firebaseApp - Initialized Firebase app instance
 * @param {string} userId - Current user ID
 * @returns {Object} Settings state and methods
 */
export const useSettings = (firebaseApp, userId) => {
  const [db, setDb] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fsrsParams, setFsrsParams] = useState(DEFAULT_FSRS_PARAMS);
  const [showIntervalSettings, setShowIntervalSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    gemini: '',
    gpt5nano: '',
    mistral: '',
    groq: ''
  });
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize Firestore when Firebase app is ready
  useEffect(() => {
    if (!firebaseApp) return;
    const dbInstance = getFirestore(firebaseApp);
    setDb(dbInstance);
  }, [firebaseApp]);

  // Initialize theme from localStorage immediately
  useEffect(() => {
    // For anonymous users (no userId), always use light mode
    // For authenticated users, load their saved theme preference
    if (!userId) {
      // Anonymous user - force light mode and clear any dark classes
      console.log('🎨 Forcing light mode for anonymous user');
      setIsDarkMode(false);
      
      // Aggressively clear dark mode classes
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      // Also persist light theme so components reading localStorage directly behave
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, THEMES.LIGHT);
      } catch (e) {
        // ignore storage errors
      }
      
      // Don't save to localStorage for anonymous users
    } else {
      // Authenticated user - load saved theme
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      const isDark = savedTheme === THEMES.DARK;
      console.log('🎨 Loading theme for authenticated user:', isDark ? 'dark' : 'light');
      setIsDarkMode(isDark);
      
      // Apply theme immediately to prevent flash
      applyTheme(isDark);
    }
  }, [userId]);

  // Initialize API keys and provider from localStorage immediately
  useEffect(() => {
    const savedKeys = {
      openai: localStorage.getItem('openai_api_key') || '',
      anthropic: localStorage.getItem('anthropic_api_key') || '',
      gemini: localStorage.getItem('gemini_api_key') || '',
      gpt5nano: localStorage.getItem('gpt5nano_api_key') || '',
      mistral: localStorage.getItem('mistral_api_key') || '',
      groq: localStorage.getItem('groq_api_key') || ''
    };
    setApiKeys(savedKeys);
    
    const savedProvider = localStorage.getItem('selected_ai_provider') || 'openai';
    setSelectedProvider(savedProvider);
    
    // Load tour state
    const savedTourState = localStorage.getItem('has_seen_tour');
    setHasSeenTour(savedTourState === 'true');
  }, []);

  /**
   * Apply theme to document
   * @param {boolean} isDark - Whether to apply dark theme
   */
  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, THEMES.DARK);
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, THEMES.LIGHT);
    }
  };

  /**
   * Save user settings to Firestore
   * @param {Object} settings - Settings object to save
   * @returns {Promise<void>}
   */
  const saveUserSettings = useCallback(async (settings) => {
    if (!db || !userId) {
      console.warn('Cannot save settings: missing db or userId', { hasDb: !!db, hasUserId: !!userId });
      return;
    }

    try {
      const settingsRef = doc(db, 'userSettings', userId);
      await setDoc(settingsRef, {
        ...settings,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      console.log('Successfully saved user settings to Firestore');
    } catch (error) {
      console.error('Error saving user settings to Firestore:', error);
      console.error('Settings that failed to save:', settings);
      console.error('User ID:', userId);
      throw new Error(`Failed to save settings: ${error.message}`);
    }
  }, [db, userId]);

  // Load user settings from Firestore when user and db are ready
  useEffect(() => {
    if (!db) return;
    
    // If no user, just mark settings as loaded with defaults
    if (!userId) {
      setSettingsLoaded(true);
      return;
    }

    const loadUserSettings = async () => {
      setIsLoading(true);
      try {
        const settingsRef = doc(db, 'userSettings', userId);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          
          // Load FSRS parameters
          if (data.fsrsParams) {
            setFsrsParams({ ...DEFAULT_FSRS_PARAMS, ...data.fsrsParams });
          }
          
          // Load UI preferences
          if (data.preferences) {
            const { isDarkMode: savedDarkMode, showIntervalSettings: savedShowInterval } = data.preferences;
            
            if (typeof savedDarkMode === 'boolean') {
              setIsDarkMode(savedDarkMode);
              applyTheme(savedDarkMode);
            }
            
            if (typeof savedShowInterval === 'boolean') {
              setShowIntervalSettings(savedShowInterval);
            }
          }

          // Load API keys and provider
          if (data.apiKeys) {
            const savedKeys = {
              openai: data.apiKeys.openai || '',
              anthropic: data.apiKeys.anthropic || '',
              gemini: data.apiKeys.gemini || '',
              gpt5nano: data.apiKeys.gpt5nano || '',
              mistral: data.apiKeys.mistral || '',
              groq: data.apiKeys.groq || ''
            };
            setApiKeys(savedKeys);
            
            // Also save to localStorage for backwards compatibility
            Object.entries(savedKeys).forEach(([provider, key]) => {
              if (key) {
                localStorage.setItem(`${provider}_api_key`, key);
              }
            });
          }
          
          if (data.selectedProvider && typeof data.selectedProvider === 'string') {
            setSelectedProvider(data.selectedProvider);
            localStorage.setItem('selected_ai_provider', data.selectedProvider);
          }
          
          // Load tour state
          if (typeof data.hasSeenTour === 'boolean') {
            setHasSeenTour(data.hasSeenTour);
            localStorage.setItem('has_seen_tour', data.hasSeenTour.toString());
          }
        } else {
          // Create default settings document for new user
          await saveUserSettings({
            fsrsParams: DEFAULT_FSRS_PARAMS,
            preferences: {
              isDarkMode: false,
              showIntervalSettings: false
            },
            apiKeys: {
              openai: '',
              anthropic: '',
              gemini: '',
              gpt5nano: '',
              mistral: '',
              groq: ''
            },
            selectedProvider: 'openai',
            hasSeenTour: false
          });
        }
        
        setSettingsLoaded(true);
      } catch (error) {
        console.error('Error loading user settings:', error);
        setError('Failed to load settings');
        setSettingsLoaded(true); // Still mark as loaded to allow app to function
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSettings();
  }, [db, userId, saveUserSettings]);

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode);

    // Save to Firestore
    if (db && userId) {
      try {
        await saveUserSettings({
          preferences: {
            isDarkMode: newDarkMode,
            showIntervalSettings
          }
        });
      } catch (error) {
        console.error('Error saving theme preference:', error);
        setError('Failed to save theme preference');
      }
    }
  };

  /**
   * Update FSRS parameters
   * @param {Object} newParams - New FSRS parameters
   */
  const updateFsrsParams = async (newParams) => {
    setFsrsParams(newParams);

    // Save to localStorage as backup
    localStorage.setItem(STORAGE_KEYS.FSRS_PARAMS, JSON.stringify(newParams));

    // Save to Firestore
    if (db && userId) {
      try {
        await saveUserSettings({
          fsrsParams: newParams
        });
      } catch (error) {
        console.error('Error saving FSRS parameters:', error);
        setError('Failed to save FSRS parameters');
        throw error;
      }
    }
  };

  /**
   * Toggle interval settings visibility
   */
  const toggleIntervalSettings = async () => {
    const newShowInterval = !showIntervalSettings;
    setShowIntervalSettings(newShowInterval);

    // Save to Firestore
    if (db && userId) {
      try {
        await saveUserSettings({
          preferences: {
            isDarkMode,
            showIntervalSettings: newShowInterval
          }
        });
      } catch (error) {
        console.error('Error saving interval settings preference:', error);
        setError('Failed to save preference');
      }
    }
  };

  /**
   * Reset FSRS parameters to default
   */
  const resetFsrsParams = async () => {
    await updateFsrsParams(DEFAULT_FSRS_PARAMS);
  };

  /**
   * Update API keys
   * @param {Object} newKeys - New API keys object
   */
  const updateApiKeys = async (newKeys) => {
    setApiKeys(newKeys);

    // Save to localStorage as backup
    Object.entries(newKeys).forEach(([provider, key]) => {
      if (key) {
        localStorage.setItem(`${provider}_api_key`, key);
      } else {
        localStorage.removeItem(`${provider}_api_key`);
      }
    });

    // Save to Firestore (only for authenticated users)
    if (db && userId) {
      try {
        await saveUserSettings({
          apiKeys: newKeys
        });
      } catch (error) {
        console.error('Error saving API keys to Firestore:', error);
        // Don't throw error or set error state for API key saves
        // This allows the app to continue working with localStorage only
        console.warn('Continuing with localStorage-only API key storage');
      }
    }
  };

  /**
   * Update selected AI provider
   * @param {string} provider - Provider name
   */
  const updateSelectedProvider = async (provider) => {
    setSelectedProvider(provider);

    // Save to localStorage as backup
    localStorage.setItem('selected_ai_provider', provider);

    // Save to Firestore (only for authenticated users)
    if (db && userId) {
      try {
        await saveUserSettings({
          selectedProvider: provider
        });
      } catch (error) {
        console.error('Error saving selected provider to Firestore:', error);
        // Don't throw error or set error state for provider saves
        // This allows the app to continue working with localStorage only
        console.warn('Continuing with localStorage-only provider storage');
      }
    }
  };

  /**
   * Mark tour as seen
   */
  const markTourAsSeen = async () => {
    setHasSeenTour(true);
    
    // Save to localStorage immediately
    localStorage.setItem('has_seen_tour', 'true');
    
    // Save to Firestore
    if (db && userId) {
      try {
        await saveUserSettings({
          hasSeenTour: true
        });
      } catch (error) {
        console.error('Error saving tour state:', error);
        // Don't throw error for tour state
      }
    }
  };

  /**
   * Load settings from localStorage as fallback
   */
  const loadFromLocalStorage = () => {
    try {
      // Load theme
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme) {
        const isDark = savedTheme === THEMES.DARK;
        setIsDarkMode(isDark);
        applyTheme(isDark);
      }

      // Load FSRS parameters
      const savedParams = localStorage.getItem(STORAGE_KEYS.FSRS_PARAMS);
      if (savedParams) {
        const params = JSON.parse(savedParams);
        setFsrsParams({ ...DEFAULT_FSRS_PARAMS, ...params });
      }

      // Load API keys
      const savedKeys = {
        openai: localStorage.getItem('openai_api_key') || '',
        anthropic: localStorage.getItem('anthropic_api_key') || '',
        gemini: localStorage.getItem('gemini_api_key') || '',
        gpt5nano: localStorage.getItem('gpt5nano_api_key') || '',
        mistral: localStorage.getItem('mistral_api_key') || '',
        groq: localStorage.getItem('groq_api_key') || ''
      };
      setApiKeys(savedKeys);

      // Load selected provider
      const savedProvider = localStorage.getItem('selected_ai_provider') || 'openai';
      setSelectedProvider(savedProvider);
      
      // Load tour state
      const savedTourState = localStorage.getItem('has_seen_tour');
      setHasSeenTour(savedTourState === 'true');

      setSettingsLoaded(true);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setSettingsLoaded(true);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError('');
  };

  return {
    // State
    isDarkMode,
    fsrsParams,
    showIntervalSettings,
    apiKeys,
    selectedProvider,
    hasSeenTour,
    settingsLoaded,
    isLoading,
    error,

    // Actions
    toggleDarkMode,
    updateFsrsParams,
    toggleIntervalSettings,
    resetFsrsParams,
    updateApiKeys,
    updateSelectedProvider,
    markTourAsSeen,
    loadFromLocalStorage,
    clearError,

    // Utils
    applyTheme
  };
};