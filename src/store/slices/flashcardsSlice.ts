import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Flashcard, FilterParams } from '@/types';
import { FIREBASE_COLLECTIONS } from '@/config/constants';
import { RootState } from '../store';

interface FlashcardsState {
  cards: Flashcard[];
  filteredCards: Flashcard[];
  currentIndex: number;
  filters: FilterParams;
  isLoading: boolean;
  error: string | null;
  unsubscribe: Unsubscribe | null;
}

const initialState: FlashcardsState = {
  cards: [],
  filteredCards: [],
  currentIndex: 0,
  filters: {},
  isLoading: false,
  error: null,
  unsubscribe: null,
};

// Async thunks
export const subscribeToFlashcards = createAsyncThunk(
  'flashcards/subscribe',
  async (userId: string, { dispatch }) => {
    const q = query(
      collection(db, FIREBASE_COLLECTIONS.FLASHCARDS),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cards: Flashcard[] = [];
        snapshot.forEach((doc) => {
          cards.push({ id: doc.id, ...doc.data() } as Flashcard);
        });
        dispatch(setCards(cards));
      },
      (error) => {
        dispatch(setError(error.message));
      }
    );

    return unsubscribe;
  }
);

export const createFlashcard = createAsyncThunk(
  'flashcards/create',
  async (cardData: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.FLASHCARDS), {
      ...cardData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }
);

export const updateFlashcard = createAsyncThunk(
  'flashcards/update',
  async ({ id, updates }: { id: string; updates: Partial<Flashcard> }) => {
    const cardRef = doc(db, FIREBASE_COLLECTIONS.FLASHCARDS, id);
    await updateDoc(cardRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { id, updates };
  }
);

export const deleteFlashcard = createAsyncThunk(
  'flashcards/delete',
  async (id: string) => {
    await deleteDoc(doc(db, FIREBASE_COLLECTIONS.FLASHCARDS, id));
    return id;
  }
);

const flashcardsSlice = createSlice({
  name: 'flashcards',
  initialState,
  reducers: {
    setCards: (state, action: PayloadAction<Flashcard[]>) => {
      state.cards = action.payload;
      state.filteredCards = applyFilters(action.payload, state.filters);
    },
    setFilters: (state, action: PayloadAction<FilterParams>) => {
      state.filters = action.payload;
      state.filteredCards = applyFilters(state.cards, action.payload);
      state.currentIndex = 0;
    },
    setCurrentIndex: (state, action: PayloadAction<number>) => {
      state.currentIndex = action.payload;
    },
    nextCard: (state) => {
      if (state.currentIndex < state.filteredCards.length - 1) {
        state.currentIndex += 1;
      }
    },
    previousCard: (state) => {
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    cleanup: (state) => {
      if (state.unsubscribe) {
        state.unsubscribe();
        state.unsubscribe = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Subscribe to flashcards
    builder.addCase(subscribeToFlashcards.fulfilled, (state, action) => {
      state.unsubscribe = action.payload;
    });

    // Create flashcard
    builder
      .addCase(createFlashcard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createFlashcard.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createFlashcard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create flashcard';
      });

    // Update flashcard
    builder
      .addCase(updateFlashcard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateFlashcard.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateFlashcard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update flashcard';
      });

    // Delete flashcard
    builder
      .addCase(deleteFlashcard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteFlashcard.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteFlashcard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete flashcard';
      });
  },
});

// Helper function to apply filters
const applyFilters = (cards: Flashcard[], filters: FilterParams): Flashcard[] => {
  return cards.filter((card) => {
    if (filters.category && card.category !== filters.category) return false;
    if (filters.subcategory && card.subcategory !== filters.subcategory) return false;
    if (filters.level !== undefined && card.level !== filters.level) return false;
    if (filters.starred !== undefined && card.starred !== filters.starred) return false;
    if (filters.dueToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(card.due);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate > today) return false;
    }
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesQuestion = card.question.toLowerCase().includes(searchLower);
      const matchesAnswer = card.answer.toLowerCase().includes(searchLower);
      if (!matchesQuestion && !matchesAnswer) return false;
    }
    return true;
  });
};

// Actions
export const { 
  setCards, 
  setFilters, 
  setCurrentIndex, 
  nextCard, 
  previousCard,
  setError,
  clearError,
  cleanup 
} = flashcardsSlice.actions;

// Selectors
export const selectAllCards = (state: RootState) => state.flashcards.cards;
export const selectFilteredCards = (state: RootState) => state.flashcards.filteredCards;
export const selectCurrentCard = (state: RootState) => 
  state.flashcards.filteredCards[state.flashcards.currentIndex] || null;
export const selectCurrentIndex = (state: RootState) => state.flashcards.currentIndex;
export const selectFilters = (state: RootState) => state.flashcards.filters;
export const selectIsLoading = (state: RootState) => state.flashcards.isLoading;
export const selectError = (state: RootState) => state.flashcards.error;

// Computed selectors
export const selectCardCount = (state: RootState) => state.flashcards.filteredCards.length;
export const selectDueCount = (state: RootState) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return state.flashcards.cards.filter(card => {
    const dueDate = new Date(card.due);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate <= today;
  }).length;
};

export default flashcardsSlice.reducer;