import React from 'react';

// Minimal debug component to test if React works at all
function DebugApp() {
  console.log('DebugApp rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>Debug App</h1>
      <p>If you can see this, React is working!</p>
      <p>Time: {new Date().toLocaleString()}</p>
    </div>
  );
}

export default DebugApp;