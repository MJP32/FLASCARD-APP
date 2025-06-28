import React from 'react';

/**
 * Component for displaying flashcard content
 * @param {Object} props - Component props
 * @param {Object} props.card - Current flashcard object
 * @param {boolean} props.showAnswer - Whether to show the answer
 * @param {Function} props.onShowAnswer - Callback to show answer
 * @param {Function} props.onPreviousCard - Callback for previous card navigation
 * @param {Function} props.onNextCard - Callback for next card navigation
 * @param {Function} props.onReviewCard - Callback for card review (again, hard, good, easy)
 * @param {number} props.currentIndex - Current card index
 * @param {number} props.totalCards - Total number of cards
 * @param {boolean} props.isDarkMode - Dark mode state
 * @returns {JSX.Element} Flashcard display component
 */
const FlashcardDisplay = ({
  card,
  showAnswer,
  onShowAnswer,
  onPreviousCard,
  onNextCard,
  onReviewCard,
  currentIndex,
  totalCards,
  isDarkMode
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

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!showAnswer) {
        onShowAnswer();
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onPreviousCard();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onNextCard();
    } else if (showAnswer && onReviewCard) {
      // Review shortcuts only work when answer is shown
      switch (event.key) {
        case '1':
          event.preventDefault();
          onReviewCard('again');
          break;
        case '2':
          event.preventDefault();
          onReviewCard('hard');
          break;
        case '3':
          event.preventDefault();
          onReviewCard('good');
          break;
        case '4':
          event.preventDefault();
          onReviewCard('easy');
          break;
        default:
          break;
      }
    }
  };

  return (
    <div 
      className={`flashcard-container ${isDarkMode ? 'dark' : ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Card Counter */}
      <div className="card-counter">
        Card {currentIndex + 1} of {totalCards}
      </div>

      {/* Card Info Header */}
      <div className="card-info-header">
        {/* Category Badge */}
        {card.category && (
          <div className="category-badge">
            {card.category}
          </div>
        )}
        
        {/* Subcategory and Level Info */}
        <div className="card-tags">
          {card.sub_category && (
            <span className="subcategory-tag">
              📂 {card.sub_category}
            </span>
          )}
          <span className="level-tag" data-level={inferLevelFromFSRS(card)}>
            📊 {inferLevelFromFSRS(card).charAt(0).toUpperCase() + inferLevelFromFSRS(card).slice(1)}
          </span>
        </div>
      </div>

      {/* Question Section */}
      <div className="flashcard-section question-section">
        <h3 className="section-label">Question</h3>
        <div 
          className="content"
          dangerouslySetInnerHTML={{ __html: card.question || 'No question provided' }}
        />
      </div>

      {/* Show Answer Button */}
      {!showAnswer && (
        <button 
          className="show-answer-btn"
          onClick={onShowAnswer}
          aria-label="Show answer"
        >
          Show Answer
        </button>
      )}

      {/* Answer Section */}
      {showAnswer && (
        <>
          <div className="flashcard-section answer-section">
            <h3 className="section-label">Answer</h3>
            <div 
              className="content"
              dangerouslySetInnerHTML={{ __html: card.answer || 'No answer provided' }}
            />
          </div>

          {/* Additional Info Section */}
          {card.additional_info && (
            <div className="flashcard-section additional-info-section">
              <h3 className="section-label">Additional Information</h3>
              <div 
                className="content"
                dangerouslySetInnerHTML={{ __html: card.additional_info }}
              />
            </div>
          )}

          {/* Review Buttons */}
          {onReviewCard && (
            <div className="review-buttons">
              <h3 className="section-label">How well did you know this?</h3>
              <div className="review-button-group">
                <button 
                  className="review-btn again-btn"
                  onClick={() => onReviewCard('again')}
                  title="Completely forgot (1)"
                >
                  <span className="btn-emoji">😵</span>
                  <span className="btn-text">Again</span>
                  <span className="btn-shortcut">1</span>
                </button>
                
                <button 
                  className="review-btn hard-btn"
                  onClick={() => onReviewCard('hard')}
                  title="Hard to remember (2)"
                >
                  <span className="btn-emoji">😓</span>
                  <span className="btn-text">Hard</span>
                  <span className="btn-shortcut">2</span>
                </button>
                
                <button 
                  className="review-btn good-btn"
                  onClick={() => onReviewCard('good')}
                  title="Remembered with effort (3)"
                >
                  <span className="btn-emoji">😊</span>
                  <span className="btn-text">Good</span>
                  <span className="btn-shortcut">3</span>
                </button>
                
                <button 
                  className="review-btn easy-btn"
                  onClick={() => onReviewCard('easy')}
                  title="Easy to remember (4)"
                >
                  <span className="btn-emoji">😎</span>
                  <span className="btn-text">Easy</span>
                  <span className="btn-shortcut">4</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigation Controls */}
      <div className="navigation-controls">
        <button 
          className="nav-btn prev-btn"
          onClick={onPreviousCard}
          disabled={totalCards <= 1}
          aria-label="Previous card"
        >
          ← Previous
        </button>
        
        <button 
          className="nav-btn next-btn"
          onClick={onNextCard}
          disabled={totalCards <= 1}
          aria-label="Next card"
        >
          Next →
        </button>
      </div>

      {/* Card Metadata */}
      <div className="card-metadata">
        {card.dueDate && (
          <div className="due-date">
            Due: {new Date(card.dueDate).toLocaleDateString()}
          </div>
        )}
        {card.lastReviewed && (
          <div className="last-reviewed">
            Last reviewed: {new Date(card.lastReviewed).toLocaleDateString()}
          </div>
        )}
        {card.reviewCount !== undefined && (
          <div className="review-count">
            Reviews: {card.reviewCount}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="keyboard-hints">
        <small>
          Use <kbd>Space</kbd> or <kbd>Enter</kbd> to show answer, 
          <kbd>←</kbd>/<kbd>→</kbd> arrows to navigate
          {showAnswer && onReviewCard && (
            <>, <kbd>1</kbd>-<kbd>4</kbd> for review</>
          )}
        </small>
      </div>
    </div>
  );
};

export default FlashcardDisplay;