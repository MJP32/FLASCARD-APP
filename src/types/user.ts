export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserSettings {
  userId: string;
  darkMode: boolean;
  fsrsParameters: FSRSParameters;
  studyReminders: boolean;
  reminderTime: string;
  autoAdvanceCards: boolean;
  autoAdvanceDelay: number;
  showCardCount: boolean;
  soundEnabled: boolean;
  defaultCategory: string;
  cardsPerSession: number;
  hideCompletedCards: boolean;
}

export interface UserStats {
  userId: string;
  totalCards: number;
  cardsStudiedToday: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  averageAccuracy: number;
  lastStudyDate: Date;
}

export interface FSRSParameters {
  requestRetention: number;
  maximumInterval: number;
  w: number[];
  initialDifficulty: number;
  fuzzFactor: number;
  easyFactor: number;
  goodFactor: number;
  hardFactor: number;
  againFactor: number;
  initialStability: number;
  initialAgainInterval: number;
  initialHardInterval: number;
  initialGoodInterval: number;
  initialEasyInterval: number;
}