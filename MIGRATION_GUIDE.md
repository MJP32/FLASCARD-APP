# Flashcard App Migration Guide

## Overview
This guide provides step-by-step instructions for migrating the current React flashcard application to the new scalable architecture.

## Migration Steps

### Step 1: Install Required Dependencies

```bash
npm install --save styled-components @reduxjs/toolkit react-redux
npm install --save-dev @types/styled-components @types/react @types/react-dom typescript
```

### Step 2: TypeScript Configuration

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"],
      "@/components/*": ["components/*"],
      "@/screens/*": ["screens/*"],
      "@/hooks/*": ["hooks/*"],
      "@/services/*": ["services/*"],
      "@/store/*": ["store/*"],
      "@/utils/*": ["utils/*"],
      "@/theme": ["theme/index"],
      "@/types": ["types/index"],
      "@/config": ["config/index"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "build", "dist"]
}
```

### Step 3: Component Migration Map

| Current Component | New Location |
|------------------|--------------|
| App.js | Split into multiple components |
| LoginScreen.jsx | screens/Auth/LoginScreen/ |
| FlashcardDisplay.jsx | components/flashcard/FlashcardDisplay/ |
| FlashcardForm.jsx | components/flashcard/FlashcardForm/ |
| ImportExportModal.jsx | components/modals/ImportExportModal/ |
| GenerateQuestionsModal.jsx | components/modals/GenerateQuestionsModal/ |
| SettingsModal.jsx | components/modals/SettingsModal/ |
| Calendar.js | components/common/Calendar/ |
| RichTextEditor.jsx | components/common/RichTextEditor/ |

### Step 4: State Migration Strategy

#### Current State (in App.js)
```javascript
// Authentication state
const [userId, setUserId] = useState(null);
const [auth, setAuth] = useState(null);

// Flashcard state
const [flashcards, setFlashcards] = useState([]);
const [currentCardIndex, setCurrentCardIndex] = useState(0);

// UI state
const [showSettingsModal, setShowSettingsModal] = useState(false);
```

#### New State (Redux Toolkit)
```typescript
// store/slices/authSlice.ts
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
});

// store/slices/flashcardsSlice.ts
const flashcardsSlice = createSlice({
  name: 'flashcards',
  initialState: {
    cards: [],
    currentIndex: 0,
    filters: {},
    loading: false,
  },
  reducers: {
    setCards: (state, action) => {
      state.cards = action.payload;
    },
  },
});
```

### Step 5: Hook Migration

#### Current Hook Usage
```javascript
// hooks/useAuth.js
export const useAuth = (firebaseApp) => {
  const [auth, setAuth] = useState(null);
  // ... hook logic
};
```

#### New Hook Pattern
```typescript
// features/auth/hooks/useAuth.ts
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { selectCurrentUser, loginAsync } from '@/store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  
  const login = async (credentials: LoginCredentials) => {
    return dispatch(loginAsync(credentials));
  };
  
  return { user, login };
};
```

### Step 6: Service Layer Migration

#### Current Service Pattern
```javascript
// Direct Firebase calls in components
const fetchFlashcards = async () => {
  const q = query(collection(db, 'flashcards'), where('userId', '==', userId));
  // ...
};
```

#### New Service Pattern
```typescript
// services/api/flashcards.ts
export class FlashcardsAPI {
  static async getFlashcards(userId: string): Promise<Flashcard[]> {
    const q = query(
      collection(db, FIREBASE_COLLECTIONS.FLASHCARDS),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Flashcard));
  }
}
```

### Step 7: CSS to Styled Components

#### Current CSS
```css
.btn-primary {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
}
```

#### Styled Component
```typescript
const PrimaryButton = styled.button`
  background-color: ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.contrast};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
`;
```

### Step 8: File Import Updates

#### Old Imports
```javascript
import './App.css';
import LoginScreen from './LoginScreen.jsx';
import { useAuth } from './hooks/useAuth';
```

#### New Imports
```typescript
import { Button } from '@/components/common';
import { LoginScreen } from '@/screens/Auth';
import { useAuth } from '@/features/auth/hooks';
```

## Migration Checklist

- [ ] Install dependencies
- [ ] Setup TypeScript configuration
- [ ] Create new folder structure
- [ ] Migrate theme and constants
- [ ] Create common components
- [ ] Setup Redux store
- [ ] Migrate authentication logic
- [ ] Migrate flashcard management
- [ ] Convert CSS to styled-components
- [ ] Update all imports
- [ ] Add type definitions
- [ ] Setup testing infrastructure
- [ ] Update build configuration
- [ ] Test all functionality
- [ ] Update documentation

## Common Pitfalls

1. **Firebase Initialization**: Ensure Firebase is initialized before using any services
2. **Type Safety**: Add proper TypeScript types for all data structures
3. **Import Paths**: Use absolute imports with @ alias
4. **State Updates**: Ensure Redux actions are dispatched correctly
5. **Async Operations**: Use Redux Toolkit's createAsyncThunk for API calls

## Testing Strategy

1. Unit test all utility functions
2. Component testing with React Testing Library
3. Integration tests for Redux actions
4. E2E tests for critical user flows

## Performance Considerations

1. Lazy load heavy components
2. Memoize expensive calculations
3. Use React.memo for pure components
4. Implement virtual scrolling for large lists
5. Code split by route