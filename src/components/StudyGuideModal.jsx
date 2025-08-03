import React, { useState, useEffect, useCallback } from 'react';

const StudyGuideModal = ({ isOpen, onClose, flashcards, isDarkMode }) => {
  const [studyGuide, setStudyGuide] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate summarized study guide from hard cards
  const generateSummarizedStudyGuide = useCallback(() => {
    setIsGenerating(true);
    
    try {
      // Get all cards rated as "hard"
      const hardCards = flashcards.filter(card => {
        if (card.active === false) return false;
        
        // Check if card is rated as hard
        if (card.level === 'hard') return true;
        
        // If no explicit level, infer from FSRS parameters
        if (card.reviewCount > 0) {
          const { difficulty = 5 } = card;
          return difficulty >= 7 && difficulty < 8;
        }
        
        return false;
      });

      if (hardCards.length === 0) {
        setStudyGuide({
          title: "Study Guide - Challenging Concepts",
          content: "No cards currently rated as 'Hard'. Keep studying and this guide will populate with concepts you find challenging!",
          cardCount: 0,
          summary: "No challenging concepts identified yet."
        });
        setIsGenerating(false);
        return;
      }

      // Group cards by category and subcategory for better organization
      const cardsByCategory = {};
      hardCards.forEach(card => {
        const category = card.category || 'Uncategorized';
        const subCategory = card.sub_category || 'General';
        
        if (!cardsByCategory[category]) {
          cardsByCategory[category] = {};
        }
        if (!cardsByCategory[category][subCategory]) {
          cardsByCategory[category][subCategory] = [];
        }
        
        cardsByCategory[category][subCategory].push(card);
      });

      // Generate study guide content with summaries
      let content = `# Study Guide - Challenging Concepts\n\n`;
      content += `This study guide summarizes ${hardCards.length} concepts you've found challenging across ${Object.keys(cardsByCategory).length} categories.\n\n`;

      // Generate executive summary
      let summary = `## 📋 Executive Summary\n\n`;
      summary += `You're currently struggling with **${hardCards.length} concepts** across **${Object.keys(cardsByCategory).length} main areas**:\n\n`;
      
      Object.keys(cardsByCategory).sort().forEach(category => {
        const categoryCardCount = Object.values(cardsByCategory[category]).flat().length;
        const subcategoryCount = Object.keys(cardsByCategory[category]).length;
        summary += `- **${category}**: ${categoryCardCount} challenging concept${categoryCardCount > 1 ? 's' : ''} across ${subcategoryCount} topic${subcategoryCount > 1 ? 's' : ''}\n`;
      });
      
      summary += `\n### 🎯 Focus Areas\n`;
      summary += `Based on your difficulty patterns, prioritize these areas for review:\n\n`;
      
      // Sort categories by number of hard cards (most problematic first)
      const sortedCategories = Object.entries(cardsByCategory)
        .sort(([,a], [,b]) => Object.values(b).flat().length - Object.values(a).flat().length);
      
      sortedCategories.forEach(([category, subcategories], index) => {
        const cardCount = Object.values(subcategories).flat().length;
        const priority = index === 0 ? '🔴 High Priority' : index === 1 ? '🟡 Medium Priority' : '🟢 Low Priority';
        summary += `${index + 1}. **${category}** (${cardCount} concepts) - ${priority}\n`;
      });

      content += summary + `\n\n`;

      // Generate detailed sections
      Object.keys(cardsByCategory).sort().forEach(category => {
        const categoryCards = Object.values(cardsByCategory[category]).flat();
        content += `## 📚 ${category} (${categoryCards.length} concepts)\n\n`;
        
        // Add category summary
        const subcategoryNames = Object.keys(cardsByCategory[category]);
        if (subcategoryNames.length > 1) {
          content += `**Key areas of difficulty:** ${subcategoryNames.join(', ')}\n\n`;
        }
        
        Object.keys(cardsByCategory[category]).sort().forEach(subCategory => {
          const cards = cardsByCategory[category][subCategory];
          if (cards.length === 0) return;
          
          content += `### 🔍 ${subCategory} (${cards.length} concept${cards.length > 1 ? 's' : ''})\n\n`;
          
          // Create summary of main points for this subcategory
          content += `**Key concepts to review:**\n`;
          cards.forEach((card, index) => {
            // Extract key terms from question and answer
            const question = card.question || '';

            
            // Simple keyword extraction (first few words or important terms)
            const keyTerm = question.split(/[?.!]/)[0].substring(0, 80);
            content += `${index + 1}. ${keyTerm}${keyTerm.length >= 80 ? '...' : ''}\n`;
          });
          
          content += `\n**Detailed Review:**\n\n`;
          
          cards.forEach((card, index) => {
            content += `#### ${index + 1}. ${card.question}\n\n`;
            
            // Summarize the answer if it's very long
            let answer = card.answer || '';
            if (answer.length > 300) {
              // Try to find the first sentence or key point
              const sentences = answer.split(/[.!?]+/);
              if (sentences.length > 1) {
                answer = sentences[0] + '.';
                if (answer.length < 100 && sentences[1]) {
                  answer += ' ' + sentences[1] + '.';
                }
                answer += '\n\n*[Note: Full answer available in flashcard]*';
              }
            }
            
            content += `**Key Point:** ${answer}\n\n`;
            
            if (card.notes && card.notes.trim()) {
              content += `**Additional Notes:** ${card.notes}\n\n`;
            }
            
            content += `---\n\n`;
          });
        });
      });

      // Add study recommendations
      content += `## 🎯 Study Recommendations\n\n`;
      content += `### Immediate Actions:\n`;
      content += `1. **Focus on high-priority categories** (those with the most challenging concepts)\n`;
      content += `2. **Review concepts daily** - spending 5-10 minutes on the most difficult topics\n`;
      content += `3. **Practice active recall** - try to explain concepts without looking at answers\n`;
      content += `4. **Use spaced repetition** - review these cards more frequently\n\n`;
      
      content += `### Long-term Strategy:\n`;
      content += `- **Track progress** - monitor which concepts move from "hard" to "good" ratings\n`;
      content += `- **Identify patterns** - notice if certain types of questions are consistently difficult\n`;
      content += `- **Seek additional resources** - consider supplementary materials for persistent challenges\n`;
      content += `- **Regular review** - regenerate this study guide weekly to track improvements\n\n`;

      setStudyGuide({
        title: "Study Guide - Challenging Concepts",
        content: content,
        cardCount: hardCards.length,
        categories: Object.keys(cardsByCategory).length,
        summary: summary
      });
      
    } catch (error) {
      console.error('Error generating study guide:', error);
      setStudyGuide({
        title: "Study Guide - Error",
        content: "Error generating study guide. Please try again.",
        cardCount: 0,
        summary: "Error occurred during generation."
      });
    } finally {
      setIsGenerating(false);
    }
  }, [flashcards]);

  // Generate study guide when modal opens
  useEffect(() => {
    if (isOpen && flashcards && flashcards.length > 0) {
      generateSummarizedStudyGuide();
    }
  }, [isOpen, flashcards, generateSummarizedStudyGuide]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0 24px',
          borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
          paddingBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: isDarkMode ? '#f9fafb' : '#111827'
            }}>
              📖 Study Guide
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
          
          {studyGuide && (
            <div style={{
              marginTop: '12px',
              fontSize: '14px',
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              {studyGuide.cardCount} challenging concepts • {studyGuide.categories} categories
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {isGenerating ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>📝</div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: isDarkMode ? '#f9fafb' : '#111827',
                marginBottom: '8px'
              }}>
                Generating Study Guide...
              </div>
              <div style={{
                fontSize: '14px',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                Analyzing your challenging concepts and creating summaries
              </div>
            </div>
          ) : studyGuide ? (
            <div>
              <div style={{
                maxHeight: '500px',
                overflowY: 'auto',
                backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
                border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                borderRadius: '8px',
                padding: '20px',
                fontSize: '14px',
                lineHeight: '1.6',
                color: isDarkMode ? '#d1d5db' : '#374151',
                whiteSpace: 'pre-wrap',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                {studyGuide.content}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              No study guide available
            </div>
          )}
        </div>

        {/* Footer */}
        {studyGuide && !isGenerating && (
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => {
                const blob = new Blob([studyGuide.content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `study-guide-${new Date().toISOString().split('T')[0]}.md`;
                a.style.visibility = 'hidden';
                document.body.appendChild(a);
                a.click();
                
                // Safe cleanup
                setTimeout(() => {
                  try {
                    if (a.parentNode === document.body) {
                      document.body.removeChild(a);
                    }
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.warn('Failed to clean up study guide download link:', error);
                  }
                }, 100);
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              💾 Download
            </button>
            
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(studyGuide.content);
                  // Could add a toast notification here
                } catch (err) {
                  console.error('Failed to copy:', err);
                }
              }}
              style={{
                backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📋 Copy
            </button>
            
            <button
              onClick={generateSummarizedStudyGuide}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔄 Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyGuideModal;