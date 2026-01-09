import React, { useMemo } from 'react';
import { ACHIEVEMENTS } from '../utils/constants';

/**
 * Modal displaying all achievements with unlock status
 */
const AchievementsModal = ({
  isVisible,
  onClose,
  unlockedAchievements = [],
  currentStats = {},
  isDarkMode
}) => {
  // Group achievements by category
  const groupedAchievements = useMemo(() => {
    const groups = {
      'Review Milestones': [],
      'Streak Achievements': [],
      'Daily Goals': [],
      'Performance': [],
      'Time-Based': [],
      'Creation': [],
      'XP Achievements': []
    };

    Object.values(ACHIEVEMENTS).forEach(achievement => {
      const { type } = achievement.condition;

      if (type === 'totalReviews') {
        groups['Review Milestones'].push(achievement);
      } else if (type === 'streak') {
        groups['Streak Achievements'].push(achievement);
      } else if (type === 'dailyGoalComplete' || type === 'dailyGoalStreak' || type === 'dailyGoalMultiplier') {
        groups['Daily Goals'].push(achievement);
      } else if (type === 'easyStreak' || type === 'sessionAccuracy') {
        groups['Performance'].push(achievement);
      } else if (type === 'studyTime') {
        groups['Time-Based'].push(achievement);
      } else if (type === 'cardsCreated') {
        groups['Creation'].push(achievement);
      } else if (type === 'totalXP') {
        groups['XP Achievements'].push(achievement);
      }
    });

    // Filter out empty groups
    return Object.entries(groups).filter(([_, achievements]) => achievements.length > 0);
  }, []);

  // Calculate progress for an achievement
  const getProgress = (achievement) => {
    const { type, value } = achievement.condition;
    let current = 0;
    let max = value;

    switch (type) {
      case 'totalReviews':
        current = currentStats.totalReviews || 0;
        break;
      case 'streak':
        current = currentStats.currentStreak || 0;
        break;
      case 'totalXP':
        current = currentStats.totalXP || 0;
        break;
      case 'cardsCreated':
        current = currentStats.cardsCreated || 0;
        break;
      case 'dailyGoalStreak':
        current = currentStats.dailyGoalStreak || 0;
        break;
      case 'easyStreak':
        current = currentStats.easyStreak || 0;
        break;
      default:
        return null;
    }

    return {
      current: Math.min(current, max),
      max,
      percent: Math.min(100, (current / max) * 100)
    };
  };

  if (!isVisible) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200000,
      padding: '20px'
    },
    modal: {
      background: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '700px',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    header: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: '20px 24px',
      borderRadius: '16px 16px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      margin: 0,
      fontSize: '24px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    headerSubtitle: {
      fontSize: '14px',
      opacity: 0.9,
      marginTop: '4px'
    },
    closeBtn: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      color: 'white',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px 12px',
      borderRadius: '8px',
      lineHeight: 1,
      transition: 'background 0.2s'
    },
    body: {
      padding: '24px',
      overflowY: 'auto',
      flex: 1
    },
    statsBar: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    statItem: {
      flex: '1 1 120px',
      padding: '16px',
      borderRadius: '12px',
      background: isDarkMode ? '#334155' : '#f1f5f9',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    },
    statLabel: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginTop: '4px',
      fontWeight: '600'
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#334155',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    achievementsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '12px'
    },
    achievementCard: {
      padding: '16px',
      borderRadius: '12px',
      border: '2px solid',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    achievementIcon: {
      fontSize: '32px',
      textAlign: 'center'
    },
    achievementName: {
      fontSize: '14px',
      fontWeight: '700',
      textAlign: 'center'
    },
    achievementDesc: {
      fontSize: '12px',
      textAlign: 'center',
      lineHeight: 1.4
    },
    progressBar: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: '4px'
    },
    progressFill: {
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.3s ease-out'
    },
    progressText: {
      fontSize: '10px',
      textAlign: 'center',
      marginTop: '2px'
    }
  };

  const unlockedCount = unlockedAchievements.length;
  const totalCount = Object.keys(ACHIEVEMENTS).length;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>
              <span>🏆</span> Achievements
            </h2>
            <p style={styles.headerSubtitle}>
              {unlockedCount} of {totalCount} unlocked
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Stats Bar */}
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#f59e0b'}}>{unlockedCount}</div>
              <div style={styles.statLabel}>Achievements</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#ef4444'}}>{currentStats.currentStreak || 0}</div>
              <div style={styles.statLabel}>Day Streak</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#8b5cf6'}}>{currentStats.totalXP || 0}</div>
              <div style={styles.statLabel}>Total XP</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#3b82f6'}}>{currentStats.totalReviews || 0}</div>
              <div style={styles.statLabel}>Total Reviews</div>
            </div>
          </div>

          {/* Achievement Groups */}
          {groupedAchievements.map(([groupName, achievements]) => (
            <div key={groupName} style={styles.section}>
              <h3 style={styles.sectionTitle}>
                {groupName}
              </h3>
              <div style={styles.achievementsGrid}>
                {achievements.map(achievement => {
                  const isUnlocked = unlockedAchievements.includes(achievement.id);
                  const progress = getProgress(achievement);

                  return (
                    <div
                      key={achievement.id}
                      style={{
                        ...styles.achievementCard,
                        borderColor: isUnlocked
                          ? '#f59e0b'
                          : (isDarkMode ? '#475569' : '#e2e8f0'),
                        background: isUnlocked
                          ? (isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)')
                          : (isDarkMode ? '#1e293b' : '#ffffff'),
                        opacity: isUnlocked ? 1 : 0.7
                      }}
                    >
                      <div style={{
                        ...styles.achievementIcon,
                        filter: isUnlocked ? 'none' : 'grayscale(100%)'
                      }}>
                        {achievement.icon}
                      </div>
                      <div style={{
                        ...styles.achievementName,
                        color: isUnlocked
                          ? (isDarkMode ? '#fbbf24' : '#d97706')
                          : (isDarkMode ? '#94a3b8' : '#64748b')
                      }}>
                        {achievement.name}
                      </div>
                      <div style={{
                        ...styles.achievementDesc,
                        color: isDarkMode ? '#94a3b8' : '#64748b'
                      }}>
                        {achievement.description}
                      </div>

                      {/* Progress bar for incomplete achievements */}
                      {!isUnlocked && progress && (
                        <>
                          <div style={{
                            ...styles.progressBar,
                            background: isDarkMode ? '#475569' : '#e2e8f0'
                          }}>
                            <div style={{
                              ...styles.progressFill,
                              width: `${progress.percent}%`,
                              background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                            }} />
                          </div>
                          <div style={{
                            ...styles.progressText,
                            color: isDarkMode ? '#94a3b8' : '#64748b'
                          }}>
                            {progress.current} / {progress.max}
                          </div>
                        </>
                      )}

                      {/* Unlocked indicator */}
                      {isUnlocked && (
                        <div style={{
                          textAlign: 'center',
                          fontSize: '11px',
                          color: '#10b981',
                          fontWeight: '600'
                        }}>
                          ✓ Unlocked
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsModal;
