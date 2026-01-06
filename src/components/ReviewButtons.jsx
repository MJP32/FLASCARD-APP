import React from 'react';

/**
 * Review rating buttons (Again, Hard, Good, Easy) shown after viewing an answer
 */
const ReviewButtons = ({ onReviewCard, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      className="review-buttons-below-card"
      role="group"
      aria-label="Rate how well you remembered this card"
    >
      <button
        className="review-btn again-btn"
        onClick={() => onReviewCard('again')}
        title="Completely forgot (1)"
        aria-label="Again - completely forgot, press 1"
      >
        <span className="btn-number" aria-hidden="true">1</span>
        <span className="btn-emoji" aria-hidden="true">😵</span>
        <span className="btn-text">Again</span>
      </button>

      <button
        className="review-btn hard-btn"
        onClick={() => onReviewCard('hard')}
        title="Hard to remember (2)"
        aria-label="Hard - difficult to remember, press 2"
      >
        <span className="btn-number" aria-hidden="true">2</span>
        <span className="btn-emoji" aria-hidden="true">😓</span>
        <span className="btn-text">Hard</span>
      </button>

      <button
        className="review-btn good-btn"
        onClick={() => onReviewCard('good')}
        title="Remembered with effort (3)"
        aria-label="Good - remembered with effort, press 3"
      >
        <span className="btn-number" aria-hidden="true">3</span>
        <span className="btn-emoji" aria-hidden="true">😊</span>
        <span className="btn-text">Good</span>
      </button>

      <button
        className="review-btn easy-btn"
        onClick={() => onReviewCard('easy')}
        title="Easy to remember (4)"
        aria-label="Easy - remembered easily, press 4"
      >
        <span className="btn-number" aria-hidden="true">4</span>
        <span className="btn-emoji" aria-hidden="true">😎</span>
        <span className="btn-text">Easy</span>
      </button>
    </div>
  );
};

export default ReviewButtons;
