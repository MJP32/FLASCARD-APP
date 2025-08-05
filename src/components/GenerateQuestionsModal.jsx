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
  selectedProvider = 'openai',
  onOpenApiConfig
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // 'input', 'generating', 'results'
  const [openDropdowns, setOpenDropdowns] = useState(new Set());

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setGeneratedQuestions([]);
      setSelectedQuestions(new Set());
      setError('');
      setStep('input');
      setOpenDropdowns(new Set());
    }
  }, [isVisible]);

  // Toggle dropdown visibility
  const toggleDropdown = (index) => {
    const newOpen = new Set(openDropdowns);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenDropdowns(newOpen);
  };

  // Simple similarity calculation between two strings (0-1)
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    // Convert to lowercase and split into words
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    // Calculate Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  };

  // Helper function to check if questions are diverse enough
  const checkQuestionDiversity = (questions) => {
    if (!Array.isArray(questions) || questions.length < 2) return true;
    
    // Check if all questions start with the same word
    const firstWords = questions.map(q => 
      q.question.trim().split(/\s+/)[0].toLowerCase()
    );
    const uniqueFirstWords = new Set(firstWords);
    
    if (uniqueFirstWords.size < questions.length * 0.5) {
      console.warn('⚠️ Questions lack diversity in starting words');
      return false;
    }
    
    // Check if questions are too similar in length
    const lengths = questions.map(q => q.question.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const similarLengths = lengths.filter(l => 
      Math.abs(l - avgLength) < avgLength * 0.2
    ).length;
    
    if (similarLengths === questions.length) {
      console.warn('⚠️ Questions are too similar in length');
      return false;
    }
    
    // Check for varied question types
    const questionTypes = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'can', 'is', 'are', 'does', 'do', 'explain', 'describe', 'compare'];
    const usedTypes = new Set();
    
    questions.forEach(q => {
      const lowerQ = q.question.toLowerCase();
      questionTypes.forEach(type => {
        if (lowerQ.startsWith(type + ' ') || lowerQ.includes(' ' + type + ' ')) {
          usedTypes.add(type);
        }
      });
    });
    
    if (usedTypes.size < 2) {
      console.warn('⚠️ Questions lack variety in question types');
      return false;
    }
    
    return true;
  };

  const handleGenerate = async () => {
    if (!currentCard) {
      setError('No card selected');
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setError(`No ${selectedProvider.toUpperCase()} API key configured. Please click the 🔑 Configure API Keys button to add your API key, or try a different AI provider if you have one configured.`);
      return;
    }

    setIsGenerating(true);
    setStep('generating');
    setError('');

    try {
      let questions = await generateQuestionsWithAI(currentCard, selectedProvider, apiKey);
      console.log('✅ Generated questions:', questions);
      
      // Filter out any question that's too similar to the original
      const originalQuestionLower = currentCard.question?.replace(/<[^>]*>/g, '').toLowerCase().trim() || '';
      questions = questions.filter(q => {
        const generatedLower = q.question.toLowerCase().trim();
        // Remove if it's the exact same question or very similar (>90% match)
        const similarity = calculateSimilarity(originalQuestionLower, generatedLower);
        if (similarity > 0.9) {
          console.log(`🚫 Filtered out question too similar to original: "${q.question}"`);
          return false;
        }
        return true;
      });
      
      // Check diversity and regenerate once if needed
      if (!checkQuestionDiversity(questions) || questions.length < 4) {
        console.log('🔄 Questions lack diversity or too few remaining, regenerating...');
        questions = await generateQuestionsWithAI(currentCard, selectedProvider, apiKey);
        console.log('✅ Regenerated questions:', questions);
        
        // Filter again after regeneration
        questions = questions.filter(q => {
          const generatedLower = q.question.toLowerCase().trim();
          const similarity = calculateSimilarity(originalQuestionLower, generatedLower);
          return similarity <= 0.9;
        });
      }
      
      setGeneratedQuestions(questions);
      setStep('results');
    } catch (err) {
      console.error('❌ Generation error:', err);
      
      // Provide user-friendly error messages based on error type
      let userMessage = 'Unable to generate questions. ';
      
      if (err.message.includes('401') || err.message.includes('403') || err.message.includes('Invalid API')) {
        userMessage += 'Please check your API key configuration - it may be invalid or expired.';
      } else if (err.message.includes('429') || err.message.includes('rate limit')) {
        userMessage += 'API rate limit exceeded. Please wait a moment and try again.';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        userMessage += 'Network connection issue. Please check your internet connection and try again.';
      } else if (err.message.includes('quota') || err.message.includes('billing')) {
        userMessage += 'API quota exceeded or billing issue. Please check your API account.';
      } else if (err.message.includes('parse') || err.message.includes('Failed to parse')) {
        userMessage += 'The AI response could not be processed. Please try again with a simpler request.';
      } else {
        userMessage += 'The AI service is currently unavailable. Please try again later or try a different AI provider.';
      }
      
      setError(userMessage);
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
      
      while ((match = pattern.exec(content)) !== null && questions.length < 6) {
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
    const prompt = `Based on this flashcard content, generate 6 DIVERSE questions that explore DIFFERENT aspects of the topic:

Original Question: ${card.question?.replace(/<[^>]*>/g, '') || ''}
Original Answer: ${card.answer?.replace(/<[^>]*>/g, '') || ''}
Category: ${card.category || 'General'}
${card.sub_category ? `Sub-category: ${card.sub_category}` : ''}

Generate 6 NEW questions that MUST:
1. Use DIFFERENT question types (e.g., "What", "How", "Why", "When", "Compare", "Explain", "True/False", "Fill-in-blank")
2. Test DIFFERENT aspects or angles of the topic
3. Vary in complexity (from basic recall to application/analysis)
4. Have DIFFERENT answers that explore various facets of the subject
5. NOT just rephrase the original question
6. NOT include the original question in your response

Examples of variety:
- If original asks "What is X?", you might ask "How does X work?", "Why is X important?", "What are examples of X?", "What's the difference between X and Y?"
- Mix factual questions with conceptual understanding
- Include practical applications or real-world examples
- Add questions that connect to related concepts

IMPORTANT: Respond with ONLY a valid JSON array with exactly 6 questions (no extra text):
[
  {
    "question": "First diverse question",
    "answer": "First answer",
    "reasoning": "How this explores a different aspect"
  },
  {
    "question": "Second diverse question", 
    "answer": "Second answer",
    "reasoning": "Different approach/angle"
  },
  {
    "question": "Third diverse question",
    "answer": "Third answer",
    "reasoning": "Another perspective"
  },
  {
    "question": "Fourth diverse question",
    "answer": "Fourth answer",
    "reasoning": "Different complexity level"
  },
  {
    "question": "Fifth diverse question",
    "answer": "Fifth answer",
    "reasoning": "Practical application"
  },
  {
    "question": "Sixth diverse question",
    "answer": "Sixth answer",
    "reasoning": "Conceptual understanding"
  }
]`;

    // Validate API key before making calls
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is required. Please click the 🔑 Configure API Keys button to add your API key.`);
    }

    // Validate API key format
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format. API key should start with "sk-ant-"');
    }

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
          { role: 'system', content: 'You are an expert educational content creator who generates diverse, thought-provoking flashcard questions. You excel at creating varied question types that explore topics from multiple angles. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
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
    console.log('🔵 Anthropic API Call - Starting request');
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
          max_tokens: 1000,
          temperature: 0.9,
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

      try {
        return parseAIResponse(content);
      } catch (e) {
        console.error('🔴 Anthropic response parsing error:', e);
        console.error('🔴 Raw content:', content);
        throw new Error('Failed to parse AI response. Please try again.');
      }
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
          temperature: 0.9,
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
      console.error('❌ Question creation error:', err);
      setError('Unable to save the generated questions. Please try again or check your connection.');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content generate-modal" style={{ backgroundColor: 'white', color: '#1f2937' }}>
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
                <p>AI will generate 6 diverse questions that explore different aspects of the topic using various question types and complexity levels. You can then select the best ones to create.</p>
                <p><strong>Using:</strong> {selectedProvider.toUpperCase()}</p>
              </div>

              {error && (
                <div className="error-message">
                  ❌ {error}
                  {(error.toLowerCase().includes('authentication') || 
                    error.toLowerCase().includes('401') || 
                    error.toLowerCase().includes('403') ||
                    error.toLowerCase().includes('invalid api key')) && (
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        onClick={() => {
                          onClose();
                          if (onOpenApiConfig) {
                            setTimeout(() => {
                              onOpenApiConfig();
                            }, 100);
                          }
                        }}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🔑 Configure API Keys
                      </button>
                    </div>
                  )}
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
              <h3>Select diverse questions to create: ({generatedQuestions.length} generated)</h3>
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
                        <button 
                          className="answer-dropdown-toggle"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDropdown(index);
                          }}
                          type="button"
                        >
                          {openDropdowns.has(index) ? '▼' : '▶'} Show Answer & Reasoning
                        </button>
                        {openDropdowns.has(index) && (
                          <div className="answer-dropdown-content">
                            <div className="answer-text">
                              <strong>A:</strong> {q.answer}
                            </div>
                            {q.reasoning && (
                              <div className="reasoning-text">
                                <em>Why: {q.reasoning}</em>
                              </div>
                            )}
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
                  {(error.toLowerCase().includes('authentication') || 
                    error.toLowerCase().includes('401') || 
                    error.toLowerCase().includes('403') ||
                    error.toLowerCase().includes('invalid api key')) && (
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        onClick={() => {
                          onClose();
                          if (onOpenApiConfig) {
                            setTimeout(() => {
                              onOpenApiConfig();
                            }, 100);
                          }
                        }}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🔑 Configure API Keys
                      </button>
                    </div>
                  )}
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