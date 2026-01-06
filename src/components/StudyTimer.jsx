import React, { useState, useEffect, useCallback } from 'react';

/**
 * Study session timer component with pause/resume functionality
 */
const StudyTimer = ({ isVisible, onClose, isDarkMode }) => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [sessionGoal, setSessionGoal] = useState(25); // Default 25 minutes

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = useCallback((totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progressPercent = Math.min(100, (seconds / (sessionGoal * 60)) * 100);
  const goalReached = seconds >= sessionGoal * 60;

  const resetTimer = () => {
    setSeconds(0);
    setIsRunning(true);
  };

  if (!isVisible) return null;

  const styles = {
    container: {
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      background: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '12px',
      padding: '16px 20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      zIndex: 1000,
      minWidth: '200px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    title: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      margin: 0
    },
    closeBtn: {
      background: 'transparent',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      padding: '0 4px'
    },
    time: {
      fontSize: '32px',
      fontWeight: '700',
      textAlign: 'center',
      color: goalReached ? '#10b981' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
      fontFamily: 'monospace'
    },
    progressBar: {
      height: '6px',
      background: isDarkMode ? '#334155' : '#e2e8f0',
      borderRadius: '3px',
      margin: '12px 0',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      background: goalReached ? '#10b981' : '#3b82f6',
      borderRadius: '3px',
      transition: 'width 0.3s ease',
      width: `${progressPercent}%`
    },
    controls: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'center'
    },
    btn: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600'
    },
    goalText: {
      fontSize: '11px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textAlign: 'center',
      marginTop: '8px'
    },
    goalInput: {
      width: '40px',
      padding: '2px 4px',
      border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      borderRadius: '4px',
      textAlign: 'center',
      background: isDarkMode ? '#0f172a' : '#ffffff',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      fontSize: '11px'
    }
  };

  return (
    <div style={styles.container} role="timer" aria-label="Study session timer">
      <div style={styles.header}>
        <h4 style={styles.title}>Study Timer</h4>
        <button
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Close timer"
        >
          ×
        </button>
      </div>

      <div style={styles.time} aria-live="polite">
        {formatTime(seconds)}
      </div>

      <div style={styles.progressBar}>
        <div style={styles.progressFill} />
      </div>

      <div style={styles.controls}>
        <button
          style={{
            ...styles.btn,
            background: isRunning ? '#f59e0b' : '#10b981',
            color: 'white'
          }}
          onClick={() => setIsRunning(!isRunning)}
          aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
        <button
          style={{
            ...styles.btn,
            background: isDarkMode ? '#334155' : '#e2e8f0',
            color: isDarkMode ? '#f1f5f9' : '#1e293b'
          }}
          onClick={resetTimer}
          aria-label="Reset timer"
        >
          Reset
        </button>
      </div>

      <div style={styles.goalText}>
        Goal:
        <input
          type="number"
          value={sessionGoal}
          onChange={(e) => setSessionGoal(Math.max(1, parseInt(e.target.value) || 1))}
          style={styles.goalInput}
          min="1"
          max="120"
          aria-label="Session goal in minutes"
        /> min
        {goalReached && ' - Goal reached!'}
      </div>
    </div>
  );
};

export default StudyTimer;
