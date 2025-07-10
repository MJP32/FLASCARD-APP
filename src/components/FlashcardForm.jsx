import React, { useState, useEffect } from 'react';
import RichTextEditor from '../RichTextEditor';

/**
 * Component for creating and editing flashcards
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the form is visible
 * @param {Function} props.onClose - Callback to close the form
 * @param {Function} props.onSubmit - Callback for form submission
 * @param {Function} props.onDelete - Callback for card deletion
 * @param {Object} props.editCard - Card to edit (null for new card)
 * @param {Array} props.categories - Available categories
 * @param {boolean} props.isDarkMode - Dark mode state
 * @param {boolean} props.isLoading - Loading state
 * @param {Object} props.apiKeys - API keys for AI providers
 * @param {string} props.selectedProvider - Currently selected AI provider
 * @returns {JSX.Element} Flashcard form component
 */
const FlashcardForm = ({
  isVisible,
  onClose,
  onSubmit,
  onDelete = null,
  editCard = null,
  categories = [],
  isDarkMode,
  isLoading = false,
  apiKeys = {},
  selectedProvider = 'openai'
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
  const [isEnhancingAnswer, setIsEnhancingAnswer] = useState(false);
  const [isAddingInfo, setIsAddingInfo] = useState(false);
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [enhancementError, setEnhancementError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setShowDeleteConfirm(false);
      setEnhancementError('');
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

  // AI Enhancement Functions
  const enhanceAnswer = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      setEnhancementError('Both question and answer are required for enhancement');
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setEnhancementError(`Please configure ${selectedProvider.toUpperCase()} API key in settings`);
      return;
    }

    setIsEnhancingAnswer(true);
    setEnhancementError('');

    try {
      const prompt = `Please enhance and expand the following flashcard answer by organizing it into a clear list of key concepts with explanations:

Question: ${formData.question.replace(/<[^>]*>/g, '')}
Current Answer: ${formData.answer.replace(/<[^>]*>/g, '')}
Category: ${formData.category}
${formData.sub_category ? `Sub-category: ${formData.sub_category}` : ''}

Create an enhanced answer that:
1. Organizes information into 3-6 key concepts using HTML lists
2. Each point should cover one main concept with clear explanation
3. Include relevant examples, details, or clarifications for each concept
4. Maintain logical flow from basic to advanced concepts
5. Keep each point focused and informative (1-2 sentences)
6. Use HTML formatting with proper tags

REQUIRED FORMAT - Choose one:
• For general concepts: <ul><li><strong>Concept Name:</strong> Explanation with examples</li></ul>
• For sequential steps: <ol><li><strong>Step Name:</strong> Description and details</li></ol>

Example output:
<ul>
<li><strong>Definition:</strong> Clear explanation of what the concept means with context</li>
<li><strong>Key Components:</strong> Main parts or elements that make up the concept</li>
<li><strong>Real-world Application:</strong> How this concept is used in practice with examples</li>
<li><strong>Important Considerations:</strong> Critical points, limitations, or common misconceptions</li>
</ul>

IMPORTANT: Start your response directly with <ul> or <ol> tag. Do not include any text before or after the HTML list.`;

      const enhancedAnswer = await callAI(prompt, selectedProvider, apiKey);
      const currentAnswer = formData.answer.trim();
      const newAnswer = currentAnswer ? `${currentAnswer}\n\n${enhancedAnswer.trim()}` : enhancedAnswer.trim();
      handleFieldChange('answer', newAnswer);
    } catch (error) {
      console.error('Enhancement error:', error);
      setEnhancementError('Failed to enhance answer: ' + error.message);
    } finally {
      setIsEnhancingAnswer(false);
    }
  };

  const addAdditionalInfo = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      setEnhancementError('Both question and answer are required to generate additional information');
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setEnhancementError(`Please configure ${selectedProvider.toUpperCase()} API key in settings`);
      return;
    }

    setIsAddingInfo(true);
    setEnhancementError('');

    try {
      const prompt = `Based on this flashcard, generate additional relevant information that would be useful for learning this topic:

Question: ${formData.question.replace(/<[^>]*>/g, '')}
Answer: ${formData.answer.replace(/<[^>]*>/g, '')}
Category: ${formData.category}
${formData.sub_category ? `Sub-category: ${formData.sub_category}` : ''}
${formData.additional_info ? `Current Additional Info: ${formData.additional_info.replace(/<[^>]*>/g, '')}` : ''}

Generate additional information using HTML lists with proper indentation for sublists:
1. Related concepts or background context
2. Real-world applications or examples
3. Common misconceptions to avoid
4. Memory aids or mnemonics (if applicable)
5. Connections to other topics in this field

IMPORTANT FORMATTING REQUIREMENTS:
- Use HTML <ul> and <li> tags for lists
- For sublists, use nested <ul> tags with proper indentation
- When creating sublists, add a tab (4 spaces) before nested <ul> tags
- Example format:
<ul>
<li><strong>Main Topic:</strong> Description
    <ul>
    <li>Subpoint 1: Details</li>
    <li>Subpoint 2: More details</li>
    </ul>
</li>
<li><strong>Another Topic:</strong> Description</li>
</ul>

${formData.additional_info ? 'Expand and improve the existing additional information.' : 'Create new additional information content.'}

Return only the additional information content with proper HTML formatting:`;

      const additionalInfo = await callAI(prompt, selectedProvider, apiKey);
      const currentInfo = formData.additional_info.trim();
      const newInfo = currentInfo ? `${currentInfo}\n\n${additionalInfo.trim()}` : additionalInfo.trim();
      handleFieldChange('additional_info', newInfo);
    } catch (error) {
      console.error('Additional info error:', error);
      setEnhancementError('Failed to generate additional information: ' + error.message);
    } finally {
      setIsAddingInfo(false);
    }
  };

  /**
   * Generates a code example or practical example based on the flashcard content
   * Uses AI to intelligently determine if an example would be helpful and what type
   */
  const generateExample = async () => {
    // Validate that both question and answer exist before generating example
    if (!formData.question.trim() || !formData.answer.trim()) {
      setEnhancementError('Both question and answer are required to generate an example');
      return;
    }

    // Check if API key is configured for the selected AI provider
    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setEnhancementError(`Please configure ${selectedProvider.toUpperCase()} API key in settings`);
      return;
    }

    // Set loading state and clear any previous errors
    setIsGeneratingExample(true);
    setEnhancementError('');

    try {
      /* Create a detailed prompt that instructs the AI to:
       * 1. Analyze the content to determine if an example is appropriate
       * 2. Choose between code example, practical example, or no example
       * 3. Format the response properly with HTML
       */
      const prompt = `Based on this flashcard, determine if a code example or practical example would be appropriate:

Question: ${formData.question.replace(/<[^>]*>/g, '')}
Answer: ${formData.answer.replace(/<[^>]*>/g, '')}
Category: ${formData.category}
${formData.sub_category ? `Sub-category: ${formData.sub_category}` : ''}

DECISION CRITERIA:
1. Generate a code example if:
   - The topic is programming-related
   - The question asks about implementation, syntax, or algorithms
   - The answer discusses technical concepts that can be demonstrated in code
   - The category suggests programming (e.g., JavaScript, Python, Data Structures, etc.)

2. Generate a practical example if:
   - The topic is conceptual but not code-related
   - The question is about theory, principles, or non-coding topics
   - A real-world scenario would help illustrate the concept

3. Return "NOT_APPLICABLE" if:
   - The topic is purely definitional or factual
   - An example would not add value
   - The question is about historical facts, dates, or names

If a code example is appropriate, provide it with:
- Clear, commented code
- Proper formatting with HTML <pre><code> tags
- A brief explanation of what the code demonstrates

If a practical example is appropriate, provide it with:
- A concrete scenario or use case
- Clear formatting with HTML tags
- Step-by-step walkthrough if needed

Format code examples like this:
<div class="example-section">
<h4>Example:</h4>
<pre><code class="language-javascript">
// Your code here
</code></pre>
<p>Explanation of what this example demonstrates.</p>
</div>

Format practical examples like this:
<div class="example-section">
<h4>Practical Example:</h4>
<p>Your practical example here with clear explanation.</p>
</div>

If not applicable, return exactly: NOT_APPLICABLE`;

      // Call the AI with the constructed prompt
      const result = await callAI(prompt, selectedProvider, apiKey);
      
      // Check if AI determined an example is not applicable
      if (result.trim() === 'NOT_APPLICABLE') {
        // Show a user-friendly message instead of adding content
        setEnhancementError('An example is not applicable for this type of content');
      } else {
        // Append the generated example to the existing answer
        const currentAnswer = formData.answer.trim();
        const newAnswer = currentAnswer ? `${currentAnswer}\n\n${result.trim()}` : result.trim();
        handleFieldChange('answer', newAnswer);
      }
    } catch (error) {
      // Log error for debugging and show user-friendly error message
      console.error('Example generation error:', error);
      setEnhancementError('Failed to generate example: ' + error.message);
    } finally {
      // Always reset loading state when operation completes
      setIsGeneratingExample(false);
    }
  };

  // Generic AI calling function
  const callAI = async (prompt, provider, apiKey) => {
    switch (provider) {
      case 'openai':
        return await callOpenAI(prompt, apiKey);
      case 'anthropic':
        return await callAnthropic(prompt, apiKey);
      case 'gemini':
        return await callGemini(prompt, apiKey);
      default:
        throw new Error('Unsupported AI provider');
    }
  };

  const callOpenAI = async (prompt, apiKey) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert educational content enhancer specializing in organizing information into clear, structured lists. Always format enhanced answers as HTML lists with key concepts, using proper <ul><li> or <ol><li> tags. Focus on breaking down complex information into digestible, well-organized points.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  };

  const callAnthropic = async (prompt, apiKey) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 800,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  };

  const callGemini = async (prompt, apiKey) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  };

  // Delete handling functions
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editCard || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(editCard.id);
      // Close modal - parent will handle navigation
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      setEnhancementError('Failed to delete card: ' + error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
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
            
            {/* AI Enhancement Buttons */}
            {editCard && (
              <div className="ai-enhancement-buttons">
                <button
                  type="button"
                  className="btn btn-secondary ai-enhance-btn"
                  onClick={enhanceAnswer}
                  disabled={isEnhancingAnswer || isAddingInfo || isGeneratingExample || isSubmitting || !formData.question.trim() || !formData.answer.trim()}
                  title="Use AI to enhance answer and format as key concepts list"
                >
                  {isEnhancingAnswer ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Enhancing...
                    </>
                  ) : (
                    <>
                      📝 Key Concepts
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  className="btn btn-secondary ai-enhance-btn"
                  onClick={generateExample}
                  disabled={isEnhancingAnswer || isAddingInfo || isGeneratingExample || isSubmitting || !formData.question.trim() || !formData.answer.trim()}
                  title="Generate a code example or practical example"
                >
                  {isGeneratingExample ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      💡 Example
                    </>
                  )}
                </button>
              </div>
            )}
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
            
            {/* AI Additional Info Button */}
            {editCard && (
              <div className="ai-enhancement-buttons">
                <button
                  type="button"
                  className="btn btn-secondary ai-enhance-btn"
                  onClick={addAdditionalInfo}
                  disabled={isEnhancingAnswer || isAddingInfo || isGeneratingExample || isSubmitting || !formData.question.trim() || !formData.answer.trim()}
                  title="Use AI to generate or enhance additional information"
                >
                  {isAddingInfo ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      🧠 Add Additional Info
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Enhancement Error Display */}
          {enhancementError && (
            <div className="error-message enhancement-error">
              ❌ {enhancementError}
              <button 
                type="button" 
                className="close-error"
                onClick={() => setEnhancementError('')}
              >
                ×
              </button>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <div className="form-actions-left">
              {editCard && onDelete && (
                <button
                  type="button"
                  className="btn btn-danger delete-card-btn"
                  onClick={handleDeleteClick}
                  disabled={isSubmitting || isDeleting || isEnhancingAnswer || isAddingInfo || isGeneratingExample}
                  title="Delete this card"
                >
                  {isDeleting ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      🗑️ Delete Card
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="form-actions-right">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || isLoading || isDeleting || isEnhancingAnswer || isAddingInfo || isGeneratingExample}
              >
                {isSubmitting ? 'Saving...' : editCard ? 'Update Card' : 'Create Card'}
              </button>
            </div>
          </div>
        </form>

        {/* Loading Indicator */}
        {(isSubmitting || isLoading) && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <div className="delete-confirm-header">
                <h3>⚠️ Delete Flashcard</h3>
              </div>
              <div className="delete-confirm-content">
                <p>Are you sure you want to delete this flashcard?</p>
                <div className="delete-preview">
                  <div className="delete-preview-question">
                    <strong>Q:</strong> <span dangerouslySetInnerHTML={{ __html: formData.question.substring(0, 100) + (formData.question.length > 100 ? '...' : '') }} />
                  </div>
                  <div className="delete-preview-answer">
                    <strong>A:</strong> <span dangerouslySetInnerHTML={{ __html: formData.answer.substring(0, 100) + (formData.answer.length > 100 ? '...' : '') }} />
                  </div>
                </div>
                <p className="delete-warning">
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
              <div className="delete-confirm-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete Card'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardForm;