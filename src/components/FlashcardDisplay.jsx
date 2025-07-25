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

  // State for card info visibility
  const [showCardInfo, setShowCardInfo] = useState(false);


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
      {/* Card Info Header - Must be first for absolute positioning */}
      <div className="card-info-header">
        {/* Card Action Buttons - Top Left */}
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


      {/* Card Counter */}
      <div className="card-counter">
        Card {currentIndex + 1} of {totalCards}
      </div>

      {/* Main Content Area - Clickable */}
      <div 
        className="flashcard-content"
        onClick={() => {
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
            onClick={() => {
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
            onClick={() => {
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
              
              {/* Additional Info Dropdown - Inside content white box */}
              {card.additional_info && (
                <div className="additional-info-wrapper">
                  <details 
                    className="additional-info-dropdown"
                    onClick={(e) => e.stopPropagation()} // Prevent card flip when clicking dropdown
                  >
                    <summary className="additional-info-header">
                      <span className="dropdown-icon">▶</span>
                      Additional Information
                    </summary>
                    <div className="additional-info-content">
                      <div 
                        className="additional-info-inner"
                        dangerouslySetInnerHTML={{ __html: card.additional_info }}
                      />
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
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


        {/* Keyboard Shortcuts Hint */}
        <div className="keyboard-hints">
          <small>
            Click card or press <kbd>Space</kbd>/<kbd>Enter</kbd> to flip • <kbd>←</kbd>/<kbd>→</kbd> navigate • <kbd>E</kbd> edit card • <kbd>G</kbd> generate questions
            {showAnswer && onReviewCard && (
              <> • <kbd>1</kbd>-<kbd>4</kbd> review</>
            )}
          </small>
        </div>
      </div>

      {/* Card Info Button - Bottom Right */}
      <div className="card-info-container">
        <button 
          className="card-info-button"
          onClick={() => setShowCardInfo(!showCardInfo)}
          title="Card Information"
        >
          ℹ️ Card Info
        </button>
        
        {showCardInfo && (
          <div className="card-info-dropdown">
            {card.createdAt && (
              <div className="card-info-item">
                <strong>Created:</strong> {new Date(card.createdAt.toDate ? card.createdAt.toDate() : card.createdAt).toLocaleDateString()}
              </div>
            )}
            {card.dueDate && (
              <div className="card-info-item">
                <strong>Due:</strong> {new Date(card.dueDate.toDate ? card.dueDate.toDate() : card.dueDate).toLocaleDateString()}
              </div>
            )}
            {card.lastReviewed && (
              <div className="card-info-item">
                <strong>Last reviewed:</strong> {new Date(card.lastReviewed.toDate ? card.lastReviewed.toDate() : card.lastReviewed).toLocaleDateString()}
              </div>
            )}
            {card.reviewCount !== undefined && (
              <div className="card-info-item">
                <strong>Reviews:</strong> {card.reviewCount}
              </div>
            )}
            {card.difficulty !== undefined && (
              <div className="card-info-item">
                <strong>Difficulty:</strong> {card.difficulty.toFixed(1)}
              </div>
            )}
            {card.interval !== undefined && (
              <div className="card-info-item">
                <strong>Interval:</strong> {card.interval} day{card.interval !== 1 ? 's' : ''}
              </div>
            )}
            {card.easeFactor !== undefined && (
              <div className="card-info-item">
                <strong>Ease Factor:</strong> {card.easeFactor.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardDisplay;