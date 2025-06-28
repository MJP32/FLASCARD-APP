import React from 'react';
import './App.css';

const LoadingTest = () => {
  return (
    <div className="app-loading dark">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p>Loading Flashcard App...</p>
      </div>
    </div>
  );
};

export default LoadingTest;