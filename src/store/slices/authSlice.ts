import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { User } from '@/types/user';
import { RootState } from '../store';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginWithEmail = createAsyncThunk(
  'auth/loginWithEmail',
  async ({ email, password }: { email: string; password: string }) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return transformFirebaseUser(userCredential.user);
  }
);

export const registerWithEmail = createAsyncThunk(
  'auth/registerWithEmail',
  async ({ email, password }: { email: string; password: string }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return transformFirebaseUser(userCredential.user);
  }
);

export const loginAnonymously = createAsyncThunk(
  'auth/loginAnonymously',
  async () => {
    const userCredential = await signInAnonymously(auth);
    return transformFirebaseUser(userCredential.user);
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    await signOut(auth);
  }
);

// Helper function to transform Firebase user
const transformFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName,
  photoURL: firebaseUser.photoURL,
  isAnonymous: firebaseUser.isAnonymous,
  createdAt: new Date(),
  lastLoginAt: new Date(),
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login with email
    builder
      .addCase(loginWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      });
    
    // Register with email
    builder
      .addCase(registerWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(registerWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      });
    
    // Anonymous login
    builder
      .addCase(loginAnonymously.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAnonymously.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginAnonymously.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Anonymous login failed';
      });
    
    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

// Actions
export const { setUser, clearError } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

export default authSlice.reducer;