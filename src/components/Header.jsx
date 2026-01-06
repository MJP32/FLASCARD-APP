import React from 'react';

/**
 * Application header with logo, search, action buttons, and progress indicator
 */
const Header = ({
  isDarkMode,
  isHeaderCollapsed,
  setIsHeaderCollapsed,
  searchQuery,
  setSearchQuery,
  showIntervalSettings,
  toggleIntervalSettings,
  cardsCompletedToday,
  cardsDueToday,
  onShowSettings,
  onShowManageCards,
  onShowCalendar,
  onShowApiKeys,
  onShowAccount
}) => {
  return (
    <header className={`app-header ${isHeaderCollapsed ? 'collapsed' : ''}`}>
      <div className={`header-layout ${isHeaderCollapsed ? 'hidden' : ''}`}>
        {/* Left Section - Logo */}
        <div
          className="header-logo clickable-logo"
          onClick={() => {
            onShowSettings();
            if (!showIntervalSettings) {
              toggleIntervalSettings();
            }
          }}
          title="Click to learn about FSRS algorithm"
        >
          <h1 className="app-logo">FSRS Flashcards</h1>
          <p className="app-subtitle">AI Learning Platform</p>
        </div>

        {/* Center Section - Search and Action Buttons */}
        <div className="header-center">
          {/* Search Input */}
          <div className="header-search">
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
              title="Search cards by question, answer, or category"
            />
            {searchQuery && (
              <button
                className="header-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="action-buttons">
            <button
              className="header-btn"
              onClick={onShowManageCards}
              title="Manage cards (M)"
            >
              Manage Cards
            </button>

            <button
              className="header-btn"
              onClick={onShowCalendar}
              title="View calendar"
            >
              Calendar
            </button>

            <button
              className="header-btn"
              onClick={onShowApiKeys}
              title="Configure API Keys"
            >
              API Keys
            </button>

            <button
              className="header-btn"
              onClick={onShowSettings}
              title="Settings (S)"
            >
              Settings
            </button>

            <button
              className="header-btn"
              onClick={onShowAccount}
              title="Account Information"
            >
              Account
            </button>

            <button
              className="header-btn"
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              aria-label={isHeaderCollapsed ? "Exit focus mode" : "Enter focus mode"}
              title={isHeaderCollapsed ? "Exit focus mode" : "Enter focus mode"}
              style={{ background: '#7c3aed' }}
            >
              {isHeaderCollapsed ? "Exit Focus" : "Focus Mode"}
            </button>
          </div>
        </div>

        {/* Right Section - Daily Progress */}
        {((cardsCompletedToday + cardsDueToday.length) > 0 || cardsCompletedToday > 0) && (
          <div className="header-right-progress">
            <div className="daily-progress-compact">
              <span className="progress-label">{cardsCompletedToday}/{cardsCompletedToday + cardsDueToday.length}</span>
              <div className="progress-bar-mini">
                <div
                  className="progress-bar-fill-mini"
                  style={{
                    width: `${Math.min(100, (cardsCompletedToday / (cardsCompletedToday + cardsDueToday.length)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Show toggle button when in focus mode */}
      {isHeaderCollapsed && (
        <div className="focus-mode-controls">
          <button
            className="focus-mode-exit-btn"
            onClick={() => setIsHeaderCollapsed(false)}
            aria-label="Exit focus mode"
            title="Exit focus mode"
          >
            Exit Focus
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
