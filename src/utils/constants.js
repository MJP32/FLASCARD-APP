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

/**
 * Gamification configuration
 */
export const GAMIFICATION_CONFIG = {
  // XP awarded per review response
  XP_AMOUNTS: {
    AGAIN: 10,
    HARD: 25,
    GOOD: 50,
    EASY: 100
  },
  // Daily goal settings
  DAILY_GOALS: {
    MIN: 5,
    DEFAULT: 20,
    MAX: 100,
    STEP: 5
  },
  // Streak bonuses
  STREAK_BONUSES: {
    DAY_3: { days: 3, xpBonus: 50, name: '3-Day Streak' },
    DAY_7: { days: 7, xpBonus: 200, name: 'Week Warrior' },
    DAY_14: { days: 14, xpBonus: 500, name: 'Two Week Champion' },
    DAY_30: { days: 30, xpBonus: 1000, name: 'Monthly Master' },
    DAY_100: { days: 100, xpBonus: 5000, name: 'Century Club' }
  },
  // Level thresholds (XP required for each level)
  LEVELS: [
    { level: 1, xpRequired: 0, title: 'Beginner' },
    { level: 2, xpRequired: 100, title: 'Novice' },
    { level: 3, xpRequired: 300, title: 'Apprentice' },
    { level: 4, xpRequired: 600, title: 'Student' },
    { level: 5, xpRequired: 1000, title: 'Learner' },
    { level: 6, xpRequired: 1500, title: 'Scholar' },
    { level: 7, xpRequired: 2500, title: 'Academic' },
    { level: 8, xpRequired: 4000, title: 'Expert' },
    { level: 9, xpRequired: 6000, title: 'Master' },
    { level: 10, xpRequired: 10000, title: 'Grandmaster' }
  ]
};

/**
 * Achievement definitions
 */
export const ACHIEVEMENTS = {
  // Review milestones
  FIRST_STEPS: {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first review',
    icon: '👶',
    condition: { type: 'totalReviews', value: 1 }
  },
  GETTING_STARTED: {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Review 10 cards',
    icon: '🚀',
    condition: { type: 'totalReviews', value: 10 }
  },
  CENTURION: {
    id: 'centurion',
    name: 'Centurion',
    description: 'Review 100 cards',
    icon: '💯',
    condition: { type: 'totalReviews', value: 100 }
  },
  FIVE_HUNDRED_CLUB: {
    id: 'five_hundred_club',
    name: '500 Club',
    description: 'Review 500 cards',
    icon: '🏆',
    condition: { type: 'totalReviews', value: 500 }
  },
  THOUSAND_REVIEWS: {
    id: 'thousand_reviews',
    name: 'Millennium',
    description: 'Review 1000 cards',
    icon: '👑',
    condition: { type: 'totalReviews', value: 1000 }
  },

  // Streak achievements
  DEDICATED: {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    condition: { type: 'streak', value: 3 }
  },
  WEEK_WARRIOR: {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚔️',
    condition: { type: 'streak', value: 7 }
  },
  FORTNIGHT_FIGHTER: {
    id: 'fortnight_fighter',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day streak',
    icon: '🛡️',
    condition: { type: 'streak', value: 14 }
  },
  MONTHLY_MASTER: {
    id: 'monthly_master',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🏅',
    condition: { type: 'streak', value: 30 }
  },

  // Daily goal achievements
  GOAL_GETTER: {
    id: 'goal_getter',
    name: 'Goal Getter',
    description: 'Complete your daily goal',
    icon: '🎯',
    condition: { type: 'dailyGoalComplete', value: 1 }
  },
  CONSISTENT: {
    id: 'consistent',
    name: 'Consistent',
    description: 'Complete daily goal 7 days in a row',
    icon: '📈',
    condition: { type: 'dailyGoalStreak', value: 7 }
  },
  OVERACHIEVER: {
    id: 'overachiever',
    name: 'Overachiever',
    description: 'Review 2x your daily goal in one day',
    icon: '🌟',
    condition: { type: 'dailyGoalMultiplier', value: 2 }
  },

  // Performance achievements
  PERFECT_TEN: {
    id: 'perfect_ten',
    name: 'Perfect Ten',
    description: 'Get 10 "Easy" ratings in a row',
    icon: '✨',
    condition: { type: 'easyStreak', value: 10 }
  },
  SHARP_MIND: {
    id: 'sharp_mind',
    name: 'Sharp Mind',
    description: 'Achieve 90% accuracy in a session (min 20 cards)',
    icon: '🧠',
    condition: { type: 'sessionAccuracy', value: 90, minCards: 20 }
  },

  // Time-based achievements
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Study before 7 AM',
    icon: '🌅',
    condition: { type: 'studyTime', value: 'early' }
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Study after 10 PM',
    icon: '🦉',
    condition: { type: 'studyTime', value: 'night' }
  },

  // Card creation achievements
  CREATOR: {
    id: 'creator',
    name: 'Creator',
    description: 'Create 10 flashcards',
    icon: '✏️',
    condition: { type: 'cardsCreated', value: 10 }
  },
  PROLIFIC: {
    id: 'prolific',
    name: 'Prolific',
    description: 'Create 100 flashcards',
    icon: '📚',
    condition: { type: 'cardsCreated', value: 100 }
  },

  // XP achievements
  XP_COLLECTOR: {
    id: 'xp_collector',
    name: 'XP Collector',
    description: 'Earn 1000 XP',
    icon: '💎',
    condition: { type: 'totalXP', value: 1000 }
  },
  XP_MASTER: {
    id: 'xp_master',
    name: 'XP Master',
    description: 'Earn 10000 XP',
    icon: '💰',
    condition: { type: 'totalXP', value: 10000 }
  }
};