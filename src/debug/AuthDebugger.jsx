import React, { useState, useEffect, useCallback } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';

const AuthDebugger = ({ firebaseApp }) => {
  const [debugInfo, setDebugInfo] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const runDebug = useCallback(async () => {
    const info = {
      timestamp: new Date().toLocaleString(),
      firebaseApp: !!firebaseApp,
      auth: null,
      user: null,
      localStorage: {},
      errors: []
    };

    try {
      // Check Firebase app
      if (!firebaseApp) {
        info.errors.push('Firebase app not available');
        setDebugInfo(info);
        return;
      }

      // Check Auth
      const auth = getAuth(firebaseApp);
      info.auth = {
        available: !!auth,
        currentUser: auth.currentUser ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          isAnonymous: auth.currentUser.isAnonymous,
          displayName: auth.currentUser.displayName
        } : null
      };

      // Check localStorage
      const allKeys = Object.keys(localStorage);
      const flashcardKeys = allKeys.filter(key => key.includes('flashcard'));
      flashcardKeys.forEach(key => {
        info.localStorage[key] = localStorage.getItem(key);
      });

      // Check for userId mismatch
      const storedUserId = localStorage.getItem('flashcard_userId');
      const currentUserId = auth.currentUser?.uid;

      if (storedUserId && currentUserId && storedUserId !== currentUserId) {
        info.errors.push(`UserId mismatch: stored=${storedUserId}, current=${currentUserId}`);
      }

      if (!currentUserId && storedUserId) {
        info.errors.push('Stored userId exists but no authenticated user');
      }

      if (!currentUserId && !storedUserId) {
        info.errors.push('No user authenticated and no stored userId');
      }

      // Check for localStorage data belonging to other users
      const currentUserKeys = flashcardKeys.filter(key => key.includes(currentUserId));
      const otherUserKeys = flashcardKeys.filter(key => !key.includes(currentUserId) && !key.includes('settings'));

      if (currentUserId && otherUserKeys.length > 0) {
        info.errors.push(`Found ${otherUserKeys.length} localStorage entries for other users`);
      }

      if (currentUserId && currentUserKeys.length === 0) {
        info.errors.push('No localStorage data found for current user - app may not work properly');
      }

    } catch (error) {
      info.errors.push(`Debug error: ${error.message}`);
    }

    setDebugInfo(info);
  }, [firebaseApp]);

  useEffect(() => {
    runDebug();
  }, [firebaseApp, runDebug]);

  const fixAuth = async () => {
    setIsFixing(true);
    try {
      if (!firebaseApp) {
        throw new Error('Firebase app not available');
      }

      const auth = getAuth(firebaseApp);
      const currentUser = auth.currentUser;

      if (currentUser) {
        // User is authenticated, fix localStorage
        console.log('🔧 Fixing localStorage for current user:', currentUser.uid);

        // Set correct userId in localStorage
        localStorage.setItem('flashcard_userId', currentUser.uid);

        // Clean up localStorage entries for other users (keep settings)
        const allKeys = Object.keys(localStorage);
        const flashcardKeys = allKeys.filter(key => key.includes('flashcard'));
        const otherUserKeys = flashcardKeys.filter(key =>
          !key.includes(currentUser.uid) &&
          !key.includes('settings') &&
          key !== 'flashcards' // Keep the main flashcards cache
        );

        console.log('🗑️ Cleaning up', otherUserKeys.length, 'entries for other users');
        otherUserKeys.forEach(key => {
          localStorage.removeItem(key);
        });

        // Initialize basic localStorage entries for current user if missing
        const today = new Date().toDateString();
        if (!localStorage.getItem(`flashcard_due_date_${currentUser.uid}`)) {
          localStorage.setItem(`flashcard_due_date_${currentUser.uid}`, today);
          localStorage.setItem(`flashcard_initial_due_${currentUser.uid}`, '0');
          localStorage.setItem(`flashcard_initial_total_${currentUser.uid}`, '0');
          localStorage.setItem(`flashcard_completed_today_${currentUser.uid}`, '0');
        }

      } else {
        // No user, sign in anonymously
        console.log('🔧 No user found, signing in anonymously...');
        const result = await signInAnonymously(auth);
        localStorage.setItem('flashcard_userId', result.user.uid);
      }

      // Wait a moment then refresh debug info
      setTimeout(() => {
        runDebug();
        setIsFixing(false);
        console.log('✅ Auth fix complete! Try using the app now.');
      }, 1000);

    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `Fix failed: ${error.message}`]
      }));
      setIsFixing(false);
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Auto-show if there are errors
  useEffect(() => {
    if (debugInfo.errors && debugInfo.errors.length > 0) {
      setIsVisible(true);
    }
  }, [debugInfo.errors]);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 100000,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      {/* Toggle Button */}
      <button
        onClick={toggleVisibility}
        style={{
          background: debugInfo.errors?.length > 0 ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '5px'
        }}
      >
        🔍 Auth Debug {debugInfo.errors?.length > 0 && `(${debugInfo.errors.length} errors)`}
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div style={{
          background: 'white',
          border: '2px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
          maxWidth: '400px',
          maxHeight: '500px',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Auth Debug Info</h3>
            <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ marginBottom: '10px', fontSize: '10px', color: '#666' }}>
            Last updated: {debugInfo.timestamp}
          </div>

          {/* Errors */}
          {debugInfo.errors && debugInfo.errors.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 5px 0' }}>❌ Errors ({debugInfo.errors.length})</h4>
              {debugInfo.errors.map((error, index) => (
                <div key={index} style={{ background: '#fef2f2', padding: '5px', margin: '2px 0', borderRadius: '3px', color: '#dc2626' }}>
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Firebase Status */}
          <div style={{ marginBottom: '10px' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>🔥 Firebase</h4>
            <div>App Available: {debugInfo.firebaseApp ? '✅' : '❌'}</div>
          </div>

          {/* Auth Status */}
          {debugInfo.auth && (
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>🔐 Authentication</h4>
              <div>Auth Available: {debugInfo.auth.available ? '✅' : '❌'}</div>
              {debugInfo.auth.currentUser ? (
                <div style={{ background: '#f0f9ff', padding: '5px', borderRadius: '3px', margin: '5px 0' }}>
                  <div><strong>User:</strong> {debugInfo.auth.currentUser.uid}</div>
                  <div><strong>Email:</strong> {debugInfo.auth.currentUser.email || 'None'}</div>
                  <div><strong>Anonymous:</strong> {debugInfo.auth.currentUser.isAnonymous ? 'Yes' : 'No'}</div>
                </div>
              ) : (
                <div style={{ color: '#ef4444' }}>No user authenticated</div>
              )}
            </div>
          )}

          {/* LocalStorage */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>💾 LocalStorage</h4>
            {Object.keys(debugInfo.localStorage || {}).length === 0 ? (
              <div style={{ color: '#666' }}>No flashcard keys found</div>
            ) : (
              Object.entries(debugInfo.localStorage || {}).map(([key, value]) => (
                <div key={key} style={{ background: '#f9f9f9', padding: '3px', margin: '2px 0', borderRadius: '3px' }}>
                  <strong>{key}:</strong> {value}
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={runDebug}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🔄 Refresh
            </button>

            {debugInfo.errors && debugInfo.errors.length > 0 && (
              <button
                onClick={fixAuth}
                disabled={isFixing}
                style={{
                  background: isFixing ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: isFixing ? 'not-allowed' : 'pointer',
                  fontSize: '11px'
                }}
              >
                {isFixing ? '⏳ Fixing...' : '🔧 Fix Auth'}
              </button>
            )}

            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🗑️ Clear & Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDebugger;
