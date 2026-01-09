import React from 'react';

/**
 * Application footer with stats and keyboard shortcuts
 */
const Footer = ({
  totalCards,
  filteredCount,
  searchCount,
  isSearching,
  categoriesCount,
  pastDueCount,
  dueTodayCount,
  sessionCards = 0,
  onEndSession
}) => {
  return (
    <footer className="app-footer">
      <div className="footer-stats">
        <span>Total Cards: {totalCards}</span>
        <span>{isSearching ? `Search: ${searchCount}` : `Filtered: ${filteredCount}`}</span>
        <span>Categories: {categoriesCount}</span>
        <span style={{ color: pastDueCount > 0 ? '#ff6b6b' : 'inherit' }}>
          Past Due: {pastDueCount}
        </span>
        <span style={{ color: dueTodayCount > 0 ? '#feca57' : 'inherit' }}>
          Due Today: {dueTodayCount}
        </span>
        {sessionCards > 0 && onEndSession && (
          <button
            className="end-session-btn"
            onClick={onEndSession}
            title="View session summary"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            End Session ({sessionCards})
          </button>
        )}
      </div>
      <div className="footer-shortcuts">
        <small>
          Shortcuts: <kbd>Space</kbd> Show Answer | <kbd>←/→</kbd> Navigate |
          <kbd>1-4</kbd> Rate Card | <kbd>C</kbd> Create | <kbd>S</kbd> Settings | <kbd>E</kbd> Export | <kbd>M</kbd> Manage
        </small>
      </div>
    </footer>
  );
};

export default Footer;
