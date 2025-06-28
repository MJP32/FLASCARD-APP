import React, { useState, useEffect } from 'react';

/**
 * Modal for generating AI-powered questions based on current card
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.currentCard - Current flashcard to base generation on
 * @param {Function} props.onGenerateQuestions - Callback to generate questions
 * @param {boolean} props.isDarkMode - Dark mode state
 * @param {Object} props.apiKeys - API keys for AI providers
 * @param {string} props.selectedProvider - Currently selected AI provider
 * @returns {JSX.Element} Generate questions modal component
 */
const GenerateQuestionsModal = ({
  isVisible,
  onClose,
  currentCard,
  onGenerateQuestions,
  isDarkMode,
  apiKeys = {},
  selectedProvider = 'openai'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // 'input', 'generating', 'results'

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setGeneratedQuestions([]);
      setSelectedQuestions(new Set());
      setError('');
      setStep('input');
    }
  }, [isVisible]);

  const handleGenerate = async () => {
    if (!currentCard) {
      setError('No card selected');
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setError(`Please configure ${selectedProvider.toUpperCase()} API key in settings`);
      return;
    }

    setIsGenerating(true);
    setStep('generating');
    setError('');

    try {
      const questions = await generateQuestionsWithAI(currentCard, selectedProvider, apiKey);
      console.log('✅ Generated questions:', questions);
      setGeneratedQuestions(questions);
      setStep('results');
    } catch (err) {
      console.error('❌ Generation error:', err);
      setError(err.message);
      setStep('input');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to parse AI responses with fallback handling
  const parseAIResponse = (content) => {
    console.log('🔍 Raw AI Response:', content);
    
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Clean up the content - remove markdown code blocks if present
    let cleanContent = content.trim();
    
    // Remove markdown code block markers
    cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    console.log('🧹 Cleaned content:', cleanContent);

    // Try to find JSON in the response (sometimes AI adds extra text)
    const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : cleanContent;
    
    console.log('🎯 JSON string to parse:', jsonString);

    try {
      const parsed = JSON.parse(jsonString);
      console.log('✅ Parsed JSON:', parsed);
      
      // Validate the structure
      if (!Array.isArray(parsed)) {
        console.error('❌ Response is not an array:', typeof parsed);
        throw new Error('Response is not an array');
      }
      
      // Validate each question object
      const validQuestions = parsed.map((q, index) => {
        if (!q.question || !q.answer) {
          console.error(`❌ Question ${index + 1} missing fields:`, q);
          throw new Error(`Question ${index + 1} missing required fields`);
        }
        return {
          question: String(q.question).trim(),
          answer: String(q.answer).trim(),
          reasoning: q.reasoning ? String(q.reasoning).trim() : ''
        };
      });

      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in response');
      }

      console.log('✅ Valid questions extracted:', validQuestions);
      return validQuestions;
    } catch (e) {
      // If JSON parsing fails, try to extract questions manually
      console.warn('⚠️ JSON parsing failed, trying manual extraction:', e.message);
      return extractQuestionsManually(cleanContent);
    }
  };

  // Fallback manual extraction for malformed responses
  const extractQuestionsManually = (content) => {
    console.log('🔧 Attempting manual extraction from:', content);
    const questions = [];
    
    // Try multiple patterns to extract questions
    const patterns = [
      // Pattern 1: "Question: ... Answer: ..."
      /(?:Question|Q):\s*([^\n]+)[\s\S]*?(?:Answer|A):\s*([^\n]+)/gi,
      // Pattern 2: Numbered format "1. Question ... Answer ..."
      /\d+\.\s*(?:Question:?)?\s*([^\n]+)[\s\S]*?(?:Answer:?)?\s*([^\n]+)/gi,
      // Pattern 3: JSON-like but broken format
      /"question":\s*"([^"]+)"[\s\S]*?"answer":\s*"([^"]+)"/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(content)) !== null && questions.length < 4) {
        const question = match[1].trim().replace(/^["']|["']$/g, '');
        const answer = match[2].trim().replace(/^["']|["']$/g, '');
        
        if (question && answer && question.length > 3 && answer.length > 1) {
          questions.push({
            question: question,
            answer: answer,
            reasoning: 'Extracted from AI response'
          });
        }
      }
      
      if (questions.length > 0) {
        console.log(`✅ Extracted ${questions.length} questions using pattern ${patterns.indexOf(pattern) + 1}`);
        break;
      }
    }
    
    if (questions.length === 0) {
      console.error('❌ Could not extract any questions from content');
      throw new Error('Could not extract questions from AI response. The AI may have returned an unexpected format.');
    }
    
    return questions;
  };

  const generateQuestionsWithAI = async (card, provider, apiKey) => {
    const prompt = `Based on this flashcard content, generate 4 different questions that test the same knowledge:

Original Question: ${card.question?.replace(/<[^>]*>/g, '') || ''}
Original Answer: ${card.answer?.replace(/<[^>]*>/g, '') || ''}
Category: ${card.category || 'General'}
${card.sub_category ? `Sub-category: ${card.sub_category}` : ''}

Generate 4 new questions that:
1. Test the same core knowledge
2. Use different phrasing/approaches
3. Are appropriate for the same difficulty level
4. Maintain the same answer or a closely related answer

IMPORTANT: Respond with ONLY a valid JSON array in this exact format (no extra text):
[
  {
    "question": "Question text here",
    "answer": "Answer text here",
    "reasoning": "Brief explanation of how this tests the same knowledge"
  },
  {
    "question": "Second question text here",
    "answer": "Second answer text here", 
    "reasoning": "Second reasoning here"
  },
  {
    "question": "Third question text here",
    "answer": "Third answer text here",
    "reasoning": "Third reasoning here"
  },
  {
    "question": "Fourth question text here",
    "answer": "Fourth answer text here",
    "reasoning": "Fourth reasoning here"
  }
]`;

    let response;
    
    switch (provider) {
      case 'openai':
        response = await callOpenAI(prompt, apiKey);
        break;
      case 'anthropic':
        response = await callAnthropic(prompt, apiKey);
        break;
      case 'gemini':
        response = await callGemini(prompt, apiKey);
        break;
      default:
        throw new Error('Unsupported AI provider');
    }

    return response;
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
          { role: 'system', content: 'You are a helpful assistant that generates educational flashcard questions. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    try {
      return parseAIResponse(content);
    } catch (e) {
      console.error('OpenAI response parsing error:', e);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }
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
        max_tokens: 1000,
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
    const content = data.content[0]?.text;
    
    try {
      return parseAIResponse(content);
    } catch (e) {
      console.error('Anthropic response parsing error:', e);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response. Please try again.');
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
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text;
    
    try {
      return parseAIResponse(content);
    } catch (e) {
      console.error('Gemini response parsing error:', e);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  };

  const toggleQuestionSelection = (index) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const handleCreateSelected = async () => {
    if (selectedQuestions.size === 0) {
      setError('Please select at least one question to create');
      return;
    }

    const questionsToCreate = Array.from(selectedQuestions).map(index => ({
      ...generatedQuestions[index],
      category: currentCard.category,
      sub_category: currentCard.sub_category || '',
      level: 'new'
    }));

    try {
      await onGenerateQuestions(questionsToCreate);
      onClose();
    } catch (err) {
      setError('Failed to create questions: ' + err.message);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className="modal-content generate-modal">
        <div className="modal-header">
          <h2>🤖 Generate AI Questions</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="generate-content">
          {step === 'input' && (
            <div className="input-step">
              <div className="current-card-preview">
                <h3>Based on this card:</h3>
                <div className="card-preview">
                  <div className="preview-question">
                    <strong>Q:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard?.question || '' }} />
                  </div>
                  <div className="preview-answer">
                    <strong>A:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard?.answer || '' }} />
                  </div>
                </div>
              </div>

              <div className="generation-info">
                <p>AI will generate 4 similar questions that test the same knowledge using different approaches.</p>
                <p><strong>Using:</strong> {selectedProvider.toUpperCase()}</p>
              </div>

              {error && (
                <div className="error-message">
                  ❌ {error}
                </div>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div className="generating-step">
              <div className="loading-spinner"></div>
              <h3>Generating questions...</h3>
              <p>This may take a few seconds</p>
            </div>
          )}

          {step === 'results' && (
            <div className="results-step">
              <h3>Select questions to create: ({generatedQuestions.length} generated)</h3>
              <div className="questions-list">
                {generatedQuestions.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No questions were generated. Please try again.
                  </div>
                ) : (
                  generatedQuestions.map((q, index) => (
                  <div key={index} className="question-item">
                    <label className="question-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(index)}
                        onChange={() => toggleQuestionSelection(index)}
                      />
                      <div className="question-content">
                        <div className="question-text">
                          <strong>Q:</strong> {q.question}
                        </div>
                        <div className="answer-text">
                          <strong>A:</strong> {q.answer}
                        </div>
                        {q.reasoning && (
                          <div className="reasoning-text">
                            <em>Why: {q.reasoning}</em>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  ))
                )}
              </div>

              {error && (
                <div className="error-message">
                  ❌ {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          {step === 'input' && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                🤖 Generate Questions
              </button>
            </>
          )}

          {step === 'results' && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={() => setStep('input')}
              >
                ← Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateSelected}
                disabled={selectedQuestions.size === 0}
              >
                Create Selected ({selectedQuestions.size})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateQuestionsModal;