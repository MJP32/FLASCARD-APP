import React, { useState, useEffect } from 'react';

/**
 * Modal for AI-powered bulk card creation
 * User describes what cards they want, AI generates them
 */
const AICreateCardsModal = ({
  isVisible,
  onClose,
  onSaveCards,
  isDarkMode,
  apiKeys = {},
  selectedProvider = 'openai',
  categories = []
}) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [includeMedia, setIncludeMedia] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // 'input', 'preview'

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setPrompt('');
      setCategory('');
      setSubCategory('');
      setVideoUrl('');
      setAudioUrl('');
      setIncludeMedia(false);
      setGeneratedCards([]);
      setError('');
      setStep('input');
    }
  }, [isVisible]);

  // Parse AI response to extract cards
  const parseAIResponse = (content) => {
    if (!content) return [];

    // Try to parse as JSON first
    try {
      // Clean markdown code blocks
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.filter(card => card.question && card.answer);
      }
    } catch (e) {
      console.log('JSON parse failed, trying regex extraction');
    }

    // Fallback: Try to extract Q&A pairs with regex
    const cards = [];
    const patterns = [
      /(?:Question|Q):\s*(.+?)\s*(?:Answer|A):\s*(.+?)(?=(?:Question|Q):|$)/gis,
      /\d+\.\s*(.+?)\s*[-–—]\s*(.+?)(?=\d+\.|$)/gis
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && match[2]) {
          cards.push({
            question: match[1].trim(),
            answer: match[2].trim()
          });
        }
      }
      if (cards.length > 0) break;
    }

    return cards;
  };

  // API call functions
  const callOpenAI = async (promptText, apiKey) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that creates educational flashcards. Always respond with valid JSON array.' },
          { role: 'user', content: promptText }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
  };

  const callAnthropic = async (promptText, apiKey) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          { role: 'user', content: promptText }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text;
  };

  const callGemini = async (promptText, apiKey) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text;
  };

  // Generate cards using AI
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please describe the cards you want to create');
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setError(`No API key configured for ${selectedProvider}. Please add it in Settings.`);
      return;
    }

    setIsGenerating(true);
    setError('');

    const aiPrompt = `Create flashcards based on this request: "${prompt}"

Generate educational flashcards as a JSON array. Each card should have a clear question and comprehensive answer.

Respond ONLY with a valid JSON array in this format:
[
  {"question": "Question text here?", "answer": "Answer text here"},
  {"question": "Another question?", "answer": "Another answer"}
]

Create between 5-15 cards depending on the topic complexity. Make questions varied (use What, How, Why, When, Compare, Explain, etc.).`;

    try {
      let content;
      if (selectedProvider === 'openai') {
        content = await callOpenAI(aiPrompt, apiKey);
      } else if (selectedProvider === 'anthropic') {
        content = await callAnthropic(aiPrompt, apiKey);
      } else if (selectedProvider === 'gemini') {
        content = await callGemini(aiPrompt, apiKey);
      }

      const cards = parseAIResponse(content);

      if (cards.length === 0) {
        throw new Error('Could not parse any cards from AI response. Please try again.');
      }

      setGeneratedCards(cards);
      setStep('preview');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove a card from preview
  const handleRemoveCard = (index) => {
    setGeneratedCards(cards => cards.filter((_, i) => i !== index));
  };

  // Save all cards
  const handleSaveAll = async () => {
    if (generatedCards.length === 0) return;

    // Build media HTML if URLs provided
    let mediaHtml = '';
    if (includeMedia) {
      if (videoUrl) {
        // Convert YouTube URL to embed format
        let embedUrl = videoUrl;
        const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        if (youtubeMatch) {
          embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        }
        mediaHtml += `<div style="margin-top: 16px;"><iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
      }
      if (audioUrl) {
        mediaHtml += `<div style="margin-top: 16px;"><audio controls style="width: 100%;"><source src="${audioUrl}" type="audio/mpeg">Your browser does not support audio.</audio></div>`;
      }
    }

    // Prepare cards for saving
    const cardsToSave = generatedCards.map(card => ({
      question: card.question,
      answer: card.answer + mediaHtml,
      category: category || 'AI Generated',
      sub_category: subCategory || '',
      active: true
    }));

    try {
      await onSaveCards(cardsToSave);
      onClose();
    } catch (err) {
      setError('Failed to save cards: ' + err.message);
    }
  };

  if (!isVisible) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200001,
      padding: '20px'
    },
    modal: {
      background: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '700px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    header: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      color: 'white',
      padding: '20px 24px',
      borderRadius: '12px 12px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      margin: 0,
      fontSize: '20px',
      fontWeight: '600'
    },
    closeBtn: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      color: 'white',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '18px'
    },
    body: {
      padding: '24px',
      overflowY: 'auto',
      flex: 1
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      fontSize: '14px'
    },
    textarea: {
      width: '100%',
      minHeight: '120px',
      padding: '12px',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#475569' : '#d1d5db'}`,
      background: isDarkMode ? '#0f172a' : '#ffffff',
      color: isDarkMode ? '#e2e8f0' : '#1f2937',
      fontSize: '14px',
      resize: 'vertical',
      marginBottom: '16px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#475569' : '#d1d5db'}`,
      background: isDarkMode ? '#0f172a' : '#ffffff',
      color: isDarkMode ? '#e2e8f0' : '#1f2937',
      fontSize: '14px',
      marginBottom: '12px'
    },
    row: {
      display: 'flex',
      gap: '12px',
      marginBottom: '16px'
    },
    col: {
      flex: 1
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px',
      cursor: 'pointer'
    },
    button: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      color: 'white'
    },
    secondaryBtn: {
      background: isDarkMode ? '#475569' : '#e2e8f0',
      color: isDarkMode ? '#e2e8f0' : '#374151'
    },
    error: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    cardPreview: {
      background: isDarkMode ? '#0f172a' : '#f8fafc',
      border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px'
    },
    cardQuestion: {
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1f2937',
      marginBottom: '8px'
    },
    cardAnswer: {
      color: isDarkMode ? '#94a3b8' : '#6b7280',
      fontSize: '14px'
    },
    cardActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
      marginTop: '12px'
    },
    footer: {
      padding: '16px 24px',
      borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>AI Create Cards</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}

          {step === 'input' && (
            <>
              <label style={styles.label}>Describe the cards you want to create</label>
              <textarea
                style={styles.textarea}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="E.g., Create 10 flashcards about photosynthesis for high school biology, covering the light and dark reactions, chloroplasts, and key molecules involved."
              />

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Category</label>
                  <input
                    style={styles.input}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Enter category"
                    list="category-list"
                  />
                  <datalist id="category-list">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Sub-category (optional)</label>
                  <input
                    style={styles.input}
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value)}
                    placeholder="Enter sub-category"
                  />
                </div>
              </div>

              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={e => setIncludeMedia(e.target.checked)}
                />
                <span style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                  Include video or audio in answers
                </span>
              </label>

              {includeMedia && (
                <>
                  <label style={styles.label}>YouTube Video URL (optional)</label>
                  <input
                    style={styles.input}
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />

                  <label style={styles.label}>Audio URL (optional)</label>
                  <input
                    style={styles.input}
                    value={audioUrl}
                    onChange={e => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                  />
                </>
              )}
            </>
          )}

          {step === 'preview' && (
            <>
              <div style={{ marginBottom: '16px', color: isDarkMode ? '#94a3b8' : '#6b7280' }}>
                Generated {generatedCards.length} cards. Review and edit before saving.
              </div>

              {generatedCards.map((card, index) => (
                <div key={index} style={styles.cardPreview}>
                  <div style={styles.cardQuestion}>
                    Q: {card.question}
                  </div>
                  <div style={styles.cardAnswer}>
                    A: {card.answer}
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      style={{ ...styles.button, ...styles.secondaryBtn, padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleRemoveCard(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={styles.footer}>
          {step === 'input' ? (
            <>
              <button
                style={{ ...styles.button, ...styles.secondaryBtn }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.primaryBtn, opacity: isGenerating ? 0.7 : 1 }}
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Cards'}
              </button>
            </>
          ) : (
            <>
              <button
                style={{ ...styles.button, ...styles.secondaryBtn }}
                onClick={() => setStep('input')}
              >
                Back
              </button>
              <div>
                <span style={{ color: isDarkMode ? '#94a3b8' : '#6b7280', marginRight: '16px' }}>
                  {generatedCards.length} cards
                </span>
                <button
                  style={{ ...styles.button, ...styles.primaryBtn }}
                  onClick={handleSaveAll}
                  disabled={generatedCards.length === 0}
                >
                  Save All Cards
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICreateCardsModal;
