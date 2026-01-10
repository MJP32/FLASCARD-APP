import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

// Mock Firebase auth functions
const mockSignInAnonymously = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockGetAuth = jest.fn();

jest.mock('firebase/auth', () => ({
  getAuth: (...args) => mockGetAuth(...args),
  signInAnonymously: (...args) => mockSignInAnonymously(...args),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}));

describe('useAuth', () => {
  const mockFirebaseApp = { name: 'test-app' };
  const mockAuthInstance = { app: mockFirebaseApp };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for getAuth
    mockGetAuth.mockReturnValue(mockAuthInstance);
    // Default mock for onAuthStateChanged - returns unsubscribe function
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Don't call callback by default - tests will trigger it
      return jest.fn(); // unsubscribe function
    });
  });

  describe('initialization', () => {
    it('should initialize with default state when no firebase app', () => {
      const { result } = renderHook(() => useAuth(null));

      expect(result.current.auth).toBeNull();
      expect(result.current.userId).toBeNull();
      expect(result.current.userDisplayName).toBe('');
      expect(result.current.isAnonymous).toBe(false);
      expect(result.current.isAuthReady).toBe(false);
      expect(result.current.authError).toBe('');
      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize auth when firebase app is provided', () => {
      renderHook(() => useAuth(mockFirebaseApp));

      expect(mockGetAuth).toHaveBeenCalledWith(mockFirebaseApp);
    });

    it('should set up auth state listener', () => {
      renderHook(() => useAuth(mockFirebaseApp));

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(
        mockAuthInstance,
        expect.any(Function)
      );
    });

    it('should update state when user signs in', () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      // Simulate user sign in
      act(() => {
        authCallback({
          uid: 'test-user-id',
          email: 'test@example.com',
          isAnonymous: false,
        });
      });

      expect(result.current.userId).toBe('test-user-id');
      expect(result.current.userDisplayName).toBe('test@example.com');
      expect(result.current.isAnonymous).toBe(false);
      expect(result.current.isAuthReady).toBe(true);
    });

    it('should update state for anonymous user', () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      // Simulate anonymous user sign in
      act(() => {
        authCallback({
          uid: 'anon-user-id',
          email: null,
          isAnonymous: true,
        });
      });

      expect(result.current.userId).toBe('anon-user-id');
      expect(result.current.userDisplayName).toBe('Anonymous User');
      expect(result.current.isAnonymous).toBe(true);
    });

    it('should clear state when user signs out', () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      // First sign in
      act(() => {
        authCallback({ uid: 'test-id', email: 'test@example.com', isAnonymous: false });
      });

      expect(result.current.userId).toBe('test-id');

      // Then sign out (user is null)
      act(() => {
        authCallback(null);
      });

      expect(result.current.userId).toBeNull();
      expect(result.current.userDisplayName).toBe('');
      expect(result.current.isAnonymous).toBe(false);
      expect(result.current.isAuthReady).toBe(true);
    });

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useAuth(mockFirebaseApp));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('signInAnonymouslyUser', () => {
    it('should throw error when auth not initialized', async () => {
      const { result } = renderHook(() => useAuth(null));

      await expect(result.current.signInAnonymouslyUser()).rejects.toThrow('Auth not initialized');
    });

    it('should call signInAnonymously and return credentials', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockCredential = { user: { uid: 'anon-id' } };
      mockSignInAnonymously.mockResolvedValue(mockCredential);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      // Wait for auth to be set up
      act(() => {
        authCallback(null);
      });

      let credential;
      await act(async () => {
        credential = await result.current.signInAnonymouslyUser();
      });

      expect(mockSignInAnonymously).toHaveBeenCalledWith(mockAuthInstance);
      expect(credential).toBe(mockCredential);
    });

    it('should handle sign in error', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockError = new Error('Sign in failed');
      mockSignInAnonymously.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      await act(async () => {
        try {
          await result.current.signInAnonymouslyUser();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.authError).toBe('Sign in failed');
    });

    it('should set loading state during sign in', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      let resolveSignIn;
      mockSignInAnonymously.mockImplementation(() =>
        new Promise((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      expect(result.current.isLoading).toBe(false);

      let signInPromise;
      act(() => {
        signInPromise = result.current.signInAnonymouslyUser();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ user: { uid: 'test' } });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signInWithEmail', () => {
    it('should throw error when auth not initialized', async () => {
      const { result } = renderHook(() => useAuth(null));

      await expect(
        result.current.signInWithEmail('test@example.com', 'password')
      ).rejects.toThrow('Auth not initialized');
    });

    it('should call signInWithEmailAndPassword', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockCredential = { user: { uid: 'email-user-id' } };
      mockSignInWithEmailAndPassword.mockResolvedValue(mockCredential);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      let credential;
      await act(async () => {
        credential = await result.current.signInWithEmail('test@example.com', 'password123');
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuthInstance,
        'test@example.com',
        'password123'
      );
      expect(credential).toBe(mockCredential);
    });

    it('should handle email sign in error', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockError = new Error('Invalid credentials');
      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      await act(async () => {
        try {
          await result.current.signInWithEmail('test@example.com', 'wrongpassword');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.authError).toBe('Invalid credentials');
    });
  });

  describe('createUserWithEmail', () => {
    it('should throw error when auth not initialized', async () => {
      const { result } = renderHook(() => useAuth(null));

      await expect(
        result.current.createUserWithEmail('new@example.com', 'password')
      ).rejects.toThrow('Auth not initialized');
    });

    it('should call createUserWithEmailAndPassword', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockCredential = { user: { uid: 'new-user-id' } };
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockCredential);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      let credential;
      await act(async () => {
        credential = await result.current.createUserWithEmail('new@example.com', 'password123');
      });

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuthInstance,
        'new@example.com',
        'password123'
      );
      expect(credential).toBe(mockCredential);
    });

    it('should handle create user error', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockError = new Error('Email already in use');
      mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      await act(async () => {
        try {
          await result.current.createUserWithEmail('existing@example.com', 'password');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.authError).toBe('Email already in use');
    });
  });

  describe('signOutUser', () => {
    it('should throw error when auth not initialized', async () => {
      const { result } = renderHook(() => useAuth(null));

      await expect(result.current.signOutUser()).rejects.toThrow('Auth not initialized');
    });

    it('should call signOut and clear user state', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      mockSignOut.mockResolvedValue();

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      // First sign in
      act(() => {
        authCallback({ uid: 'test-id', email: 'test@example.com', isAnonymous: false });
      });

      expect(result.current.userId).toBe('test-id');

      await act(async () => {
        await result.current.signOutUser();
      });

      expect(mockSignOut).toHaveBeenCalledWith(mockAuthInstance);
      expect(result.current.userId).toBeNull();
      expect(result.current.userDisplayName).toBe('');
    });

    it('should handle sign out error', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockError = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback({ uid: 'test-id', email: 'test@example.com', isAnonymous: false });
      });

      await act(async () => {
        try {
          await result.current.signOutUser();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.authError).toBe('Sign out failed');
    });
  });

  describe('sendPasswordReset', () => {
    it('should throw error when auth not initialized', async () => {
      const { result } = renderHook(() => useAuth(null));

      await expect(
        result.current.sendPasswordReset('test@example.com')
      ).rejects.toThrow('Auth not initialized');
    });

    it('should call sendPasswordResetEmail', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      mockSendPasswordResetEmail.mockResolvedValue();

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      await act(async () => {
        await result.current.sendPasswordReset('test@example.com');
      });

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        mockAuthInstance,
        'test@example.com'
      );
    });

    it('should handle password reset error', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      const mockError = new Error('User not found');
      mockSendPasswordResetEmail.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      await act(async () => {
        try {
          await result.current.sendPasswordReset('nonexistent@example.com');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.authError).toBe('User not found');
    });
  });

  describe('clearAuthError', () => {
    it('should clear the auth error', async () => {
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return jest.fn();
      });

      mockSignInAnonymously.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useAuth(mockFirebaseApp));

      act(() => {
        authCallback(null);
      });

      // Generate an error
      await act(async () => {
        try {
          await result.current.signInAnonymouslyUser();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.authError).toBe('Test error');

      act(() => {
        result.current.clearAuthError();
      });

      expect(result.current.authError).toBe('');
    });
  });

  describe('return value structure', () => {
    it('should return all expected state properties', () => {
      const { result } = renderHook(() => useAuth(null));

      expect(result.current).toHaveProperty('auth');
      expect(result.current).toHaveProperty('userId');
      expect(result.current).toHaveProperty('userDisplayName');
      expect(result.current).toHaveProperty('isAnonymous');
      expect(result.current).toHaveProperty('isAuthReady');
      expect(result.current).toHaveProperty('authError');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should return all expected method functions', () => {
      const { result } = renderHook(() => useAuth(null));

      expect(typeof result.current.signInAnonymouslyUser).toBe('function');
      expect(typeof result.current.signInWithEmail).toBe('function');
      expect(typeof result.current.createUserWithEmail).toBe('function');
      expect(typeof result.current.signOutUser).toBe('function');
      expect(typeof result.current.sendPasswordReset).toBe('function');
      expect(typeof result.current.clearAuthError).toBe('function');
    });
  });
});
