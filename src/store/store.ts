import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import flashcardsReducer from './slices/flashcardsSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    flashcards: flashcardsReducer,
    settings: settingsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['flashcards/addCard', 'flashcards/updateCard'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'payload.date'],
        // Ignore these paths in the state
        ignoredPaths: ['flashcards.items'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;