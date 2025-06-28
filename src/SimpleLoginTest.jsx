import React, { useState } from 'react';

// Simplified login screen for testing
function SimpleLoginTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  console.log('SimpleLoginTest rendering...');
  
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
        width: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Flashcard App</h1>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                background: 'rgba(255, 255, 255, 0.3)'
              }}
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
                background: 'rgba(255, 255, 255, 0.3)'
              }}
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
              cursor: 'pointer'
            }}
            onClick={() => alert('Login clicked! App is working.')}
          >
            Sign In
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          If you can see this form, React is working properly!
        </p>
      </div>
    </div>
  );
}

export default SimpleLoginTest;