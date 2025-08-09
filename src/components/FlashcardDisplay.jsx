import React from 'react';

/**
 * Component for displaying flashcard content
 * @param {Object} props - Component props
 * @param {Object} props.card - Current flashcard object
 * @param {boolean} props.showAnswer - Whether to show the answer
 * @param {Function} props.onShowAnswer - Callback to show answer
 * @param {Function} props.onToggleAnswer - Callback to toggle answer visibility
 * @param {Function} props.onPreviousCard - Callback for previous card navigation
 * @param {Function} props.onNextCard - Callback for next card navigation
 * @param {Function} props.onReviewCard - Callback for card review (again, hard, good, easy)
 * @param {number} props.currentIndex - Current card index
 * @param {number} props.totalCards - Total number of cards
 * @param {boolean} props.isDarkMode - Dark mode state
 * @param {Function} props.onUpdateCardNotes - Callback to update card notes
 * @param {Function} props.onToggleStarCard - Callback to toggle star status
 * @param {Function} props.onEditCard - Callback to edit the current card
 * @param {Function} props.onGenerateQuestions - Callback to generate questions based on current card
 * @param {Function} props.onFocusMode - Callback to switch to focus mode (only in maximized view)
 * @param {JSX.Element} props.windowControlButtons - Window control buttons to render next to star
 * @returns {JSX.Element} Flashcard display component
 */
const FlashcardDisplay = ({
  card,
  showAnswer,
  onShowAnswer,
  onToggleAnswer,
  onPreviousCard,
  onNextCard,
  onReviewCard,
  currentIndex,
  totalCards,
  isDarkMode,
  onUpdateCardNotes,
  onToggleStarCard,
  onEditCard,
  onGenerateQuestions,
  onExplain,
  onFocusMode,
  windowControlButtons
}) => {
  // Helper function to infer level from FSRS parameters
  const inferLevelFromFSRS = (card) => {
    if (card.level) return card.level;
    
    const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
    
    if (difficulty >= 8) return 'again';
    if (difficulty >= 7) return 'hard';
    if (difficulty <= 3 && easeFactor >= 2.8) return 'easy';
    if (interval >= 4) return 'good';
    return 'new';
  };

  // Helper function to safely convert dates
  const formatDate = (dateValue) => {
    if (!dateValue) return null;
    
    try {
      let date;
      
      // Handle Firestore timestamp
      if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      }
      // Handle Firestore timestamp with seconds property
      else if (dateValue && typeof dateValue.seconds === 'number') {
        date = new Date(dateValue.seconds * 1000);
      }
      // Handle regular Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle timestamp number
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      // Handle date string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      else {
        return null;
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting date:', error, dateValue);
      return null;
    }
  };

  // Removed showCardInfo state since card info panel was removed


  if (!card) {
    // Trigger automatic navigation to next available content
    // This will be handled by the parent component's auto-advance logic
    return null;
  }

  // Keyboard handling is done at the App level to avoid conflicts
  // This component only needs to display the UI

  return (
    <div 
      className={`flashcard-container ${isDarkMode ? 'dark' : ''}`}
    >
      {/* Card Info Dropdown - Top Left Position */}
      <div className="card-info-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <details 
            className="info-dropdown no-arrow"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <summary 
              className="info-header icon-only"
              onClick={(e) => {
                e.stopPropagation();
              }}
              title="Card Info"
            >
              📊
            </summary>
            <div className="info-content">
              <div className="info-item">
                <strong>Card ID:</strong> {card?.id || 'N/A'}
              </div>
              <div className="info-item">
                <strong>Reviews:</strong> {card?.reviewCount || 0}
              </div>
              <div className="info-item">
                <strong>Last Review:</strong> {formatDate(card?.lastReviewed) || 'Never'}
              </div>
              <div className="info-item">
                <strong>Due Date:</strong> {formatDate(card?.dueDate) || 'Not set'}
              </div>
              <div className="info-item">
                <strong>Difficulty:</strong> {card?.difficulty ? card.difficulty.toFixed(2) : 'N/A'}
              </div>
              <div className="info-item">
                <strong>Interval:</strong> {card?.interval || 0} days
              </div>
            </div>
          </details>
          
          {/* Explain Button - Next to Card Info */}
          {onExplain && (
            <button
              className="explain-btn-card explain-button"
              onClick={(e) => {
                e.stopPropagation();
                onExplain();
              }}
              aria-label="Generate explanation"
              title="Generate AI explanation about this question"
            >
              💡 Explain
            </button>
          )}
        </div>
        
        {/* Right side container for all right-aligned elements */}
        <div style={{ 
          position: 'absolute', 
          top: '0px', 
          right: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          zIndex: 20
        }}>
          {/* Category, Subcategory, Level, and Star */}
          <div className="card-tags">

            {card.category && (
              <div className="category-badge">
                {card.category}
              </div>
            )}
            {card.sub_category && (
              <span className="subcategory-tag">
                📂 {card.sub_category}
              </span>
            )}
            <span className="level-tag" data-level={inferLevelFromFSRS(card)}>
              📊 {inferLevelFromFSRS(card).charAt(0).toUpperCase() + inferLevelFromFSRS(card).slice(1)}
            </span>
            {/* Star Toggle Button - Next to Level */}
            {onToggleStarCard && (
              <button
                className={`star-toggle-btn-inline ${card.starred ? 'starred' : ''}`}
                onClick={() => onToggleStarCard(card.id)}
                aria-label={card.starred ? "Remove star" : "Add star"}
                title={card.starred ? "Remove star" : "Mark as important"}
                style={{ marginRight: onFocusMode ? '0.5rem' : 0 }}
              >
                {card.starred ? '★' : '☆'}
              </button>
            )}
            {/* Focus Mode Button - Immediately after Star Button */}
            {onFocusMode && (
              <button
                className="focus-mode-btn-inline"
                onClick={onFocusMode}
                aria-label="Go to focus mode"
                title="Exit fullscreen and go to focus mode"
                style={{ marginRight: '0.5rem' }}
              >
                🎯
              </button>
            )}
          </div>

          {/* Window Control Buttons - After Focus Button */}
          {windowControlButtons && (
            <div className="window-control-buttons">
              {windowControlButtons}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Clickable */}
      <div 
        className="flashcard-content"
        onClick={(e) => {
          // Check if the click target is a dropdown element or inside a dropdown
          const target = e.target;
          const isDropdownClick = target.closest('details') || 
                                  target.closest('summary') || 
                                  target.closest('.info-dropdown') ||
                                  target.closest('.card-info-dropdown') ||
                                  target.closest('.answer-dropdown-toggle') ||
                                  target.closest('.answer-dropdown-content') ||
                                  target.closest('button') ||
                                  target.closest('select') ||
                                  target.closest('.dropdown');
          
          // Don't flip card if clicking on dropdown elements
          if (isDropdownClick) {
            return;
          }
          
          if (onToggleAnswer) {
            onToggleAnswer();
          } else if (!showAnswer && onShowAnswer) {
            onShowAnswer();
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* Question Section - Only show when answer is not shown */}
        {!showAnswer && (
          <div 
            className="flashcard-section question-section"
            onClick={(e) => {
              // Check if the click target is a dropdown element or inside a dropdown
              const target = e.target;
              const isDropdownClick = target.closest('details') || 
                                      target.closest('summary') || 
                                      target.closest('.info-dropdown') ||
                                      target.closest('.card-info-dropdown') ||
                                      target.closest('.answer-dropdown-toggle') ||
                                      target.closest('.answer-dropdown-content') ||
                                      target.closest('button') ||
                                      target.closest('select') ||
                                      target.closest('.dropdown');
              
              // Don't flip card if clicking on dropdown elements
              if (isDropdownClick) {
                return;
              }
              
              if (onToggleAnswer) {
                onToggleAnswer();
              } else if (!showAnswer && onShowAnswer) {
                onShowAnswer();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <h3 className="section-label">Question</h3>
            <div 
              className="content"
              dangerouslySetInnerHTML={{ __html: card.question || 'No question provided' }}
            />
          </div>
        )}

        {/* Answer Section - Show when answer is shown */}
        {showAnswer && (
          <div 
            className="flashcard-section answer-section"
            onClick={(e) => {
              const target = e.target;
              const isDropdownClick = target.closest('details') || 
                                      target.closest('summary') || 
                                      target.closest('.info-dropdown') ||
                                      target.closest('.card-info-dropdown') ||
                                      target.closest('.answer-dropdown-toggle') ||
                                      target.closest('.answer-dropdown-content') ||
                                      target.closest('button') ||
                                      target.closest('select') ||
                                      target.closest('.dropdown');
              if (isDropdownClick) {
                return;
              }
              if (onToggleAnswer) {
                onToggleAnswer();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <h3 className="section-label">Answer</h3>
            <div className="content">
              <div 
                className="answer-text"
                dangerouslySetInnerHTML={{ __html: card.answer || 'No answer provided' }}
              />
            </div>
          </div>
        )}
      </div>


      {/* Bottom Controls Section */}
      <div className="flashcard-bottom">
        {/* Keyboard Shortcuts - Moved above navigation */}
        <div className="keyboard-shortcuts">
          <div className="shortcuts-hint">
            <small>
              ⌨️ <strong>Shortcuts:</strong> 
              <kbd>Space</kbd> Show Answer     •     
              <kbd>←/→</kbd> Navigate     •     
              <kbd>1-4</kbd> Rate     •     
              <kbd>E</kbd> Edit     •     
              <kbd>M</kbd> Manage
            </small>
          </div>
        </div>

        {/* Navigation Controls - Arranged horizontally */}
        <div className="navigation-controls">
          {/* Previous Button - Left */}
          <button 
            className="nav-btn prev-btn arrow-btn"
            onClick={onPreviousCard}
            disabled={totalCards <= 1}
            aria-label="Previous card"
          >
            ‹
          </button>
          
          {/* Edit Card Button - Second */}
          {onEditCard && (
            <button
              className="edit-card-btn"
              onClick={() => onEditCard(card)}
              aria-label="Edit card"
              title="Edit this card"
            >
              ✏️ Edit Card
            </button>
          )}
          
          {/* Show/Hide Answer Button - Center */}
          {onToggleAnswer ? (
            <button 
              className="show-answer-btn toggle-answer-btn"
              onClick={onToggleAnswer}
              aria-label={showAnswer ? "Hide answer" : "Show answer"}
            >
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </button>
          ) : (
            !showAnswer && (
              <button 
                className="show-answer-btn"
                onClick={onShowAnswer}
                aria-label="Show answer"
              >
                Show Answer
              </button>
            )
          )}
          
          {/* Similar Questions Button */}
          {onGenerateQuestions && (
            <button
              className="generate-questions-btn generate-button"
              onClick={onGenerateQuestions}
              aria-label="Generate similar questions"
              title="Generate similar questions based on this card"
            >
              🤖 Similar Questions
            </button>
          )}
          
          {/* Next Button - Right */}
          <button 
            className="nav-btn next-btn arrow-btn"
            onClick={onNextCard}
            disabled={totalCards <= 1}
            aria-label="Next card"
          >
            ›
          </button>
        </div>


      </div>
    </div>
  );
};

export default FlashcardDisplay;