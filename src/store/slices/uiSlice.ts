import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

interface UIState {
  modals: {
    settings: boolean;
    createCard: boolean;
    importExport: boolean;
    generateQuestions: boolean;
    manageCards: boolean;
    studyGuide: boolean;
    calendar: boolean;
  };
  showAnswer: boolean;
  isHeaderCollapsed: boolean;
  message: string | null;
  error: string | null;
  loading: boolean;
  notes: string;
  showNotesDropdown: boolean;
  notesCopied: boolean;
  notesSaved: boolean;
}

const initialState: UIState = {
  modals: {
    settings: false,
    createCard: false,
    importExport: false,
    generateQuestions: false,
    manageCards: false,
    studyGuide: false,
    calendar: false,
  },
  showAnswer: false,
  isHeaderCollapsed: false,
  message: null,
  error: null,
  loading: false,
  notes: localStorage.getItem('flashcard_session_notes') || '',
  showNotesDropdown: false,
  notesCopied: false,
  notesSaved: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Modal actions
    openModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key as keyof UIState['modals']] = false;
      });
    },
    
    // Answer visibility
    setShowAnswer: (state, action: PayloadAction<boolean>) => {
      state.showAnswer = action.payload;
    },
    toggleAnswer: (state) => {
      state.showAnswer = !state.showAnswer;
    },
    
    // Header collapse
    setHeaderCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isHeaderCollapsed = action.payload;
    },
    
    // Messages
    setMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.message = null;
    },
    clearMessage: (state) => {
      state.message = null;
      state.error = null;
    },
    
    // Loading
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Notes
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
      localStorage.setItem('flashcard_session_notes', action.payload);
    },
    setShowNotesDropdown: (state, action: PayloadAction<boolean>) => {
      state.showNotesDropdown = action.payload;
    },
    setNotesCopied: (state, action: PayloadAction<boolean>) => {
      state.notesCopied = action.payload;
      if (action.payload) {
        // Auto-reset after 2 seconds
        setTimeout(() => {
          state.notesCopied = false;
        }, 2000);
      }
    },
    setNotesSaved: (state, action: PayloadAction<boolean>) => {
      state.notesSaved = action.payload;
      if (action.payload) {
        // Auto-reset after 2 seconds
        setTimeout(() => {
          state.notesSaved = false;
        }, 2000);
      }
    },
  },
});

// Actions
export const {
  openModal,
  closeModal,
  closeAllModals,
  setShowAnswer,
  toggleAnswer,
  setHeaderCollapsed,
  setMessage,
  setError,
  clearMessage,
  setLoading,
  setNotes,
  setShowNotesDropdown,
  setNotesCopied,
  setNotesSaved,
} = uiSlice.actions;

// Selectors
export const selectModals = (state: RootState) => state.ui.modals;
export const selectModalOpen = (modalName: keyof UIState['modals']) => 
  (state: RootState) => state.ui.modals[modalName];
export const selectShowAnswer = (state: RootState) => state.ui.showAnswer;
export const selectIsHeaderCollapsed = (state: RootState) => state.ui.isHeaderCollapsed;
export const selectMessage = (state: RootState) => state.ui.message;
export const selectError = (state: RootState) => state.ui.error;
export const selectIsLoading = (state: RootState) => state.ui.loading;
export const selectNotes = (state: RootState) => state.ui.notes;
export const selectShowNotesDropdown = (state: RootState) => state.ui.showNotesDropdown;
export const selectNotesCopied = (state: RootState) => state.ui.notesCopied;
export const selectNotesSaved = (state: RootState) => state.ui.notesSaved;

export default uiSlice.reducer;