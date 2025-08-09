import React, { useState, useEffect, useMemo, useCallback } from 'react';

import './Tour.css';

const TourStep = ({ step, currentStep, totalSteps, onNext, onPrev, onSkip, onComplete, isDarkMode }) => {
  // Handle undefined isDarkMode prop
  const darkMode = isDarkMode || false;
  
  const { target, title, content, position = 'bottom', highlight = true, action } = step;
  const [targetElement, setTargetElement] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const findTarget = () => {
      // If target contains multiple selectors separated by commas, try each one
      const selectors = target.split(',').map(s => s.trim());
      let element = null;
      
      for (const selector of selectors) {
        element = document.querySelector(selector);
        if (element) break;
      }
      
      if (element) {
        console.log(`Tour: Found target element for step ${currentStep + 1}:`, element);
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.warn(`Tour Step ${currentStep + 1}: Could not find target element for selectors: ${target}`);
        // Try to find any of the common container elements as fallback
        const fallbacks = ['.app-header', '.header-right', '.flashcard-area', 'body'];
        let fallback = null;
        
        for (const selector of fallbacks) {
          fallback = document.querySelector(selector);
          if (fallback) {
            console.log(`Tour Step ${currentStep + 1}: Using fallback element:`, selector, fallback);
            break;
          }
        }
        
        if (fallback) {
          setTargetElement(fallback);
          const rect = fallback.getBoundingClientRect();
          setCoords({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
          });
        } else {
          console.error(`Tour Step ${currentStep + 1}: No fallback elements found!`);
        }
      }
    };

    // Try to find the element immediately and after a delay
    findTarget();
    const timer = setTimeout(findTarget, 500);

    // Update on window resize and scroll
    const handleResize = () => findTarget();
    const handleScroll = () => findTarget();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [target, currentStep]);

  const getTooltipPosition = () => {
    const tooltip = { top: 0, left: 0 };
    const offset = 20;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    const tooltipWidth = Math.min(400, viewport.width - 40); // max-width from CSS, but smaller on mobile
    const tooltipHeight = 350; // estimated height (increased for safety)

    // Initial positioning based on desired position
    let finalPosition = position;
    
    switch (position) {
      case 'top':
        tooltip.top = coords.top - offset;
        tooltip.left = coords.left + coords.width / 2;
        break;
      case 'bottom':
        tooltip.top = coords.top + coords.height + offset;
        tooltip.left = coords.left + coords.width / 2;
        break;
      case 'left':
        tooltip.top = coords.top + coords.height / 2;
        tooltip.left = coords.left - offset;
        break;
      case 'right':
        tooltip.top = coords.top + coords.height / 2;
        tooltip.left = coords.left + coords.width + offset;
        break;
      default:
        tooltip.top = coords.top + coords.height + offset;
        tooltip.left = coords.left + coords.width / 2;
    }

    // Adjust for viewport boundaries
    
    // Check horizontal bounds
    const tooltipLeftEdge = tooltip.left - tooltipWidth / 2;
    const tooltipRightEdge = tooltip.left + tooltipWidth / 2;
    
    if (tooltipLeftEdge < viewport.scrollX + 20) {
      // Too far left, adjust
      tooltip.left = viewport.scrollX + tooltipWidth / 2 + 20;
    } else if (tooltipRightEdge > viewport.scrollX + viewport.width - 20) {
      // Too far right, adjust
      tooltip.left = viewport.scrollX + viewport.width - tooltipWidth / 2 - 20;
    }
    
    // Check vertical bounds and flip position if needed
    if (position === 'top' && tooltip.top - tooltipHeight < viewport.scrollY + 20) {
      // Not enough space above, flip to bottom
      tooltip.top = coords.top + coords.height + offset;
      finalPosition = 'bottom';
    } else if (position === 'bottom' && tooltip.top + tooltipHeight > viewport.scrollY + viewport.height - 20) {
      // Not enough space below, flip to top
      tooltip.top = coords.top - offset;
      finalPosition = 'top';
    }
    
    // Force tooltip to stay within viewport bounds
    const minTop = viewport.scrollY + 20;
    const maxTop = viewport.scrollY + viewport.height - tooltipHeight - 20;
    
    if (tooltip.top < minTop) {
      tooltip.top = minTop;
      finalPosition = 'top';
    } else if (tooltip.top > maxTop) {
      tooltip.top = Math.max(minTop, maxTop);
      finalPosition = 'bottom';
    }
    
    // Ensure tooltip doesn't go off screen horizontally
    const minLeft = viewport.scrollX + 20;
    const maxLeft = viewport.scrollX + viewport.width - tooltipWidth - 20;
    
    if (tooltip.left - tooltipWidth/2 < minLeft) {
      tooltip.left = minLeft + tooltipWidth/2;
    } else if (tooltip.left + tooltipWidth/2 > viewport.scrollX + viewport.width - 20) {
      tooltip.left = maxLeft + tooltipWidth/2;
    }
    
    // For left/right positions, ensure they stay within vertical bounds
    if (position === 'left' || position === 'right') {
      const tooltipTopEdge = tooltip.top - tooltipHeight / 2;
      const tooltipBottomEdge = tooltip.top + tooltipHeight / 2;
      
      if (tooltipTopEdge < viewport.scrollY + 20) {
        tooltip.top = viewport.scrollY + tooltipHeight / 2 + 20;
      } else if (tooltipBottomEdge > viewport.scrollY + viewport.height - 20) {
        tooltip.top = viewport.scrollY + viewport.height - tooltipHeight / 2 - 20;
      }
      
      // Check if left/right position needs flipping
      if (position === 'left' && tooltip.left - tooltipWidth < viewport.scrollX + 20) {
        tooltip.left = coords.left + coords.width + offset;
        finalPosition = 'right';
      } else if (position === 'right' && tooltip.left + tooltipWidth > viewport.scrollX + viewport.width - 20) {
        tooltip.left = coords.left - offset;
        finalPosition = 'left';
      }
    }

    // Special handling for steps that commonly go off-screen (steps 7, 8)
    if (currentStep >= 6 && currentStep <= 7) { // Steps 7 and 8 (0-indexed: 6, 7)
      // Force center positioning for these problematic steps
      tooltip.top = viewport.scrollY + viewport.height / 2 - tooltipHeight / 2;
      tooltip.left = viewport.scrollX + viewport.width / 2;
      finalPosition = 'bottom';
      
      console.log(`Tour Step ${currentStep + 1}: Using center positioning due to common off-screen issues`);
    }

    return { ...tooltip, finalPosition };
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {/* Overlay */}
      <div className={`tour-overlay ${darkMode ? 'dark' : ''}`} onClick={onSkip}>
        {highlight && targetElement && (
          <div
            className="tour-highlight"
            style={{
              top: coords.top - 5,
              left: coords.left - 5,
              width: coords.width + 10,
              height: coords.height + 10
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className={`tour-tooltip tour-tooltip-${tooltipPosition.finalPosition} ${currentStep >= 6 && currentStep <= 7 ? 'tour-centered' : ''} ${darkMode ? 'dark' : ''}`}
        style={currentStep >= 6 && currentStep <= 7 ? {} : {
          top: tooltipPosition.top,
          left: tooltipPosition.left
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tour-tooltip-header">
          <h3>{title}</h3>
          <span className="tour-step-indicator">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        
        <div className="tour-tooltip-content">
          {content}
          {action && (
            <div className="tour-action">
              <button 
                className="tour-action-button"
                onClick={action.handler}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        <div className="tour-tooltip-footer">
          <div className="tour-keyboard-hint">
            <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
              Use arrow keys or buttons to navigate • ESC to exit
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {currentStep > 0 && (
              <button className="tour-button tour-button-secondary" onClick={onPrev}>
                ← Previous
              </button>
            )}
            
            <button className="tour-button tour-button-skip" onClick={onSkip}>
              Skip Tour
            </button>
            
            {currentStep < totalSteps - 1 ? (
              <button className="tour-button tour-button-primary" onClick={onNext}>
                Next →
              </button>
            ) : (
              <button className="tour-button tour-button-primary" onClick={onComplete}>
                Get Started! ✨
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const Tour = ({ isActive, onComplete, onOpenApiConfig, isDarkMode }) => {
  // Handle undefined isDarkMode prop
  const darkMode = isDarkMode || false;
  
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps = useMemo(() => [
    {
      target: '.app-header',
      title: '👋 Welcome to AI-Powered Flashcards!',
      content: (
        <div>
          <p>Let's take a quick tour to help you get started with the powerful AI features.</p>
          <p className="tour-tip">💡 This app uses AI to enhance your learning experience!</p>
        </div>
      ),
      position: 'bottom'
    },
    {
      target: '.api-key-button',
      title: '🔑 Set Up Your AI API Keys',
      content: (
        <div>
          <p>First, you'll need to add an API key to use AI features.</p>
          <p>Click the <strong>🔑 API Key</strong> button to add your OpenAI, Anthropic, or Google API key.</p>
          <p className="tour-tip">Don't have an API key? We'll show you how to get one!</p>
        </div>
      ),
      position: 'left',
      action: {
        label: 'Open API Settings',
        handler: onOpenApiConfig
      }
    },
    {
      target: '.action-buttons button:first-child',
      title: '📋 Manage Your Flashcards',
      content: (
        <div>
          <p>Click the <strong>📋 Manage Cards</strong> button to access all flashcard creation and management tools.</p>
          <p>Key features include:</p>
          <ul className="tour-list">
            <li><strong>➕ Create Cards</strong> - Add individual flashcards</li>
            <li><strong>🤖 Generate Questions</strong> - Use AI to create multiple cards at once</li>
            <li><strong>📁 Import/Export</strong> - Bulk manage your card collection</li>
            <li><strong>✏️ Edit & Organize</strong> - Modify existing cards and categories</li>
          </ul>
          <p className="tour-tip">Try: "Generate 5 flashcards about photosynthesis" in the AI tool!</p>
        </div>
      ),
      position: 'bottom'
    },
    {
      target: '.action-buttons button:nth-child(2)',
      title: '📅 Track Your Progress',
      content: (
        <div>
          <p>The <strong>📅 Calendar</strong> button shows your study progress and activity over time.</p>
          <p>Calendar features:</p>
          <ul className="tour-list">
            <li><strong>Daily Activity</strong> - See which days you studied</li>
            <li><strong>Review Counts</strong> - Track cards reviewed per day</li>
            <li><strong>Study Streaks</strong> - Monitor your consistency</li>
            <li><strong>Progress Visualization</strong> - Visual learning patterns</li>
          </ul>
          <p className="tour-tip">Great for tracking your learning consistency!</p>
        </div>
      ),
      position: 'bottom'
    },
    {
      target: '.flashcard-container, .flashcard-content, .flashcard-main-content, .flashcard-with-notes-container',
      title: '💡 Your Demo Card: "What is 2 + 2?"',
      content: (
        <div>
          <p>Here's your demo flashcard! This simple math question shows how the app works:</p>
          <ul className="tour-list">
            <li><strong>Question:</strong> "What is 2 + 2?"</li>
            <li><strong>Answer:</strong> "4" (click to reveal)</li>
            <li><strong>Category:</strong> Math → Addition</li>
          </ul>
          <p>When studying, you'll also see AI features like:</p>
          <ul className="tour-list">
            <li><strong>💡 Explain</strong> - Get detailed explanations</li>
            <li><strong>🤖 Generate Questions</strong> - Create similar cards</li>
          </ul>
          <p className="tour-tip">Click the card to reveal the answer "4", then rate your recall!</p>
        </div>
      ),
      position: 'top'
    },
    {
      target: '.filters-group',
      title: '📚 Organize Your Cards',
      content: (
        <div>
          <p>This blue section helps you organize and filter your flashcards!</p>
          <ul className="tour-list">
            <li><strong>📚 All/Today Toggle:</strong> Switch between all cards and due cards</li>
            <li><strong>⭐ Starred Filter:</strong> Show only your starred cards</li>
            <li><strong>📖 Categories:</strong> Filter by Math, Science, etc. (below)</li>
          </ul>
          <p>Your demo card is in <strong>Math → Addition</strong>.</p>
          <p className="tour-tip">Click "Today" to see only cards due for review!</p>
        </div>
      ),
      position: 'right'
    },
    {
      target: '.review-panel-below-categories',
      title: '🎯 Rate Your Knowledge',
      content: (
        <div>
          <p>Here are the rating buttons for the "What is 2 + 2?" demo card!</p>
          <p>After clicking the card to reveal the answer "4", use these buttons (or keys 1-4):</p>
          <ul className="tour-list">
            <li><strong>1 - Again 😵</strong> - Completely forgot it</li>
            <li><strong>2 - Hard 😓</strong> - Difficult to recall</li>
            <li><strong>3 - Good 😊</strong> - Normal recall (recommended for this demo)</li>
            <li><strong>4 - Easy 😎</strong> - Perfect recall</li>
          </ul>
          <p className="tour-tip">Try clicking "3 - Good" for the demo card since 2+2=4 is easy to remember!</p>
        </div>
      ),
      position: 'top',
      highlight: true
    },
    {
      target: '.notes-section-permanent, .right-side-content, .notes-header',
      title: '📝 Session Notes Panel',
      content: (
        <div>
          <p>This is your dedicated notes area for capturing insights while studying!</p>
          <p>Perfect for the "What is 2 + 2?" demo - you could note:</p>
          <ul className="tour-list">
            <li><strong>Basic arithmetic</strong> - Addition fundamentals</li>
            <li><strong>Memory techniques</strong> - How you remember math facts</li>
            <li><strong>Related concepts</strong> - Other math operations</li>
          </ul>
          <p>Notes features:</p>
          <ul className="tour-list">
            <li><strong>Rich Text Editor</strong> - Format with bold, italic, lists</li>
            <li><strong>Auto-Save</strong> - Notes save automatically as you type</li>
            <li><strong>Pop-out Window</strong> - Click the expand button for separate window</li>
          </ul>
          <p className="tour-tip">Try typing a note about the demo card to test the editor!</p>
        </div>
      ),
      position: 'left',
      highlight: true
    },
    {
      target: '.settings-button, .action-buttons button[title*="Settings"], .header-right button:last-child',
      title: '⚙️ Customize Your Experience',
      content: (
        <div>
          <p>Click the <strong>⚙️ Settings</strong> button to customize your experience:</p>
          <ul className="tour-list">
            <li><strong>🌙 Dark Mode</strong> - Toggle light/dark theme</li>
            <li><strong>📊 Study Intervals</strong> - Adjust review timing</li>
            <li><strong>📁 Import/Export</strong> - Manage your flashcards</li>
            <li><strong>🎯 Run This Tour Again</strong> - Anytime from Help & Support!</li>
          </ul>
        </div>
      ),
      position: 'bottom'
    },
    {
      target: 'button[title*="View:"], .btn[title*="View:"]',
      title: '🔄 Switch View Modes',
      content: (
        <div>
          <p>Click this button to cycle through different view modes for your study experience!</p>
          <p>Available view modes:</p>
          <ul className="tour-list">
            <li><strong>👁️ Normal</strong> - Standard view with notes panel visible</li>
            <li><strong>🎯 Focus</strong> - Minimized distractions, notes panel hidden</li>
            <li><strong>🔳 Fullscreen</strong> - Maximized view for immersive studying</li>
            <li><strong>📱 Popout</strong> - Study in a separate resizable window</li>
          </ul>
          <p className="tour-tip">You're all set! Start creating flashcards and studying! 🚀</p>
        </div>
      ),
      position: 'bottom'
    }
  ], [onOpenApiConfig]);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, tourSteps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Debug: Log all tour targets when tour becomes active
  useEffect(() => {
    if (!isActive) return;

    console.log('🎯 Tour Debug: Checking all tour step targets...');
    tourSteps.forEach((step, index) => {
      const selectors = step.target.split(',').map(s => s.trim());
      let found = false;
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`✅ Step ${index + 1} (${step.title}): Found "${selector}"`, element);
          // Log the element's position and size for debugging
          const rect = element.getBoundingClientRect();
          console.log(`   Position: ${rect.top}, ${rect.left}, Size: ${rect.width}x${rect.height}`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.warn(`❌ Step ${index + 1} (${step.title}): Could not find any of: ${step.target}`);

        // Special debug for flashcard step
        if (step.title.includes('Demo Card')) {
          console.log('🔍 Flashcard debug - checking available elements:');
          console.log('  - .flashcard-container:', !!document.querySelector('.flashcard-container'));
          console.log('  - .flashcard-content:', !!document.querySelector('.flashcard-content'));
          console.log('  - .flashcard-main-content:', !!document.querySelector('.flashcard-main-content'));
          console.log('  - .flashcard-with-notes-container:', !!document.querySelector('.flashcard-with-notes-container'));

          // Check if we have any flashcards in the DOM
          const allFlashcardElements = document.querySelectorAll('[class*="flashcard"]');
          console.log('  - All flashcard-related elements:', Array.from(allFlashcardElements).map(el => el.className));
        }
      }
    });
  }, [isActive, tourSteps]);

  // Add keyboard navigation support
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          if (currentStep < tourSteps.length - 1) {
            setCurrentStep(currentStep + 1);
          } else {
            handleComplete();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
          }
          break;
        case 'Escape':
          event.preventDefault();
          handleSkip();
          break;
        case 'Enter':
        case ' ': // Spacebar
          event.preventDefault();
          if (currentStep < tourSteps.length - 1) {
            setCurrentStep(currentStep + 1);
          } else {
            handleComplete();
          }
          break;
        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, currentStep, tourSteps.length, handleComplete, handleSkip]);

  if (!isActive) return null;

  return (
    <TourStep
      step={tourSteps[currentStep]}
      currentStep={currentStep}
      totalSteps={tourSteps.length}
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={handleSkip}
      onComplete={handleComplete}
      isDarkMode={darkMode}
    />
  );
};

export default Tour;