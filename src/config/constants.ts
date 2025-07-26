import { FSRSParameters } from '@/types';

/**
 * Default FSRS algorithm parameters
 */
export const DEFAULT_FSRS_PARAMS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  initialDifficulty: 5,
  fuzzFactor: 0.05,
  easyFactor: 1.3,
  goodFactor: 1.0,
  hardFactor: 0.8,
  againFactor: 0.5,
  initialStability: 2,
  initialAgainInterval: 1,
  initialHardInterval: 1,
  initialGoodInterval: 4,
  initialEasyInterval: 15,
};

/**
 * Review response options for spaced repetition
 */
export const REVIEW_RESPONSES = {
  AGAIN: 'again',
  HARD: 'hard', 
  GOOD: 'good',
  EASY: 'easy',
} as const;

/**
 * Category sorting options
 */
export const CATEGORY_SORT_OPTIONS = {
  ALPHABETICAL: 'alphabetical',
  MOST_DUE: 'most-due',
  LEAST_DUE: 'least-due',
} as const;

/**
 * File types supported for import
 */
export const SUPPORTED_FILE_TYPES = {
  CSV: '.csv',
  EXCEL: '.xlsx,.xls',
} as const;

/**
 * Maximum file sizes for various operations
 */
export const FILE_SIZE_LIMITS = {
  IMPORT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  IMAGE_MAX_SIZE: 2 * 1024 * 1024,   // 2MB for images
  EXCEL_CELL_LIMIT: 32767,           // Excel cell character limit
  LARGE_CONTENT_THRESHOLD: 20000,    // When to use CSV instead of Excel
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  FSRS_PARAMS: 'fsrsParams',
  SETTINGS: 'flashcardSettings',
  USER_PREFERENCES: 'userPreferences',
  AUTH_TOKEN: 'authToken',
  SESSION_NOTES: 'flashcard_session_notes',
  API_KEYS: {
    OPENAI: 'openai_api_key',
    ANTHROPIC: 'anthropic_api_key',
    GEMINI: 'gemini_api_key',
  },
  SELECTED_AI_PROVIDER: 'selected_ai_provider',
} as const;

/**
 * Firebase collection names
 */
export const FIREBASE_COLLECTIONS = {
  FLASHCARDS: 'flashcards',
  USER_SETTINGS: 'userSettings',
  USER_PROGRESS: 'userProgress',
  REVIEW_LOGS: 'reviewLogs',
} as const;

/**
 * Keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  SHOW_ANSWER: [' ', 'Enter'],
  NEXT_CARD: ['ArrowRight', 'n'],
  PREV_CARD: ['ArrowLeft', 'p'],
  REVIEW_AGAIN: ['1'],
  REVIEW_HARD: ['2'],
  REVIEW_GOOD: ['3'],
  REVIEW_EASY: ['4'],
  CREATE_CARD: ['c'],
  SETTINGS: ['s'],
  EXPORT: ['e'],
  IMPORT: ['i'],
  STAR_CARD: ['f'],
  EDIT_CARD: ['e'],
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  CARD_FLIP: 400,
  MODAL_FADE: 200,
} as const;

/**
 * Debounce delays (in milliseconds)
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  TEXT_INPUT: 150,
  RESIZE: 100,
} as const;

/**
 * Progress tracking configuration
 */
export const PROGRESS_CONFIG = {
  STREAK_THRESHOLD: 5, // Days
  DAILY_GOAL: 20,      // Cards per day
  WEEKLY_GOAL: 100,    // Cards per week
  RETENTION_CALCULATION_DAYS: 30,
} as const;