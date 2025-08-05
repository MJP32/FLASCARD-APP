# Flashcard App Refactoring Plan

## Current Structure Analysis
The app is currently a React web application with:
- **Main App**: Monolithic App.js with all state management
- **Components**: 7 modal/form components in `/components`
- **Hooks**: 3 custom hooks for auth, flashcards, and settings
- **Services**: 2 service files for export and file parsing
- **Utils**: Constants and multiple debug utilities
- **Styling**: CSS files with extensive custom styles

## New Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Card/
│   │   ├── Input/
│   │   └── LoadingSpinner/
│   ├── flashcard/
│   │   ├── FlashcardDisplay/
│   │   ├── FlashcardForm/
│   │   ├── ReviewButtons/
│   │   └── CategoryFilter/
│   ├── layout/
│   │   ├── Header/
│   │   ├── MobileHeader/
│   │   └── Footer/
│   └── modals/
│       ├── ImportExportModal/
│       ├── GenerateQuestionsModal/
│       ├── ManageCardsModal/
│       ├── SettingsModal/
│       └── StudyGuideModal/
│
├── screens/
│   ├── Auth/
│   │   └── LoginScreen/
│   ├── Home/
│   │   └── HomeScreen/
│   └── Study/
│       └── StudyScreen/
│
├── features/
│   ├── auth/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── flashcards/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── types/
│   └── settings/
│       ├── hooks/
│       └── types/
│
├── services/
│   ├── api/
│   │   └── firebase/
│   ├── storage/
│   └── export/
│
├── store/
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── flashcardsSlice.ts
│   │   └── settingsSlice.ts
│   └── store.ts
│
├── hooks/
│   ├── common/
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   └── index.ts
│
├── utils/
│   ├── constants/
│   ├── formatters/
│   ├── validators/
│   ├── fsrs/
│   └── debug/
│
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   └── index.ts
│
├── types/
│   ├── flashcard.ts
│   ├── user.ts
│   └── index.ts
│
└── config/
    ├── firebase.ts
    └── constants.ts
```

## Refactoring Steps

### Phase 1: Setup New Structure
1. Create new directory structure
2. Install necessary dependencies (Redux Toolkit, styled-components)
3. Setup TypeScript configuration
4. Create base theme system

### Phase 2: Component Migration
1. Break down App.js into smaller components
2. Extract common UI components
3. Create proper component hierarchy
4. Implement proper prop types/interfaces

### Phase 3: State Management
1. Migrate from hooks to Redux Toolkit
2. Create proper slices for each domain
3. Implement selectors and actions
4. Setup middleware for Firebase sync

### Phase 4: Services Layer
1. Create proper API service layer
2. Implement error handling
3. Add request/response interceptors
4. Create data transformation layer

### Phase 5: Testing & Documentation
1. Add unit tests for components
2. Add integration tests for features
3. Create component documentation
4. Update README with new structure

## Benefits of New Structure
- **Scalability**: Easy to add new features
- **Maintainability**: Clear separation of concerns
- **Testability**: Isolated components and logic
- **Type Safety**: Full TypeScript support
- **Developer Experience**: Clear import paths and organization