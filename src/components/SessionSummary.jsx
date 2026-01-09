import React, { useEffect, useState } from 'react';

/**
 * Session Summary modal showing study session stats
 */
const SessionSummary = ({
  isVisible,
  onClose,
  sessionData = {},
  unlockedAchievements = [],
  isDarkMode
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  const {
    cardsReviewed = 0,
    xpEarned = 0,
    accuracy = 0,
    duration = 0,
    correct = 0
  } = sessionData;

  // Show confetti for good sessions
  useEffect(() => {
    if (isVisible && cardsReviewed >= 10 && accuracy >= 70) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, cardsReviewed, accuracy]);

  // Add animation styles - must be before early return
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'session-summary-styles';
    if (!document.getElementById('session-summary-styles')) {
      styleSheet.textContent = `
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .session-btn:hover {
          transform: translateY(-2px);
        }
      `;
      document.head.appendChild(styleSheet);
    }
    return () => {
      const existingStyle = document.getElementById('session-summary-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  if (!isVisible) return null;

  const formatDuration = (minutes) => {
    if (minutes < 1) return 'Less than 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getGrade = () => {
    if (accuracy >= 90) return { grade: 'A+', color: '#10b981', emoji: '🌟' };
    if (accuracy >= 80) return { grade: 'A', color: '#22c55e', emoji: '⭐' };
    if (accuracy >= 70) return { grade: 'B', color: '#84cc16', emoji: '👍' };
    if (accuracy >= 60) return { grade: 'C', color: '#eab308', emoji: '👌' };
    if (accuracy >= 50) return { grade: 'D', color: '#f97316', emoji: '💪' };
    return { grade: 'F', color: '#ef4444', emoji: '📚' };
  };

  const grade = getGrade();

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200000,
      padding: '20px'
    },
    modal: {
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '24px',
      width: '100%',
      maxWidth: '500px',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      animation: 'scaleIn 0.3s ease-out'
    },
    header: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      padding: '32px 24px',
      textAlign: 'center',
      position: 'relative'
    },
    headerTitle: {
      color: 'white',
      fontSize: '28px',
      fontWeight: '700',
      margin: 0,
      marginBottom: '8px'
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      margin: 0
    },
    gradeCircle: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '20px auto 0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    },
    gradeEmoji: {
      fontSize: '32px'
    },
    gradeLetter: {
      fontSize: '28px',
      fontWeight: '800'
    },
    body: {
      padding: '24px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      padding: '20px',
      borderRadius: '16px',
      textAlign: 'center',
      background: isDarkMode ? '#334155' : '#f1f5f9'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    accuracyBar: {
      marginBottom: '24px'
    },
    accuracyLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#334155'
    },
    accuracyTrack: {
      height: '12px',
      borderRadius: '6px',
      background: isDarkMode ? '#475569' : '#e2e8f0',
      overflow: 'hidden'
    },
    accuracyFill: {
      height: '100%',
      borderRadius: '6px',
      transition: 'width 1s ease-out'
    },
    achievementsSection: {
      marginBottom: '24px'
    },
    achievementsTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#334155',
      marginBottom: '12px'
    },
    achievementsList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    },
    achievementBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      borderRadius: '20px',
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      fontSize: '12px',
      fontWeight: '600'
    },
    footer: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center'
    },
    button: {
      padding: '14px 28px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: '700',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: 'white',
      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
    },
    secondaryButton: {
      background: isDarkMode ? '#475569' : '#e2e8f0',
      color: isDarkMode ? '#e2e8f0' : '#334155'
    },
    confetti: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      overflow: 'hidden'
    }
  };

  // Generate confetti elements
  const confettiElements = showConfetti ? Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      style={{
        position: 'absolute',
        left: `${Math.random() * 100}%`,
        top: '-20px',
        width: '10px',
        height: '10px',
        background: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        animation: `confettiFall ${2 + Math.random() * 2}s linear forwards`,
        animationDelay: `${Math.random() * 0.5}s`
      }}
    />
  )) : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          {showConfetti && <div style={styles.confetti}>{confettiElements}</div>}
          <h2 style={styles.headerTitle}>Session Complete!</h2>
          <p style={styles.headerSubtitle}>Great work on your study session</p>

          <div style={styles.gradeCircle}>
            <span style={styles.gradeEmoji}>{grade.emoji}</span>
            <span style={{...styles.gradeLetter, color: grade.color}}>{grade.grade}</span>
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#3b82f6'}}>{cardsReviewed}</div>
              <div style={styles.statLabel}>Cards Reviewed</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#8b5cf6'}}>{xpEarned}</div>
              <div style={styles.statLabel}>XP Earned</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#10b981'}}>{correct}</div>
              <div style={styles.statLabel}>Correct</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#64748b'}}>{formatDuration(duration)}</div>
              <div style={styles.statLabel}>Time Spent</div>
            </div>
          </div>

          {/* Accuracy Bar */}
          <div style={styles.accuracyBar}>
            <div style={styles.accuracyLabel}>
              <span>Accuracy</span>
              <span style={{ color: grade.color }}>{accuracy}%</span>
            </div>
            <div style={styles.accuracyTrack}>
              <div
                style={{
                  ...styles.accuracyFill,
                  width: `${accuracy}%`,
                  background: `linear-gradient(90deg, ${grade.color} 0%, ${grade.color}dd 100%)`
                }}
              />
            </div>
          </div>

          {/* Achievements Unlocked */}
          {unlockedAchievements.length > 0 && (
            <div style={styles.achievementsSection}>
              <div style={styles.achievementsTitle}>
                Achievements Unlocked This Session
              </div>
              <div style={styles.achievementsList}>
                {unlockedAchievements.map(achievement => (
                  <div key={achievement.id} style={styles.achievementBadge}>
                    <span>{achievement.icon}</span>
                    <span>{achievement.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={styles.footer}>
            <button
              className="session-btn"
              style={{...styles.button, ...styles.secondaryButton}}
              onClick={onClose}
            >
              Continue Studying
            </button>
            <button
              className="session-btn"
              style={{...styles.button, ...styles.primaryButton}}
              onClick={onClose}
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;
