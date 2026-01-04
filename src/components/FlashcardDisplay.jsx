import React from 'react';

/**
 * Component for displaying flashcard content
 */
const FlashcardDisplay = ({
  card,
  showAnswer,
  onShowAnswer,
  onToggleAnswer,
  onPreviousCard,
  onNextCard,
  totalCards,
  isDarkMode,
  onEditCard,
  isTransitioning = false
}) => {

  const handleCardClick = (e) => {
    // Ignore clicks on buttons, dropdowns, details/summary elements, and links
    if (e.target.closest('button')) return;
    if (e.target.closest('details')) return;
    if (e.target.closest('summary')) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('.dropdown')) return;
    if (e.target.closest('.info-dropdown')) return;
    if (e.target.closest('select')) return;

    if (onToggleAnswer) {
      onToggleAnswer();
    } else if (!showAnswer && onShowAnswer) {
      onShowAnswer();
    }
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

  return (
    <div className={`flashcard-container ${isDarkMode ? 'dark' : ''}`}>
      {/* Question/Answer Content */}
      <div
        className={`flashcard-section ${showAnswer ? 'answer-section' : 'question-section'}`}
        onClick={handleCardClick}
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {!isTransitioning && (
          <div
            dangerouslySetInnerHTML={{
              __html: showAnswer
                ? (card.answer || 'No answer provided')
                : (card.question || 'No question provided')
            }}
          />
        )}
      </div>

      {/* Footer with navigation */}
      <div className="flashcard-bottom">
        <button
          className="edit-card-btn"
          onClick={() => onEditCard && onEditCard(card)}
          title="Edit this card"
        >
          ✏️ Edit
        </button>

        <div className="navigation-controls">
          <button
            className="nav-btn"
            onClick={onPreviousCard}
            disabled={totalCards <= 1}
          >
            ← Prev
          </button>

          <button
            className="show-answer-btn"
            onClick={onToggleAnswer || onShowAnswer}
          >
            {showAnswer ? "Hide Answer" : "Show Answer"}
          </button>

          <button
            className="nav-btn"
            onClick={onNextCard}
            disabled={totalCards <= 1}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardDisplay;
