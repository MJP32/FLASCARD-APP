import { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';

/**
 * Custom hook for Firebase authentication
 * @param {Object} firebaseApp - Initialized Firebase app instance
 * @returns {Object} Authentication state and methods
 */
export const useAuth = (firebaseApp) => {
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize auth when Firebase app is ready
  useEffect(() => {
    if (!firebaseApp) return;

    const authInstance = getAuth(firebaseApp);
    setAuth(authInstance);

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        console.log('🔐 User authenticated:', { uid: user.uid, email: user.email, isAnonymous: user.isAnonymous });
        setUserId(user.uid);
        setUserDisplayName(user.email || 'Anonymous User');
        setIsAnonymous(user.isAnonymous);
      } else {
        console.log('🔐 User signed out');
        setUserId(null);
        setUserDisplayName('');
        setIsAnonymous(false);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [firebaseApp]);

  /**
   * Sign in anonymously
   * @returns {Promise<Object>} User credentials
   */
  const signInAnonymouslyUser = async () => {
    if (!auth) throw new Error('Auth not initialized');
    
    setIsLoading(true);
    setAuthError('');
    
    try {
      const userCredential = await signInAnonymously(auth);
      return userCredential;
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User credentials
   */
  const signInWithEmail = async (email, password) => {
    if (!auth) throw new Error('Auth not initialized');
    
    setIsLoading(true);
    setAuthError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      console.error('Email sign in error:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create new user account with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User credentials
   */
  const createUserWithEmail = async (email, password) => {
    if (!auth) throw new Error('Auth not initialized');
    
    setIsLoading(true);
    setAuthError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      console.error('Create user error:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  const signOutUser = async () => {
    if (!auth) throw new Error('Auth not initialized');
    
    setIsLoading(true);
    setAuthError('');
    
    try {
      await signOut(auth);
      setUserId(null);
      setUserDisplayName('');
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  const sendPasswordReset = async (email) => {
    if (!auth) throw new Error('Auth not initialized');
    
    setIsLoading(true);
    setAuthError('');
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      setAuthError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear authentication error
   */
  const clearAuthError = () => {
    setAuthError('');
  };

  return {
    // State
    auth,
    userId,
    userDisplayName,
    isAnonymous,
    isAuthReady,
    authError,
    isLoading,
    
    // Methods
    signInAnonymouslyUser,
    signInWithEmail,
    createUserWithEmail,
    signOutUser,
    sendPasswordReset,
    clearAuthError
  };
};