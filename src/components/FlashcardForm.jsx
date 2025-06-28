import React, { useState, useEffect } from 'react';
import RichTextEditor from '../RichTextEditor';

/**
 * Component for creating and editing flashcards
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the form is visible
 * @param {Function} props.onClose - Callback to close the form
 * @param {Function} props.onSubmit - Callback for form submission
 * @param {Object} props.editCard - Card to edit (null for new card)
 * @param {Array} props.categories - Available categories
 * @param {boolean} props.isDarkMode - Dark mode state
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} Flashcard form component
 */
const FlashcardForm = ({
  isVisible,
  onClose,
  onSubmit,
  editCard = null,
  categories = [],
  isDarkMode,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Uncategorized',
    sub_category: '',
    additional_info: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when editCard changes or form becomes visible
  useEffect(() => {
    if (isVisible) {
      if (editCard) {
        setFormData({
          question: editCard.question || '',
          answer: editCard.answer || '',
          category: editCard.category || 'Uncategorized',
          sub_category: editCard.sub_category || '',
          additional_info: editCard.additional_info || ''
        });
      } else {
        setFormData({
          question: '',
          answer: '',
          category: 'Uncategorized',
          sub_category: '',
          additional_info: ''
        });
      }
      setErrors({});
    }
  }, [isVisible, editCard]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Question is required';
    }

    if (!formData.answer.trim()) {
      newErrors.answer = 'Answer is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const cardData = {
        ...formData,
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        category: formData.category.trim(),
        sub_category: formData.sub_category.trim() || '',
        additional_info: formData.additional_info.trim() || null
      };

      await onSubmit(cardData, editCard?.id);
      
      // Reset form on successful submission
      if (!editCard) {
        setFormData({
          question: '',
          answer: '',
          category: 'Uncategorized',
          sub_category: '',
          additional_info: ''
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting flashcard:', error);
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      question: '',
      answer: '',
      category: 'Uncategorized',
      additional_info: ''
    });
    setErrors({});
    onClose();
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className="modal-content flashcard-form-modal">
        <div className="modal-header">
          <h2>{editCard ? 'Edit Flashcard' : 'Create New Flashcard'}</h2>
          <button 
            className="close-btn"
            onClick={handleCancel}
            disabled={isSubmitting}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flashcard-form">
          {/* Category Selection */}
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <div className="category-input-group">
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                className={errors.category ? 'error' : ''}
                disabled={isSubmitting}
              >
                <option value="Uncategorized">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or enter new category"
                value={formData.category === 'Uncategorized' ? '' : formData.category}
                onChange={(e) => handleFieldChange('category', e.target.value || 'Uncategorized')}
                className="new-category-input"
                disabled={isSubmitting}
              />
            </div>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          {/* Sub-Category Field */}
          <div className="form-group">
            <label htmlFor="sub_category">Sub-Category</label>
            <input
              type="text"
              id="sub_category"
              value={formData.sub_category}
              onChange={(e) => handleFieldChange('sub_category', e.target.value)}
              placeholder="Enter sub-category (optional)"
              className="form-input"
              disabled={isSubmitting}
            />
          </div>

          {/* Question Field */}
          <div className="form-group">
            <label htmlFor="question">Question *</label>
            <RichTextEditor
              value={formData.question}
              onChange={(value) => handleFieldChange('question', value)}
              placeholder="Enter your question here..."
              className={errors.question ? 'error' : ''}
              minHeight="120px"
            />
            {errors.question && <span className="error-message">{errors.question}</span>}
          </div>

          {/* Answer Field */}
          <div className="form-group">
            <label htmlFor="answer">Answer *</label>
            <RichTextEditor
              value={formData.answer}
              onChange={(value) => handleFieldChange('answer', value)}
              placeholder="Enter your answer here..."
              className={errors.answer ? 'error' : ''}
              minHeight="120px"
            />
            {errors.answer && <span className="error-message">{errors.answer}</span>}
          </div>

          {/* Additional Information Field */}
          <div className="form-group">
            <label htmlFor="additional_info">Additional Information</label>
            <RichTextEditor
              value={formData.additional_info}
              onChange={(value) => handleFieldChange('additional_info', value)}
              placeholder="Enter additional information (optional)..."
              minHeight="100px"
            />
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Saving...' : editCard ? 'Update Card' : 'Create Card'}
            </button>
          </div>
        </form>

        {/* Loading Indicator */}
        {(isSubmitting || isLoading) && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardForm;