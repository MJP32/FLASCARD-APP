import React, { useState, useEffect } from 'react';
import StudyGuideModal from './StudyGuideModal';

/**
 * Settings modal component for application configuration
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {boolean} props.isDarkMode - Current dark mode state
 * @param {Function} props.onToggleDarkMode - Callback to toggle dark mode
 * @param {Object} props.fsrsParams - FSRS algorithm parameters
 * @param {Function} props.onUpdateFsrsParams - Callback to update FSRS parameters
 * @param {boolean} props.showIntervalSettings - Whether to show interval settings
 * @param {Function} props.onToggleIntervalSettings - Callback to toggle interval settings
 * @param {Function} props.onSignOut - Callback for user sign out
 * @param {string} props.userDisplayName - Current user display name
 * @param {Array} props.flashcards - Array of user's flashcards
 * @returns {JSX.Element} Settings modal component
 */
const SettingsModal = ({
  isVisible,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  fsrsParams,
  onUpdateFsrsParams,
  showIntervalSettings,
  onToggleIntervalSettings,
  onSignOut,
  userDisplayName,
  flashcards = [],
  apiKeys = {},
  selectedProvider = 'openai',
  onApiKeysUpdate
}) => {
  const [localFsrsParams, setLocalFsrsParams] = useState(fsrsParams);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showFileFormat, setShowFileFormat] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [localApiKeys, setLocalApiKeys] = useState(apiKeys);
  const [localSelectedProvider, setLocalSelectedProvider] = useState(selectedProvider);
  const [showFsrsExplanation, setShowFsrsExplanation] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const [showFeedbackSection, setShowFeedbackSection] = useState(false);
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false);
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [showAccountSection, setShowAccountSection] = useState(false);
  const [showAppearanceSection, setShowAppearanceSection] = useState(false);

  // Helper function to infer level from FSRS parameters (same as FlashcardDisplay)
  const inferLevelFromFSRS = (card) => {
    if (card.level) return card.level;
    
    const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
    
    if (difficulty >= 8) return 'again';
    if (difficulty >= 7) return 'hard';
    if (difficulty <= 3 && easeFactor >= 2.8) return 'easy';
    if (interval >= 4) return 'good';
    return 'new';
  };

  // Calculate card rating statistics using proper FSRS level inference
  const calculateRatingStats = () => {
    const stats = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
      new: 0
    };
    
    flashcards.forEach(card => {
      const level = inferLevelFromFSRS(card);
      if (stats.hasOwnProperty(level)) {
        stats[level]++;
      }
    });
    
    return stats;
  };

  console.log('Flashcards received:', flashcards.length);
  let ratingStats;
  try {
    ratingStats = calculateRatingStats();
    console.log('Rating stats:', ratingStats);
  } catch (error) {
    console.error('Error calculating rating stats:', error);
    ratingStats = { again: 0, hard: 0, good: 0, easy: 0, new: 0 };
  }

  // Update local params when props change
  useEffect(() => {
    setLocalFsrsParams(fsrsParams);
    setHasUnsavedChanges(false);
  }, [fsrsParams]);

  // Update local API keys when props change
  useEffect(() => {
    setLocalApiKeys(apiKeys);
    setLocalSelectedProvider(selectedProvider);
  }, [apiKeys, selectedProvider]);

  const handleParamChange = (key, value) => {
    setLocalFsrsParams(prev => ({
      ...prev,
      [key]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveParams = () => {
    onUpdateFsrsParams(localFsrsParams);
    setHasUnsavedChanges(false);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all FSRS parameters to their default values?')) {
      // Reset to default values
      const defaultParams = {
        requestRetention: 0.9,
        maximumInterval: 36500,
        w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
        againFactor: 0.5,
        hardFactor: 0.8,
        goodFactor: 1.0,
        easyFactor: 1.3,
        initialAgainInterval: 1,
        initialHardInterval: 1,
        initialGoodInterval: 4,
        initialEasyInterval: 15
      };
      setLocalFsrsParams(defaultParams);
      setHasUnsavedChanges(true);
    }
  };

  const handleApiKeyChange = (provider, key) => {
    setLocalApiKeys(prev => ({
      ...prev,
      [provider]: key
    }));
  };

  const handleProviderChange = (provider) => {
    setLocalSelectedProvider(provider);
  };

  const handleSaveApiKeys = () => {
    onApiKeysUpdate(localApiKeys, localSelectedProvider);
    setShowApiKeys(false);
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackStatus({ type: 'error', message: 'Please enter your feedback before sending.' });
      return;
    }

    setFeedbackSending(true);
    setFeedbackStatus(null);

    try {
      const subject = encodeURIComponent('FSRS Flashcards - User Feedback');
      const body = encodeURIComponent(
        `User Feedback\n\n` +
        `${feedbackText}\n\n` +
        `---\n` +
        `User: ${userDisplayName || 'Anonymous'}\n` +
        `Cards: ${flashcards.length}\n` +
        `Dark Mode: ${isDarkMode ? 'Yes' : 'No'}\n` +
        `Date: ${new Date().toLocaleString()}`
      );

      const mailtoLink = `mailto:admin@fsrslearn.com?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;

      setFeedbackText('');
      setFeedbackStatus({ 
        type: 'success', 
        message: 'Email client opened! Please send the email to complete your feedback submission.' 
      });

      setTimeout(() => {
        setFeedbackStatus(null);
      }, 5000);

    } catch (error) {
      console.error('Error preparing feedback email:', error);
      setFeedbackStatus({ 
        type: 'error', 
        message: 'Error preparing email. Please try again or contact admin@fsrslearn.com directly.' 
      });
    } finally {
      setFeedbackSending(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className="modal-content settings-modal">
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Account Section */}
          <section className="settings-section">
            <div className="section-header-with-checkbox">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="show-account-section"
                  checked={showAccountSection}
                  onChange={(e) => setShowAccountSection(e.target.checked)}
                />
                <label htmlFor="show-account-section">
                  <h3>👤 Account</h3>
                </label>
              </div>
              <button 
                className="btn btn-info btn-small"
                onClick={() => setShowAccountSection(!showAccountSection)}
              >
                {showAccountSection ? '👤 Hide' : '👤'} Account Info
              </button>
            </div>
            
            <p className="section-description">
              View your account information, study statistics, and manage your session.
            </p>
            
            {showAccountSection && (
              <div className="account-section-content">
            <div className="account-info">
              <div className="account-details">
                <div className="account-item">
                  <span className="account-label">User:</span>
                  <span className="account-value">
                    {userDisplayName ? userDisplayName : 'Anonymous User'}
                  </span>
                </div>
                <div className="account-item">
                  <span className="account-label">Total Cards:</span>
                  <span className="account-value">{flashcards.length}</span>
                </div>
                <div className="account-item">
                  <span className="account-label">Active Cards:</span>
                  <span className="account-value">
                    {flashcards.filter(card => card.active !== false).length}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Card Performance - Horizontal Layout */}
            <div className="rating-statistics-horizontal">
              <h4 className="rating-stats-title">📊 Card Performance</h4>
              <div className="rating-stats-horizontal-wrapper">
                  <div className="rating-stat-item new">
                    <span className="rating-emoji">🆕</span>
                    <span className="rating-label">New</span>
                    <span className="rating-count">{ratingStats.new}</span>
                  </div>
                  <div className="rating-stat-item again">
                    <span className="rating-emoji">😵</span>
                    <span className="rating-label">Again</span>
                    <span className="rating-count">{ratingStats.again}</span>
                  </div>
                  <div className="rating-stat-item hard">
                    <span className="rating-emoji">😰</span>
                    <span className="rating-label">Hard</span>
                    <span className="rating-count">{ratingStats.hard}</span>
                  </div>
                  <div className="rating-stat-item good">
                    <span className="rating-emoji">😊</span>
                    <span className="rating-label">Good</span>
                    <span className="rating-count">{ratingStats.good}</span>
                  </div>
                  <div className="rating-stat-item easy">
                    <span className="rating-emoji">😎</span>
                    <span className="rating-label">Easy</span>
                    <span className="rating-count">{ratingStats.easy}</span>
                  </div>
                <div className="rating-stats-summary">
                  <div className="summary-item">
                    <span className="summary-label">Reviewed:</span>
                    <span className="summary-value">
                      {ratingStats.again + ratingStats.hard + ratingStats.good + ratingStats.easy}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Mastery Rate:</span>
                    <span className="summary-value">
                      {(() => {
                        const total = ratingStats.again + ratingStats.hard + ratingStats.good + ratingStats.easy;
                        const mastered = ratingStats.good + ratingStats.easy;
                        return total > 0 ? `${Math.round((mastered / total) * 100)}%` : '0%';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Study Guide Section */}
              <div className="study-guide-section">
                <button 
                  className="btn btn-primary study-guide-btn"
                  onClick={() => setShowStudyGuideModal(true)}
                  disabled={false}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    marginBottom: '16px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📖 Open Study Guide
                </button>
                
              </div>
              
              <button 
                className="btn btn-danger"
                onClick={onSignOut}
              >
                🚪 Sign Out
              </button>
            </div>
              </div>
            )}
          </section>

          {/* Appearance Section */}
          <section className="settings-section">
            <div className="section-header-with-checkbox">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="show-appearance-section"
                  checked={showAppearanceSection}
                  onChange={(e) => setShowAppearanceSection(e.target.checked)}
                />
                <label htmlFor="show-appearance-section">
                  <h3>🎨 Appearance</h3>
                </label>
              </div>
              <button 
                className="btn btn-info btn-small"
                onClick={() => setShowAppearanceSection(!showAppearanceSection)}
              >
                {showAppearanceSection ? '🎨 Hide' : '🎨'} Theme Settings
              </button>
            </div>
            
            <p className="section-description">
              Customize the visual appearance and theme of the application.
            </p>
            
            {showAppearanceSection && (
              <div className="setting-item">
                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Theme</span>
                    <span className="toggle-description">
                      {isDarkMode ? 'Dark mode is enabled' : 'Light mode is enabled'}
                    </span>
                  </div>
                  <div className="theme-toggle">
                    <span className="theme-label light">☀️ Light</span>
                    <button
                      className={`toggle-switch ${isDarkMode ? 'dark' : 'light'}`}
                      onClick={onToggleDarkMode}
                      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                    >
                      <div className="toggle-slider"></div>
                    </button>
                    <span className="theme-label dark">🌙 Dark</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Study Settings Section */}
          <section className="settings-section">
            <div className="section-header-with-checkbox">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="show-study-settings"
                  checked={showIntervalSettings}
                  onChange={onToggleIntervalSettings}
                />
                <label htmlFor="show-study-settings">
                  <h3>📚 Study Settings</h3>
                </label>
              </div>
              <button 
                className="btn btn-info btn-small"
                onClick={onToggleIntervalSettings}
              >
                {showIntervalSettings ? '⚙️ Hide' : '⚙️'} Advanced FSRS
              </button>
            </div>
            
            <p className="section-description">
              Configure advanced spaced repetition algorithm parameters and study behavior settings.
            </p>
            
            {/* FSRS Parameters Section - Moved inside dropdown */}
            {showIntervalSettings && (
              <div className="fsrs-section">
                <div className="section-header-with-button">
                  <h4>FSRS Algorithm Parameters</h4>
                  <button 
                    className="btn btn-info btn-small"
                    onClick={() => setShowFsrsExplanation(!showFsrsExplanation)}
                  >
                    {showFsrsExplanation ? '📖 Hide' : '📚'} FSRS Explanation
                  </button>
                </div>
                <p className="section-description">
                  These parameters control the spaced repetition algorithm. 
                  Modify only if you understand their impact on learning intervals.
                </p>

                {/* FSRS Explanation - Conditionally Rendered */}
                {showFsrsExplanation && (
                  <div className="fsrs-explanation">
                    <h5>Understanding FSRS (Free Spaced Repetition Scheduler)</h5>
                    
                    <div className="explanation-section">
                      <h6>What is FSRS?</h6>
                      <p>
                        FSRS is a modern spaced repetition algorithm based on scientific research in memory and forgetting curves. 
                        It optimizes review intervals to maximize long-term retention while minimizing study time.
                      </p>
                    </div>

                    <div className="explanation-section">
                      <h6>Key Benefits:</h6>
                      <ul>
                        <li>More accurate than traditional algorithms like SM2 (used by Anki)</li>
                        <li>Adapts to your individual learning patterns</li>
                        <li>Reduces study time while improving retention</li>
                        <li>Based on modern memory research</li>
                      </ul>
                    </div>

                    <div className="explanation-section">
                      <h6>How It Works:</h6>
                      <ol>
                        <li><strong>Difficulty:</strong> How hard a card is to remember (0-10)</li>
                        <li><strong>Stability:</strong> How long you can remember the card</li>
                        <li><strong>Retrievability:</strong> Current probability of successful recall</li>
                        <li><strong>Review History:</strong> Your past performance influences future intervals</li>
                      </ol>
                    </div>

                    <div className="explanation-section">
                      <h6>Rating Guidelines:</h6>
                      <ul>
                        <li><strong>Again (1):</strong> Complete failure - you didn't remember at all</li>
                        <li><strong>Hard (2):</strong> Incorrect response, but you recognized the correct answer</li>
                        <li><strong>Good (3):</strong> Correct response, but required significant effort</li>
                        <li><strong>Easy (4):</strong> Correct response with perfect recall</li>
                      </ul>
                    </div>

                    <div className="explanation-section">
                      <h6>Parameter Explanation:</h6>
                      <ul>
                        <li><strong>Request Retention:</strong> Target retention rate (90% = remember 9/10 cards)</li>
                        <li><strong>Maximum Interval:</strong> Longest time between reviews (days)</li>
                        <li><strong>W Parameters:</strong> Algorithm weights (leave as default unless expert)</li>
                        <li><strong>Factor Multipliers:</strong> How much each rating affects the next interval</li>
                      </ul>
                    </div>

                    <div className="warning-box">
                      <h6>⚠️ Important Notes:</h6>
                      <ul>
                        <li>Only modify these settings if you understand spaced repetition algorithms</li>
                        <li>Incorrect settings can harm your learning efficiency</li>
                        <li>The default parameters work well for most users</li>
                        <li>Changes apply to new reviews, not existing card schedules</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* FSRS Parameters Form */}
                <div className="fsrs-params-form">
                  <div className="param-group">
                    <h5>Basic Parameters</h5>
                    
                    <div className="param-item">
                      <label htmlFor="requestRetention">
                        Request Retention (0.8 - 0.99):
                        <span className="param-description">Target retention rate - higher means more frequent reviews</span>
                      </label>
                      <input
                        id="requestRetention"
                        type="number"
                        min="0.8"
                        max="0.99"
                        step="0.01"
                        value={localFsrsParams.requestRetention || 0.9}
                        onChange={(e) => handleParamChange('requestRetention', parseFloat(e.target.value))}
                        className="param-input"
                      />
                    </div>

                    <div className="param-item">
                      <label htmlFor="maximumInterval">
                        Maximum Interval (days):
                        <span className="param-description">Longest time between reviews (1-36500 days)</span>
                      </label>
                      <input
                        id="maximumInterval"
                        type="number"
                        min="1"
                        max="36500"
                        value={localFsrsParams.maximumInterval || 36500}
                        onChange={(e) => handleParamChange('maximumInterval', parseInt(e.target.value))}
                        className="param-input"
                      />
                    </div>
                  </div>

                  <div className="param-group">
                    <h5>Rating Factors</h5>
                    <p className="param-group-description">
                      These factors determine how much each rating affects the next review interval.
                    </p>
                    
                    <div className="param-row">
                      <div className="param-item">
                        <label htmlFor="againFactor">Again Factor:</label>
                        <input
                          id="againFactor"
                          type="number"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={localFsrsParams.againFactor || 0.5}
                          onChange={(e) => handleParamChange('againFactor', parseFloat(e.target.value))}
                          className="param-input"
                        />
                      </div>
                      
                      <div className="param-item">
                        <label htmlFor="hardFactor">Hard Factor:</label>
                        <input
                          id="hardFactor"
                          type="number"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          value={localFsrsParams.hardFactor || 0.8}
                          onChange={(e) => handleParamChange('hardFactor', parseFloat(e.target.value))}
                          className="param-input"
                        />
                      </div>
                    </div>

                    <div className="param-row">
                      <div className="param-item">
                        <label htmlFor="goodFactor">Good Factor:</label>
                        <input
                          id="goodFactor"
                          type="number"
                          min="0.8"
                          max="2.0"
                          step="0.1"
                          value={localFsrsParams.goodFactor || 1.0}
                          onChange={(e) => handleParamChange('goodFactor', parseFloat(e.target.value))}
                          className="param-input"
                        />
                      </div>
                      
                      <div className="param-item">
                        <label htmlFor="easyFactor">Easy Factor:</label>
                        <input
                          id="easyFactor"
                          type="number"
                          min="1.0"
                          max="3.0"
                          step="0.1"
                          value={localFsrsParams.easyFactor || 1.3}
                          onChange={(e) => handleParamChange('easyFactor', parseFloat(e.target.value))}
                          className="param-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="param-group">
                    <h5>Initial Intervals (days)</h5>
                    <p className="param-group-description">
                      Default intervals for new cards based on initial rating.
                    </p>
                    
                    <div className="param-row">
                      <div className="param-item">
                        <label htmlFor="initialAgainInterval">Again:</label>
                        <input
                          id="initialAgainInterval"
                          type="number"
                          min="0.01"
                          max="30"
                          step="0.01"
                          value={localFsrsParams.initialAgainInterval || 1}
                          onChange={(e) => handleParamChange('initialAgainInterval', parseFloat(e.target.value))}
                          className="param-input"
                        />
                      </div>
                      
                      <div className="param-item">
                        <label htmlFor="initialHardInterval">Hard:</label>
                        <input
                          id="initialHardInterval"
                          type="number"
                          min="0.01"
                          max="30"
                          step="0.01"
                          value={localFsrsParams.initialHardInterval || 1}
                          onChange={(e) => handleParamChange('initialHardInterval', parseFloat(e.target.value))}
                          className="param-input"
                        />
                      </div>
                    </div>

                    <div className="param-row">
                      <div className="param-item">
                        <label htmlFor="initialGoodInterval">Good:</label>
                        <input
                          id="initialGoodInterval"
                          type="number"
                          min="1"
                          max="30"
                          value={localFsrsParams.initialGoodInterval || 4}
                          onChange={(e) => handleParamChange('initialGoodInterval', parseInt(e.target.value))}
                          className="param-input"
                        />
                      </div>
                      
                      <div className="param-item">
                        <label htmlFor="initialEasyInterval">Easy:</label>
                        <input
                          id="initialEasyInterval"
                          type="number"
                          min="1"
                          max="30"
                          value={localFsrsParams.initialEasyInterval || 15}
                          onChange={(e) => handleParamChange('initialEasyInterval', parseInt(e.target.value))}
                          className="param-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="param-group advanced-params">
                    <h5>Advanced W Parameters</h5>
                    <p className="param-group-description">
                      <strong>⚠️ Advanced users only:</strong> These are the core FSRS algorithm weights. 
                      Modifying these incorrectly can significantly impact learning efficiency.
                    </p>
                    
                    <div className="w-params-grid">
                      {(localFsrsParams.w || []).map((weight, index) => (
                        <div key={index} className="param-item">
                          <label htmlFor={`w${index}`}>W[{index}]:</label>
                          <input
                            id={`w${index}`}
                            type="number"
                            step="0.0001"
                            value={weight}
                            onChange={(e) => {
                              const newW = [...(localFsrsParams.w || [])];
                              newW[index] = parseFloat(e.target.value);
                              handleParamChange('w', newW);
                            }}
                            className="param-input w-param"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* File Format Section */}
          <section className="settings-section">
            <div className="section-header-with-checkbox">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="show-file-format"
                  checked={showFileFormat}
                  onChange={(e) => setShowFileFormat(e.target.checked)}
                />
                <label htmlFor="show-file-format">
                  <h3>📁 File Format</h3>
                </label>
              </div>
              <button 
                className="btn btn-info btn-small"
                onClick={() => setShowFileFormat(!showFileFormat)}
              >
                {showFileFormat ? '📖 Hide' : '📚'} Format Guide
              </button>
            </div>
            
            <p className="section-description">
              Configure import settings and view file format requirements for CSV and Excel files.
            </p>
            
            {/* File Format Guide - Moved inside dropdown */}
            {showFileFormat && (
              <div className="file-format-info">
                <p className="section-description">
                  When importing flashcards from CSV or Excel files, use the following format:
                </p>
                
                <div className="format-example">
                  <h4>Required Columns:</h4>
                  <ul>
                    <li><strong>question</strong> - The front of the flashcard (supports HTML/Markdown)</li>
                    <li><strong>answer</strong> - The back of the flashcard (supports HTML/Markdown)</li>
                  </ul>
                  
                  <h4>Optional Columns:</h4>
                  <ul>
                    <li><strong>category</strong> - Main category to organize cards (e.g., "Spanish", "Biology")</li>
                    <li><strong>sub_category</strong> - Sub-category for further organization (e.g., "Verbs", "Cell Biology")</li>
                    <li><strong>level</strong> - Difficulty level: "new" (default), "again", "hard", "good", or "easy"</li>
                    <li><strong>additional_info</strong> - Extra information or notes</li>
                  </ul>
                </div>

                <div className="format-example">
                  <h4>Example CSV (headers optional):</h4>
                  <pre className="code-block">
{`Option 1: With headers (recommended)
question,answer,category,sub_category,level,additional_info
"What is 2+2?","4","Math","Arithmetic","new","Basic addition"
"Capital of France?","Paris","Geography","Europe","easy","Located in Western Europe"

Option 2: Without headers (uses default column order)
"What is 2+2?","4","Math","Arithmetic","new","Basic addition"
"Capital of France?","Paris","Geography","Europe","easy","Located in Western Europe"
"<b>Bold text</b>","<i>Italic answer</i>","Formatting","","new","HTML supported"`}
                  </pre>
                </div>

                <div className="format-notes">
                  <h4>Important Notes:</h4>
                  <ul>
                    <li>• Use quotes around text containing commas</li>
                    <li>• HTML tags are preserved for formatting</li>
                    <li>• Images can be included using base64 encoding</li>
                    <li>• UTF-8 encoding is recommended for special characters</li>
                    <li>• Maximum 1000 cards per import recommended</li>
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* API Keys Section */}
          <section className="settings-section">
            <div className="section-header-with-checkbox">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="show-api-keys"
                  checked={showApiKeys}
                  onChange={(e) => setShowApiKeys(e.target.checked)}
                />
                <label htmlFor="show-api-keys">
                  <h3>🔑 API Keys</h3>
                </label>
              </div>
              <button 
                className="btn btn-info btn-small"
                onClick={() => setShowApiKeys(!showApiKeys)}
              >
                {showApiKeys ? '🔒 Hide' : '🔑'} Configure Keys
              </button>
            </div>
            
            <p className="section-description">
              Configure API keys for AI providers to enable advanced flashcard features like auto-generation and content enhancement.
            </p>
            
            {/* API Keys Configuration - Moved inside dropdown */}
            {showApiKeys && (
              <div className="api-keys-info">
                <div className="api-keys-config">
                  {/* Provider Selection */}
                  <div className="provider-selection">
                    <h4>Select AI Provider</h4>
                    <div className="provider-options">
                      <label className="provider-option">
                        <input
                          type="radio"
                          name="provider"
                          value="openai"
                          checked={localSelectedProvider === 'openai'}
                          onChange={(e) => handleProviderChange(e.target.value)}
                        />
                        <div className="provider-info">
                          <strong>OpenAI (GPT-4/GPT-3.5)</strong>
                          <span>Most versatile, great for general content</span>
                        </div>
                      </label>
                      
                      <label className="provider-option">
                        <input
                          type="radio"
                          name="provider"
                          value="anthropic"
                          checked={localSelectedProvider === 'anthropic'}
                          onChange={(e) => handleProviderChange(e.target.value)}
                        />
                        <div className="provider-info">
                          <strong>Anthropic (Claude)</strong>
                          <span>Excellent for detailed explanations and analysis</span>
                        </div>
                      </label>
                      
                      <label className="provider-option">
                        <input
                          type="radio"
                          name="provider"
                          value="gemini"
                          checked={localSelectedProvider === 'gemini'}
                          onChange={(e) => handleProviderChange(e.target.value)}
                        />
                        <div className="provider-info">
                          <strong>Google Gemini</strong>
                          <span>Good balance of performance and cost</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* API Key Inputs */}
                  <div className="api-key-inputs">
                    <h4>API Keys</h4>
                    <p className="api-keys-description">
                      Enter your API keys below. Keys are stored locally in your browser and never sent to our servers.
                    </p>
                    
                    <div className="api-key-input">
                      <label htmlFor="openai-key">
                        OpenAI API Key:
                        <span className="key-status">
                          {localApiKeys.openai ? '✅ Configured' : '❌ Not configured'}
                        </span>
                      </label>
                      <input
                        id="openai-key"
                        type="password"
                        placeholder="sk-..."
                        value={localApiKeys.openai || ''}
                        onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                        className="api-key-field"
                      />
                      <small>Get your key from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API Keys</a></small>
                    </div>

                    <div className="api-key-input">
                      <label htmlFor="anthropic-key">
                        Anthropic API Key:
                        <span className="key-status">
                          {localApiKeys.anthropic ? '✅ Configured' : '❌ Not configured'}
                        </span>
                      </label>
                      <input
                        id="anthropic-key"
                        type="password"
                        placeholder="sk-ant-..."
                        value={localApiKeys.anthropic || ''}
                        onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                        className="api-key-field"
                      />
                      <small>Get your key from: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></small>
                    </div>

                    <div className="api-key-input">
                      <label htmlFor="gemini-key">
                        Google Gemini API Key:
                        <span className="key-status">
                          {localApiKeys.gemini ? '✅ Configured' : '❌ Not configured'}
                        </span>
                      </label>
                      <input
                        id="gemini-key"
                        type="password"
                        placeholder="AI..."
                        value={localApiKeys.gemini || ''}
                        onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                        className="api-key-field"
                      />
                      <small>Get your key from: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></small>
                    </div>
                  </div>

                  {/* Features Info */}
                  <div className="features-info">
                    <h4>What can you do with API keys?</h4>
                    <ul>
                      <li><strong>Auto-generate flashcards:</strong> Create cards from topics or text</li>
                      <li><strong>Enhance existing cards:</strong> Improve questions and answers</li>
                      <li><strong>Generate examples:</strong> Create practical examples for concepts</li>
                      <li><strong>Content suggestions:</strong> Get hints and additional information</li>
                    </ul>
                  </div>

                  {/* Privacy Notice */}
                  <div className="privacy-notice">
                    <h4>🔒 Privacy & Security</h4>
                    <ul>
                      <li>API keys are stored locally in your browser only</li>
                      <li>Keys are never sent to our servers</li>
                      <li>You can clear keys anytime by deleting the text</li>
                      <li>Keys are used only for AI provider communication</li>
                    </ul>
                  </div>

                  {/* Save Button */}
                  <div className="api-keys-actions">
                    <button 
                      className="btn btn-success"
                      onClick={handleSaveApiKeys}
                    >
                      💾 Save API Keys
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* User Feedback Section */}
          <section className="settings-section">
            <div className="section-header-with-checkbox">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="enable-feedback"
                  checked={showFeedbackSection}
                  onChange={(e) => setShowFeedbackSection(e.target.checked)}
                />
                <label htmlFor="enable-feedback">
                  <h3>💬 User Feedback</h3>
                </label>
              </div>
              <button 
                className="btn btn-info btn-small"
                onClick={() => setShowFeedbackSection(!showFeedbackSection)}
              >
                {showFeedbackSection ? '📝 Hide' : '📝'} Feedback Form
              </button>
            </div>
            
            <p className="section-description">
              We value your feedback! Share your thoughts, suggestions, or report issues to help us improve FSRS Flashcards.
            </p>
            
            {showFeedbackSection && (
              <div className="feedback-section">
                <div className="feedback-form">
                  <label htmlFor="feedback-text" className="feedback-label">
                    Your Feedback
                  </label>
                  <textarea
                    id="feedback-text"
                    className="feedback-textarea"
                    placeholder="Tell us what you think about FSRS Flashcards, suggest new features, or report any issues you've encountered..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows="6"
                    maxLength="2000"
                    disabled={feedbackSending}
                  />
                  <div className="feedback-char-count">
                    {feedbackText.length}/2000 characters
                  </div>
                  
                  {feedbackStatus && (
                    <div className={`feedback-status ${feedbackStatus.type}`}>
                      {feedbackStatus.type === 'success' ? '✅' : '❌'} {feedbackStatus.message}
                    </div>
                  )}
                  
                  <button 
                    className="btn btn-primary"
                    onClick={handleSendFeedback}
                    disabled={feedbackSending || !feedbackText.trim()}
                  >
                    {feedbackSending ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        Preparing Email...
                      </>
                    ) : (
                      <>
                        📧 Send Email to admin@fsrslearn.com
                      </>
                    )}
                  </button>
                  
                  <p className="feedback-note">
                    <small>
                      Clicking "Send Email" will open your default email client with your feedback pre-filled. 
                      Simply send the email to complete the submission.
                    </small>
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Invite & Share Section */}
          <section className="settings-section">
            <div className="section-header-with-checkbox">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="show-invite-section"
                  checked={showInviteSection}
                  onChange={(e) => setShowInviteSection(e.target.checked)}
                />
                <label htmlFor="show-invite-section">
                  <h3>🤝 Invite & Share</h3>
                </label>
              </div>
              <button 
                className="btn btn-info btn-small"
                onClick={() => setShowInviteSection(!showInviteSection)}
              >
                {showInviteSection ? '🔗 Hide' : '🔗'} Share Options
              </button>
            </div>
            
            <p className="section-description">
              Share this flashcard app with friends and colleagues to help them learn more effectively!
            </p>
            
            {showInviteSection && (
              <div className="invite-section">
                <div className="share-options">
                  <div className="share-option">
                    <h4>📧 Email</h4>
                    <p className="share-description">Send an invitation via email</p>
                    <button 
                      className="btn btn-primary share-btn"
                      onClick={() => {
                        const subject = encodeURIComponent('Check out this amazing flashcard app!');
                        const body = encodeURIComponent(`Hi! I've been using this fantastic flashcard app for studying and thought you might find it useful too.\n\nIt uses the FSRS algorithm for optimal spaced repetition, has a great dark mode, and makes studying much more effective.\n\nCheck it out at: ${window.location.origin}\n\nHappy studying!`);
                        window.open(`mailto:?subject=${subject}&body=${body}`);
                      }}
                    >
                      📧 Share via Email
                    </button>
                  </div>

                  <div className="share-option">
                    <h4>🔗 Copy Link</h4>
                    <p className="share-description">Copy the app link to share anywhere</p>
                    <button 
                      className="btn btn-secondary share-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin);
                        // You could add a toast notification here
                        const btn = document.activeElement;
                        const originalText = btn.textContent;
                        btn.textContent = '✅ Copied!';
                        setTimeout(() => {
                          btn.textContent = originalText;
                        }, 2000);
                      }}
                    >
                      📋 Copy Link
                    </button>
                  </div>

                  <div className="share-option">
                    <h4>📱 Social Media</h4>
                    <p className="share-description">Share on your favorite social platforms</p>
                    <div className="social-buttons">
                      <button 
                        className="btn btn-social twitter"
                        onClick={() => {
                          const text = encodeURIComponent('Just discovered this amazing flashcard app with FSRS algorithm for optimal spaced repetition! 🧠✨');
                          const url = encodeURIComponent(window.location.origin);
                          window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                        }}
                      >
                        🐦 Twitter
                      </button>
                      <button 
                        className="btn btn-social facebook"
                        onClick={() => {
                          const url = encodeURIComponent(window.location.origin);
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                        }}
                      >
                        📘 Facebook
                      </button>
                      <button 
                        className="btn btn-social linkedin"
                        onClick={() => {
                          const url = encodeURIComponent(window.location.origin);
                          const title = encodeURIComponent('Amazing Flashcard App with FSRS Algorithm');
                          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank');
                        }}
                      >
                        💼 LinkedIn
                      </button>
                      <button 
                        className="btn btn-social reddit"
                        onClick={() => {
                          const url = encodeURIComponent(window.location.origin);
                          const title = encodeURIComponent('Check out this flashcard app with FSRS algorithm for optimal spaced repetition');
                          window.open(`https://reddit.com/submit?url=${url}&title=${title}`, '_blank');
                        }}
                      >
                        🤖 Reddit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          {showIntervalSettings && (
            <>
              <button 
                className="btn btn-warning"
                onClick={handleResetToDefaults}
                disabled={!hasUnsavedChanges}
              >
                Reset to Defaults
              </button>
              <button 
                className="btn btn-success"
                onClick={handleSaveParams}
                disabled={!hasUnsavedChanges}
              >
                Save Parameters
              </button>
            </>
          )}
          
          <button 
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      {/* Study Guide Modal */}
      <StudyGuideModal
        isOpen={showStudyGuideModal}
        onClose={() => setShowStudyGuideModal(false)}
        flashcards={flashcards}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default SettingsModal;