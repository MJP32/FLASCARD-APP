import React from 'react';

/**
 * Review rating buttons (Again, Hard, Good, Easy) shown after viewing an answer
 */
const ReviewButtons = ({ onReviewCard, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="review-buttons-below-card">
      <button
        className="review-btn again-btn"
        onClick={() => onReviewCard('again')}
        title="Completely forgot (1)"
      >
        <span className="btn-number">1</span>
        <span className="btn-emoji">😵</span>
        <span className="btn-text">Again</span>
      </button>

      <button
        className="review-btn hard-btn"
        onClick={() => onReviewCard('hard')}
        title="Hard to remember (2)"
      >
        <span className="btn-number">2</span>
        <span className="btn-emoji">😓</span>
        <span className="btn-text">Hard</span>
      </button>

      <button
        className="review-btn good-btn"
        onClick={() => onReviewCard('good')}
        title="Remembered with effort (3)"
      >
        <span className="btn-number">3</span>
        <span className="btn-emoji">😊</span>
        <span className="btn-text">Good</span>
      </button>

      <button
        className="review-btn easy-btn"
        onClick={() => onReviewCard('easy')}
        title="Easy to remember (4)"
      >
        <span className="btn-number">4</span>
        <span className="btn-emoji">😎</span>
        <span className="btn-text">Easy</span>
      </button>
    </div>
  );
};

export default ReviewButtons;
