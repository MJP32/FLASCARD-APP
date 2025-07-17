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
    additional_info: '',
    notes: '',
    starred: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancingAnswer, setIsEnhancingAnswer] = useState(false);
  const [isAddingInfo, setIsAddingInfo] = useState(false);
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [enhancementError, setEnhancementError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Track original form data to detect changes
  const [originalFormData, setOriginalFormData] = useState(null);

  // Reset form when editCard changes or form becomes visible
  useEffect(() => {
    if (isVisible) {
      const newFormData = editCard ? {
        question: editCard.question || '',
        answer: editCard.answer || '',
        category: editCard.category || 'Uncategorized',
        sub_category: editCard.sub_category || '',
        additional_info: editCard.additional_info || '',
        notes: editCard.notes || '',
        starred: editCard.starred || false
      } : {
        question: '',
        answer: '',
        category: 'Uncategorized',
        sub_category: '',
        additional_info: '',
        notes: '',
        starred: false
      };
      
      setFormData(newFormData);
      setOriginalFormData(newFormData); // Track original state
      setErrors({});
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

  // Check if form has changes
  const hasChanges = () => {
    if (!originalFormData) return false;
    
    return Object.keys(formData).some(key => {
      return formData[key] !== originalFormData[key];
    });
  };

  // Auto-save function
  const autoSave = async () => {
    if (!editCard || !hasChanges() || !validateForm()) {
      return false;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData, editCard.id);
      return true;
    } catch (error) {
      console.error('Auto-save error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form close with auto-save
  const handleClose = async () => {
    if (editCard && hasChanges() && validateForm()) {
      // Auto-save changes before closing
      await autoSave();
    }
    onClose();
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
      
      // Update original data to prevent auto-save on close after successful submit
      setOriginalFormData(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting flashcard:', error);
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    // Auto-save changes if editing and there are changes
    if (editCard && hasChanges() && validateForm()) {
      await autoSave();
    }
    
    // Reset form for new cards
    if (!editCard) {
      setFormData({
        question: '',
        answer: '',
        category: 'Uncategorized',
        additional_info: ''
      });
    }
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
      
      // Wrap the generated content in a collapsible section
      const collapsibleContent = `
<details class="generated-content-section">
  <summary class="generated-content-header">🧠 Key Concepts</summary>
  <div class="generated-content-body">
    ${enhancedAnswer.trim()}
  </div>
</details>`;

      const currentAnswer = formData.answer.trim();
      const newAnswer = currentAnswer ? `${currentAnswer}\n\n${collapsibleContent}` : collapsibleContent;
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
      
      // Wrap the generated content in a collapsible section
      const collapsibleContent = `
<details class="generated-content-section">
  <summary class="generated-content-header">🧠 Additional Information</summary>
  <div class="generated-content-body">
    ${additionalInfo.trim()}
  </div>
</details>`;

      const currentInfo = formData.additional_info.trim();
      const newInfo = currentInfo ? `${currentInfo}\n\n${collapsibleContent}` : collapsibleContent;
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
1. Generate a Java code example if:
   - The topic is programming-related
   - The question asks about implementation, syntax, or algorithms
   - The answer discusses technical concepts that can be demonstrated in code
   - The category suggests programming (e.g., Java, Data Structures, Algorithms, OOP, etc.)

2. Generate a practical example if:
   - The topic is conceptual but not code-related
   - The question is about theory, principles, or non-coding topics
   - A real-world scenario would help illustrate the concept

3. Return "NOT_APPLICABLE" if:
   - The topic is purely definitional or factual
   - An example would not add value
   - The question is about historical facts, dates, or names

If a Java code example is appropriate, provide it with:
- Clean Java code with proper syntax and conventions
- ABSOLUTELY NO EXPLANATORY COMMENTS in the code
- NO comments like "// This demonstrates", "// Here we", "// Notice", "// Example of"
- Write the code as if it were production code - clean and minimal
- Include the expected output when the code is executed (if applicable)
- Put ALL explanations in the paragraph below the code block
- Proper formatting with HTML <pre><code> tags

CRITICAL: Write Java code exactly as a developer would write it in a real project. 
Do NOT add any teaching comments or explanations inside the code block.
The code should speak for itself through proper variable names and structure.
ALWAYS include what output the code produces when executed (if it produces console output).

If a practical example is appropriate, provide it with:
- A concrete scenario or use case
- Clear formatting with HTML tags
- Step-by-step walkthrough if needed

Format Java code examples like this:
<div class="example-section">
<h4>Java Example:</h4>
<pre><code class="language-java">
public class Student {
    private String name;
    private int age;
    
    public Student(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public String getName() {
        return name;
    }
    
    public static void main(String[] args) {
        Student student = new Student("Alice", 20);
        System.out.println("Student name: " + student.getName());
    }
}
</code></pre>
<div class="output-section">
<h5>Output:</h5>
<pre><code class="output">Student name: Alice</code></pre>
</div>
<p>This example demonstrates basic class structure with constructor and getter method.</p>
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
        // Wrap the generated example in a collapsible section
        const collapsibleContent = `
<details class="generated-content-section">
  <summary class="generated-content-header">💡 Example</summary>
  <div class="generated-content-body">
    ${result.trim()}
  </div>
</details>`;

        const currentAnswer = formData.answer.trim();
        const newAnswer = currentAnswer ? `${currentAnswer}\n\n${collapsibleContent}` : collapsibleContent;
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
    // Validate API key before making calls
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is required. Please add your API key in Settings.`);
    }

    // Validate API key format
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format. API key should start with "sk-ant-"');
    }

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
    console.log('🔵 Anthropic API Call (FlashcardForm) - Starting request');
    console.log('🔵 API Key format:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'No API key provided');
    console.log('🔵 Prompt length:', prompt.length);

    try {
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

      console.log('🔵 Anthropic API Response Status:', response.status);
      console.log('🔵 Anthropic API Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          console.log('🔴 Anthropic API Error Data:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error.message || errorMessage;
            errorDetails = errorData.error.type || '';
          }
          
          // Specific error handling for common issues
          if (response.status === 401) {
            throw new Error(`Authentication Failed: Invalid API key. Please check your Anthropic API key in Settings. (${errorMessage})`);
          } else if (response.status === 403) {
            throw new Error(`Permission Denied: Your API key doesn't have permission to access this resource. (${errorMessage})`);
          } else if (response.status === 429) {
            throw new Error(`Rate Limited: You've exceeded the API rate limit. Please wait and try again. (${errorMessage})`);
          } else if (response.status === 400) {
            throw new Error(`Bad Request: ${errorMessage}. Check your input format.`);
          } else if (response.status === 500) {
            throw new Error(`Server Error: Anthropic API is experiencing issues. Please try again later. (${errorMessage})`);
          } else {
            throw new Error(`Anthropic API Error [${response.status}]: ${errorMessage}${errorDetails ? ` (Type: ${errorDetails})` : ''}`);
          }
        } catch (jsonError) {
          console.log('🔴 Could not parse error response as JSON:', jsonError);
          throw new Error(`Anthropic API Error [${response.status}]: ${errorMessage}. Response could not be parsed.`);
        }
      }

      const data = await response.json();
      console.log('🔵 Anthropic API Success - Response structure:', {
        hasContent: !!data.content,
        contentLength: data.content?.length || 0,
        firstContentType: data.content?.[0]?.type,
        hasText: !!data.content?.[0]?.text
      });

      const content = data.content[0]?.text;
      
      if (!content) {
        throw new Error('Anthropic API returned empty content. Please try again.');
      }

      return content;
    } catch (networkError) {
      console.error('🔴 Anthropic API Network Error:', networkError);
      if (networkError.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to Anthropic API. Please check your internet connection and try again.');
      }
      throw networkError;
    }
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
  const handleDeleteClick = async () => {
    if (!editCard || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(editCard.id);
      // Update original data to prevent auto-save on close after successful delete
      setOriginalFormData(formData);
      // Close modal - parent will handle navigation
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      setEnhancementError('Failed to delete card: ' + error.message);
    } finally {
      setIsDeleting(false);
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

          {/* Starred Checkbox */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.starred}
                onChange={(e) => handleFieldChange('starred', e.target.checked)}
                disabled={isSubmitting}
                className="checkbox-input"
              />
              <span className="checkbox-text">
                ⭐ Mark as important (starred)
              </span>
            </label>
          </div>

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

      </div>
    </div>
  );
};

export default FlashcardForm;