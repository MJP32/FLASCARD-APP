import React, { useState, useEffect } from 'react';

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

  const handleParamChange = (param, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setLocalFsrsParams(prev => ({
      ...prev,
      [param]: numValue
    }));
    setHasUnsavedChanges(true);
  };

  const handleArrayParamChange = (param, index, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setLocalFsrsParams(prev => ({
      ...prev,
      [param]: prev[param].map((item, i) => i === index ? numValue : item)
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = () => {
    onUpdateFsrsParams(localFsrsParams);
    setHasUnsavedChanges(false);
  };

  const handleSaveApiKeys = () => {
    if (onApiKeysUpdate) {
      onApiKeysUpdate(localApiKeys, localSelectedProvider);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackStatus({ type: 'error', message: 'Please enter your feedback before sending.' });
      return;
    }

    setFeedbackSending(true);
    setFeedbackStatus(null);

    try {
      // Create email subject and body
      const subject = encodeURIComponent('FSRS Flashcards - User Feedback');
      const body = encodeURIComponent(
        `User Feedback\n\n` +
        `From: ${userDisplayName || 'Anonymous User'}\n` +
        `Date: ${new Date().toLocaleString()}\n` +
        `Total Cards: ${flashcards.length}\n\n` +
        `Feedback:\n${feedbackText}\n\n` +
        `---\n` +
        `Sent from FSRS Flashcards App`
      );

      // Create mailto link
      const mailtoLink = `mailto:admin@fsrslearn.com?subject=${subject}&body=${body}`;
      
      // Open email client
      window.location.href = mailtoLink;
      
      // Clear feedback and show success
      setFeedbackText('');
      setFeedbackStatus({ 
        type: 'success', 
        message: 'Email client opened! Please send the email to complete your feedback submission.' 
      });
    } catch (error) {
      console.error('Feedback error:', error);
      setFeedbackStatus({ 
        type: 'error', 
        message: 'Failed to open email client. Please try again.' 
      });
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleResetToDefaults = () => {
    const defaultParams = {
      requestRetention: 0.9,
      maximumInterval: 36500,
      w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
      initialDifficulty: 5,
      fuzzFactor: 0.05,
      easyFactor: 1.3,
      goodFactor: 1.0,
      hardFactor: 0.8,
      againFactor: 0.5,
      initialStability: 2,
      initialAgainInterval: 1,
      initialHardInterval: 1,
      initialGoodInterval: 4,
      initialEasyInterval: 15
    };
    setLocalFsrsParams(defaultParams);
    setHasUnsavedChanges(true);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setLocalFsrsParams(fsrsParams);
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className="modal-content settings-modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button 
            className="close-btn"
            onClick={handleClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="settings-content">
          {/* User Section */}
          <section className="settings-section">
            <h3>User Settings</h3>
            <div className="setting-item">
              <span className="setting-label">Logged in as:</span>
              <span className="setting-value">{userDisplayName}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Total flashcards:</span>
              <span className="setting-value">{flashcards.length} cards</span>
            </div>
            <button className="btn btn-secondary" onClick={onSignOut}>
              Sign Out
            </button>
          </section>

          {/* Appearance Section */}
          <section className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={onToggleDarkMode}
                />
                Dark Mode
              </label>
            </div>
          </section>

          {/* Study Settings Section */}
          <section className="settings-section">
            <h3>Study Settings</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={showIntervalSettings}
                  onChange={onToggleIntervalSettings}
                />
                Show Advanced FSRS Settings
              </label>
            </div>
          </section>

          {/* File Format Section */}
          <section className="settings-section">
            <h3>File Format</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={showFileFormat}
                  onChange={(e) => setShowFileFormat(e.target.checked)}
                />
                Show Import File Format Guide
              </label>
            </div>
          </section>

          {/* API Keys Section */}
          <section className="settings-section">
            <h3>API Keys</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={showApiKeys}
                  onChange={(e) => setShowApiKeys(e.target.checked)}
                />
                Configure AI Provider API Keys
              </label>
            </div>
          </section>

          {/* File Format Guide - Conditionally Rendered */}
          {showFileFormat && (
            <section className="settings-section">
              <h3>Import File Format Guide</h3>
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
                  <h4>Example CSV:</h4>
                  <pre className="code-block">
{`question,answer,category,sub_category,level,additional_info
"What is 2+2?","4","Math","Arithmetic","new","Basic addition"
"Capital of France?","Paris","Geography","Europe","easy","Located in Western Europe"
"Conjugate 'ser' in present","soy, eres, es...","Spanish","Verbs","hard","Irregular verb"
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
            </section>
          )}

          {/* API Keys Configuration - Conditionally Rendered */}
          {showApiKeys && (
            <section className="settings-section">
              <h3>AI Provider Configuration</h3>
              <div className="api-keys-info">
                <p className="section-description">
                  Configure API keys for AI providers to enable advanced flashcard features like auto-generation and content enhancement.
                </p>
                
                {/* Provider Selection */}
                <div className="provider-selection">
                  <h4>Active Provider</h4>
                  <select
                    value={localSelectedProvider}
                    onChange={(e) => setLocalSelectedProvider(e.target.value)}
                    className="provider-select"
                  >
                    <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Google (Gemini)</option>
                  </select>
                </div>

                {/* API Key Inputs */}
                <div className="api-keys-grid">
                  <div className="api-key-item">
                    <label htmlFor="openai-key">
                      <span className="provider-icon">🤖</span>
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      id="openai-key"
                      value={localApiKeys.openai}
                      onChange={(e) => setLocalApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                      placeholder="sk-..."
                      className="api-key-input"
                    />
                    <small className="api-key-hint">Get your key from platform.openai.com</small>
                  </div>

                  <div className="api-key-item">
                    <label htmlFor="anthropic-key">
                      <span className="provider-icon">🧠</span>
                      Anthropic API Key
                    </label>
                    <input
                      type="password"
                      id="anthropic-key"
                      value={localApiKeys.anthropic}
                      onChange={(e) => setLocalApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                      placeholder="sk-ant-..."
                      className="api-key-input"
                    />
                    <small className="api-key-hint">Get your key from console.anthropic.com</small>
                  </div>

                  <div className="api-key-item">
                    <label htmlFor="gemini-key">
                      <span className="provider-icon">💎</span>
                      Google Gemini API Key
                    </label>
                    <input
                      type="password"
                      id="gemini-key"
                      value={localApiKeys.gemini}
                      onChange={(e) => setLocalApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                      placeholder="AIza..."
                      className="api-key-input"
                    />
                    <small className="api-key-hint">Get your key from aistudio.google.com</small>
                  </div>
                </div>

                <div className="api-keys-notes">
                  <h4>Important Notes</h4>
                  <ul>
                    <li>• API keys are stored locally in your browser</li>
                    <li>• Keys are never sent to our servers</li>
                    <li>• You are responsible for your API usage and costs</li>
                    <li>• Different providers have different capabilities and pricing</li>
                    <li>• Keys are required for AI-powered features only</li>
                  </ul>
                </div>

                <div className="api-keys-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleSaveApiKeys}
                  >
                    Save API Keys
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* User Feedback Section */}
          <section className="settings-section">
            <h3>User Feedback</h3>
            <div className="feedback-section">
              <p className="section-description">
                We value your feedback! Share your thoughts, suggestions, or report issues to help us improve FSRS Flashcards.
              </p>
              
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
          </section>

          {/* FSRS Parameters Section */}
          {showIntervalSettings && (
            <section className="settings-section fsrs-section">
              <div className="section-header-with-button">
                <h3>FSRS Algorithm Parameters</h3>
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
                  <h4>Understanding FSRS (Free Spaced Repetition Scheduler)</h4>
                  
                  <div className="explanation-section">
                    <h5>What is FSRS?</h5>
                    <p>
                      FSRS is a modern spaced repetition algorithm based on scientific research in memory and forgetting curves. 
                      It optimizes review intervals to maximize long-term retention while minimizing study time.
                    </p>
                  </div>

                  <div className="explanation-section">
                    <h5>How Intervals Are Calculated</h5>
                    <p>The algorithm considers multiple factors to determine when you should review a card next:</p>
                    
                    <div className="formula-box">
                      <strong>Key Factors:</strong>
                      <ul>
                        <li><strong>Difficulty (D)</strong>: How hard the card is for you (1-10 scale)</li>
                        <li><strong>Stability (S)</strong>: How long you can remember the card</li>
                        <li><strong>Retrievability (R)</strong>: Probability of successful recall</li>
                        <li><strong>Rating</strong>: Your performance (Again/Hard/Good/Easy)</li>
                      </ul>
                    </div>

                    <div className="interval-examples">
                      <h6>Typical Interval Progression:</h6>
                      <table className="interval-table">
                        <thead>
                          <tr>
                            <th>Review #</th>
                            <th>Again (1)</th>
                            <th>Hard (2)</th>
                            <th>Good (3)</th>
                            <th>Easy (4)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>1st</td>
                            <td>&lt;1 day</td>
                            <td>&lt;1 day</td>
                            <td>4 days</td>
                            <td>15 days</td>
                          </tr>
                          <tr>
                            <td>2nd</td>
                            <td>&lt;1 day</td>
                            <td>~3 days</td>
                            <td>~10 days</td>
                            <td>~39 days</td>
                          </tr>
                          <tr>
                            <td>3rd</td>
                            <td>&lt;1 day</td>
                            <td>~5 days</td>
                            <td>~25 days</td>
                            <td>~101 days</td>
                          </tr>
                          <tr>
                            <td>4th</td>
                            <td>&lt;1 day</td>
                            <td>~8 days</td>
                            <td>~63 days</td>
                            <td>~262 days</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="explanation-section">
                    <h5>The FSRS Formula</h5>
                    <div className="formula-box">
                      <p><strong>Stability Update:</strong></p>
                      <code>S' = S × (1 + e^w[8] × (11-D) × S^w[9] × (e^(R×w[10]) - 1))</code>
                      
                      <p><strong>Interval Calculation:</strong></p>
                      <code>I = S × ln(requestRetention) / ln(0.9)</code>
                      
                      <p><strong>Where:</strong></p>
                      <ul>
                        <li>S' = New stability</li>
                        <li>S = Current stability</li>
                        <li>D = Difficulty</li>
                        <li>R = Retrievability</li>
                        <li>I = Interval in days</li>
                        <li>w[] = Weight parameters</li>
                      </ul>
                    </div>
                  </div>

                  <div className="explanation-section">
                    <h5>Rating Impact</h5>
                    <div className="rating-impact">
                      <div className="rating-box again">
                        <h6>😵 Again</h6>
                        <ul>
                          <li>Resets progress</li>
                          <li>Interval → 1 minute</li>
                          <li>Difficulty increases</li>
                          <li>Stability decreases significantly</li>
                        </ul>
                      </div>
                      
                      <div className="rating-box hard">
                        <h6>😓 Hard</h6>
                        <ul>
                          <li>Slows progression</li>
                          <li>Interval × 0.8</li>
                          <li>Difficulty slightly increases</li>
                          <li>Stability slightly decreases</li>
                        </ul>
                      </div>
                      
                      <div className="rating-box good">
                        <h6>😊 Good</h6>
                        <ul>
                          <li>Normal progression</li>
                          <li>Interval × ease factor</li>
                          <li>Difficulty decreases</li>
                          <li>Stability increases</li>
                        </ul>
                      </div>
                      
                      <div className="rating-box easy">
                        <h6>😎 Easy</h6>
                        <ul>
                          <li>Accelerated progression</li>
                          <li>Interval × ease × 1.3</li>
                          <li>Difficulty decreases more</li>
                          <li>Stability increases more</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="explanation-section">
                    <h5>Key Parameters Explained</h5>
                    <dl className="parameter-list">
                      <dt>Request Retention (0.7-0.99)</dt>
                      <dd>Target probability of remembering a card. Higher = shorter intervals, better retention.</dd>
                      
                      <dt>Maximum Interval</dt>
                      <dd>Longest time between reviews (in days). Default: 36,500 days (100 years).</dd>
                      
                      <dt>Initial Difficulty</dt>
                      <dd>Starting difficulty for new cards (1-10). Higher = harder card, shorter intervals.</dd>
                      
                      <dt>Initial Stability</dt>
                      <dd>How many days until 90% retrievability for a new card.</dd>
                      
                      <dt>Again/Hard/Good/Easy Factors</dt>
                      <dd>Multipliers applied to intervals based on your rating.</dd>
                      
                      <dt>W Parameters</dt>
                      <dd>17 weights that fine-tune the algorithm based on millions of reviews.</dd>
                    </dl>
                  </div>

                  <div className="explanation-section tips">
                    <h5>💡 Tips for Optimal Learning</h5>
                    <ul>
                      <li>Be honest with ratings - the algorithm adapts to your performance</li>
                      <li>Review cards daily to maintain the schedule</li>
                      <li>Use "Hard" instead of "Again" when you remember with effort</li>
                      <li>Default parameters are optimized for most learners</li>
                      <li>Lower retention target (0.85-0.90) for easier material</li>
                      <li>Higher retention target (0.95+) for critical information</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Basic Parameters */}
              <div className="param-group">
                <h4>Basic Parameters</h4>
                
                <div className="param-item">
                  <label>Request Retention (0.7-0.99)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.7"
                    max="0.99"
                    value={localFsrsParams.requestRetention}
                    onChange={(e) => handleParamChange('requestRetention', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Maximum Interval (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="36500"
                    value={localFsrsParams.maximumInterval}
                    onChange={(e) => handleParamChange('maximumInterval', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Initial Difficulty (1-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={localFsrsParams.initialDifficulty}
                    onChange={(e) => handleParamChange('initialDifficulty', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Initial Stability (days)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={localFsrsParams.initialStability}
                    onChange={(e) => handleParamChange('initialStability', e.target.value)}
                  />
                </div>
              </div>

              {/* Initial Intervals */}
              <div className="param-group">
                <h4>Initial Review Intervals</h4>
                
                <div className="param-item">
                  <label>Again Interval (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={localFsrsParams.initialAgainInterval}
                    onChange={(e) => handleParamChange('initialAgainInterval', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Hard Interval (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={localFsrsParams.initialHardInterval}
                    onChange={(e) => handleParamChange('initialHardInterval', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Good Interval (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={localFsrsParams.initialGoodInterval}
                    onChange={(e) => handleParamChange('initialGoodInterval', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Easy Interval (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={localFsrsParams.initialEasyInterval}
                    onChange={(e) => handleParamChange('initialEasyInterval', e.target.value)}
                  />
                </div>
              </div>

              {/* Response Factors */}
              <div className="param-group">
                <h4>Response Factors</h4>
                
                <div className="param-item">
                  <label>Again Factor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="1"
                    value={localFsrsParams.againFactor}
                    onChange={(e) => handleParamChange('againFactor', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Hard Factor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="1.2"
                    value={localFsrsParams.hardFactor}
                    onChange={(e) => handleParamChange('hardFactor', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Good Factor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.8"
                    max="1.5"
                    value={localFsrsParams.goodFactor}
                    onChange={(e) => handleParamChange('goodFactor', e.target.value)}
                  />
                </div>

                <div className="param-item">
                  <label>Easy Factor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="2"
                    value={localFsrsParams.easyFactor}
                    onChange={(e) => handleParamChange('easyFactor', e.target.value)}
                  />
                </div>
              </div>

              {/* Advanced Parameters */}
              <div className="param-group">
                <h4>Advanced Parameters</h4>
                
                <div className="param-item">
                  <label>Fuzz Factor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.2"
                    value={localFsrsParams.fuzzFactor}
                    onChange={(e) => handleParamChange('fuzzFactor', e.target.value)}
                  />
                </div>

                <div className="param-item w-params">
                  <label>W Parameters (17 values)</label>
                  <div className="w-param-grid">
                    {localFsrsParams.w.map((value, index) => (
                      <div key={index} className="w-param-input">
                        <label>W[{index}]</label>
                        <input
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={(e) => handleArrayParamChange('w', index, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          {showIntervalSettings && (
            <>
              <button 
                className="btn btn-warning"
                onClick={handleResetToDefaults}
              >
                Reset to Defaults
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveSettings}
                disabled={!hasUnsavedChanges}
              >
                Save Settings
              </button>
            </>
          )}
          <button 
            className="btn btn-secondary"
            onClick={handleClose}
          >
            Close
          </button>
        </div>

        {hasUnsavedChanges && (
          <div className="unsaved-changes-warning">
            You have unsaved changes to FSRS parameters.
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;