# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based flashcard application with Firebase backend integration. The app implements spaced repetition using FSRS (Free Spaced Repetition Scheduler) algorithm for optimal learning scheduling.

## Development Commands

- `npm start` - Runs development server on localhost:3000
- `npm test` - Launches test runner in interactive watch mode  
- `npm run build` - Creates production build in `build/` folder
- `npm run eject` - Ejects from Create React App (one-way operation)

## Architecture Overview

### Monolithic Component Structure
The application uses a centralized architecture where **App.js** serves as the primary container for all state management and business logic. This monolithic approach keeps related functionality together but results in a large main component (~27k tokens).

### Custom Hooks Architecture
The app leverages three main custom hooks for separation of concerns:
- **useAuth** (`src/hooks/useAuth.js`) - Firebase authentication management
- **useFlashcards** (`src/hooks/useFlashcards.js`) - Flashcard CRUD operations and Firestore integration  
- **useSettings** (`src/hooks/useSettings.js`) - User preferences and FSRS algorithm parameters

### Component Structure  
- **App.js** - Main container with all state management and modal orchestration
- **LoginScreen.jsx** - Authentication UI (email/password and anonymous login)
- **FlashcardDisplay.jsx** - Card presentation and review interface
- **FlashcardForm.jsx** - Card creation and editing forms
- **SettingsModal.jsx** - FSRS parameters and app configuration
- **ImportExportModal.jsx** - CSV/Excel file handling
- **GenerateQuestionsModal.jsx** - AI-powered question generation
- **ManageCardsModal.jsx** - Bulk card management operations
- **StudyGuideModal.jsx** - Study guide generation and viewing
- **Calendar.js** - Study calendar and streak tracking
- **RichTextEditor.jsx** - Quill-based rich text editing

### Services Layer
- **exportService.js** - Handles CSV/Excel export functionality
- **fileParser.js** - Processes uploaded CSV/Excel files for import

### Firebase Integration
- **firebase.js** - Firebase app initialization and configuration
- **Firestore Collections**: User-scoped flashcard documents with real-time synchronization
- **Authentication**: Support for email/password and anonymous users
- **Real-time Updates**: Live synchronization of flashcard changes across sessions

### FSRS Implementation
The app implements a complete FSRS (Free Spaced Repetition Scheduler) algorithm:
- **Default Parameters**: Configurable in `src/utils/constants.js`
- **Review Responses**: Four-option system (Again, Hard, Good, Easy)
- **Scheduling Logic**: Integrated into flashcard review workflow
- **Progress Tracking**: Due date calculation and interval adjustment

### Debugging Infrastructure
Extensive debugging utilities in `src/utils/` for troubleshooting:
- **debugCategories.js** - Category filtering and counting issues
- **debugDueCards.js** - Due date calculation verification
- **debugAutoAdvance.js** - Auto-advance feature testing
- **firebaseDebug.js** - Firestore connection and rule testing
- Multiple specialized debug utilities for specific features

### Key Features
- Spaced repetition with FSRS algorithm
- Category and subcategory filtering
- Rich text editing with code syntax highlighting
- AI-powered question generation (OpenAI, Anthropic, Gemini)
- CSV/Excel import/export
- Study streaks and calendar tracking
- Session notes and progress tracking
- Dark mode support
- Mobile-responsive design

### State Management Patterns
- Centralized state in App.js with prop drilling to components
- Local state in custom hooks for domain-specific logic
- localStorage for user preferences and session data
- Real-time Firestore listeners for data synchronization