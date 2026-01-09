import React, { useState, useEffect } from 'react';

/**
 * Daily Goal Progress component showing streak, XP, and daily progress
 */
const DailyGoalProgress = ({
  dailyProgress,
  currentStreak,
  todayXP,
  levelInfo,
  isDarkMode,
  onOpenStats,
  onShowHeatMap
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevComplete, setPrevComplete] = useState(false);

  // Trigger celebration when goal is completed
  useEffect(() => {
    if (dailyProgress.isComplete && !prevComplete) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    setPrevComplete(dailyProgress.isComplete);
  }, [dailyProgress.isComplete, prevComplete]);

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderRadius: '10px',
      background: isDarkMode
        ? 'rgba(30, 41, 59, 0.8)'
        : 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(8px)',
      boxShadow: isDarkMode
        ? '0 2px 8px rgba(0, 0, 0, 0.3)'
        : '0 2px 8px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden',
      maxWidth: '450px'
    },
    streakContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      padding: '3px 8px',
      borderRadius: '16px',
      background: currentStreak > 0
        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
        : isDarkMode ? '#374151' : '#e5e7eb',
      color: currentStreak > 0 ? 'white' : (isDarkMode ? '#9ca3af' : '#6b7280'),
      fontWeight: '700',
      fontSize: '12px',
      minWidth: '45px',
      justifyContent: 'center'
    },
    fireIcon: {
      fontSize: '14px',
      animation: currentStreak > 0 ? 'pulse 1s ease-in-out infinite' : 'none'
    },
    progressContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      minWidth: '90px',
      maxWidth: '100px'
    },
    progressHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '10px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      fontWeight: '600'
    },
    progressBar: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      background: isDarkMode ? '#374151' : '#e5e7eb',
      overflow: 'hidden',
      position: 'relative'
    },
    progressFill: {
      height: '100%',
      borderRadius: '3px',
      background: dailyProgress.isComplete
        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
        : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
      width: `${dailyProgress.percent}%`,
      transition: 'width 0.5s ease-out'
    },
    xpContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      padding: '3px 8px',
      borderRadius: '16px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
        : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      color: 'white',
      fontWeight: '700',
      fontSize: '11px'
    },
    levelBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      padding: '3px 8px',
      borderRadius: '16px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
        : 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
      color: 'white',
      fontWeight: '700',
      fontSize: '11px'
    },
    celebration: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeInOut 2s ease-out forwards',
      pointerEvents: 'none',
      zIndex: 10
    },
    celebrationText: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#10b981',
      textShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
    }
  };

  // Add keyframe animations
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes fadeInOut {
        0% { opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }
      .daily-goal-progress:hover {
        transform: translateY(-2px);
        box-shadow: ${isDarkMode
          ? '0 4px 12px rgba(0, 0, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.15)'} !important;
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, [isDarkMode]);

  return (
    <div
      className="daily-goal-progress"
      style={styles.container}
      onClick={onOpenStats}
      title="Click to view detailed stats"
    >
      {/* Celebration overlay */}
      {showCelebration && (
        <div style={styles.celebration}>
          <span style={styles.celebrationText}>Goal Complete!</span>
        </div>
      )}

      {/* Streak */}
      <div style={styles.streakContainer} title={`${currentStreak} day streak`}>
        <span style={styles.fireIcon}>{currentStreak > 0 ? '🔥' : '❄️'}</span>
        <span>{currentStreak}</span>
      </div>

      {/* Daily Progress */}
      <div style={styles.progressContainer}>
        <div style={styles.progressHeader}>
          <span>Daily Goal</span>
          <span>{dailyProgress.current}/{dailyProgress.goal}</span>
        </div>
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>
      </div>

      {/* Today's XP */}
      <div style={styles.xpContainer} title={`${todayXP} XP earned today`}>
        <span>⚡</span>
        <span>{todayXP}</span>
      </div>

      {/* Level Badge */}
      <div style={styles.levelBadge} title={`Level ${levelInfo.level}: ${levelInfo.title}`}>
        <span>Lv.{levelInfo.level}</span>
      </div>

      {/* Activity Heat Map Button */}
      {onShowHeatMap && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: isDarkMode
              ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            flexShrink: 0
          }}
          onClick={(e) => {
            e.stopPropagation();
            onShowHeatMap();
          }}
          title="View activity history"
        >
          📊
        </div>
      )}
    </div>
  );
};

export default DailyGoalProgress;
