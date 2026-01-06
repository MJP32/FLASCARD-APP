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
  dueTodayCount
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
