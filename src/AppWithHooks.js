import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';

// Import only the hooks first
import { useAuth } from './hooks/useAuth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3R7pV3mXqg2-kY9xvH126BoF5KQDQDls",
  authDomain: "flashcard-app-3f2a3.firebaseapp.com",
  projectId: "flashcard-app-3f2a3",
  storageBucket: "flashcard-app-3f2a3.firebasestorage.app",
  messagingSenderId: "399745541062",
  appId: "1:399745541062:web:958a2cfbd7c6c9c78988c7",
  measurementId: "G-6LJ19R2ZTZ"
};

// Test app with just auth hook
function AppWithHooks() {
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  
  // Initialize Firebase
  useEffect(() => {
    console.log('AppWithHooks: Initializing Firebase...');
    try {
      const app = initializeApp(firebaseConfig);
      setFirebaseApp(app);
      setIsFirebaseInitialized(true);
      console.log('AppWithHooks: Firebase initialized successfully');
    } catch (error) {
      console.error('AppWithHooks: Firebase initialization failed:', error);
    }
  }, []);
  
  // Use auth hook
  const {
    userId,
    userDisplayName,
    isAuthReady,
    authError,
    isLoading: authLoading,
    signInAnonymouslyUser,
    signInWithEmail,
    createUserWithEmail,
    signOutUser,
    sendPasswordReset,
    clearAuthError
  } = useAuth(firebaseApp);
  
  console.log('AppWithHooks: Render state', { 
    isFirebaseInitialized, 
    isAuthReady, 
    userId,
    authLoading 
  });
  
  // Loading screen
  if (!isFirebaseInitialized || !isAuthReady) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f0f0',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading with Hooks...</h2>
          <p>Firebase: {isFirebaseInitialized ? '✅' : '⏳'}</p>
          <p>Auth: {isAuthReady ? '✅' : '⏳'}</p>
          {authError && <p style={{ color: 'red' }}>Error: {authError}</p>}
        </div>
      </div>
    );
  }
  
  // Login screen
  if (!userId) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '40px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          color: 'white',
          width: '400px',
          textAlign: 'center'
        }}>
          <h1>Auth Hook Test</h1>
          <p>Testing authentication with hooks</p>
          
          <button
            onClick={async () => {
              console.log('Attempting anonymous login...');
              try {
                await signInAnonymouslyUser();
                console.log('Anonymous login successful');
              } catch (error) {
                console.error('Anonymous login failed:', error);
              }
            }}
            disabled={authLoading}
            style={{
              width: '100%',
              padding: '15px',
              marginTop: '20px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: '16px',
              cursor: authLoading ? 'not-allowed' : 'pointer',
              opacity: authLoading ? 0.5 : 1
            }}
          >
            {authLoading ? 'Loading...' : 'Continue as Guest'}
          </button>
          
          {authError && (
            <p style={{ 
              color: '#ff6b6b', 
              marginTop: '20px',
              background: 'rgba(255, 0, 0, 0.2)',
              padding: '10px',
              borderRadius: '5px'
            }}>
              Error: {authError}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // Main app
  return (
    <div style={{
      minHeight: '100vh',
      padding: '20px',
      background: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h1>Hooks Working!</h1>
        <p>User: {userDisplayName || userId}</p>
        <button 
          onClick={async () => {
            console.log('Signing out...');
            await signOutUser();
          }}
          disabled={authLoading}
          style={{
            padding: '10px 20px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Sign Out
        </button>
      </header>
      
      <main style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <h2>✅ Auth Hook is Working!</h2>
        <p>Next step: Add more hooks and components gradually</p>
        
        <div style={{ marginTop: '40px' }}>
          <h3>Debug Information:</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>React: ✅ Working</li>
            <li>Firebase: ✅ Initialized</li>
            <li>Auth Hook: ✅ Functional</li>
            <li>User ID: {userId}</li>
            <li>Display Name: {userDisplayName || 'Anonymous'}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default AppWithHooks;