export const colors = {
  primary: {
    main: '#1e40af', // Main blue from card footer/notes header
    light: '#3b82f6',
    dark: '#1e3a8a',
    contrast: '#ffffff',
  },
  secondary: {
    main: '#0ea5e9',
    light: '#38bdf8',
    dark: '#0284c7',
    contrast: '#ffffff',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    contrast: '#ffffff',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    contrast: '#ffffff',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    contrast: '#ffffff',
  },
  grey: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  background: {
    default: '#e2e8f0',
    paper: '#ffffff',
    dark: '#020617',
  },
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    disabled: '#94a3b8',
    light: '#f1f5f9',
  },
} as const;

export type Colors = typeof colors;