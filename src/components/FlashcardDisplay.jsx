import React, { useState } from 'react';

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
  onGenerateQuestions
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

  // Removed showCardInfo state since card info panel was removed


  if (!card) {
    return (
      <div className={`flashcard-container ${isDarkMode ? 'dark' : ''}`}>
        <div className="no-cards-message">
          <h3>No flashcards available</h3>
          <p>Create some flashcards or adjust your filters to see cards here.</p>
        </div>
      </div>
    );
  }

  // Keyboard handling is done at the App level to avoid conflicts
  // This component only needs to display the UI

  return (
    <div 
      className={`flashcard-container ${isDarkMode ? 'dark' : ''}`}
    >
      {/* Removed card info header - moved to after answer section */}


      {/* Removed card counter to simplify layout */}

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

      {/* Card Info Section - Above footer */}
      <div className="card-info-section">
        {/* Card Action Buttons */}
        <div className="card-action-buttons">
          {/* Edit Card Button */}
          {onEditCard && (
            <button 
              className="card-action-btn edit-btn"
              onClick={() => onEditCard(card)}
              aria-label="Edit card"
              title="Edit this card"
            >
              ✏️ Edit
            </button>
          )}
          
          {/* Generate Questions Button */}
          {onGenerateQuestions && (
            <button 
              className="card-action-btn generate-btn"
              onClick={() => onGenerateQuestions()}
              aria-label="Generate questions"
              title="Generate related questions"
            >
              🤖 Generate
            </button>
          )}
        </div>
        
        {/* Category, Subcategory, Level, and Star - Horizontally Aligned */}
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
            >
              {card.starred ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls Section */}
      <div className="flashcard-bottom">
        {/* Navigation Controls - Arranged horizontally */}
        <div className="navigation-controls">
          <button 
            className="nav-btn prev-btn"
            onClick={onPreviousCard}
            disabled={totalCards <= 1}
            aria-label="Previous card"
          >
            ← Previous
          </button>
          
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
          
          <button 
            className="nav-btn next-btn"
            onClick={onNextCard}
            disabled={totalCards <= 1}
            aria-label="Next card"
          >
            Next →
          </button>
        </div>


        {/* Keyboard Shortcuts */}
        <div className="keyboard-shortcuts">
          <div className="shortcuts-hint">
            <small>
              💡 <strong>Keyboard Shortcuts:</strong> 
              <kbd>Space</kbd> Show Answer | 
              <kbd>←/→</kbd> Navigate | 
              <kbd>1-4</kbd> Rate Card | 
              <kbd>Enter</kbd> Next Card
            </small>
          </div>
        </div>

        {/* Card Info Dropdown - Moved to footer */}
        <div className="card-info-dropdown">
          <details 
            className="info-dropdown"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <summary 
              className="info-header"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              📊 Card Info
            </summary>
            <div className="info-content">
              <div className="info-item">
                <strong>Card ID:</strong> {card?.id || 'N/A'}
              </div>
              <div className="info-item">
                <strong>Reviews:</strong> {card?.reviewCount || 0}
              </div>
              <div className="info-item">
                <strong>Last Review:</strong> {card?.lastReviewed ? new Date(card.lastReviewed.seconds * 1000).toLocaleDateString() : 'Never'}
              </div>
              <div className="info-item">
                <strong>Due Date:</strong> {card?.dueDate ? new Date(card.dueDate.seconds * 1000).toLocaleDateString() : 'Not set'}
              </div>
              <div className="info-item">
                <strong>Difficulty:</strong> {card?.difficulty ? card.difficulty.toFixed(2) : 'N/A'}
              </div>
              <div className="info-item">
                <strong>Interval:</strong> {card?.interval || 0} days
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default FlashcardDisplay;