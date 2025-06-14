# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based flashcard application with Firebase backend integration. The app implements spaced repetition using FSRS (Free Spaced Repetition Scheduler) algorithm for optimal learning scheduling.

## Development Commands

- `npm start` - Runs development server on localhost:3000
- `npm test` - Launches test runner in interactive watch mode  
- `npm run build` - Creates production build in `build/` folder
- `npm run eject` - Ejects from Create React App (one-way operation)

## Architecture

### Core Components
- **App.js** - Main application component containing all state management and Firebase integration
- **LoginScreen.jsx** - Authentication UI with login/register/anonymous options
- **Calendar.js** - Modal component for viewing flashcard study calendar
- **firebase.js** - Firebase configuration and initialization

### Key Features
- Firebase Authentication (email/password and anonymous)
- Firestore database for flashcard storage
- FSRS algorithm implementation for spaced repetition
- CSV import/export functionality using xlsx library
- Category-based flashcard filtering
- Dark mode support
- Calendar view for study tracking

### State Management
All state is managed in App.js using React hooks. Key state includes:
- Authentication state (userId, auth, isAuthReady)
- Flashcard data (flashcards, filteredFlashcards, currentCardIndex)
- UI state (modals, forms, dark mode)
- FSRS parameters for spaced repetition algorithm

### Firebase Integration
- Authentication: email/password and anonymous login
- Firestore: flashcards collection with user-specific documents
- Real-time listeners for flashcard updates

### Dependencies
- React 18.2.0 with Create React App
- Firebase 10.14.1 for backend services
- xlsx 0.18.5 for CSV import/export
- react-syntax-highlighter 15.5.0 for code display
- Testing Library suite for component testing