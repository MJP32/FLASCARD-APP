import React, { useState, useMemo } from 'react';

/**
 * GitHub-style contribution heatmap calendar
 * Shows study activity intensity over the past year
 */
const HeatMapCalendar = ({
  isVisible,
  onClose,
  activityData = [], // Array of { date: Date, cardsReviewed: number }
  currentStreak = 0,
  longestStreak = 0,
  totalReviews = 0,
  isDarkMode
}) => {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Generate weeks data for the past year
  const weeksData = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    oneYearAgo.setDate(oneYearAgo.getDate() - oneYearAgo.getDay()); // Start from Sunday

    // Create a map of date -> count for quick lookup
    const activityMap = new Map();
    activityData.forEach(item => {
      const dateKey = item.date instanceof Date
        ? item.date.toISOString().split('T')[0]
        : new Date(item.date).toISOString().split('T')[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + item.cardsReviewed);
    });

    const weeks = [];
    let currentDate = new Date(oneYearAgo);

    while (currentDate <= today) {
      const week = [];
      for (let day = 0; day < 7; day++) {
        if (currentDate <= today) {
          const dateKey = currentDate.toISOString().split('T')[0];
          const count = activityMap.get(dateKey) || 0;
          week.push({
            date: new Date(currentDate),
            dateKey,
            count,
            isToday: currentDate.toDateString() === today.toDateString()
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      if (week.length > 0) {
        weeks.push(week);
      }
    }

    return weeks;
  }, [activityData]);

  // Get color intensity based on card count
  const getIntensityColor = (count) => {
    if (count === 0) {
      return isDarkMode ? '#161b22' : '#ebedf0';
    } else if (count <= 5) {
      return isDarkMode ? '#0e4429' : '#9be9a8';
    } else if (count <= 15) {
      return isDarkMode ? '#006d32' : '#40c463';
    } else if (count <= 30) {
      return isDarkMode ? '#26a641' : '#30a14e';
    } else {
      return isDarkMode ? '#39d353' : '#216e39';
    }
  };

  // Month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let currentMonth = -1;

    weeksData.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== currentMonth) {
          currentMonth = month;
          labels.push({
            month: firstDay.date.toLocaleString('default', { month: 'short' }),
            weekIndex
          });
        }
      }
    });

    return labels;
  }, [weeksData]);

  // Calculate stats
  const stats = useMemo(() => {
    let totalCards = 0;
    let activeDays = 0;
    let maxCards = 0;

    weeksData.flat().forEach(day => {
      if (day && day.count > 0) {
        totalCards += day.count;
        activeDays++;
        maxCards = Math.max(maxCards, day.count);
      }
    });

    return { totalCards, activeDays, maxCards };
  }, [weeksData]);

  const handleMouseEnter = (day, event) => {
    if (!day) return;
    const rect = event.target.getBoundingClientRect();
    setHoveredDay(day);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
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
      background: isDarkMode ? '#0d1117' : '#ffffff',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '900px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      border: `1px solid ${isDarkMode ? '#30363d' : '#d0d7de'}`
    },
    header: {
      padding: '20px 24px',
      borderBottom: `1px solid ${isDarkMode ? '#30363d' : '#d0d7de'}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      margin: 0,
      fontSize: '20px',
      fontWeight: '600',
      color: isDarkMode ? '#e6edf3' : '#24292f',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    closeBtn: {
      background: 'transparent',
      border: 'none',
      color: isDarkMode ? '#8b949e' : '#57606a',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '6px',
      lineHeight: 1
    },
    body: {
      padding: '24px'
    },
    statsRow: {
      display: 'flex',
      gap: '24px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    statCard: {
      flex: '1 1 150px',
      padding: '16px 20px',
      borderRadius: '12px',
      background: isDarkMode ? '#161b22' : '#f6f8fa',
      border: `1px solid ${isDarkMode ? '#30363d' : '#d0d7de'}`
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: isDarkMode ? '#8b949e' : '#57606a',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    graphContainer: {
      overflowX: 'auto',
      paddingBottom: '8px'
    },
    graph: {
      display: 'flex',
      gap: '3px',
      minWidth: 'max-content'
    },
    monthLabels: {
      display: 'flex',
      marginLeft: '32px',
      marginBottom: '8px',
      position: 'relative',
      height: '20px'
    },
    monthLabel: {
      position: 'absolute',
      fontSize: '11px',
      color: isDarkMode ? '#8b949e' : '#57606a',
      fontWeight: '500'
    },
    dayLabels: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      marginRight: '8px',
      paddingTop: '0'
    },
    dayLabel: {
      height: '12px',
      fontSize: '10px',
      color: isDarkMode ? '#8b949e' : '#57606a',
      display: 'flex',
      alignItems: 'center',
      fontWeight: '500'
    },
    week: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px'
    },
    day: {
      width: '12px',
      height: '12px',
      borderRadius: '2px',
      cursor: 'pointer',
      transition: 'transform 0.1s'
    },
    legendContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '8px',
      marginTop: '16px'
    },
    legendText: {
      fontSize: '11px',
      color: isDarkMode ? '#8b949e' : '#57606a'
    },
    legendSquares: {
      display: 'flex',
      gap: '3px'
    },
    tooltip: {
      position: 'fixed',
      padding: '8px 12px',
      borderRadius: '6px',
      background: isDarkMode ? '#24292f' : '#24292f',
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: '500',
      pointerEvents: 'none',
      zIndex: 300000,
      transform: 'translate(-50%, -100%)',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    },
    tooltipArrow: {
      position: 'absolute',
      bottom: '-6px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: `6px solid ${isDarkMode ? '#24292f' : '#24292f'}`
    }
  };

  const dayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>
            <span>Activity</span>
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Stats Row */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#f97316'}}>{currentStreak}</div>
              <div style={styles.statLabel}>Current Streak</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#8b5cf6'}}>{longestStreak}</div>
              <div style={styles.statLabel}>Longest Streak</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#10b981'}}>{stats.activeDays}</div>
              <div style={styles.statLabel}>Active Days</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statValue, color: '#3b82f6'}}>{totalReviews || stats.totalCards}</div>
              <div style={styles.statLabel}>Total Reviews</div>
            </div>
          </div>

          {/* Month Labels */}
          <div style={styles.monthLabels}>
            {monthLabels.map((label, idx) => (
              <span
                key={idx}
                style={{
                  ...styles.monthLabel,
                  left: `${label.weekIndex * 15 + 32}px`
                }}
              >
                {label.month}
              </span>
            ))}
          </div>

          {/* Heat Map Graph */}
          <div style={styles.graphContainer}>
            <div style={{ display: 'flex' }}>
              {/* Day labels */}
              <div style={styles.dayLabels}>
                {dayLabels.map((label, idx) => (
                  <div key={idx} style={styles.dayLabel}>{label}</div>
                ))}
              </div>

              {/* Weeks grid */}
              <div style={styles.graph}>
                {weeksData.map((week, weekIdx) => (
                  <div key={weekIdx} style={styles.week}>
                    {week.map((day, dayIdx) => (
                      <div
                        key={dayIdx}
                        style={{
                          ...styles.day,
                          backgroundColor: getIntensityColor(day?.count || 0),
                          outline: day?.isToday ? '2px solid #1f6feb' : 'none',
                          outlineOffset: '-1px'
                        }}
                        onMouseEnter={(e) => handleMouseEnter(day, e)}
                        onMouseLeave={handleMouseLeave}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={styles.legendContainer}>
            <span style={styles.legendText}>Less</span>
            <div style={styles.legendSquares}>
              {[0, 3, 10, 20, 35].map((count, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.day,
                    backgroundColor: getIntensityColor(count)
                  }}
                />
              ))}
            </div>
            <span style={styles.legendText}>More</span>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div
            style={{
              ...styles.tooltip,
              left: tooltipPosition.x,
              top: tooltipPosition.y
            }}
          >
            <strong>{hoveredDay.count} card{hoveredDay.count !== 1 ? 's' : ''}</strong> on{' '}
            {hoveredDay.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
            <div style={styles.tooltipArrow} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatMapCalendar;
