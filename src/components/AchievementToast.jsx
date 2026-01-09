import React, { useEffect, useState } from 'react';

/**
 * Toast notification for newly unlocked achievements
 */
const AchievementToast = ({
  achievements = [],
  onDismiss,
  isDarkMode
}) => {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Add keyframe animations on mount - must be before any early returns
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'achievement-toast-styles';
    if (!document.getElementById('achievement-toast-styles')) {
      styleSheet.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
    return () => {
      const existingStyle = document.getElementById('achievement-toast-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  useEffect(() => {
    if (achievements.length > 0) {
      setVisible(true);
      setCurrentIndex(0);
    }
  }, [achievements]);

  useEffect(() => {
    if (visible && achievements.length > 0) {
      const timer = setTimeout(() => {
        if (currentIndex < achievements.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setVisible(false);
          if (onDismiss) onDismiss();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, currentIndex, achievements.length, onDismiss]);

  if (!visible || achievements.length === 0) return null;

  const achievement = achievements[currentIndex];

  const styles = {
    container: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 300000,
      animation: 'slideInRight 0.5s ease-out, pulse 0.5s ease-out 0.5s'
    },
    toast: {
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: isDarkMode
        ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.3)'
        : '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(245, 158, 11, 0.3)',
      border: '2px solid #f59e0b',
      minWidth: '300px',
      maxWidth: '400px'
    },
    iconContainer: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      flexShrink: 0,
      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
    },
    content: {
      flex: 1
    },
    title: {
      fontSize: '12px',
      fontWeight: '700',
      color: '#f59e0b',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '4px'
    },
    name: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      marginBottom: '4px'
    },
    description: {
      fontSize: '13px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    closeBtn: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      background: 'transparent',
      border: 'none',
      color: isDarkMode ? '#64748b' : '#94a3b8',
      cursor: 'pointer',
      fontSize: '18px',
      padding: '4px',
      lineHeight: 1
    },
    counter: {
      position: 'absolute',
      bottom: '8px',
      right: '12px',
      fontSize: '11px',
      color: isDarkMode ? '#64748b' : '#94a3b8'
    }
  };

  return (
    <div style={styles.container}>
      <div style={{...styles.toast, position: 'relative'}}>
        <button
          style={styles.closeBtn}
          onClick={() => {
            setVisible(false);
            if (onDismiss) onDismiss();
          }}
        >
          ×
        </button>

        <div style={styles.iconContainer}>
          {achievement.icon}
        </div>

        <div style={styles.content}>
          <div style={styles.title}>Achievement Unlocked!</div>
          <div style={styles.name}>{achievement.name}</div>
          <div style={styles.description}>{achievement.description}</div>
        </div>

        {achievements.length > 1 && (
          <div style={styles.counter}>
            {currentIndex + 1} / {achievements.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementToast;
