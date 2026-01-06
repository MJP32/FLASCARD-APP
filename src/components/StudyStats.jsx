import React, { useMemo } from 'react';

/**
 * Study statistics component showing review patterns and progress
 */
const StudyStats = ({ flashcards, isVisible, onClose, isDarkMode }) => {
  const stats = useMemo(() => {
    if (!flashcards || flashcards.length === 0) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate statistics
    const totalCards = flashcards.length;
    const activeCards = flashcards.filter(c => c.active !== false).length;

    // Cards by stability level
    const newCards = flashcards.filter(c => !c.reviewCount || c.reviewCount === 0).length;
    const learningCards = flashcards.filter(c => c.reviewCount > 0 && c.reviewCount < 5).length;
    const matureCards = flashcards.filter(c => c.reviewCount >= 5).length;

    // Due cards breakdown
    const dueToday = flashcards.filter(c => {
      if (c.active === false) return false;
      const dueDate = c.dueDate ? (c.dueDate.toDate ? c.dueDate.toDate() : new Date(c.dueDate)) : null;
      if (!dueDate) return true;
      return dueDate <= now;
    }).length;

    const dueTomorrow = flashcards.filter(c => {
      if (c.active === false) return false;
      const dueDate = c.dueDate ? (c.dueDate.toDate ? c.dueDate.toDate() : new Date(c.dueDate)) : null;
      if (!dueDate) return false;
      const dayAfter = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      return dueDate > now && dueDate < dayAfter;
    }).length;

    const dueThisWeek = flashcards.filter(c => {
      if (c.active === false) return false;
      const dueDate = c.dueDate ? (c.dueDate.toDate ? c.dueDate.toDate() : new Date(c.dueDate)) : null;
      if (!dueDate) return false;
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate > now && dueDate <= weekFromNow;
    }).length;

    // Average stats
    const cardsWithReviews = flashcards.filter(c => c.reviewCount > 0);
    const avgReviewCount = cardsWithReviews.length > 0
      ? Math.round(cardsWithReviews.reduce((sum, c) => sum + (c.reviewCount || 0), 0) / cardsWithReviews.length)
      : 0;

    // Retention estimate (based on cards that passed review)
    const passedCards = flashcards.filter(c => c.reviewCount > 0 && c.stability > 1);
    const retentionRate = cardsWithReviews.length > 0
      ? Math.round((passedCards.length / cardsWithReviews.length) * 100)
      : 0;

    // Categories breakdown
    const categoryMap = {};
    flashcards.forEach(c => {
      const cat = c.category || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat]++;
    });
    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalCards,
      activeCards,
      newCards,
      learningCards,
      matureCards,
      dueToday,
      dueTomorrow,
      dueThisWeek,
      avgReviewCount,
      retentionRate,
      topCategories
    };
  }, [flashcards]);

  if (!isVisible) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '20px'
    },
    modal: {
      background: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '12px',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    header: {
      background: isDarkMode ? '#0f172a' : '#2563eb',
      color: '#ffffff',
      padding: '16px 24px',
      borderRadius: '12px 12px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      margin: 0,
      fontSize: '20px',
      fontWeight: '600'
    },
    closeBtn: {
      background: 'transparent',
      border: 'none',
      color: '#ffffff',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '0 8px'
    },
    body: {
      padding: '24px'
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px'
    },
    statCard: {
      padding: '16px',
      borderRadius: '8px',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    categoryList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    categoryItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderRadius: '6px',
      marginBottom: '6px',
      background: isDarkMode ? '#0f172a' : '#f8fafc'
    },
    categoryName: {
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      fontWeight: '500'
    },
    categoryCount: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '600'
    },
    progressBar: {
      height: '8px',
      background: isDarkMode ? '#334155' : '#e2e8f0',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '8px'
    }
  };

  if (!stats) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>Study Statistics</h2>
            <button style={styles.closeBtn} onClick={onClose}>×</button>
          </div>
          <div style={styles.body}>
            <p style={{ textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              No cards to analyze yet. Create some flashcards to see your statistics!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="stats-title">
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title} id="stats-title">Study Statistics</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close statistics">×</button>
        </div>

        <div style={styles.body}>
          {/* Overview */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Overview</div>
            <div style={styles.statsGrid}>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#1e3a5f' : '#eff6ff' }}>
                <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.totalCards}</div>
                <div style={styles.statLabel}>Total Cards</div>
              </div>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#14532d' : '#f0fdf4' }}>
                <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.activeCards}</div>
                <div style={styles.statLabel}>Active</div>
              </div>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#7c2d12' : '#fef3c7' }}>
                <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.dueToday}</div>
                <div style={styles.statLabel}>Due Today</div>
              </div>
            </div>
          </div>

          {/* Card Maturity */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Card Maturity</div>
            <div style={styles.statsGrid}>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{stats.newCards}</div>
                <div style={styles.statLabel}>New</div>
              </div>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{stats.learningCards}</div>
                <div style={styles.statLabel}>Learning</div>
              </div>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.matureCards}</div>
                <div style={styles.statLabel}>Mature</div>
              </div>
            </div>
            <div style={styles.progressBar}>
              <div style={{
                display: 'flex',
                height: '100%'
              }}>
                <div style={{ width: `${(stats.newCards / stats.totalCards) * 100}%`, background: '#94a3b8' }} />
                <div style={{ width: `${(stats.learningCards / stats.totalCards) * 100}%`, background: '#8b5cf6' }} />
                <div style={{ width: `${(stats.matureCards / stats.totalCards) * 100}%`, background: '#10b981' }} />
              </div>
            </div>
          </div>

          {/* Upcoming Reviews */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Upcoming Reviews</div>
            <div style={styles.statsGrid}>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: '#ef4444' }}>{stats.dueToday}</div>
                <div style={styles.statLabel}>Today</div>
              </div>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.dueTomorrow}</div>
                <div style={styles.statLabel}>Tomorrow</div>
              </div>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.dueThisWeek}</div>
                <div style={styles.statLabel}>This Week</div>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Performance</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{stats.avgReviewCount}</div>
                <div style={styles.statLabel}>Avg Reviews/Card</div>
              </div>
              <div style={{ ...styles.statCard, background: isDarkMode ? '#0f172a' : '#f8fafc' }}>
                <div style={{ ...styles.statValue, color: stats.retentionRate >= 80 ? '#10b981' : '#f59e0b' }}>
                  {stats.retentionRate}%
                </div>
                <div style={styles.statLabel}>Est. Retention</div>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          {stats.topCategories.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Top Categories</div>
              <ul style={styles.categoryList}>
                {stats.topCategories.map(([name, count]) => (
                  <li key={name} style={styles.categoryItem}>
                    <span style={styles.categoryName}>{name}</span>
                    <span style={styles.categoryCount}>{count} cards</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyStats;
