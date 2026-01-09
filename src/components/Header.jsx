import React, { useRef, useEffect, useCallback } from 'react';
import DailyGoalProgress from './DailyGoalProgress';

/**
 * Application header with logo, search, action buttons, and progress indicator
 */
const Header = ({
  isDarkMode,
  isHeaderCollapsed,
  setIsHeaderCollapsed,
  searchQuery,
  setSearchQuery,
  searchResultCount,
  totalCardCount,
  showIntervalSettings,
  toggleIntervalSettings,
  cardsCompletedToday,
  cardsDueToday,
  onShowSettings,
  onShowManageCards,
  onShowCalendar,
  onShowApiKeys,
  onShowAccount,
  onShowStudyTimer,
  onShowStudyStats,
  // Gamification props
  gamificationEnabled = true,
  dailyProgress,
  currentStreak,
  todayXP,
  levelInfo,
  onShowAchievements,
  onShowHeatMap
}) => {
  const searchInputRef = useRef(null);

  // Keyboard shortcut: Ctrl+F or Cmd+F to focus search
  const handleGlobalKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  // Handle search input keyboard events
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);
  return (
    <header
      className={`app-header ${isHeaderCollapsed ? 'collapsed' : ''}`}
      role="banner"
    >
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
          role="button"
          tabIndex={0}
          aria-label="FSRS Flashcards - Click to learn about FSRS algorithm"
        >
          <h1 className="app-logo">FSRS Flashcards</h1>
          <p className="app-subtitle">AI Learning Platform</p>
        </div>

        {/* Center Section - Search and Action Buttons */}
        <div className="header-center">
          {/* Search Input */}
          <div className="header-search" role="search">
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search cards... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={`header-search-input ${searchQuery && searchResultCount === 0 ? 'no-results' : ''}`}
              title="Search cards by question, answer, or category (Ctrl+F to focus, Escape to clear)"
              aria-label="Search flashcards"
              aria-describedby={searchQuery ? "search-results-count" : undefined}
            />
            {searchQuery && (
              <>
                <span
                  id="search-results-count"
                  className={`header-search-count ${searchResultCount === 0 ? 'no-results' : ''}`}
                  aria-live="polite"
                >
                  {searchResultCount}/{totalCardCount}
                </span>
                <button
                  className="header-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search (Escape)"
                  aria-label="Clear search"
                >
                  ×
                </button>
              </>
            )}
          </div>
          <nav className="action-buttons" role="navigation" aria-label="Main navigation">
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
              onClick={onShowStudyStats}
              title="View study statistics"
            >
              Stats
            </button>

            <button
              className="header-btn"
              onClick={onShowStudyTimer}
              title="Study session timer"
            >
              Timer
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
          </nav>
        </div>

        {/* Right Section - Gamification Progress */}
        <div className="header-right-progress">
          {gamificationEnabled && dailyProgress ? (
            <DailyGoalProgress
              dailyProgress={dailyProgress}
              currentStreak={currentStreak || 0}
              todayXP={todayXP || 0}
              levelInfo={levelInfo || { level: 1, title: 'Beginner' }}
              isDarkMode={isDarkMode}
              onOpenStats={onShowAchievements || onShowStudyStats}
              onShowHeatMap={onShowHeatMap}
            />
          ) : (
            ((cardsCompletedToday + cardsDueToday.length) > 0 || cardsCompletedToday > 0) && (
              <div className="daily-progress-compact">
                <span className="progress-label">
                  {cardsCompletedToday}/{cardsCompletedToday + cardsDueToday.length}
                  {cardsDueToday.length === 0 && cardsCompletedToday > 0 && ' ✓'}
                </span>
                <div className="progress-bar-mini">
                  <div
                    className={`progress-bar-fill-mini${cardsDueToday.length === 0 && cardsCompletedToday > 0 ? ' complete' : ''}`}
                    style={{
                      width: `${Math.min(100, (cardsCompletedToday / (cardsCompletedToday + cardsDueToday.length)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )
          )}
        </div>
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
