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
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const isDark = savedTheme === THEMES.DARK;
    setIsDarkMode(isDark);
    
    // Apply theme immediately to prevent flash
    applyTheme(isDark);
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
    if (!db || !userId) return;

    try {
      const settingsRef = doc(db, 'userSettings', userId);
      await setDoc(settingsRef, {
        ...settings,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw new Error('Failed to save settings');
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
        } else {
          // Create default settings document for new user
          await saveUserSettings({
            fsrsParams: DEFAULT_FSRS_PARAMS,
            preferences: {
              isDarkMode: false,
              showIntervalSettings: false
            }
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
    settingsLoaded,
    isLoading,
    error,

    // Actions
    toggleDarkMode,
    updateFsrsParams,
    toggleIntervalSettings,
    resetFsrsParams,
    loadFromLocalStorage,
    clearError,

    // Utils
    applyTheme
  };
};