// Application constants and configuration

/**
 * Default FSRS algorithm parameters
 */
export const DEFAULT_FSRS_PARAMS = {
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
  initialEasyInterval: 15
};

/**
 * Review response options for spaced repetition
 */
export const REVIEW_RESPONSES = {
  AGAIN: 'again',
  HARD: 'hard', 
  GOOD: 'good',
  EASY: 'easy'
};

/**
 * Category sorting options
 */
export const CATEGORY_SORT_OPTIONS = {
  ALPHABETICAL: 'alphabetical',
  MOST_DUE: 'most-due',
  LEAST_DUE: 'least-due'
};

/**
 * File types supported for import
 */
export const SUPPORTED_FILE_TYPES = {
  CSV: '.csv',
  EXCEL: '.xlsx,.xls'
};

/**
 * Maximum file sizes for various operations
 */
export const FILE_SIZE_LIMITS = {
  IMPORT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  IMAGE_MAX_SIZE: 2 * 1024 * 1024,   // 2MB for images
  EXCEL_CELL_LIMIT: 32767,           // Excel cell character limit
  LARGE_CONTENT_THRESHOLD: 20000     // When to use CSV instead of Excel
};

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  FSRS_PARAMS: 'fsrsParams',
  SETTINGS: 'flashcardSettings',
  USER_PREFERENCES: 'userPreferences'
};

/**
 * Theme options
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_EMAIL: 'Please enter a valid email address',
    WEAK_PASSWORD: 'Password must be at least 6 characters long',
    USER_NOT_FOUND: 'No user found with this email address',
    WRONG_PASSWORD: 'Incorrect password',
    EMAIL_IN_USE: 'An account with this email already exists',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.'
  },
  IMPORT: {
    INVALID_FILE: 'Please select a valid CSV or Excel file',
    FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB',
    EMPTY_FILE: 'The selected file is empty',
    PARSE_ERROR: 'Unable to parse the file. Please check the format',
    NO_VALID_CARDS: 'No valid flashcards found in the file'
  },
  EXPORT: {
    NO_CARDS: 'No flashcards available to export',
    EXPORT_FAILED: 'Export failed. Please try again'
  },
  GENERAL: {
    NETWORK_ERROR: 'Network error. Please try again',
    UNKNOWN_ERROR: 'An unexpected error occurred'
  }
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  CARD_CREATED: 'Flashcard created successfully',
  CARD_UPDATED: 'Flashcard updated successfully',
  CARD_DELETED: 'Flashcard deleted successfully',
  IMPORT_SUCCESS: 'Flashcards imported successfully',
  EXPORT_SUCCESS: 'Flashcards exported successfully',
  SETTINGS_SAVED: 'Settings saved successfully'
};

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
  IMPORT: ['i']
};

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  CARD_FLIP: 400,
  MODAL_FADE: 200
};

/**
 * Debounce delays (in milliseconds)
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  TEXT_INPUT: 150,
  RESIZE: 100
};

/**
 * Firebase collection names
 */
export const FIREBASE_COLLECTIONS = {
  FLASHCARDS: 'flashcards',
  USER_SETTINGS: 'userSettings',
  USER_PROGRESS: 'userProgress'
};

/**
 * Default card values
 */
export const DEFAULT_CARD_VALUES = {
  CATEGORY: 'Uncategorized',
  DIFFICULTY: 5,
  STABILITY: 2,
  EASE_FACTOR: 2.5,
  INTERVAL: 1,
  REPETITIONS: 0,
  REVIEW_COUNT: 0
};

/**
 * Rich text editor configuration
 */
export const RICH_TEXT_CONFIG = {
  MIN_HEIGHT: '150px',
  MAX_HEIGHT: '400px',
  TOOLBAR_HEIGHT: '40px',
  FONT_SIZES: [
    { label: 'Very Small', value: '1' },
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Medium', value: '4' },
    { label: 'Large', value: '5' },
    { label: 'Very Large', value: '6' },
    { label: 'Huge', value: '7' }
  ],
  COLORS: [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0',
    '#808080', '#9999FF', '#993366', '#FFFFCC', '#CCFFFF', '#660066', '#FF8080',
    '#0066CC', '#CCCCFF', '#000080', '#FF00FF', '#FFFF00', '#00FFFF', '#800080'
  ],
  FONTS: [
    'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
    'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact'
  ]
};

/**
 * Calendar configuration
 */
export const CALENDAR_CONFIG = {
  DAYS_PER_WEEK: 7,
  WEEKS_TO_SHOW: 6,
  START_DAY: 0, // 0 = Sunday, 1 = Monday
  DATE_FORMAT: 'YYYY-MM-DD',
  DISPLAY_FORMAT: 'MMM DD, YYYY'
};

/**
 * Progress tracking configuration
 */
export const PROGRESS_CONFIG = {
  STREAK_THRESHOLD: 5, // Days
  DAILY_GOAL: 20,      // Cards per day
  WEEKLY_GOAL: 100,    // Cards per week
  RETENTION_CALCULATION_DAYS: 30
};