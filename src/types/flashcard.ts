export interface Flashcard {
  id: string;
  userId: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string;
  level: number;
  tags: string[];
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastReviewedAt?: Date;
  nextReviewDate?: Date;
  
  // FSRS (Spaced Repetition) fields
  difficulty: number;
  stability: number;
  interval: number;
  repetitions: number;
  lapses: number;
  state: CardState;
  due: Date;
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum ReviewRating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface ReviewLog {
  cardId: string;
  rating: ReviewRating;
  reviewedAt: Date;
  scheduledDays: number;
  elapsedDays: number;
  state: CardState;
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

export interface Category {
  name: string;
  count: number;
  dueCount: number;
  subcategories: string[];
}

export interface StudySession {
  id: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  cardsStudied: number;
  cardsCorrect: number;
  averageEase: number;
  streakDays: number;
}