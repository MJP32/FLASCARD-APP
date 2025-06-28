import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';

// Simplified LoginScreen component inline
function SimpleLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Flashcard App</h1>
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>Simplified Debug Version</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                fontSize: '16px'
              }}
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                fontSize: '16px'
              }}
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="button"
            style={{
              padding: '15px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onClick={() => onLogin(email, password)}
          >
            Sign In
          </button>
          
          <button 
            type="button"
            style={{
              padding: '15px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer'
            }}
            onClick={() => onLogin('guest', 'guest')}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

// Simplified main app
function AppSimplified() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  
  // Log component lifecycle
  console.log('AppSimplified rendering...', { isLoading, showLogin, user });
  
  // Simple Firebase initialization
  useEffect(() => {
    console.log('Initializing Firebase...');
    try {
      const firebaseConfig = {
        apiKey: "AIzaSyC3R7pV3mXqg2-kY9xvH126BoF5KQDQDls",
        authDomain: "flashcard-app-3f2a3.firebaseapp.com",
        projectId: "flashcard-app-3f2a3",
        storageBucket: "flashcard-app-3f2a3.firebasestorage.app",
        messagingSenderId: "399745541062",
        appId: "1:399745541062:web:958a2cfbd7c6c9c78988c7",
        measurementId: "G-6LJ19R2ZTZ"
      };
      
      const app = initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
      setIsLoading(false);
    } catch (err) {
      console.error('Firebase initialization error:', err);
      setError('Failed to initialize app: ' + err.message);
      setIsLoading(false);
    }
  }, []);
  
  // Handle login
  const handleLogin = (email, password) => {
    console.log('Login attempted:', { email, password });
    if (email === 'guest' && password === 'guest') {
      setUser({ email: 'guest@example.com', isAnonymous: true });
      setShowLogin(false);
    } else if (email && password) {
      setUser({ email });
      setShowLogin(false);
    } else {
      alert('Please enter email and password');
    }
  };
  
  // Loading screen
  if (isLoading) {
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
          <h2>Loading Flashcard App...</h2>
          <p>Debug Version</p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      </div>
    );
  }
  
  // Login screen
  if (showLogin) {
    return <SimpleLoginScreen onLogin={handleLogin} />;
  }
  
  // Main app (simplified)
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
        <h1>Flashcard App - Simplified</h1>
        <p>Welcome, {user?.email || 'User'}!</p>
        <button 
          onClick={() => {
            setUser(null);
            setShowLogin(true);
          }}
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
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2>App is Working!</h2>
        <p>This is a simplified version for debugging.</p>
        <p>If you can see this, the basic app structure is functional.</p>
        
        <div style={{ marginTop: '40px' }}>
          <h3>Debug Information:</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>React: ✅ Working</li>
            <li>Firebase: ✅ Initialized</li>
            <li>Basic Auth: ✅ Functional</li>
            <li>User: {user?.email || 'None'}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default AppSimplified;