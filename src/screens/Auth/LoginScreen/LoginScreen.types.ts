export interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export type AuthMode = 'login' | 'register' | 'forgotPassword';