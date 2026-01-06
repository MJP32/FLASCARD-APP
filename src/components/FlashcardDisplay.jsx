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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h3>No flashcards to display</h3>
          <p style={{ color: '#64748b', marginBottom: '12px' }}>
            There are no cards matching your current filters.
          </p>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>
            <p style={{ margin: '4px 0' }}>💡 Try selecting "All" categories</p>
            <p style={{ margin: '4px 0' }}>💡 Turn off "Due Today" filter</p>
            <p style={{ margin: '4px 0' }}>💡 Create new cards with the "New Card" button</p>
          </div>
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
          title="Edit this card (E)"
        >
          ✏️ Edit
        </button>

        <div className="navigation-controls">
          <button
            className="nav-btn"
            onClick={onPreviousCard}
            disabled={totalCards <= 1}
            title="Previous card (← or P)"
          >
            ← Prev
          </button>

          <button
            className="show-answer-btn"
            onClick={onToggleAnswer || onShowAnswer}
            title="Toggle answer (Space or Enter)"
          >
            {showAnswer ? "Hide Answer" : "Show Answer"}
            <span className="shortcut-hint">Space</span>
          </button>

          <button
            className="nav-btn"
            onClick={onNextCard}
            disabled={totalCards <= 1}
            title="Next card (→ or N)"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardDisplay;
