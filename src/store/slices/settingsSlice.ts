import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserSettings, FSRSParameters } from '@/types/user';
import { DEFAULT_FSRS_PARAMS, FIREBASE_COLLECTIONS, STORAGE_KEYS } from '@/config/constants';
import { RootState } from '../store';

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchUserSettings = createAsyncThunk(
  'settings/fetch',
  async (userId: string) => {
    const docRef = doc(db, FIREBASE_COLLECTIONS.USER_SETTINGS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserSettings;
    } else {
      // Create default settings
      const defaultSettings: UserSettings = {
        userId,
        darkMode: false,
        fsrsParameters: DEFAULT_FSRS_PARAMS,
        studyReminders: false,
        reminderTime: '09:00',
        autoAdvanceCards: false,
        autoAdvanceDelay: 3000,
        showCardCount: true,
        soundEnabled: true,
        defaultCategory: 'All',
        cardsPerSession: 20,
        hideCompletedCards: false,
      };
      
      await setDoc(docRef, defaultSettings);
      return defaultSettings;
    }
  }
);

export const updateUserSettings = createAsyncThunk(
  'settings/update',
  async ({ userId, updates }: { userId: string; updates: Partial<UserSettings> }) => {
    const docRef = doc(db, FIREBASE_COLLECTIONS.USER_SETTINGS, userId);
    await setDoc(docRef, updates, { merge: true });
    
    // Update local storage for quick access
    if (updates.darkMode !== undefined) {
      localStorage.setItem(STORAGE_KEYS.THEME, updates.darkMode ? 'dark' : 'light');
    }
    if (updates.fsrsParameters) {
      localStorage.setItem(STORAGE_KEYS.FSRS_PARAMS, JSON.stringify(updates.fsrsParameters));
    }
    
    return updates;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      if (state.settings) {
        state.settings.darkMode = action.payload;
        localStorage.setItem(STORAGE_KEYS.THEME, action.payload ? 'dark' : 'light');
      }
    },
    setFSRSParameters: (state, action: PayloadAction<FSRSParameters>) => {
      if (state.settings) {
        state.settings.fsrsParameters = action.payload;
        localStorage.setItem(STORAGE_KEYS.FSRS_PARAMS, JSON.stringify(action.payload));
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder
      .addCase(fetchUserSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings = action.payload;
      })
      .addCase(fetchUserSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch settings';
      });
    
    // Update settings
    builder
      .addCase(updateUserSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.settings) {
          state.settings = { ...state.settings, ...action.payload };
        }
      })
      .addCase(updateUserSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update settings';
      });
  },
});

// Actions
export const { setDarkMode, setFSRSParameters, clearError } = settingsSlice.actions;

// Selectors
export const selectSettings = (state: RootState) => state.settings.settings;
export const selectDarkMode = (state: RootState) => state.settings.settings?.darkMode ?? false;
export const selectFSRSParameters = (state: RootState) => 
  state.settings.settings?.fsrsParameters ?? DEFAULT_FSRS_PARAMS;
export const selectAutoAdvance = (state: RootState) => ({
  enabled: state.settings.settings?.autoAdvanceCards ?? false,
  delay: state.settings.settings?.autoAdvanceDelay ?? 3000,
});
export const selectIsLoading = (state: RootState) => state.settings.isLoading;
export const selectError = (state: RootState) => state.settings.error;

export default settingsSlice.reducer;