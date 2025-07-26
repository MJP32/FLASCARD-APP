export * from './flashcard';
export * from './user';

// Common types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  category?: string;
  subcategory?: string;
  level?: number;
  starred?: boolean;
  dueToday?: boolean;
  searchTerm?: string;
}

export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface ErrorState {
  message: string;
  code?: string;
  details?: any;
}