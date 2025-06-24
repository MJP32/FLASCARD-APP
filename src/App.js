import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, updateDoc, doc, getDoc, setDoc, deleteDoc, getDocs, where, Timestamp } from 'firebase/firestore';
import LoginScreen from './LoginScreen.jsx';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import Calendar from './Calendar';
import RichTextEditor from './RichTextEditor';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Main App component for the flashcard application
function App() {
  // Settings states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showIntervalSettings, setShowIntervalSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false); // To ensure settings are loaded before saving/using them
  const [fsrsParams, setFsrsParams] = useState({
    requestRetention: 0.9,
    maximumInterval: 36500,
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
    initialDifficulty: 5,
    fuzzFactor: 0.05,
    easyFactor: 1.3,
    goodFactor: 1.0,
    hardFactor: 0.8,
    againFactor: 0.5,
    initialStability: 2,
    // Initial intervals for first review
    initialAgainInterval: 1,
    initialHardInterval: 1,
    initialGoodInterval: 4,  // Changed from default 3 to 4
    initialEasyInterval: 15
  });

  // State variables for Firebase, user authentication, and flashcards
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [flashcards, setFlashcards] = useState([]); // All flashcards from Firestore
  const [filteredFlashcards, setFilteredFlashcards] = useState([]); // Flashcards after category filter
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [showCreateCardForm, setShowCreateCardForm] = useState(false); // State for toggling create card form
  const [showUploadCsvForm, setShowUploadCsvForm] = useState(false); // State for toggling CSV upload form
  const [uploadMessage, setUploadMessage] = useState(''); // Message for CSV upload success
  const [uploadError, setUploadError] = useState('');     // Message for CSV upload errors
  const [showCalendarModal, setShowCalendarModal] = useState(false); // State for calendar modal visibility
  const [calendarDates, setCalendarDates] = useState([]); // State for calendar dates and card counts
  const [showLoginModal, setShowLoginModal] = useState(false); // State for login modal visibility
  const [selectedCategory, setSelectedCategory] = useState('All'); // State for selected category filter
  const [categorySortBy, setCategorySortBy] = useState('alphabetical'); // State for category sort order: 'alphabetical', 'most-due', 'least-due'
  const [authError, setAuthError] = useState(''); // New state for Firebase authentication errors
  const [userDisplayName, setUserDisplayName] = useState(''); // New state for user display name

  // Login screen states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDueTodayOnly, setShowDueTodayOnly] = useState(true); // Show only cards due today when logged in
  const [showLoginScreen, setShowLoginScreen] = useState(true); // Always show login screen first
  
  // Flag to prevent React re-renders during keyboard events
  const isKeyboardEventRef = useRef(false);
  
  // State to prevent double-clicking review buttons
  const [isReviewing, setIsReviewing] = useState(false);

  // Initialize theme immediately on load to prevent flash
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    
    // Apply theme immediately to prevent flash
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, []);

  // Apply/remove .dark class on html and body for complete theme coverage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Settings states
  // Removed duplicate settings state declarations from here. Only keep the ones at the top of the component.
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false); // State for Gemini API loading (Suggest Answer)
  const [isGeneratingExample, setIsGeneratingExample] = useState(false); // State for Gemini API loading (Generate Example)
  const [generatedExample, setGeneratedExample] = useState(''); // State to store generated example
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false); // State for Gemini API loading (Generate Questions)
  const [generatedQuestions, setGeneratedQuestions] = useState([]); // State to store generated questions for selection
  const [selectedQuestions, setSelectedQuestions] = useState([]); // State to track which questions are selected
  const [showGeneratedQuestionsModal, setShowGeneratedQuestionsModal] = useState(false); // State for related questions modal
  const [isExplainingConcept, setIsExplainingConcept] = useState(false); // State for Gemini API loading (Explain Concept)
  const [geminiExplanation, setGeminiExplanation] = useState(''); // State to store generated explanation

  const [showCsvGuide, setShowCsvGuide] = useState(false); // State for toggling CSV guide visibility in settings
  const [showAboutFsrs, setShowAboutFsrs] = useState(false); // State for About FSRS dropdown
  const [showUserInfo, setShowUserInfo] = useState(false); // State for User Info dropdown
  const [showFsrsFactors, setShowFsrsFactors] = useState(false); // State for FSRS Factors dropdown - closed by default
  const [showGenerationPrompt, setShowGenerationPrompt] = useState(false); // State for Generation Prompt dropdown
  const [showApiKeys, setShowApiKeys] = useState(false); // State for API Keys dropdown
  const [showFeedback, setShowFeedback] = useState(false); // State for Feedback dropdown
  const [feedbackText, setFeedbackText] = useState(''); // State for feedback text
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv'); // 'csv' or 'excel'

  // API Keys state
  const [apiKeys, setApiKeys] = useState({
    gemini: process.env.REACT_APP_GEMINI_API_KEY || '',
    anthropic: process.env.REACT_APP_ANTHROPIC_API_KEY || '',
    openai: process.env.REACT_APP_OPENAI_API_KEY || ''
  });
  const [selectedApiProvider, setSelectedApiProvider] = useState('gemini'); // Default to Gemini

  // Edit Card states
  const [isEditingCard, setIsEditingCard] = useState(false); // State for edit mode
  const [editCardData, setEditCardData] = useState(null); // Data for the card being edited
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); // State for delete confirmation
  const [isGeneratingSelectedCards, setIsGeneratingSelectedCards] = useState(false); // New state for batch generation loading
  const [copyFeedback, setCopyFeedback] = useState(''); // State for copy button feedback
  const [formattedAnswerContent, setFormattedAnswerContent] = useState(''); // Store formatted content
  const [formattedQuestionContent, setFormattedQuestionContent] = useState(''); // Store formatted content
  const [editQuestion, setEditQuestion] = useState(""); // Controlled state for edit question field
  const [editAnswer, setEditAnswer] = useState(""); // Controlled state for edit answer field
  // Tracking state for debugging contentEditable behavior
  const [contentEditableDebug, setContentEditableDebug] = useState("");

  // Refs for new card input fields and file input
  const newCardQuestionRef = useRef(null);
  const newCardAnswerRef = useRef(null);
  const newCardCategoryRef = useRef(null); // Ref for new card category input
  const newCardAdditionalInfoRef = useRef(null); // New ref for additional info
  const fileInputRef = useRef(null); // Ref for the CSV file input
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]); // State to hold selected file objects (array)

  // Refs for edit card inputs
  const editQuestionRef = useRef(null);
  // Note: Removed editAnswerRef since we're now using RichTextEditor component
  const editCategoryRef = useRef(null);
  const editAdditionalInfoRef = useRef(null);
  
  // Ref to preserve card position after editing
  const preservedCardIndexRef = useRef(null);

  // Shared formatting function for both questions and answers
  const formatAnswer = (text) => {
    console.log('📥 formatAnswer called with text length:', text?.length);
    console.log('📥 formatAnswer preview:', text?.substring(0, 100));
    
    if (!text || !text.trim()) {
      console.log('❌ formatAnswer: empty text, returning empty');
      return '';
    }
    
    console.log('✅ formatAnswer: processing text of length', text.length);
    
    // First, check if this is primarily code content
    // More specific code detection - avoid false positives with markdown formatting
    const codeIndicators = /^[\s]*```|^[\s]*\{[\s]*$|^[\s]*public class|^[\s]*function\s*\(|^[\s]*def\s+\w+\s*\(|^[\s]*#include|^[\s]*import\s+|^[\s]*<\w+|^[\s]*if\s*\(|^[\s]*for\s*\(|^[\s]*while\s*\(/.test(text);
    
    // Only count programming-specific special characters, not formatting characters
    const programmingSpecialChars = text.match(/[{}();]/g) || [];
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const specialCharRatio = programmingSpecialChars.length / words.length;
    
    // Check for markdown/formatting patterns that should NOT be treated as code
    const hasMarkdownFormatting = /\*\*[^*]+\*\*|\*[^*]+\*|•|◦|▪|▫|→|←|↑|↓/.test(text);
    const hasStructuredText = /advantages|disadvantages|benefits|drawbacks|pros|cons|overview|summary|definition|concept/i.test(text);
    
    // More restrictive code detection - require either explicit code indicators OR high ratio of programming chars WITHOUT formatting indicators
    const isCodeContent = codeIndicators || (specialCharRatio > 0.25 && words.length > 10 && !hasMarkdownFormatting && !hasStructuredText);
    
    console.log('formatAnswer: Code detection analysis:');
    console.log('  - codeIndicators:', codeIndicators);
    console.log('  - programmingSpecialChars count:', programmingSpecialChars.length);
    console.log('  - words count:', words.length);
    console.log('  - specialCharRatio:', specialCharRatio);
    console.log('  - hasMarkdownFormatting:', hasMarkdownFormatting);
    console.log('  - hasStructuredText:', hasStructuredText);
    console.log('  - final isCodeContent:', isCodeContent);
    
    if (isCodeContent) {
      console.log('formatAnswer: treating as code, returning as-is');
      // For code content, preserve existing code formatting logic
      return text; // Return as-is for now, or implement existing code formatting
    }
    
    console.log('formatAnswer: treating as human-readable text, applying formatting');
    
    // First, preprocess the text to improve structure and readability
    const preprocessText = (rawText) => {
      let processed = rawText;
      
      // STEP 1: Detect and format code blocks
      // Look for code patterns and wrap them in proper code blocks
      processed = processed.replace(/\b(public\s+class\s+\w+|function\s+\w+\s*\(|def\s+\w+\s*\(|if\s*\([^)]+\)|for\s*\([^)]+\)|while\s*\([^)]+\)|try\s*\{|catch\s*\([^)]+\))[^.]*[;}]/gi, '\n```\n$&\n```\n');
      
      // Format method calls and code snippets
      processed = processed.replace(/\b(\w+\.\w+\([^)]*\)|\w+\([^)]*\)|new\s+\w+\([^)]*\))/g, '`$1`');
      
      // Format class names and type names
      processed = processed.replace(/\b([A-Z][a-zA-Z]*(?:Exception|Error|Thread|Stream|List|Map|Set|Queue|Interface|Class))\b/g, '`$1`');
      
      // STEP 2: Improve list formatting dramatically
      // Convert sequences of items into proper lists
      processed = processed.replace(/([.!?])\s+((?:\w+[^.!?]*[,;]\s*)+\w+[^.!?]*\.)/g, (match, ending, listText) => {
        const items = listText.replace(/\.$/, '').split(/[,;]\s*/);
        if (items.length >= 3) {
          const formattedList = items.map((item, index) => `${index + 1}. ${item.trim()}`).join('\n');
          return `${ending}\n\n${formattedList}\n`;
        }
        return match;
      });
      
      // STEP 3: Improve numbered lists - ensure each number starts on new line
      processed = processed.replace(/([.!?])\s*(\d+\.\s+)/g, '$1\n\n$2');
      processed = processed.replace(/([^.\n])\s+(\d+\.\s+)/g, '$1\n\n$2');
      
      // STEP 4: Add line breaks before bold text patterns
      processed = processed.replace(/([.!?])\s*(\*\*[^*]+\*\*)/g, '$1\n\n$2');
      processed = processed.replace(/([a-z.])\s*(\*\*[A-Z][^*]+\*\*)/g, '$1\n\n$2');
      
      // STEP 5: Add line breaks before section headers
      processed = processed.replace(/([.!?])\s*([A-Z][A-Za-z\s]{2,30}:)/g, '$1\n\n$2');
      processed = processed.replace(/([.!?])\s*(Advantages?|Disadvantages?|Benefits?|Drawbacks?|Pros?|Cons?):/gi, '$1\n\n$2:');
      processed = processed.replace(/([.!?])\s*(Performance|Implementation|Usage|Example|Overview|Definition|Concept|Framework|Pattern|Method|Interface|Class|Algorithm)([:\s])/gi, '$1\n\n$2$3');
      processed = processed.replace(/([.!?])\s*(How\s+[^:]{5,25}:|What\s+[^:]{5,25}:|Why\s+[^:]{5,25}:|When\s+[^:]{5,25}:)/gi, '$1\n\n$2');
      
      // STEP 6: Add line breaks before bullet points and improve bullet formatting
      processed = processed.replace(/([.!?])\s*([•▪▫◦])/g, '$1\n$2');
      processed = processed.replace(/([^.\n])\s*([•▪▫◦])/g, '$1\n$2');
      
      // Convert comma-separated items into bullet lists when appropriate
      processed = processed.replace(/:\s*([^.!?:]*(?:,\s*[^.!?:]*){2,}[.!?])/g, (match, listText) => {
        const items = listText.replace(/[.!?]$/, '').split(/,\s*/);
        if (items.length >= 3 && items.every(item => item.length < 50)) {
          const formattedList = items.map(item => `• ${item.trim()}`).join('\n');
          return `:\n${formattedList}\n`;
        }
        return match;
      });
      
      // STEP 7: Bold key terms and important concepts
      processed = processed.replace(/\b(ForkJoin|Thread|Synchronized|Performance|Memory|CPU|Framework|Algorithm|Implementation|Interface|Class|Method|API|Database|Network|Security|Lock|Queue|Stream|Parallel|Concurrent|Asynchronous|Synchronous|ExecutorService|CompletableFuture|ConcurrentHashMap)\b/gi, '<strong>$1</strong>');
      
      // STEP 8: Convert existing markdown formatting
      processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      
      // STEP 9: Format code blocks properly
      processed = processed.replace(/```\n([^`]+)\n```/g, '<pre><code>$1</code></pre>');
      
      // STEP 10: Improve spacing and structure
      processed = processed.replace(/\.([A-Z])/g, '. $1');
      processed = processed.replace(/\s+/g, ' ').trim();
      processed = processed.replace(/\n\s*\n/g, '\n\n');
      
      // STEP 11: Group related content - add extra spacing between major sections
      processed = processed.replace(/(\n\n)(Advantages?:|Disadvantages?:|Benefits?:|Drawbacks?:)/gi, '$1\n$2');
      processed = processed.replace(/(\n\n)(Performance|Implementation|Usage|Example|Overview|Definition|Concept)/gi, '$1\n$2');
      
      // STEP 12: Add proper paragraph breaks for readability
      processed = processed.replace(/([.!?])\s+([A-Z][^.!?]*(?:is|are|can|will|should|must|provides|offers|enables|allows|requires|involves)[^.!?]*[.!?])/g, '$1\n\n$2');
      
      console.log('📝 Enhanced text preprocessing with code formatting completed');
      console.log('📄 Original length:', rawText.length);
      console.log('📄 Processed length:', processed.length);
      console.log('📋 Preview:', processed.substring(0, 250) + '...');
      
      return processed;
    };
    
    // Apply text preprocessing
    const preprocessedText = preprocessText(text);
    
    // Human-readable text transformation
    let result = [];
    
    // Helper function to add proper icons based on content type
    const getTopicIcon = (content) => {
      const lower = content.toLowerCase();
      if (lower.includes('java') || lower.includes('thread') || lower.includes('synchronized')) return '☕';
      if (lower.includes('lock') || lower.includes('security')) return '🔒';
      if (lower.includes('interface') || lower.includes('api')) return '🛠️';
      if (lower.includes('database') || lower.includes('sql')) return '🗄️';
      if (lower.includes('network') || lower.includes('http')) return '🌐';
      if (lower.includes('algorithm') || lower.includes('performance')) return '⚡';
      if (lower.includes('design') || lower.includes('pattern')) return '🎨';
      if (lower.includes('test') || lower.includes('debug')) return '🔍';
      return ''; // Remove default pin icon
    };
    
    // Split preprocessed text into logical sections
    const sections = [];
    // Split by line breaks first, then by sentences, to handle the new structure
    const lines = preprocessedText.split(/\n+/).filter(line => line.trim());
    const sentences = [];
    
    // Process each line and split further if needed
    lines.forEach(line => {
      if (line.includes('.') && !line.endsWith(':')) {
        // Split sentences within the line
        const lineSentences = line.split(/\.\s+/).filter(s => s.trim());
        sentences.push(...lineSentences);
      } else {
        // Keep the line as is (headers, single sentences, etc.)
        sentences.push(line.trim());
      }
    });
    
    let currentSection = null;
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      
      // Detect section headers/topics - enhanced to work with preprocessed text
      const isNewTopic = trimmed.match(/^[A-Z][a-z]+ (?:keyword|interface|method|class|pattern|algorithm)/i) ||
                        (trimmed.includes(':') && trimmed.split(':')[0].length < 50) ||
                        trimmed.match(/^<strong>[^<]+<\/strong>/i) ||  // Bold headers
                        trimmed.match(/^(Performance|Implementation|Usage|Example|Overview|Definition|Concept|Framework|Pattern|Method|Interface|Class|Algorithm|How\s+[^:]+|What\s+[^:]+|Why\s+[^:]+|When\s+[^:]+)/i);
      
      if (isNewTopic) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section - clean up HTML tags for title
        let topicName = trimmed.includes(':') ? trimmed.split(':')[0].trim() : trimmed;
        // Remove HTML tags from title
        topicName = topicName.replace(/<[^>]*>/g, '');
        const description = trimmed.includes(':') ? trimmed.split(':').slice(1).join(':').trim() : '';
        
        currentSection = {
          title: topicName,
          description: description,
          advantages: [],
          disadvantages: [],
          content: []
        };
      } else {
        // Add to current section or create a section without 'Overview' title
        if (!currentSection) {
          currentSection = {
            title: '',  // Remove 'Overview' title
            description: '',
            advantages: [],
            disadvantages: [],
            content: []
          };
        }
        
        // Parse advantages and disadvantages
        if (trimmed.toLowerCase().includes('advantage')) {
          const advText = trimmed.replace(/advantages?:?\s*/gi, '').trim();
          const advantages = advText.split(/,\s*(?=[A-Z])/).filter(adv => adv.trim());
          currentSection.advantages.push(...advantages);
        } else if (trimmed.toLowerCase().includes('disadvantage')) {
          const disAdvText = trimmed.replace(/disadvantages?:?\s*/gi, '').trim();
          const disadvantages = disAdvText.split(/,\s*(?=[A-Z])/).filter(dis => dis.trim());
          currentSection.disadvantages.push(...disadvantages);
        } else {
          currentSection.content.push(trimmed);
        }
      }
    });
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    console.log('formatAnswer: sections created =', sections.length);
    sections.forEach((section, i) => {
      console.log(`Section ${i}:`, {
        title: section.title,
        description: section.description?.substring(0, 50),
        advantages: section.advantages.length,
        disadvantages: section.disadvantages.length,
        content: section.content.length
      });
    });
    
    // If no sections were created, create a simple formatted version with better structure
    if (sections.length === 0) {
      console.log('formatAnswer: no sections detected, creating simple format');
      
      // Convert line breaks to HTML breaks and add enhanced formatting
      const lines = preprocessedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let formattedContent = '';
      let inListGroup = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = lines[i + 1];
        const isCurrentList = line.match(/^\d+\.\s+/) || line.match(/^[•▪▫◦]\s+/);
        const isNextList = nextLine && (nextLine.match(/^\d+\.\s+/) || nextLine.match(/^[•▪▫◦]\s+/));
        
        // Start list group
        if (isCurrentList && !inListGroup) {
          formattedContent += '<div style="margin: 12px 0; padding: 12px; background: #f1f5f9; border-radius: 8px; border-left: 4px solid #3b82f6;">';
          inListGroup = true;
        }
        
        // Style different line types
        if (line.match(/^<pre><code>/)) {
          // Code blocks with syntax highlighting
          formattedContent += `<div style="margin: 16px 0; background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 14px; line-height: 1.4; overflow-x: auto;">${line.replace(/<\/?pre><\/?code>/g, '')}</div>`;
        } else if (line.match(/^[•▪▫◦]\s+/)) {
          // Bullet points
          formattedContent += `<div style="margin: 6px 0; padding-left: 16px; color: #1e40af; font-weight: 500; position: relative;">
            <span style="position: absolute; left: 0; color: #3b82f6;">•</span>
            ${line.replace(/^[•▪▫◦]\s+/, '')}
          </div>`;
        } else if (line.match(/^\d+\.\s+/)) {
          // Numbered lists with better styling
          const number = line.match(/^(\d+)\./)[1];
          const content = line.replace(/^\d+\.\s+/, '');
          formattedContent += `<div style="margin: 8px 0; padding-left: 24px; color: #1e40af; font-weight: 500; position: relative;">
            <span style="position: absolute; left: 0; color: #3b82f6; font-weight: bold; min-width: 20px;">${number}.</span>
            ${content}
          </div>`;
        } else if (line.endsWith(':')) {
          // Section headers with enhanced styling
          formattedContent += `<div style="margin: 20px 0 12px 0; color: #1d4ed8; font-weight: bold; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">${line}</div>`;
        } else if (line.match(/^<strong>[^<]+<\/strong>/)) {
          // Bold headers
          formattedContent += `<div style="margin: 16px 0 8px 0; color: #1d4ed8; font-weight: bold; font-size: 16px;">${line}</div>`;
        } else {
          // Regular content with better typography and inline code formatting
          let processedLine = line;
          
          // Style inline code with backticks
          processedLine = processedLine.replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-family: \'Consolas\', \'Monaco\', \'Courier New\', monospace; font-size: 13px;">$1</code>');
          
          formattedContent += `<div style="margin: 8px 0; line-height: 1.6; color: #374151;">${processedLine}</div>`;
        }
        
        // End list group
        if (inListGroup && !isNextList) {
          formattedContent += '</div>';
          inListGroup = false;
        }
      }
      
      // Close any open list group
      if (inListGroup) {
        formattedContent += '</div>';
      }
      
      return `<div style="background: #f8fafc; color: #334155; padding: 15px; border-radius: 6px; margin: 6px 0; border-left: 3px solid #cbd5e1;">${formattedContent}</div>`;
    }
    
    // Format each section beautifully with colors and visual separation
    sections.forEach((section, index) => {
      // Only add section header if there's a title
      if (section.title && section.title.trim()) {
        // Remove the icon from section headers
        result.push(`<div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 12px 16px; border-radius: 8px; margin: 16px 0 8px 0; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${section.title}</div>`);
      }
      
      // Description with light blue background
      if (section.description) {
        const description = section.description + (section.description.endsWith('.') ? '' : '.');
        result.push(`<div style="background: #eff6ff; color: #1e40af; padding: 12px; border-radius: 6px; margin: 8px 0; border-left: 4px solid #3b82f6; font-weight: 500;">${description}</div>`);
      }
      
      // Additional content with subtle background
      section.content.forEach(content => {
        if (content && !content.toLowerCase().includes('advantage') && !content.toLowerCase().includes('disadvantage')) {
          const formattedContent = content + (content.endsWith('.') ? '' : '.');
          result.push(`<div style="background: #f8fafc; color: #334155; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 3px solid #cbd5e1;">${formattedContent}</div>`);
        }
      });
      
      result.push(''); // Spacing
      
      // Advantages section with green theme
      if (section.advantages.length > 0) {
        result.push(`<div style="background: linear-gradient(135deg, #10b981, #047857); color: white; padding: 10px 16px; border-radius: 8px; margin: 16px 0 8px 0; font-weight: bold; font-size: 16px;">✅ Advantages</div>`);
        section.advantages.forEach(advantage => {
          const cleanAdv = advantage.replace(/[,.]$/, '').trim();
          
          // Check if advantage has sub-points (parenthetical examples)
          if (cleanAdv.includes('(') && cleanAdv.includes(')')) {
            const mainPoint = cleanAdv.split('(')[0].trim();
            const examples = cleanAdv.match(/\([^)]+\)/g) || [];
            
            result.push(`<div style="background: #d1fae5; color: #065f46; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 4px solid #10b981; font-weight: 600;">• ${mainPoint}</div>`);
            examples.forEach(example => {
              const exampleText = example.replace(/[()]/g, '').trim();
              const examplePoints = exampleText.split(/,\s*(?=\w)/).filter(ex => ex.trim());
              
              if (examplePoints.length > 1) {
                examplePoints.forEach(point => {
                  result.push(`<div style="background: #ecfdf5; color: #047857; padding: 8px 8px 8px 24px; border-radius: 4px; margin: 4px 0 4px 20px; border-left: 2px solid #34d399;">◦ ${point.trim()}</div>`);
                });
              } else {
                result.push(`<div style="background: #ecfdf5; color: #047857; padding: 8px 8px 8px 24px; border-radius: 4px; margin: 4px 0 4px 20px; border-left: 2px solid #34d399;">◦ ${exampleText}</div>`);
              }
            });
          } else {
            // Simple advantage
            const isSimple = cleanAdv.length < 50 && !cleanAdv.includes(',');
            if (isSimple) {
              result.push(`<div style="background: #d1fae5; color: #065f46; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 4px solid #10b981; font-weight: 600;">• ${cleanAdv}</div>`);
            } else {
              // Split complex advantages
              const parts = cleanAdv.split(',').filter(p => p.trim());
              if (parts.length > 1) {
                const mainPoint = parts[0].trim();
                result.push(`<div style="background: #d1fae5; color: #065f46; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 4px solid #10b981; font-weight: 600;">• ${mainPoint}</div>`);
                parts.slice(1).forEach(part => {
                  result.push(`<div style="background: #ecfdf5; color: #047857; padding: 8px 8px 8px 24px; border-radius: 4px; margin: 4px 0 4px 20px; border-left: 2px solid #34d399;">◦ ${part.trim()}</div>`);
                });
              } else {
                result.push(`<div style="background: #d1fae5; color: #065f46; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 4px solid #10b981;">• ${cleanAdv}</div>`);
              }
            }
          }
        });
        result.push(''); // Spacing
      }
      
      // Disadvantages section with red theme
      if (section.disadvantages.length > 0) {
        result.push(`<div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 10px 16px; border-radius: 8px; margin: 16px 0 8px 0; font-weight: bold; font-size: 16px;">⚠️ Disadvantages</div>`);
        section.disadvantages.forEach(disadvantage => {
          const cleanDisAdv = disadvantage.replace(/[,.]$/, '').trim();
          
          // Check if disadvantage has sub-points
          if (cleanDisAdv.includes('(') && cleanDisAdv.includes(')')) {
            const mainPoint = cleanDisAdv.split('(')[0].trim();
            const examples = cleanDisAdv.match(/\([^)]+\)/g) || [];
            
            result.push(`<div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 4px solid #ef4444; font-weight: 600;">• ${mainPoint}</div>`);
            examples.forEach(example => {
              const exampleText = example.replace(/[()]/g, '').trim();
              const examplePoints = exampleText.split(/,\s*(?=\w)/).filter(ex => ex.trim());
              
              if (examplePoints.length > 1) {
                examplePoints.forEach(point => {
                  result.push(`<div style="background: #fef2f2; color: #dc2626; padding: 8px 8px 8px 24px; border-radius: 4px; margin: 4px 0 4px 20px; border-left: 2px solid #f87171;">◦ ${point.trim()}</div>`);
                });
              } else {
                result.push(`<div style="background: #fef2f2; color: #dc2626; padding: 8px 8px 8px 24px; border-radius: 4px; margin: 4px 0 4px 20px; border-left: 2px solid #f87171;">◦ ${exampleText}</div>`);
              }
            });
          } else {
            // Split complex disadvantages
            const parts = cleanDisAdv.split(',').filter(p => p.trim());
            if (parts.length > 1) {
              const mainPoint = parts[0].trim();
              result.push(`<div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 4px solid #ef4444; font-weight: 600;">• ${mainPoint}</div>`);
              parts.slice(1).forEach(part => {
                result.push(`<div style="background: #fef2f2; color: #dc2626; padding: 8px 8px 8px 24px; border-radius: 4px; margin: 4px 0 4px 20px; border-left: 2px solid #f87171;">◦ ${part.trim()}</div>`);
              });
            } else {
              result.push(`<div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; margin: 6px 0; border-left: 4px solid #ef4444;">• ${cleanDisAdv}</div>`);
            }
          }
        });
        result.push(''); // Spacing
      }
      
      // Add section separator between major sections
      if (index < sections.length - 1) {
        result.push(`<div style="height: 2px; background: linear-gradient(90deg, transparent, #cbd5e1, transparent); margin: 24px 0;"></div>`);
      }
    });
    
    // Final cleanup and enhancement for HTML formatted content
    let formatted = result.join('\n');
    
    // Clean up extra spacing in HTML content
    formatted = formatted
      .replace(/\n{3,}/g, '\n\n')           // Limit blank lines
      .replace(/>\s+</g, '><')              // Remove spaces between HTML tags
      .trim();
    
    console.log('formatAnswer: returning formatted result, length =', formatted.length);
    console.log('formatAnswer: result preview =', formatted.substring(0, 300));
    return formatted;
  };

  // Utility function to save cursor position
  const saveCursorPosition = (element) => {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  // Utility function to restore cursor position
  const restoreCursorPosition = (element, pos) => {
    if (pos === null) return;
    
    const selection = window.getSelection();
    const range = document.createRange();
    
    let charIndex = 0;
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const nextCharIndex = charIndex + node.textContent.length;
      if (pos <= nextCharIndex) {
        range.setStart(node, pos - charIndex);
        range.setEnd(node, pos - charIndex);
        break;
      }
      charIndex = nextCharIndex;
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // Effect to update contentEditable content without using dangerouslySetInnerHTML
  useEffect(() => {
    if (editQuestionRef.current && isEditingCard) {
      const element = editQuestionRef.current;
      if (element.innerHTML !== editQuestion) {
        const savedPos = saveCursorPosition(element);
        element.innerHTML = editQuestion;
        if (savedPos !== null) {
          restoreCursorPosition(element, savedPos);
        }
      }
    }
  }, [editQuestion, isEditingCard]);
  
  // Note: Removed editAnswerRef useEffect since we're now using RichTextEditor component

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (isFirebaseInitialized) {
      console.log("Firebase already initialized, skipping");
      return;
    }
    
    try {
      console.log("Initializing Firebase...");
      // Your web app's Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyC3R7pV3mXqg2-kY9xvH126BoF5KQDQDls",
        authDomain: "flashcard-app-3f2a3.firebaseapp.com",
        projectId: "flashcard-app-3f2a3",
        storageBucket: "flashcard-app-3f2a3.firebasestorage.app",
        messagingSenderId: "399745541062",
        appId: "1:399745541062:web:958a2cfbd7c6c9c78988c7",
        measurementId: "G-6LJ19R2ZTZ"
      };

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authentication = getAuth(app);
      
      setDb(firestore);
      setAuth(authentication);
      setIsFirebaseInitialized(true);

      const unsubscribe = onAuthStateChanged(authentication, async (user) => {
        if (user) {
          setUserId(user.uid);
          setAuthError(''); // Clear auth error on successful sign-in
          setUserDisplayName(user.displayName || user.email || user.uid); // Set user display name
          setShowLoginScreen(false); // Hide login screen when user is authenticated
        } else {
          setUserId(null);
          setUserDisplayName('');
          setShowLoginScreen(true); // Show login screen when no user is authenticated
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase app:", error);
      setAuthError("Failed to initialize Firebase. Check console for details.");
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      setAuthError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in successfully:", userCredential.user.uid);
    } catch (error) {
      console.error("Login error:", error);
      setAuthError(`Login failed: ${error.message}`);
    }
  };

  // Function to handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      setAuthError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User registered successfully:", userCredential.user.uid);
    } catch (error) {
      console.error("Registration error:", error);
      setAuthError(`Registration failed: ${error.message}`);
    }
  };

  // Function to handle anonymous login
  const handleAnonymousLogin = async () => {
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      setAuthError('');
      const userCredential = await signInAnonymously(auth);
      console.log("User logged in anonymously:", userCredential.user.uid);
    } catch (error) {
      console.error("Anonymous login error:", error);
      setAuthError(`Anonymous login failed: ${error.message}`);
    }
  };

  // Function to handle logout
  const handleLogout = async () => {
    if (!auth) {
      setAuthError("Authentication not initialized");
      return;
    }

    try {
      await signOut(auth);
      setUserId(null);
      setUserDisplayName('');
      setAuthError('');
      setShowSettingsModal(false);
      setEmail('');
      setPassword('');
      setShowLoginScreen(true);
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
      setAuthError(`Logout failed: ${error.message}`);
    }
  };

  // Fetch/Set FSRS settings and dark mode from Firestore
  useEffect(() => {
    if (db && userId && isAuthReady) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');

      const fetchSettings = async () => {
        try {
          const docSnap = await getDoc(settingsDocRef);
          if (docSnap.exists()) {
            const fetchedSettings = docSnap.data();
            setFsrsParams(prev => ({ ...prev, ...fetchedSettings.fsrsParams }));
            setIsDarkMode(fetchedSettings.isDarkMode || false);
            setApiKeys(prev => ({ ...prev, ...fetchedSettings.apiKeys }));
            setSelectedApiProvider(fetchedSettings.selectedApiProvider || 'gemini');
          } else {
            // Set initial settings if they don't exist
            await setDoc(settingsDocRef, {
              fsrsParams: fsrsParams, // use default initial state
              isDarkMode: false,
              apiKeys: { gemini: '', anthropic: '', openai: '' },
              selectedApiProvider: 'gemini'
            });
          }
          setSettingsLoaded(true); // Mark settings as loaded
        } catch (error) {
          console.error("Error fetching/setting app settings:", error);
          if (error.code && error.code === 'unavailable' || error.message.includes('offline')) {
            setAuthError("Firestore connection failed: You appear to be offline or there's a network issue. Please check your internet connection.");
          } else {
            setAuthError(`Error loading settings: ${error.message}`);
          }
          setSettingsLoaded(true); // Still set to true to proceed even if fetch fails
        }
      };
      fetchSettings();
    }
  }, [db, userId, isAuthReady]);

  // Effect to apply dark mode class to HTML element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Also save the dark mode preference to Firestore if settings are already loaded
    if (db && userId && settingsLoaded) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
      updateDoc(settingsDocRef, { isDarkMode: isDarkMode }).catch(error => console.error("Error updating dark mode setting:", error));
    }
  }, [isDarkMode, db, userId, settingsLoaded]);

  // Function to update FSRS parameters and save to Firestore
  const updateFsrsParameter = (paramName, value) => {
    setFsrsParams(prev => {
      const newParams = { ...prev, [paramName]: parseFloat(value) }; // Ensure float
      // Save to Firestore if settings are already loaded
      if (db && userId && settingsLoaded) {
        const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
        const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
        updateDoc(settingsDocRef, { fsrsParams: newParams }).catch(error => console.error("Error updating FSRS settings:", error));
      }
      return newParams;
    });
  };

  // Function to check if API keys are configured
  const checkApiKeys = () => {
    const missingKeys = [];
    if (!apiKeys.gemini) missingKeys.push('Gemini');
    if (!apiKeys.anthropic) missingKeys.push('Anthropic');
    if (!apiKeys.openai) missingKeys.push('OpenAI');
    
    if (missingKeys.length > 0) {
      console.warn(`Missing API keys for: ${missingKeys.join(', ')}. Please configure them in your .env file.`);
      return false;
    }
    return true;
  };

  // Function to update API keys and save to Firestore
  const updateApiKey = (provider, key) => {
    setApiKeys(prev => {
      const newApiKeys = { ...prev, [provider]: key };
      // Save to Firestore if settings are already loaded
      if (db && userId && settingsLoaded) {
        const appId = "flashcard-app-3f2a3";
        const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
        updateDoc(settingsDocRef, { apiKeys: newApiKeys }).catch(error => console.error("Error updating API keys:", error));
      }
      return newApiKeys;
    });
  };

  // Function to update selected API provider and save to Firestore
  const updateSelectedApiProvider = (provider) => {
    setSelectedApiProvider(provider);
    // Save to Firestore if settings are already loaded
    if (db && userId && settingsLoaded) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      const settingsDocRef = doc(db, `/artifacts/${appId}/users/${userId}/settings`, 'app_settings');
      updateDoc(settingsDocRef, { selectedApiProvider: provider }).catch(error => console.error("Error updating selected API provider:", error));
    }
  };

  // Fetch flashcards from Firestore when DB and auth are ready
  useEffect(() => {
    if (isFirebaseInitialized && db && auth && userId) {
      const appId = "flashcard-app-3f2a3"; // Hardcoding appId based on the provided config
      
      // Additional validation to ensure db is a valid Firestore instance
      try {
        const flashcardsColRef = collection(db, `/artifacts/${appId}/users/${userId}/flashcards`);
        const q = query(flashcardsColRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cards = [];
          snapshot.forEach(doc => {
            cards.push({ id: doc.id, ...doc.data() });
          });
          cards.sort((a, b) => (a.nextReview?.toMillis() || 0) - (b.nextReview?.toMillis() || 0));
          setFlashcards(cards);
          if (currentCardIndex >= cards.length && cards.length > 0) {
            setCurrentCardIndex(0);
          }
        }, (error) => {
          console.error("Error fetching flashcards:", error);
          if (error.code && error.code === 'unavailable' || error.message.includes('offline')) {
            setAuthError("Firestore connection failed: You appear to be offline or there's a network issue. Please check your internet connection.");
          } else {
            setAuthError(`Error fetching flashcards: ${error.message}`);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up Firestore listener:", error);
        setAuthError(`Failed to connect to database: ${error.message}`);
      }
    }
  }, [isFirebaseInitialized, db, auth, userId]);

  // Effect to filter flashcards whenever `flashcards`, `selectedCategory`, or `showDueTodayOnly` changes
  useEffect(() => {
    let filtered = flashcards;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(card => card.category === selectedCategory);
    }

    // Filter by due date if user is logged in and showDueTodayOnly is true
    if (userId && showDueTodayOnly) {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      filtered = filtered.filter(card => {
        if (!card.nextReview) return true; // Include cards without nextReview date
        const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
        return nextReviewDate <= today;
      });
    }

    // Check if we should preserve the current position
    const shouldPreservePosition = preservedCardIndexRef.current !== null;
    const currentCard = filteredFlashcards[currentCardIndex];
    
    setFilteredFlashcards(filtered);
    
    if (shouldPreservePosition) {
      // Don't reset position if we're in the middle of an edit save operation
      console.log('Preserving card position during filter update');
    } else if (currentCard && filtered.length > 0) {
      // Try to maintain position by finding the same card in the new filtered array
      const newIndex = filtered.findIndex(card => card.id === currentCard.id);
      if (newIndex !== -1) {
        setCurrentCardIndex(newIndex);
      } else {
        // Card not found in new filter, reset to beginning
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setGeneratedExample('');
        setGeminiExplanation('');
        setGeneratedQuestions([]);
      }
    } else {
      // No current card or no filtered cards, reset to beginning
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setGeneratedExample('');
      setGeminiExplanation('');
      setGeneratedQuestions([]);
    }
  }, [flashcards, selectedCategory, userId, showDueTodayOnly]);

  const nextCard = React.useCallback(() => {
    setShowAnswer(false);
    setGeneratedExample(''); // Clear generated example on next card
    setGeneratedQuestions([]); // Clear generated questions on next card
    setGeminiExplanation(''); // Clear generated explanation on next card
    setShowGeneratedQuestionsModal(false); // Close modal on card change
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % filteredFlashcards.length);
  }, [filteredFlashcards.length, setShowAnswer, setGeneratedExample, setGeneratedQuestions, setGeminiExplanation, setShowGeneratedQuestionsModal, setCurrentCardIndex]);

  const prevCard = () => {
    setShowAnswer(false);
    setGeneratedExample(''); // Clear generated example on prev card
    setGeneratedQuestions([]); // Clear generated questions on prev card
    setGeminiExplanation(''); // Clear generated explanation on prev card
    setShowGeneratedQuestionsModal(false); // Close modal on card change
    setCurrentCardIndex((prevIndex) =>
      (prevIndex - 1 + filteredFlashcards.length) % filteredFlashcards.length
    );
  };

  const handleAddCard = async (e) => {
    e.preventDefault();

    const question = newCardQuestionRef.current.value.trim();
    const answer = newCardAnswerRef.current.value.trim();
    const category = newCardCategoryRef.current.value.trim() || 'Uncategorized';
    const additionalInfo = newCardAdditionalInfoRef.current.value.trim() || null; // Capture additional info

    if (!question || !answer) {
      console.log("Please enter both question and answer.");
      return;
    }

    if (isFirebaseInitialized && db && userId) {
      try {
        const appId = "flashcard-app-3f2a3"; // Hardcoding appId
        const now = new Date();

        // Additional safety check for Firestore instance
        if (!db) {
          console.error('Database not properly initialized');
          return;
        }

        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), {
          question,
          answer,
          category,
          additional_info: additionalInfo, // Save additional info
          difficulty: fsrsParams.initialDifficulty, // Use initial difficulty from settings
          stability: fsrsParams.initialStability,   // Use initial stability from settings
          lastReview: serverTimestamp(),
          nextReview: now,
          createdAt: serverTimestamp(),
        });
        console.log("Flashcard added successfully!");
        newCardQuestionRef.current.value = '';
        newCardAnswerRef.current.value = '';
        newCardCategoryRef.current.value = '';
        newCardAdditionalInfoRef.current.value = ''; // Clear additional info
        setShowCreateCardForm(false);
      } catch (error) {
        console.error("Error adding flashcard:", error);
        if (error.code && error.code === 'unavailable' || error.message.includes('offline')) {
          setAuthError("Firestore write failed: You appear to be offline or there's a network issue. Please check your internet connection.");
        } else {
          setAuthError(`Error adding flashcard: ${error.message}`);
        }
      }
    } else {
      console.log("Firebase not initialized, database not available, or user not authenticated.");
      setAuthError("Application is still loading or user not authenticated. Please wait and try again.");
    }
  };

  /**
   * Applies a simplified FSRS-like algorithm to update flashcard parameters.
   * Uses customizable factors from fsrsParams state.
   * Wrapped in useCallback to avoid dependency issues in useEffect
   */
  const reviewCard = React.useCallback(async (quality, card) => {
    console.log("reviewCard called with:", { quality, cardId: card?.id });
    
    // Prevent double-clicking
    if (isReviewing) {
      console.log("Review already in progress, ignoring click");
      return;
    }
    
    if (!isFirebaseInitialized || !db || !userId || !card || !settingsLoaded) {
      console.error("Missing dependencies:", { isFirebaseInitialized, db: !!db, userId: !!userId, card: !!card, settingsLoaded });
      return;
    }
    
    // Set reviewing state to prevent double-clicks
    setIsReviewing(true);

    try {
      const appId = "flashcard-app-3f2a3";
      const now = new Date();
      console.log("Processing review for card:", card.id);

      // Get current card data
      const cardRef = doc(db, `artifacts/${appId}/users/${userId}/flashcards`, card.id);
      const cardDoc = await getDoc(cardRef);
      
      if (!cardDoc.exists()) {
        console.error("Card not found in database:", card.id);
        return;
      }

      const cardData = cardDoc.data();
      console.log("Retrieved card data:", cardData);
      
      // Calculate next review date based on quality rating using FSRS factors
      const nextReview = new Date(now);
      let daysToAdd = 0;
      
      // Get the current interval from card data, or use default if first review
      const isFirstReview = !cardData.interval || cardData.reviewCount === 0;
      const currentInterval = cardData.interval || 1;
      
      if (isFirstReview) {
        // For first review, use initial intervals from settings
        switch (quality) {
          case 1: // Again
            daysToAdd = fsrsParams.initialAgainInterval;
            break;
          case 2: // Hard
            daysToAdd = fsrsParams.initialHardInterval;
            break;
          case 3: // Good
            daysToAdd = fsrsParams.initialGoodInterval;
            break;
          case 4: // Easy
            daysToAdd = fsrsParams.initialEasyInterval;
            break;
          default:
            console.warn("Invalid quality rating:", quality);
            return;
        }
        console.log("First review - using initial interval:", daysToAdd, "days for quality:", quality);
      } else {
        // For subsequent reviews, use FSRS factors
        switch (quality) {
          case 1: // Again
            daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.againFactor));
            break;
          case 2: // Hard
            daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.hardFactor));
            break;
          case 3: // Good
            daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.goodFactor));
            break;
          case 4: // Easy
            daysToAdd = Math.max(1, Math.round(currentInterval * fsrsParams.easyFactor));
            break;
          default:
            console.warn("Invalid quality rating:", quality);
            return;
        }
      }

      nextReview.setDate(now.getDate() + daysToAdd);
      // Set time to end of day (23:59:59) to ensure card appears on the correct day
      nextReview.setHours(23, 59, 59, 999);

      console.log("Updating card with new values:", {
        quality: quality,
        isFirstReview: isFirstReview,
        currentInterval: currentInterval,
        daysToAdd: daysToAdd,
        nextReview: nextReview,
        fsrsParams: fsrsParams
      });

      // Update card in database with new interval and review data
      await updateDoc(cardRef, {
        lastReview: serverTimestamp(),
        nextReview: nextReview,
        interval: daysToAdd,
        lastQuality: quality,
        reviewCount: (cardData.reviewCount || 0) + 1
      });

      console.log(`Card ${card.id} reviewed with quality ${quality}. Next review in ${daysToAdd} days.`);
      
      // Force calendar update to immediately reflect the new due date
      await updateCalendarDates();
      console.log(`✅ Calendar updated after Easy button - card will be due in ${daysToAdd} days`);
      
      // Always move to next card after updating
      nextCard();
      
    } catch (error) {
      console.error("Error updating flashcard:", error);
      if (error.code && (error.code === 'unavailable' || error.message.includes('offline'))) {
        setAuthError("Firestore write failed: You appear to be offline or there's a network issue. Please check your internet connection.");
      } else {
        setAuthError(`Error updating flashcard: ${error.message}`);
      }
    } finally {
      // Reset reviewing state to allow next review
      setIsReviewing(false);
    }
  }, [db, userId, settingsLoaded, fsrsParams, nextCard, isReviewing]);

  // Function to get cards due on a specific date
  const getCardsDueOnDate = React.useCallback(async (date) => {
    if (!db || !userId || !isFirebaseInitialized) {
      console.log("getCardsDueOnDate: db, userId, or Firebase not available");
      return 0;
    }

    try {
      // Create proper Firestore Timestamp objects for query
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get all flashcards and filter them in memory
      const cardsRef = collection(db, `artifacts/flashcard-app-3f2a3/users/${userId}/flashcards`);
      const querySnapshot = await getDocs(cardsRef);
      
      // Filter cards due on the specified date
      // For today: include overdue cards (cards due today or earlier)
      // For future dates: only include cards due exactly on that date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const specifiedDate = new Date(date);
      specifiedDate.setHours(0, 0, 0, 0);
      const isToday = today.getTime() === specifiedDate.getTime();
      
      // For today, we need to calculate remaining cards (cards due minus cards reviewed today)
      // For future dates, just count cards due on that exact date
      let dueCards;
      
      if (isToday) {
        // For today: count cards that are due (including new cards and overdue) 
        // but exclude cards that were already reviewed today
        const cardsDueToday = querySnapshot.docs.filter(doc => {
          const card = doc.data();
          
          // Include new cards (no nextReview date)
          if (!card.nextReview) return true;
          
          const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
          const reviewDate = new Date(nextReviewDate);
          reviewDate.setHours(0, 0, 0, 0);
          
          // Include cards that are due today or overdue
          return reviewDate.getTime() <= specifiedDate.getTime();
        });
        
        // Count cards that were reviewed today
        const cardsReviewedToday = querySnapshot.docs.filter(doc => {
          const card = doc.data();
          if (!card.lastReview) return false;
          
          const lastReviewDate = card.lastReview.toDate ? card.lastReview.toDate() : new Date(card.lastReview);
          const lastReviewDay = new Date(lastReviewDate);
          lastReviewDay.setHours(0, 0, 0, 0);
          
          return lastReviewDay.getTime() === specifiedDate.getTime();
        });
        
        // Return remaining cards (due cards minus reviewed cards, but never negative)
        const remainingCards = Math.max(0, cardsDueToday.length - cardsReviewedToday.length);
        
        console.log(`Calendar for today - Due: ${cardsDueToday.length}, Reviewed: ${cardsReviewedToday.length}, Remaining: ${remainingCards}`);
        
        return remainingCards;
      } else {
        // For future dates: only include cards due exactly on that date
        dueCards = querySnapshot.docs.filter(doc => {
          const card = doc.data();
          if (!card.nextReview) return false;
          
          const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
          const reviewDate = new Date(nextReviewDate);
          reviewDate.setHours(0, 0, 0, 0);
          
          return reviewDate.getTime() === specifiedDate.getTime();
        });
      }
      
      return dueCards.length;
    } catch (error) {
      console.error("Error getting cards due on date:", error);
      return 0;
    }
  }, [db, userId, isFirebaseInitialized]);

  // Update calendar dates with correct card counts
  const updateCalendarDates = React.useCallback(async () => {
    if (!db || !userId || !isFirebaseInitialized) return;

    try {
      // Get current date in Central Time
      const now = new Date();
      const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const today = new Date(centralTime.getFullYear(), centralTime.getMonth(), centralTime.getDate());
      
      const dates = [];
      
      // Generate dates for the next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const cardCount = await getCardsDueOnDate(date);
        dates.push({
          date: date,
          cardCount: cardCount
        });
      }

      setCalendarDates(dates);
    } catch (error) {
      console.error("Error updating calendar dates:", error);
    }
  }, [db, userId, getCardsDueOnDate]);

  // Effect to update calendar when cards change or when calendar modal is shown
  useEffect(() => {
    if (db && userId) {
      updateCalendarDates();
    }
  }, [db, userId, updateCalendarDates, flashcards]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle keyboard shortcuts when not in input fields or modals
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || 
          event.target.contentEditable === 'true' ||
          showCreateCardForm || showUploadCsvForm || showSettingsModal || showCalendarModal || showLoginModal || isEditingCard) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          prevCard();
          break;
        case 'ArrowRight':
          event.preventDefault();
          nextCard();
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          if (filteredFlashcards.length > 0) {
            setShowAnswer(!showAnswer);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAnswer, showCreateCardForm, showUploadCsvForm, showSettingsModal, showCalendarModal, showLoginModal, isEditingCard, filteredFlashcards.length]);

  // Helper function to calculate estimated next review days based on FSRS factors
  const calculateEstimatedReviewDays = (factor, baseInterval = 3) => {
    return Math.round(baseInterval * factor);
  };

  /**
   * Parses a CSV string into an array of flashcard objects.
   * Handles quoted fields, including multiline content, commas within quotes, and code comments.
   * Expected format: id,number,category,question,answer,additional_info
   */
  const parseCSV = (csvString) => {
    try {
      // Validate input
      if (!csvString || typeof csvString !== 'string') {
        throw new Error('CSV file appears to be empty or corrupted. Please check the file and try again.');
      }

      if (csvString.trim().length === 0) {
        throw new Error('CSV file is empty. Please add flashcard data and try again.');
      }

      // Check for common file format issues
      if (csvString.includes('\0') || csvString.includes('\uFFFD')) {
        throw new Error('CSV file contains invalid characters. This might be a binary file. Please save as CSV format and try again.');
      }

    // Split the CSV into rows carefully handling quoted content which may contain newlines
    const getRows = (text) => {
      const rows = [];
      let row = '';
      let inQuote = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        // Handle escaped quotes ("")
        if (char === '"' && nextChar === '"') {
          row += '"';
          i++;
          continue;
        }
        
        // Toggle quote state
        if (char === '"') {
          inQuote = !inQuote;
          row += char;
          continue;
        }
        
        // Handle newline
        if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuote) {
          if (char === '\r') i++; // Skip \n of CRLF
          rows.push(row);
          row = '';
          continue;
        }
        
        row += char;
      }
      
      if (row) rows.push(row);
      return rows;
    };
    
    // Parse a single row into fields
    const parseRow = (row) => {
      const fields = [];
      let field = '';
      let inQuote = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        // Handle escaped quotes ("")
        if (char === '"' && nextChar === '"') {
          field += '"';
          i++;
          continue;
        }
        
        // Toggle quote state
        if (char === '"') {
          inQuote = !inQuote;
          continue;
        }
        
        // Field delimiter
        if (char === ',' && !inQuote) {
          fields.push(field);
          field = '';
          continue;
        }
        
        field += char;
      }
      
      fields.push(field);
      return fields;
    };
    
    // Get and process rows
    const rows = getRows(csvString);
    console.log('Total rows found:', rows.length);
    console.log('First few rows:', rows.slice(0, 3));
    
    // Analyze header row to determine column structure
    const headerRow = rows[0];
    const headerFields = parseRow(headerRow);
    console.log('Header fields:', headerFields);
    
    // Detect if ID column is present by checking header content and column count
    const hasIdColumn = detectIdColumn(headerFields);
    console.log('ID column detected:', hasIdColumn);
    
    rows.shift(); // Remove header row (first row is headers)
    console.log('Rows after removing header:', rows.length);
    const cards = [];
    
    // Helper function to detect if ID column is present
    function detectIdColumn(headers) {
      // Method 1: Check if first column header suggests an ID
      const firstHeader = headers[0]?.toLowerCase().trim();
      const idKeywords = ['id', 'cardid', 'card_id', 'flashcard_id', 'uid'];
      const isIdHeader = idKeywords.some(keyword => firstHeader?.includes(keyword));
      
      // Method 2: Check column count (6 columns suggests ID column, 5 suggests no ID)
      const hasEnoughColumns = headers.length >= 6;
      
      // Method 3: Check if first column contains ID-like values (check first data row)
      const firstDataRow = rows[1] ? parseRow(rows[1]) : [];
      const firstValue = firstDataRow[0]?.trim();
      const looksLikeId = /^[a-zA-Z0-9_-]+$/.test(firstValue) && firstValue.length > 3;
      
      console.log('ID detection analysis:', {
        firstHeader,
        isIdHeader,
        columnCount: headers.length,
        hasEnoughColumns,
        firstValue,
        looksLikeId
      });
      
      // Return true if any strong indicator suggests ID column
      return isIdHeader || (hasEnoughColumns && looksLikeId);
    }
    
    rows.forEach((row, index) => {
      if (!row.trim()) return; // Skip empty rows
      
      const fields = parseRow(row);
      while (fields.length < 6) fields.push('');
      
      // Map columns based on whether ID column is present
      let id, csvNumber, category, question, answer, additional_info;
      
      if (hasIdColumn) {
        // Format: ID, Number, Category, Question, Answer, Additional Info
        id = fields[0]?.trim() || null;
        csvNumber = fields[1]?.trim() || null;
        category = fields[2]?.trim() || 'Uncategorized';
        question = fields[3]; // Don't trim to preserve formatting
        answer = fields[4];   // Don't trim to preserve formatting
        additional_info = fields[5]; // Don't trim to preserve formatting
      } else {
        // Format: Number, Category, Question, Answer, Additional Info (no ID)
        id = null;
        csvNumber = fields[0]?.trim() || null;
        category = fields[1]?.trim() || 'Uncategorized';
        question = fields[2]; // Don't trim to preserve formatting
        answer = fields[3];   // Don't trim to preserve formatting
        additional_info = fields[4]; // Don't trim to preserve formatting
      }
      
      if (question && answer) {
        console.log(`Processing row ${index + 1}:`, { question: question.substring(0, 50), answer: answer.substring(0, 50) });
        cards.push({
          id: id || null,
          csvNumber: csvNumber || null,
          category,
          question,
          answer,
          additional_info: additional_info || null,
        });
      } else {
        console.warn(`Skipping row ${index + 1} due to missing Question or Answer. Question: "${question}", Answer: "${answer}"`);
      }
    });

    // Validate that we parsed some cards
    if (cards.length === 0) {
      const formatExample = hasIdColumn 
        ? 'id,number,category,question,answer,additional_info' 
        : 'number,category,question,answer,additional_info';
      throw new Error(`No valid flashcards found in CSV. Please check that your file has the correct format: ${formatExample}`);
    }
    
    return cards;

    } catch (error) {
      console.error('CSV parsing error:', error);
      // Re-throw with context if it's not already a detailed error
      if (error.message.includes('CSV file') || error.message.includes('No valid flashcards')) {
        throw error;
      } else {
        throw new Error(`CSV parsing failed: ${error.message}. Please check that your file is in proper CSV format.`);
      }
    }
  };

  // Function to parse Excel file with rich formatting preservation
  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { 
            type: 'array', 
            cellText: false,
            cellFormula: false,
            cellHTML: true,    // Enable HTML to capture formatting
            cellStyles: true,  // Enable styles
            raw: false,
            cellDates: true,
            sheetStubs: true
          });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Helper function to decode HTML entities
          const decodeHtmlEntities = (text) => {
            if (!text) return '';
            // Ensure text is a string
            const str = String(text);
            return str
              .replace(/&nbsp;/gi, ' ')                            // Non-breaking spaces
              .replace(/&amp;/gi, '&')                             // Ampersands
              .replace(/&lt;/gi, '<')                              // Less than
              .replace(/&gt;/gi, '>')                              // Greater than
              .replace(/&quot;/gi, '"')                           // Quotes
              .replace(/&apos;/gi, "'")                           // Apostrophes
              .replace(/&#x000[dD];/gi, '\n')                     // Carriage return (hex)
              .replace(/&#13;/gi, '\n')                           // Carriage return (decimal)
              .replace(/&#x000[aA];/gi, '\n')                     // Line feed (hex)
              .replace(/&#10;/gi, '\n')                           // Line feed (decimal)
              .replace(/&#x0009;/gi, '\t')                        // Tab (hex)
              .replace(/&#9;/gi, '\t');                           // Tab (decimal)
          };

          // Helper function to extract rich text content with formatting
          const extractRichContent = (cell) => {
            if (!cell) return '';
            
            try {
              // If cell has rich text (formatted text), process it
            if (cell.r && Array.isArray(cell.r)) {
              let richText = '';
              for (const run of cell.r) {
                let text = decodeHtmlEntities(run.t || run.v || '');
                
                // Apply formatting based on font properties
                if (run.rPr) {
                  if (run.rPr.b) text = `**${text}**`; // Bold
                  if (run.rPr.i) text = `*${text}*`;   // Italic
                  if (run.rPr.u) text = `<u>${text}</u>`; // Underline
                  if (run.rPr.strike) text = `~~${text}~~`; // Strikethrough
                  
                  // Handle colors
                  if (run.rPr.color && run.rPr.color.rgb) {
                    const color = run.rPr.color.rgb;
                    text = `<span style="color: #${color}">${text}</span>`;
                  }
                  
                  // Handle font size
                  if (run.rPr.sz) {
                    const size = run.rPr.sz;
                    if (size > 14) text = `### ${text}`;
                    else if (size > 12) text = `## ${text}`;
                  }
                }
                
                richText += text;
              }
              return richText;
            }
            
            // If no rich text, check for HTML content
            if (cell.h) {
              // Convert HTML formatting to markdown
              let html = cell.h;
              
              // Convert HTML tags to markdown
              html = html
                .replace(/<b\b[^>]*>(.*?)<\/b>/gi, '**$1**')         // Bold
                .replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, '**$1**') // Strong
                .replace(/<i\b[^>]*>(.*?)<\/i>/gi, '*$1*')           // Italic
                .replace(/<em\b[^>]*>(.*?)<\/em>/gi, '*$1*')         // Emphasis
                .replace(/<u\b[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')     // Underline
                .replace(/<strike\b[^>]*>(.*?)<\/strike>/gi, '~~$1~~') // Strikethrough
                .replace(/<br\s*\/?>/gi, '\n')                       // Line breaks
                .replace(/<[^>]+>/gi, '');                           // Remove remaining HTML tags
              
              return decodeHtmlEntities(html);
            }
            
            // Fallback to formatted text or raw value
            return decodeHtmlEntities(cell.w || cell.v || '');
            } catch (error) {
              console.error('Error processing cell content:', error);
              // Return a safe fallback
              return String(cell.w || cell.v || '');
            }
          };
          
          // Get the range and access cells directly
          const range = XLSX.utils.decode_range(firstSheet['!ref']);
          const rawData = [];
          
          for (let row = 0; row <= range.e.r; row++) {
            const rowData = [];
            for (let col = 0; col <= Math.min(5, range.e.c); col++) { // Include up to 6 columns (0-5)
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = firstSheet[cellAddress];
              
              if (cell) {
                // Extract rich content with formatting
                const content = extractRichContent(cell);
                rowData[col] = content;
              } else {
                rowData[col] = '';
              }
            }
            rawData.push(rowData);
          }
          
          console.log('Enhanced Excel data with formatting:', rawData); // Debug logging
          
          // Analyze header row to determine column structure
          const headerRow = rawData[0] || [];
          console.log('Excel header row:', headerRow);
          
          // Detect if ID column is present
          const hasIdColumn = detectIdColumn(headerRow);
          console.log('Excel ID column detected:', hasIdColumn);
          
          // Helper function to detect if ID column is present
          function detectIdColumn(headers) {
            // Method 1: Check if first column header suggests an ID
            const firstHeader = headers[0]?.toLowerCase?.().trim() || String(headers[0] || '').toLowerCase().trim();
            const idKeywords = ['id', 'cardid', 'card_id', 'flashcard_id', 'uid'];
            const isIdHeader = idKeywords.some(keyword => firstHeader?.includes(keyword));
            
            // Method 2: Check column count (6 columns suggests ID column, 5 suggests no ID)
            const hasEnoughColumns = headers.length >= 6;
            
            // Method 3: Check if first column contains ID-like values (check first data row)
            const firstDataRow = rawData[1] || [];
            const firstValue = String(firstDataRow[0] || '').trim();
            const looksLikeId = /^[a-zA-Z0-9_-]+$/.test(firstValue) && firstValue.length > 3;
            
            console.log('Excel ID detection analysis:', {
              firstHeader,
              isIdHeader,
              columnCount: headers.length,
              hasEnoughColumns,
              firstValue,
              looksLikeId
            });
            
            // Return true if any strong indicator suggests ID column
            return isIdHeader || (hasEnoughColumns && looksLikeId);
          }
          
          const cards = [];
          
          // Helper function to preserve exact formatting
          const preserveFormatting = (content) => {
            if (!content) return '';
            
            // Preserve all spacing, tabs, and line breaks exactly as they are
            return String(content)
              .replace(/\t/g, '    ')  // Convert tabs to 4 spaces for consistency
              .replace(/\r\n/g, '\n')  // Normalize line endings
              .replace(/\r/g, '\n');   // Handle Mac line endings
          };
          
          // Process rows and group them into complete flashcards
          let currentCard = null;
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;
            
            console.log(`Processing enhanced row ${i}:`, row); // Debug logging
            
            // Map columns based on whether ID column is present
            let id, csvNumber, category, question, answer, additional_info;
            
            if (hasIdColumn) {
              // Format: ID, Number, Category, Question, Answer, Additional Info
              id = preserveFormatting(row[0]);
              csvNumber = preserveFormatting(row[1]);
              category = preserveFormatting(row[2]);
              question = preserveFormatting(row[3]);
              answer = preserveFormatting(row[4]);
              additional_info = preserveFormatting(row[5]);
            } else {
              // Format: Number, Category, Question, Answer, Additional Info (no ID)
              id = null;
              csvNumber = preserveFormatting(row[0]);
              category = preserveFormatting(row[1]);
              question = preserveFormatting(row[2]);
              answer = preserveFormatting(row[3]);
              additional_info = preserveFormatting(row[4]);
            }
            
            // Check if this is a new flashcard (has csvNumber and question) or continuation of previous
            if (csvNumber && question) {
              // This is a new flashcard - save the previous one if it exists
              if (currentCard && currentCard.question && currentCard.answer) {
                cards.push(currentCard);
              }
              
              // Start new flashcard with preserved formatting
              currentCard = {
                id: id ? id.trim() : null,
                csvNumber: csvNumber,
                category: category ? category.trim() : 'Uncategorized',
                question: question,
                answer: answer,
                additional_info: additional_info || null,
              };
              
              console.log(`New formatted flashcard started: ${question.substring(0, 100)}...`);
            } else if (currentCard && answer) {
              // This is a continuation row - preserve exact spacing and formatting
              currentCard.answer += '\n' + answer;
              
              // Also append additional_info if present
              if (additional_info) {
                if (currentCard.additional_info) {
                  currentCard.additional_info += '\n' + additional_info;
                } else {
                  currentCard.additional_info = additional_info;
                }
              }
              
              console.log(`Answer continued, new length: ${currentCard.answer.length}`);
            }
          }
          
          // Don't forget to add the last card
          if (currentCard && currentCard.question && currentCard.answer) {
            cards.push(currentCard);
            console.log(`Final card added, total answer length: ${currentCard.answer.length}`);
          }
          
          console.log(`Total flashcards created: ${cards.length}`);
          
          resolve(cards);
        } catch (error) {
          console.error('Excel parsing error:', error);
          if (error.message.includes('Unsupported file')) {
            reject(new Error('This Excel file format is not supported. Please save as .xlsx format and try again.'));
          } else if (error.message.includes('password')) {
            reject(new Error('Password-protected Excel files are not supported. Please remove password protection and try again.'));
          } else if (error.message.includes('corrupted')) {
            reject(new Error('The Excel file appears to be corrupted. Please check the file and try again.'));
          } else {
            reject(new Error(`Excel file parsing failed: ${error.message}. Please check that the file is a valid Excel (.xlsx) file.`));
          }
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Function to parse Numbers file (.numbers)
  const parseNumbers = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          // Numbers files are actually zip archives containing XML/protobuf files
          // XLSX.js can handle Numbers files similarly to Excel files
          const workbook = XLSX.read(data, { 
            type: 'array', 
            cellText: true, 
            cellFormula: false,
            cellHTML: false,
            cellStyles: true,
            raw: false
          });
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Get the range and access cells directly to preserve exact formatting
          const range = XLSX.utils.decode_range(firstSheet['!ref']);
          const rawData = [];
          
          for (let row = 0; row <= range.e.r; row++) {
            const rowData = [];
            for (let col = 0; col <= Math.min(5, range.e.c); col++) { // Include up to 6 columns (0-5)
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = firstSheet[cellAddress];
              
              if (cell) {
                // Use the formatted text value (w) which preserves Numbers' display formatting
                rowData[col] = cell.w || cell.v || '';
              } else {
                rowData[col] = '';
              }
            }
            rawData.push(rowData);
          }
          
          const jsonData = rawData;
          
          console.log('Raw Numbers data:', jsonData); // Debug logging
          
          // Analyze header row to determine column structure
          const headerRow = jsonData[0] || [];
          console.log('Numbers header row:', headerRow);
          
          // Detect if ID column is present
          const hasIdColumn = detectIdColumn(headerRow);
          console.log('Numbers ID column detected:', hasIdColumn);
          
          // Helper function to detect if ID column is present
          function detectIdColumn(headers) {
            // Method 1: Check if first column header suggests an ID
            const firstHeader = String(headers[0] || '').toLowerCase().trim();
            const idKeywords = ['id', 'cardid', 'card_id', 'flashcard_id', 'uid'];
            const isIdHeader = idKeywords.some(keyword => firstHeader?.includes(keyword));
            
            // Method 2: Check column count (6 columns suggests ID column, 5 suggests no ID)
            const hasEnoughColumns = headers.length >= 6;
            
            // Method 3: Check if first column contains ID-like values (check first data row)
            const firstDataRow = jsonData[1] || [];
            const firstValue = String(firstDataRow[0] || '').trim();
            const looksLikeId = /^[a-zA-Z0-9_-]+$/.test(firstValue) && firstValue.length > 3;
            
            console.log('Numbers ID detection analysis:', {
              firstHeader,
              isIdHeader,
              columnCount: headers.length,
              hasEnoughColumns,
              firstValue,
              looksLikeId
            });
            
            // Return true if any strong indicator suggests ID column
            return isIdHeader || (hasEnoughColumns && looksLikeId);
          }
          
          const cards = [];
          
          // Helper function to decode HTML entities
          const decodeHtmlEntities = (text) => {
            if (!text) return '';
            // Ensure text is a string
            const str = String(text);
            return str
              .replace(/&nbsp;/gi, ' ')                            // Non-breaking spaces
              .replace(/&amp;/gi, '&')                             // Ampersands
              .replace(/&lt;/gi, '<')                              // Less than
              .replace(/&gt;/gi, '>')                              // Greater than
              .replace(/&quot;/gi, '"')                           // Quotes
              .replace(/&apos;/gi, "'")                           // Apostrophes
              .replace(/&#x000[dD];/gi, '\n')                     // Carriage return (hex)
              .replace(/&#13;/gi, '\n')                           // Carriage return (decimal)
              .replace(/&#x000[aA];/gi, '\n')                     // Line feed (hex)
              .replace(/&#10;/gi, '\n')                           // Line feed (decimal)
              .replace(/&#x0009;/gi, '\t')                        // Tab (hex)
              .replace(/&#9;/gi, '\t');                           // Tab (decimal)
          };

          // Helper function to get complete cell content
          const getCompleteContent = (cellValue) => {
            if (cellValue === null || cellValue === undefined) return '';
            return decodeHtmlEntities(String(cellValue));
          };
          
          // Process rows and group them into complete flashcards
          let currentCard = null;
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            console.log(`Processing Numbers row ${i}:`, row); // Debug logging
            
            // Map columns based on whether ID column is present
            let id, csvNumber, category, question, answer, additional_info;
            
            if (hasIdColumn) {
              // Format: ID, Number, Category, Question, Answer, Additional Info
              id = getCompleteContent(row[0]);
              csvNumber = getCompleteContent(row[1]);
              category = getCompleteContent(row[2]);
              question = getCompleteContent(row[3]);
              answer = getCompleteContent(row[4]);
              additional_info = getCompleteContent(row[5]);
            } else {
              // Format: Number, Category, Question, Answer, Additional Info (no ID)
              id = null;
              csvNumber = getCompleteContent(row[0]);
              category = getCompleteContent(row[1]);
              question = getCompleteContent(row[2]);
              answer = getCompleteContent(row[3]);
              additional_info = getCompleteContent(row[4]);
            }
            
            // Check if this is a new flashcard (has csvNumber and question) or continuation of previous
            if (csvNumber && question) {
              // This is a new flashcard - save the previous one if it exists
              if (currentCard && currentCard.question && currentCard.answer) {
                cards.push(currentCard);
              }
              
              // Start new flashcard
              currentCard = {
                id: id ? id.trim() : null,
                csvNumber: csvNumber,
                category: category ? category.trim() : 'Uncategorized',
                question: question,
                answer: answer,
                additional_info: additional_info || null,
              };
              
              console.log(`New Numbers flashcard started: ${question.substring(0, 100)}...`);
            } else if (currentCard && answer) {
              // This is a continuation row - append to current card's answer with proper spacing
              // Preserve existing spacing and only add newline if answer doesn't start with whitespace
              const separator = answer.match(/^\s/) ? '' : '\n';
              currentCard.answer += separator + answer;
              
              // Also append additional_info if present
              if (additional_info) {
                if (currentCard.additional_info) {
                  const infoSeparator = additional_info.match(/^\s/) ? '' : '\n';
                  currentCard.additional_info += infoSeparator + additional_info;
                } else {
                  currentCard.additional_info = additional_info;
                }
              }
              
              console.log(`Numbers answer continued, new length: ${currentCard.answer.length}`);
            }
          }
          
          // Don't forget to add the last card
          if (currentCard && currentCard.question && currentCard.answer) {
            cards.push(currentCard);
            console.log(`Final Numbers card added, total answer length: ${currentCard.answer.length}`);
          }
          
          console.log(`Total Numbers flashcards created: ${cards.length}`);
          
          resolve(cards);
        } catch (error) {
          console.error('Numbers parsing error:', error);
          if (error.message.includes('Unsupported file')) {
            reject(new Error('This Numbers file format is not supported. Please export as Excel (.xlsx) or CSV format and try again.'));
          } else if (error.message.includes('password')) {
            reject(new Error('Password-protected Numbers files are not supported. Please remove password protection and try again.'));
          } else if (error.message.includes('corrupted')) {
            reject(new Error('The Numbers file appears to be corrupted. Please check the file and try again.'));
          } else if (error.message.includes('ENOENT') || error.message.includes('not found')) {
            reject(new Error('Numbers file could not be read. Please check the file path and permissions.'));
          } else {
            reject(new Error(`Numbers file parsing failed: ${error.message}. Please export as Excel (.xlsx) or CSV format for better compatibility.`));
          }
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Handles the CSV file selection (for multiple files)
  const handleFileSelect = (event) => {
    setSelectedUploadFiles(Array.from(event.target.files)); // Store FileList as an array
    setUploadMessage(''); // Clear previous messages
    setUploadError('');
  };

  // Handles the actual CSV upload when the button is clicked
  const handleUploadButtonClick = async () => {
    if (selectedUploadFiles.length === 0) {
      setUploadError('Please select at least one file first.');
      return;
    }

    if (!db || !userId) {
      setUploadError('Database not initialized or user not authenticated. Please try again.');
      return;
    }

    setUploadMessage('Processing files...');
    setUploadError('');

    let totalCardsAdded = 0;
    let totalCardsUpdated = 0;
    let totalFilesProcessed = 0;
    let errorsFound = false;

    // Function to sanitize text for Firestore
    const sanitizeText = (text) => {
      if (!text) return text;
      // We no longer need to replace all forward slashes as this breaks code examples
      // Firestore document content can include forward slashes, only document paths have restrictions
      return text;
    };

    for (const file of selectedUploadFiles) {
      const isExcel = file.name.endsWith('.xlsx');
      const isCsv = file.name.endsWith('.csv');
      const isNumbers = file.name.endsWith('.numbers');

      // File type validation
      if (!isExcel && !isCsv && !isNumbers) {
        setUploadError((prev) => prev + `${file.name}: Invalid file type. Only CSV, Excel (.xlsx), and Numbers (.numbers) files are supported.\n`);
        errorsFound = true;
        continue;
      }

      // File size validation (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setUploadError((prev) => prev + `${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.\n`);
        errorsFound = true;
        continue;
      }

      // Empty file validation
      if (file.size === 0) {
        setUploadError((prev) => prev + `${file.name}: File is empty. Please check the file and try again.\n`);
        errorsFound = true;
        continue;
      }

      try {
        let parsedCards;
        if (isExcel) {
          parsedCards = await parseExcel(file);
        } else if (isNumbers) {
          parsedCards = await parseNumbers(file);
        } else {
          const csvContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (!e.target.result) {
                reject(new Error('Could not read file content. The file might be empty or corrupted.'));
                return;
              }
              resolve(e.target.result);
            };
            reader.onerror = (e) => {
              reject(new Error(`Failed to read CSV file: ${file.name}. The file might be corrupted or in use by another application.`));
            };
            reader.readAsText(file, 'UTF-8');
          });
          parsedCards = parseCSV(csvContent);
        }

        if (parsedCards.length === 0) {
          setUploadError((prev) => prev + `No valid flashcards found in ${file.name}.\n`);
          errorsFound = true;
          continue;
        }

        for (const cardData of parsedCards) {
          if (db && userId) {
            const appId = "flashcard-app-3f2a3";
            const now = new Date();

            // Additional safety check for Firestore instance
            if (!db) {
              console.error('Database not properly initialized during upload');
              continue;
            }

            // Sanitize the data to prevent Firestore path issues
            const sanitizedData = {
              question: sanitizeText(cardData.question),
              answer: sanitizeText(cardData.answer),
              category: sanitizeText(cardData.category),
              additional_info: cardData.additional_info ? sanitizeText(cardData.additional_info) : null,
              csvNumber: cardData.csvNumber,
              difficulty: fsrsParams.initialDifficulty,
              stability: fsrsParams.initialStability,
              lastReview: serverTimestamp(),
              nextReview: now,
              createdAt: serverTimestamp(),
            };

            try {
              if (cardData.id) {
                // If card has an ID, try to update existing card
                const existingCardRef = doc(db, `/artifacts/${appId}/users/${userId}/flashcards`, cardData.id);
                const existingCard = await getDoc(existingCardRef);
                
                if (existingCard.exists()) {
                  // Update existing card
                  await updateDoc(existingCardRef, sanitizedData);
                  totalCardsUpdated++;
                } else {
                  // Add new card with specified ID
                  await setDoc(existingCardRef, sanitizedData);
                  totalCardsAdded++;
                }
              } else {
                // Add new card without ID
                await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), sanitizedData);
                totalCardsAdded++;
              }
            } catch (error) {
              console.error(`Error processing card: ${error.message}`);
              setUploadError((prev) => prev + `Failed to process card: ${error.message}\n`);
              errorsFound = true;
            }
          }
        }
        totalFilesProcessed++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        
        // Provide specific error messages based on error type
        let errorMessage = '';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name === 'NotReadableError') {
          errorMessage = `Cannot read ${file.name}. The file might be in use by another application or corrupted.`;
        } else if (error.name === 'SecurityError') {
          errorMessage = `Access denied to ${file.name}. Please check file permissions.`;
        } else if (error.name === 'AbortError') {
          errorMessage = `Upload of ${file.name} was cancelled.`;
        } else if (error.name === 'NetworkError') {
          errorMessage = `Network error while uploading ${file.name}. Please check your connection.`;
        } else if (error.toString().includes('QuotaExceeded')) {
          errorMessage = `Storage quota exceeded while processing ${file.name}. Please free up space.`;
        } else {
          errorMessage = `Unknown error processing ${file.name}. Please try again or use a different file format.`;
        }
        
        setUploadError((prev) => prev + `${file.name}: ${errorMessage}\n`);
        errorsFound = true;
      }
    }

    let message = '';
    if (totalCardsUpdated > 0) {
      message += `Updated ${totalCardsUpdated} existing card(s). `;
    }
    if (!errorsFound && totalFilesProcessed > 0) {
      message += `Successfully added ${totalCardsAdded} new flashcard(s) from ${totalFilesProcessed} file(s).`;
    } else if (errorsFound && totalFilesProcessed > 0) {
      message += `Processed ${totalFilesProcessed} file(s). Added ${totalCardsAdded} new cards, updated ${totalCardsUpdated} cards. Some errors occurred.`;
    } else if (errorsFound && totalFilesProcessed === 0) {
      message = "No files were successfully processed.";
    }
    setUploadMessage(message);
    
    // If cards were successfully added, close the upload modal and navigate to first new card
    if (totalCardsAdded > 0 && !errorsFound) {
      // Wait briefly to show success message
      setTimeout(() => {
        setShowUploadCsvForm(false); // Close upload modal
        setCurrentCardIndex(0); // Go to first card (which should include new ones)
        setShowAnswer(false); // Show question side first
        setUploadMessage(''); // Clear upload message
        setUploadError(''); // Clear any errors
      }, 2000); // Show success message for 2 seconds
    }
    
    setSelectedUploadFiles([]); // Clear selected files after upload attempt
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input visual
  };
  const handleSendFeedback = () => {
    if (!feedbackText.trim()) {
      alert('Please enter your feedback before sending.');
      return;
    }
    
    const subject = encodeURIComponent('Flashcard App Feedback');
    const body = encodeURIComponent(`Hi,\n\nHere's my feedback for the Flashcard App:\n\n${feedbackText}\n\nBest regards`);
    const mailtoLink = `mailto:admin@fsrslearn.com?subject=${subject}&body=${body}`;
    
    window.open(mailtoLink, '_blank');
    
    // Clear the feedback after sending
    setFeedbackText('');
    alert('Feedback email opened! Please send it from your email client.');
  };
  // Function to handle answer suggestion using Gemini API
  const handleSuggestAnswer = async () => {
    const question = newCardQuestionRef.current.value.trim();
    if (!question) {
      console.log("Please enter a question to get a suggestion.");
      return;
    }

    setIsGeneratingAnswer(true);
    try {
      const prompt = `Provide a concise and accurate answer for the flashcard question: "${question}"`;
      const text = await callAI(prompt);
      newCardAnswerRef.current.value = text.trim();
    } catch (error) {
      console.error("Error generating answer:", error);
      newCardAnswerRef.current.value = `Error generating answer: ${error.message}`;
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Function to handle generating code example using AI API
  const handleGenerateExample = async (question, answer) => {
    if (!question || !answer) {
      console.log("Question and Answer are required to generate an example.");
      return;
    }

    setIsGeneratingExample(true);
    setGeneratedExample(''); // Clear previous example

    try {
      const prompt = `Provide a concise code example or a clear real-world scenario that illustrates the concept from this flashcard. 
      Question: "${question}"
      Answer: "${answer}"
      Focus on providing a direct, illustrative example. Output only the example, no conversational text.`;
      
      const text = await callAI(prompt);
      setGeneratedExample(text.trim()); // Store the generated example
    } catch (error) {
      console.error("Error generating example:", error);
      setGeneratedExample(`Error generating example: ${error.message}`);
    } finally {
      setIsGeneratingExample(false);
    }
  };

  // Function to handle generating related questions using AI API
  const handleGenerateQuestions = async (question, answer) => {
    if (!question || !answer) {
      console.log("Question and Answer are required to generate related questions.");
      return;
    }

    setIsGeneratingQuestions(true);
    setGeneratedQuestions([]); // Clear previous questions before generating

    try {
      const prompt = `Based on the following flashcard:\nQuestion: "${question}"\nAnswer: "${answer}"\n\nGenerate 3-5 concise, related follow-up questions to test deeper understanding. Provide them as a numbered list.`;
      
      const text = await callAI(prompt);
      // Simple parsing for numbered list, adjust as needed for robust parsing
      const questionsArray = text.split('\n').filter(line => line.match(/^\d+\./)).map(line => ({
          id: crypto.randomUUID(), // Unique ID for each generated question
          text: line.replace(/^\d+\.\s*/, '').trim(),
          selected: true // Default to selected
      }));
      setGeneratedQuestions(questionsArray);
      setShowGeneratedQuestionsModal(true); // Open the modal
    } catch (error) {
      console.error("Error generating questions:", error);
      setGeneratedQuestions([{ id: 'error', text: `Error generating questions: ${error.message}`, selected: false }]);
      setShowGeneratedQuestionsModal(true); // Open modal even on error to show message
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Handle checkbox change for generated questions
  const handleGeneratedQuestionCheckboxChange = (id) => {
    setGeneratedQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === id ? { ...q, selected: !q.selected } : q
      )
    );
  };

  // Handle generating new cards from selected questions WITH AI-generated answers
  const handleGenerateSelectedCards = async () => {
    if (!db || !userId) return;

    const selectedQ = generatedQuestions.filter(q => q.selected);
    if (selectedQ.length === 0) {
      alert("Please select at least one question to generate a card.");
      return;
    }

    setIsGeneratingSelectedCards(true); // Start loading for batch generation
    let cardsAdded = 0;
    const appId = "flashcard-app-3f2a3"; // Hardcoding appId
    const now = new Date();
    const currentCategory = filteredFlashcards[currentCardIndex]?.category || 'Uncategorized';

    // Additional safety check for Firestore instance
    if (!db) {
      console.error('Database not properly initialized during question generation');
      setIsGeneratingSelectedCards(false);
      return;
    }

    for (const qData of selectedQ) {
      try {
        // Generate answer for the new question
        let answerText = "";
        try {
          const prompt = `Provide a concise answer for the flashcard question: "${qData.text}"`;
          answerText = await callAI(prompt);
        } catch (apiError) {
          console.error(`Error generating answer for question "${qData.text}":`, apiError);
          answerText = `Error generating answer: ${apiError.message}`;
        }

        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/flashcards`), {
          question: qData.text,
          answer: answerText, // Use the generated answer
          category: currentCategory, // Inherit category or default
          additional_info: "", // Empty additional info for new cards
          difficulty: fsrsParams.initialDifficulty,
          stability: fsrsParams.initialStability,
          lastReview: serverTimestamp(),
          nextReview: now,
          createdAt: serverTimestamp(),
        });
        cardsAdded++;
      } catch (error) {
        console.error("Error adding generated card:", error);
      }
    }

    alert(`Successfully generated ${cardsAdded} new flashcard(s)!`); // Provide feedback
    setShowGeneratedQuestionsModal(false); // Close the modal
    setGeneratedQuestions([]); // Clear generated questions
    setIsGeneratingSelectedCards(false); // End loading for batch generation
  };


  // Function to handle explaining a concept using Gemini API
  const handleExplainConcept = async (question, answer) => {
    if (!question || !answer) {
      console.log("Question and Answer are required to explain the concept.");
      return;
    }

    setIsExplainingConcept(true);
    setGeminiExplanation(''); // Clear previous explanation

    try {
      const prompt = `Explain the core concept or provide more context for the following flashcard:\nQuestion: "${question}"\nAnswer: "${answer}"\n\nKeep the explanation concise and beginner-friendly.`;
      
      const text = await callAI(prompt);
      setGeminiExplanation(text.trim()); // Store the generated explanation
    } catch (error) {
      console.error("Error generating explanation:", error);
      setGeminiExplanation(`Error generating explanation: ${error.message}`);
    } finally {
      setIsExplainingConcept(false);
    }
  };


  // Function to enter edit mode for a card
  const handleEditCard = (card) => {
    setEditCardData({ ...card }); // Copy card data to edit state
    setGeneratedQuestions([]); // Clear any old generated questions when opening edit from button
    
    // Initialize controlled state variables with card content
    setEditQuestion(card.question || "");
    setEditAnswer(card.answer || "");
    
    setIsEditingCard(true);
  };


  // AI API call function
  const callAI = async (prompt) => {
    const provider = selectedApiProvider;
    const apiKey = apiKeys[provider];
    
    if (!apiKey) {
      throw new Error(`API key for ${provider} not configured`);
    }

    try {
      switch (provider) {
        case 'anthropic':
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-sonnet-20240229',
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }]
            })
          });
          
          if (!anthropicResponse.ok) {
            const error = await anthropicResponse.json();
            throw new Error(`Anthropic API error: ${error.error?.message || anthropicResponse.statusText}`);
          }

          const anthropicResult = await anthropicResponse.json();
          return anthropicResult.content[0].text;

        case 'gemini':
        default:
          const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
          const payload = { contents: chatHistory };
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
          
          const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!geminiResponse.ok) {
            throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
          }

          const geminiResult = await geminiResponse.json();
          if (geminiResult.candidates && geminiResult.candidates.length > 0 &&
              geminiResult.candidates[0].content && geminiResult.candidates[0].content.parts &&
              geminiResult.candidates[0].content.parts.length > 0) {
            return geminiResult.candidates[0].content.parts[0].text;
          } else {
            throw new Error('No valid response from Gemini API');
          }
      }
    } catch (error) {
      console.error(`API call failed for ${provider}:`, error);
      throw error;
    }
  };


  // Format answer handler for RichTextEditor
  const handleFormatAnswer = () => {
    console.log('🔥 FORMAT ANSWER CLICKED');
    
    try {
      // Get current answer content
      let text = editAnswer;
      
      // Strip HTML tags to get plain text for processing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      let plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      console.log('📝 Original text:', plainText.substring(0, 100));
      
      if (!plainText.trim()) {
        alert('Please enter some text first');
        return;
      }
      
      // Simple formatting
      let formatted = plainText.trim();
      
      // Add line breaks at periods followed by capital letters
      formatted = formatted.replace(/\.\s*([A-Z])/g, '.\n\n$1');
      
      // Add line breaks before numbered lists
      formatted = formatted.replace(/(\w)\s*(\d+\.\s)/g, '$1\n\n$2');
      
      // Add line breaks around parentheses
      formatted = formatted.replace(/(\w)\s*(\([^)]+\))/g, '$1\n$2');
      
      // Bold words in **text**
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Method names like map()
      formatted = formatted.replace(/(\w+)\(\)/g, '<code style="background: #e3f2fd; padding: 2px 4px; border-radius: 3px;">$1()</code>');
      
      // Convert newlines to HTML paragraphs (better for RichTextEditor)
      formatted = formatted.replace(/\n\n/g, '</p><p>');
      formatted = formatted.replace(/\n/g, '<br>');
      formatted = '<p>' + formatted + '</p>';
      
      console.log('🎨 Formatted text:', formatted.substring(0, 100));
      
      // Update the RichTextEditor content
      setEditAnswer(formatted);
      
      console.log('✅ Format complete!');
      
    } catch (error) {
      console.error('❌ Format error:', error);
      alert('Error formatting text: ' + error.message);
    }
  };

  // Enhanced format question handler with comprehensive debugging
  const handleFormatQuestion = () => {
    console.log('🔥 FORMAT QUESTION - Starting');
    
    // Get current content from the DOM element
    const element = editQuestionRef.current || document.getElementById('edit-question');
    if (!element) {
      console.error('❌ Element not found');
      alert('Error: Could not find question field');
      return;
    }
    console.log('✅ Element found:', element);
    
    // Try multiple methods to get content
    let currentContent = '';
    const methods = [];
    
    // Method 1: React state
    if (editQuestion && editQuestion.trim()) {
      currentContent = editQuestion;
      // Strip HTML tags to get plain text for processing
      const stripped = currentContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
      if (stripped) {
        currentContent = stripped;
        methods.push('React state (HTML stripped)');
      }
    }
    
    // Method 2: DOM textContent
    if (!currentContent) {
      const textContent = element.textContent || '';
      if (textContent.trim()) {
        currentContent = textContent.trim();
        methods.push('DOM textContent');
      }
    }
    
    // Method 3: DOM innerText
    if (!currentContent) {
      const innerText = element.innerText || '';
      if (innerText.trim()) {
        currentContent = innerText.trim();
        methods.push('DOM innerText');
      }
    }
    
    // Method 4: DOM innerHTML stripped
    if (!currentContent) {
      const innerHTML = element.innerHTML || '';
      if (innerHTML.trim()) {
        currentContent = innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
        methods.push('DOM innerHTML (stripped)');
      }
    }
    
    console.log('📄 Content extraction methods tried:', methods);
    console.log('📏 Content length:', currentContent?.length);
    console.log('📝 Content preview:', currentContent?.substring(0, 100));
    
    if (!currentContent || !currentContent.trim()) {
      console.log('❌ No content found to format');
      alert('Please enter some text first.');
      return;
    }
    
    try {
      let formatted = currentContent.trim();
      const originalLength = formatted.length;
      
      console.log('🧹 Starting formatting process...');
      
      // Enhanced formatting rules that work with any text
      
      // 1. Clean up excessive whitespace first
      formatted = formatted.replace(/\s+/g, ' ');
      
      // 2. Add line breaks before numbered lists (1. 2. 3.)
      formatted = formatted.replace(/(\w)\s*(\d+\.\s)/g, '$1\n\n$2');
      
      // 3. Add line breaks before bullet points
      formatted = formatted.replace(/(\w)\s*([•▪▫◦*-]\s)/g, '$1\n$2');
      
      // 4. Add line breaks before section headers (Title: or TITLE:)
      formatted = formatted.replace(/(\w)\s*([A-Z][A-Za-z\s]*:)/g, '$1\n\n$2');
      
      // 5. Add line breaks after periods followed by capital letters (new sentences)
      formatted = formatted.replace(/(\.)(\s*)([A-Z])/g, '$1\n\n$3');
      
      // 6. Add line breaks around parenthetical explanations
      formatted = formatted.replace(/(\w)\s*(\([^)]+\))/g, '$1\n$2');
      
      // 7. Add line breaks before key programming terms and concepts
      formatted = formatted.replace(/(\w)\s*(while|however|therefore|additionally|furthermore|moreover|conversely|in contrast)\s/gi, '$1\n\n$2 ');
      
      // 8. Break up long sentences at commas when they're getting too long
      const sentences = formatted.split(/\n+/);
      formatted = sentences.map(sentence => {
        if (sentence.length > 100) {
          return sentence.replace(/,\s+/g, ',\n');
        }
        return sentence;
      }).join('\n\n');
      
      // 9. Convert markdown and add emphasis
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      formatted = formatted.replace(/`([^`]+)`/g, '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
      
      // 10. Highlight technical terms and method names
      formatted = formatted.replace(/(\w+)\(\)/g, '<code style="background-color: #e0f2fe; padding: 1px 3px; border-radius: 2px; font-family: monospace; color: #0277bd;">$1()</code>');
      
      // 11. Clean up excessive line breaks and convert to HTML
      formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
      formatted = formatted.replace(/\n/g, '<br>');
      
      console.log('✨ Formatted length:', formatted.length);
      console.log('🎨 Formatted preview:', formatted.substring(0, 100));
      
      if (formatted === currentContent.replace(/\n/g, '<br>')) {
        console.log('⚠️ No changes made during formatting');
      }
      
      // Force update both DOM and state
      console.log('🔄 Updating DOM and state...');
      element.innerHTML = formatted;
      setEditQuestion(formatted);
      
      // Trigger a re-render by focusing the element
      setTimeout(() => {
        if (element) {
          element.focus();
          element.blur();
        }
      }, 100);
      
      console.log('✅ Format Question completed successfully');
      console.log('📊 Original length:', originalLength, '→ New length:', formatted.length);
      
    } catch (error) {
      console.error('❌ Error during formatting:', error);
      console.error('❌ Error stack:', error.stack);
      alert('Error during formatting: ' + error.message);
    }
  };

  // Function to delete a card
  const handleDeleteCard = async () => {
    console.log('Delete card clicked - Debug info:');
    console.log('db:', !!db);
    console.log('userId:', userId);
    console.log('editCardData:', editCardData);
    
    if (!db || !userId || !editCardData) {
      console.log('Missing required data for delete');
      return;
    }

    // Show confirmation dialog before deleting
    console.log('Showing delete confirmation modal');
    setShowConfirmDelete(true);
  };

  // Confirmed delete action
  const confirmDelete = async () => {
    console.log('Confirm delete clicked - Debug info:');
    console.log('db:', !!db);
    console.log('editCardData:', editCardData);
    console.log('editCardData.id:', editCardData?.id);
    
    setShowConfirmDelete(false); // Close confirmation modal
    if (!db || !editCardData?.id) {
      console.log('Missing db or editCardData.id for delete');
      return;
    }

    const appId = "flashcard-app-3f2a3"; // Hardcoding appId
    const docPath = `/artifacts/${appId}/users/${userId}/flashcards`;
    console.log('Attempting to delete document at path:', docPath, 'with ID:', editCardData.id);
    
    try {
      await deleteDoc(doc(db, docPath, editCardData.id));
      console.log(`Card ${editCardData.id} deleted successfully!`);
      setIsEditingCard(false); // Exit edit mode
      setEditCardData(null); // Clear edit data
      setGeneratedQuestions([]); // Clear generated questions after deleting
      // Navigate to the next card or default view if current card was deleted
      if (filteredFlashcards.length > 0) {
        setCurrentCardIndex(0); // Reset to first card
      } else {
        setCurrentCardIndex(0); // No cards left
      }
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      console.error("Error details:", error.code, error.message);
      alert('Failed to delete card: ' + error.message);
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setShowConfirmDelete(false);
  };

  // Save card changes function
  const handleSaveCardChanges = async () => {
    if (!db || !userId || !editCardData) return;
    
    // Validate required fields
    if (!editQuestion.trim() || !editAnswer.trim()) {
      alert('Question and Answer fields are required');
      return;
    }

    const appId = "flashcard-app-3f2a3"; // Hardcoding appId
    
    // Save the current card ID and index to preserve position
    const currentEditedCardId = editCardData.id;
    const currentPosition = currentCardIndex;
    
    // Store position info in ref to survive re-renders
    preservedCardIndexRef.current = {
      cardId: currentEditedCardId,
      index: currentPosition,
      timestamp: Date.now()
    };
    
    try {
      // Get category and additional info from refs
      const category = editCategoryRef.current?.value?.trim() || 'Uncategorized';
      const additionalInfo = editAdditionalInfoRef.current?.value?.trim() || '';
      
      const updatedCard = {
        ...editCardData,
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
        category: category,
        additional_info: additionalInfo,
        lastModified: serverTimestamp()
      };
      
      await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/flashcards`, editCardData.id), updatedCard);
      
      // Update the current card data in state immediately to show the new formatting
      setFlashcards(prevFlashcards => 
        prevFlashcards.map(card => 
          card.id === currentEditedCardId 
            ? { ...card, 
                question: editQuestion.trim(), 
                answer: editAnswer.trim(),
                category: category,
                additional_info: additionalInfo
              }
            : card
        )
      );
      
      // Close edit modal and reset state
      setIsEditingCard(false);
      setEditCardData(null);
      setEditQuestion('');
      setEditAnswer('');
      setGeneratedQuestions([]);
      setShowGeneratedQuestionsModal(false);
      
      console.log('Card updated successfully, position preserved in ref');
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Failed to update card: ' + error.message);
    }
  };

  const handleCopyPrompt = () => {
    // Uses the Clipboard API for modern browsers
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(generationPromptContent.trim())
        .then(() => {
          setCopyFeedback('Copied!');
          setTimeout(() => setCopyFeedback(''), 2000); // Clear feedback after 2 seconds
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          setCopyFeedback('Failed to copy.');
          setTimeout(() => setCopyFeedback(''), 2000);
        });
    } else {
      // Fallback for older browsers (e.g., execCommand)
      // Note: execCommand is deprecated, but useful for broader compatibility in some limited environments
      const textArea = document.createElement("textarea");
      textArea.value = generationPromptContent.trim();
      textArea.style.position = "fixed";  // Avoid scrolling to bottom
      textArea.style.left = "-9999px"; // Hide element
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback('Copied!');
        setTimeout(() => setCopyFeedback(''), 2000);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        setCopyFeedback('Failed to copy (fallback).');
        setTimeout(() => setCopyFeedback(''), 2000);
      }
      document.body.removeChild(textArea);
    }
  };


  // Calculate reviewed and yet-to-review counts for FILTERED cards
  const now = new Date(); // Use current time for more precise "due" calculation

  // Cards that are due for review (nextReview is now or in the past, or not set for new cards)
  const yetToReviewCards = filteredFlashcards.filter(card => {
    const nextReviewDate = card.nextReview ? card.nextReview.toDate() : null;
    // A card is due if it has no nextReview date (new card) or if its nextReview date is now or in the past
    return !nextReviewDate || nextReviewDate <= now;
  });

  // Cards that have been reviewed and are not yet due again (nextReview is in the future)
  const reviewedCards = filteredFlashcards.filter(card => {
    const nextReviewDate = card.nextReview ? card.nextReview.toDate() : null;
    // A card is reviewed if it has a nextReview date AND that date is in the future
    return nextReviewDate && nextReviewDate > now;
  });

  const totalCardsCount = filteredFlashcards.length;
  const reviewedCount = reviewedCards.length;
  const toReviewCount = yetToReviewCards.length;

  // Calculate total cards that were due today (including those already reviewed)
  const cardsDueToday = flashcards.filter(card => {
    // Apply category filter first
    if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
    
    // Card is considered "due today" if:
    // 1. It was due before or on today (nextReview <= end of today), OR
    // 2. It was reviewed today (meaning it was due and got completed)
    
    // Check if reviewed today (was due and completed today)
    if (card.lastReview) {
      const lastReviewDate = card.lastReview.toDate ? card.lastReview.toDate() : new Date(card.lastReview);
      if (lastReviewDate >= today && lastReviewDate < tomorrow) {
        return true; // Was reviewed today, so it was due today
      }
    }
    
    // Check if still due (was due before end of today and not yet reviewed today)
    if (card.nextReview) {
      const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      return nextReviewDate <= endOfToday;
    }
    
    // New cards (no nextReview) are always considered due
    return !card.nextReview;
  }).length;

  // Calculate cards reviewed today
  const cardsReviewedToday = flashcards.filter(card => {
    // Apply category filter first
    if (selectedCategory !== 'All' && card.category !== selectedCategory) return false;
    
    if (!card.lastReview) return false;
    const lastReviewDate = card.lastReview.toDate ? card.lastReview.toDate() : new Date(card.lastReview);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
    return lastReviewDate >= today && lastReviewDate < tomorrow;
  }).length;


  // Function to get daily due counts for the next 30 days (for ALL flashcards, not just filtered)
  const getDailyDueCounts = () => {
    const dailyCounts = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dailyCounts[dateString] = 0;
    }

    flashcards.forEach(card => {
      const nextReviewDate = card.nextReview ? card.nextReview.toDate() : null;
      if (nextReviewDate) {
        const cardDueDate = new Date(nextReviewDate);
        cardDueDate.setHours(0, 0, 0, 0);

        if (cardDueDate <= today) {
          const todayString = today.toISOString().split('T')[0];
          dailyCounts[todayString] = (dailyCounts[todayString] || 0) + 1;
        } else {
          const futureDateString = cardDueDate.toISOString().split('T')[0];
          if (dailyCounts.hasOwnProperty(futureDateString)) {
            dailyCounts[futureDateString] = (dailyCounts[futureDateString] || 0) + 1;
          }
        }
      } else {
        const todayString = today.toISOString().split('T')[0];
        dailyCounts[todayString] = (dailyCounts[todayString] || 0) + 1;
      }
    });

    return dailyCounts;
  };

  const dailyDueCounts = getDailyDueCounts();

  // Get unique categories with due counts for the dropdown
  const getCategoriesWithCounts = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today to match filtering logic
    const categoryData = [];
    
    // Get all unique categories
    const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
    
    // Add 'All' category with count based on current filter
    const allFilteredCards = flashcards.filter(card => {
      if (showDueTodayOnly) {
        if (!card.nextReview) return true; // New cards are always due
        const nextReview = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
        return nextReview <= today;
      }
      return true; // Show all cards when filter is off
    });
    categoryData.push({ name: 'All', count: allFilteredCards.length });
    
    // Add each category with its count based on current filter
    allCategories.forEach(category => {
      const cardsInCategory = flashcards.filter(card => {
        if ((card.category || 'Uncategorized') !== category) return false;
        
        if (showDueTodayOnly) {
          if (!card.nextReview) return true; // New cards are always due
          const nextReview = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
          return nextReview <= today;
        }
        return true; // Show all cards when filter is off
      });
      
      // Only add category if it has cards, or if we're showing all cards (not just due today)
      if (cardsInCategory.length > 0 || !showDueTodayOnly) {
        categoryData.push({ name: category, count: cardsInCategory.length });
      }
    });
    
    // Sort categories based on user preference (but keep 'All' at the top)
    const allCategory = categoryData.find(cat => cat.name === 'All');
    const otherCategories = categoryData.filter(cat => cat.name !== 'All');
    
    switch (categorySortBy) {
      case 'most-due':
        otherCategories.sort((a, b) => b.count - a.count);
        break;
      case 'least-due':
        otherCategories.sort((a, b) => a.count - b.count);
        break;
      case 'alphabetical':
      default:
        otherCategories.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    // Return with 'All' first, then sorted categories
    const sortedCategoryData = [allCategory, ...otherCategories];
    
    console.log('Categories with counts:', sortedCategoryData);
    console.log('Sort by:', categorySortBy);
    console.log('showDueTodayOnly:', showDueTodayOnly);
    console.log('today cutoff:', today);
    
    return sortedCategoryData;
  };
  
  const categoriesWithCounts = getCategoriesWithCounts();
  const uniqueCategories = categoriesWithCounts.map(cat => cat.name); // Keep for backward compatibility

  // Effect to handle keyboard events for navigation and review
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger if user is typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || 
          event.target.contentEditable === 'true') {
        return;
      }
      
      // Only trigger if no modals or forms are open and there are filtered flashcards
      const isStudyViewActive = !showCreateCardForm && !showUploadCsvForm && !showCalendarModal && !showSettingsModal && !isEditingCard && !showGeneratedQuestionsModal;
      if (!isStudyViewActive || filteredFlashcards.length === 0) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault(); // Prevent scrolling down the page
        setShowAnswer(prev => !prev); // Toggle the answer visibility
        setGeneratedExample(''); // Clear generated example when flipping
        setGeneratedQuestions([]); // Clear generated questions when flipping
        setGeminiExplanation(''); // Clear generated explanation when flipping
      } else if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        reviewCard(1, filteredFlashcards[currentCardIndex]);
      } else if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        reviewCard(2, filteredFlashcards[currentCardIndex]);
      } else if (event.key === 'g' || event.key === 'G') {
        event.preventDefault();
        reviewCard(3, filteredFlashcards[currentCardIndex]);
      } else if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        reviewCard(4, filteredFlashcards[currentCardIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener when the component unmounts or dependencies change
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showCreateCardForm,
    showUploadCsvForm,
    showCalendarModal,
    showSettingsModal,
    isEditingCard,
    showGeneratedQuestionsModal,
    filteredFlashcards,
    currentCardIndex,
    reviewCard
  ]);

  // Effect to restore card position after editing
  useEffect(() => {
    // Check if we have a preserved card position and the filtered flashcards have been updated
    if (preservedCardIndexRef.current && filteredFlashcards.length > 0) {
      const { cardId, index, timestamp } = preservedCardIndexRef.current;
      
      // Only restore position if this is recent (within 5 seconds) to avoid stale restores
      if (Date.now() - timestamp < 5000) {
        // Try to find the card by ID first (most accurate)
        const cardIndex = filteredFlashcards.findIndex(card => card.id === cardId);
        
        if (cardIndex !== -1) {
          // Found the card, set to its current position
          setCurrentCardIndex(cardIndex);
          setShowAnswer(true); // Show the answer to display the formatted content
          console.log('Restored card position by ID:', cardIndex);
        } else {
          // Card not found, fallback to the saved index if it's valid
          const fallbackIndex = Math.min(index, filteredFlashcards.length - 1);
          setCurrentCardIndex(fallbackIndex);
          console.log('Restored card position by index fallback:', fallbackIndex);
        }
        
        // Clear the preserved position after restoring
        preservedCardIndexRef.current = null;
      }
    }
  }, [filteredFlashcards]);

  // Content for the File Upload Guide in Settings
  const csvUploadGuideContent = `
### Understanding the File Upload Format

Your flashcard application supports CSV, Excel (.xlsx), and Numbers (.numbers) files. All formats expect the same column structure to correctly parse the data. Here's a breakdown of each field and how to handle special characters:

**Format:** \`number,category,question,answer,additional_info\`

1.  **\`number\` (Optional):**
    * This field is for an arbitrary numerical identifier.
    * **If you don't provide a number, leave this field completely empty.** Do not put \`""\` or \` \` (a space).
    * Example (empty number): \`,,Math,What is 2 + 2?,...\`

2.  **\`category\` (Optional):**
    * This field allows you to group your flashcards.
    * **If you don't provide a category, leave this field completely empty.** It will default to 'Uncategorized' in the app.
    * Example (empty category): \`,,What is 1 + 1?,...\`

3.  **\`question\` (Required):**
    * The question for your flashcard. This field cannot be empty.

4.  **\`answer\` (Required):**
    * The answer to your flashcard. This field cannot be empty.

5.  **\`additional_info\` (Optional):**
    * This field is for any extra notes, context, or code examples related to the flashcard.
    * **If you don't provide additional info, leave this field completely empty.**

#### Handling Special Characters within Fields

The most critical aspect of CSV is correctly handling content that contains delimiters (commas), line breaks, or quotation marks within a field's data.

* **Commas (\`,\`) within a field:**
    * If a field's content contains a comma, the **entire field must be enclosed in double quotes (\`"\`)\`.**
    * Example: \`,,What are colors?,"Red, Blue, Green",...\`

* **Newline characters (line breaks) within a field:**
    * If a field's content spans multiple lines, the **entire field must be enclosed in double quotes (\`"\`)\`.** The newlines within the quotes will be preserved.
    * Example: \`,,List fruits,"Apples\\nBananas\\nOranges",...\`
    * *Note:* The \`\\n\` here represents a newline character.

* **Double Quotes (\`"\`) within a quoted field:**
    * If a field is enclosed in double quotes (because it contains commas or newlines), and the field * itself* contains a double quote, that **internal double quote must be escaped by preceding it with another double quote (\`""\`)\`.**
    * Example: \`,,What is a ""simple"" example?,"Something easy to understand.",...\`

`;

  // Content for the Prompt for Generating Flashcards
  const generationPromptContent = `
Please generate 20 flashcards about [Subject].
For each flashcard, provide the following information in CSV format:
number,category,question,answer,additional_info

Constraints:
- Number is optional; if omitted, leave it empty.
- Category is optional; if omitted, default to 'Uncategorized'.
- Question and Answer are required and should not be empty.
- Use quotes for multiline content or content that contains commas.
- Ensure the CSV content is UTF-8 encoded.
- Additional_info is optional; if omitted, leave it empty.

Example:
,Math,What is 2 + 2?,4
`;


  // Show loading screen while authentication is being determined
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 font-inter bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Loading...</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Show login screen first on app load or when explicitly requested
  if (showLoginScreen || !userId) {
    return (
      <LoginScreen
        authError={authError}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        handleAnonymousLogin={handleAnonymousLogin}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
      />
    );
  }

  // Show loading state if settings aren't loaded yet (only after user is logged in)
  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 font-inter dark:from-gray-800 dark:to-gray-900 transition-colors duration-500">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading user settings...</p>
      </div>
    );
  }

  // Determine the current flashcard to display
  const currentCard = filteredFlashcards[currentCardIndex];

  // Function to show export modal
  const handleShowExportModal = () => {
    if (!filteredFlashcards || filteredFlashcards.length === 0) {
      alert('No cards to export!');
      return;
    }
    setShowExportModal(true);
  };

  // Test function to verify XLSX is working
  const testXLSX = () => {
    try {
      console.log('Testing XLSX library...');
      console.log('XLSX available:', !!XLSX);
      console.log('XLSX.utils available:', !!XLSX?.utils);
      console.log('XLSX.write available:', !!XLSX?.write);
      console.log('XLSX version:', XLSX?.version);
      
      // Create a simple test workbook
      const testData = [['Test', 'Data'], ['Hello', 'World']];
      const testWorkbook = XLSX.utils.book_new();
      const testWorksheet = XLSX.utils.aoa_to_sheet(testData);
      XLSX.utils.book_append_sheet(testWorkbook, testWorksheet, 'Test');
      
      // Try to create a blob
      const testBlob = XLSX.write(testWorkbook, { bookType: 'xlsx', type: 'array' });
      console.log('Test blob created, size:', testBlob.byteLength);
      
      return true;
    } catch (error) {
      console.error('XLSX test failed:', error);
      return false;
    }
  };

  // Function to handle the actual export based on selected format
  const handleExportConfirm = async () => {
    console.log('Export confirmed with format:', exportFormat);
    
    // Test XLSX library before proceeding with Excel export
    if (exportFormat === 'excel') {
      const xlsxWorking = testXLSX();
      if (!xlsxWorking) {
        alert('Excel export is not available. The XLSX library failed to load properly. Please try CSV export instead.');
        return;
      }
    }
    
    // Format the date for filename
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);
    const dateStr = formattedDate.replace(/,/g, '').replace(/ /g, '_');

    try {
      if (exportFormat === 'csv') {
        console.log('Calling CSV export');
        exportCSV(dateStr);
      } else {
        console.log('Calling Excel export');
        await exportExcel(dateStr);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
    
    setShowExportModal(false);
  };

  // Function to export cards as CSV
  const exportCSV = (dateStr) => {
    // Create CSV content matching import format: id,number,category,question,answer,additional_info
    const headers = ['id', 'number', 'category', 'question', 'answer', 'additional_info'];
    const csvContent = [
      headers.join(','),
      ...filteredFlashcards.map((card, index) => {
        // Function to properly escape and quote CSV fields while preserving formatting
        const escapeField = (field) => {
          if (!field) return '';
          // Convert to string and preserve line breaks, spacing, and formatting
          const fieldStr = String(field);
          // Only wrap in quotes if the field contains special characters
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n') || fieldStr.includes('\r')) {
            // Replace double quotes with double double quotes and wrap in quotes
            return `"${fieldStr.replace(/"/g, '""')}"`;
          }
          return fieldStr;
        };

        const row = [
          escapeField(card.id || ''),
          escapeField(card.csvNumber || ''),
          escapeField(card.category || 'Uncategorized'),
          escapeField(card.question || ''),
          escapeField(card.answer || ''),
          escapeField(card.additional_info || '')
        ];
        return row.join(',');
      })
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `flashcards_export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to clean and truncate text for Excel
  const cleanTextForExcel = (text, maxLength = 32000) => {
    if (!text) return '';
    
    // Strip HTML tags
    let cleanText = text.replace(/<[^>]*>/g, '');
    
    // Replace HTML entities
    cleanText = cleanText
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Remove extra whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long and add indicator
    if (cleanText.length > maxLength) {
      cleanText = cleanText.substring(0, maxLength - 20) + '... [TRUNCATED]';
    }
    
    return cleanText;
  };

  // Function to check if content is too long for a single Excel file
  const checkContentLength = (cards) => {
    let totalLength = 0;
    let hasLongContent = false;
    let maxFieldLength = 0;
    let problemCard = null;
    
    cards.forEach((card, index) => {
      const questionLength = (card.question || '').length;
      const answerLength = (card.answer || '').length;
      const additionalLength = (card.additional_info || '').length;
      
      totalLength += questionLength + answerLength + additionalLength;
      
      const maxCurrentField = Math.max(questionLength, answerLength, additionalLength);
      if (maxCurrentField > maxFieldLength) {
        maxFieldLength = maxCurrentField;
        problemCard = { index, questionLength, answerLength, additionalLength };
      }
      
      // Excel limit is 32,767 characters per cell - be more conservative
      if (questionLength > 30000 || answerLength > 30000 || additionalLength > 30000) {
        hasLongContent = true;
      }
    });
    
    console.log('Content analysis:', {
      totalCards: cards.length,
      totalLength,
      maxFieldLength,
      hasLongContent,
      problemCard
    });
    
    // Consider it too long if any single field > 30K chars (close to Excel's 32K limit)
    const shouldSplit = hasLongContent || maxFieldLength > 30000;
    
    if (shouldSplit) {
      console.log('Will split into categories due to long content');
    } else {
      console.log('Content size is manageable for single file');
    }
    
    return shouldSplit;
  };

  // Function to create a single Excel workbook from cards
  const createExcelWorkbook = (cards, sheetName = 'Flashcards') => {
    const headers = ['id', 'number', 'category', 'question', 'answer', 'additional_info'];
    const worksheetData = [
      headers,
      ...cards.map((card, index) => {
        const row = [
          card.id || '',
          card.csvNumber || '',
          card.category || 'Uncategorized',
          cleanTextForExcel(card.question),
          cleanTextForExcel(card.answer),
          cleanTextForExcel(card.additional_info)
        ];
        
        return row;
      })
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { width: 10 }, // id
      { width: 10 }, // number
      { width: 15 }, // category
      { width: 30 }, // question
      { width: 50 }, // answer
      { width: 20 }  // additional_info
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return workbook;
  };

  // Function to create categorized ZIP export
  const createCategorizedExport = async (dateStr) => {
    console.log('Creating categorized export...');
    
    // Group cards by category
    const cardsByCategory = {};
    filteredFlashcards.forEach(card => {
      const category = card.category || 'Uncategorized';
      if (!cardsByCategory[category]) {
        cardsByCategory[category] = [];
      }
      cardsByCategory[category].push(card);
    });
    
    const categories = Object.keys(cardsByCategory);
    console.log(`Creating ${categories.length} category files:`, categories);
    
    // Create ZIP file
    const zip = new JSZip();
    const folder = zip.folder('Flashcards_by_Category');
    
    // Create Excel file for each category
    for (const category of categories) {
      const categoryCards = cardsByCategory[category];
      const sanitizedCategory = category.replace(/[<>:"/\\|?*]/g, '_');
      
      try {
        const workbook = createExcelWorkbook(categoryCards, sanitizedCategory);
        const workbookBlob = XLSX.write(workbook, { 
          bookType: 'xlsx', 
          type: 'array',
          compression: true 
        });
        
        folder.file(`${sanitizedCategory}_${categoryCards.length}_cards.xlsx`, workbookBlob);
        console.log(`✅ Added ${sanitizedCategory} with ${categoryCards.length} cards`);
      } catch (categoryError) {
        console.error(`❌ Failed to create Excel for category ${category}:`, categoryError);
        // If even individual categories fail, create a CSV file instead
        const csvData = [
          ['id', 'number', 'category', 'question', 'answer', 'additional_info'],
          ...categoryCards.map(card => [
            card.id || '',
            card.csvNumber || '',
            card.category || 'Uncategorized',
            (card.question || '').replace(/"/g, '""'),
            (card.answer || '').replace(/"/g, '""'),
            (card.additional_info || '').replace(/"/g, '""')
          ])
        ].map(row => row.join(',')).join('\n');
        
        folder.file(`${sanitizedCategory}_${categoryCards.length}_cards.csv`, csvData);
        console.log(`📄 Added ${sanitizedCategory} as CSV fallback`);
      }
    }
    
    // Add a summary file
    const summaryData = [
      ['Category', 'Card Count', 'File Name'],
      ...categories.map(category => [
        category,
        cardsByCategory[category].length,
        `${category.replace(/[<>:"/\\|?*]/g, '_')}_${cardsByCategory[category].length}_cards.xlsx`
      ]),
      ['Total', filteredFlashcards.length, `${categories.length} files`]
    ];
    
    const summaryWorkbook = XLSX.utils.book_new();
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ width: 20 }, { width: 15 }, { width: 40 }];
    XLSX.utils.book_append_sheet(summaryWorkbook, summaryWorksheet, 'Export Summary');
    
    const summaryBlob = XLSX.write(summaryWorkbook, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true 
    });
    
    folder.file('_Export_Summary.xlsx', summaryBlob);
    
    // Generate ZIP file
    console.log('Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // Download ZIP file
    const zipFilename = `flashcards_export_${dateStr}_by_category.zip`;
    const link = document.createElement('a');
    const url = URL.createObjectURL(zipBlob);
    link.setAttribute('href', url);
    link.setAttribute('download', zipFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('ZIP export completed successfully:', zipFilename);
    alert(`ZIP file "${zipFilename}" downloaded successfully!\n\nContains ${categories.length} files organized by category, plus a summary file.`);
  };

  // Function to export cards as Excel file(s)
  const exportExcel = async (dateStr) => {
    try {
      console.log('Starting Excel export with', filteredFlashcards.length, 'cards');
      console.log('XLSX library check:', typeof XLSX, XLSX?.version);
      
      if (!XLSX || !XLSX.utils) {
        throw new Error('XLSX library not loaded properly');
      }

      if (!JSZip) {
        throw new Error('JSZip library not loaded properly');
      }
      
      // Check if content is too long for a single file
      const isTooLong = checkContentLength(filteredFlashcards);
      
      if (!isTooLong) {
        // Try simple single-file export first
        console.log('Content size is manageable, attempting single Excel file...');
        
        try {
          const workbook = createExcelWorkbook(filteredFlashcards);
          const filename = `flashcards_export_${dateStr}.xlsx`;
          
          const workbookBlob = XLSX.write(workbook, { 
            bookType: 'xlsx', 
            type: 'array',
            compression: true 
          });
          
          const blob = new Blob([workbookBlob], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
          
          console.log('Single Excel export completed successfully:', filename);
          alert(`Excel file "${filename}" downloaded successfully!`);
          
        } catch (singleFileError) {
          console.warn('Single file export failed, falling back to categorized export:', singleFileError);
          
          // Check if it's the character limit error
          if (singleFileError.message && singleFileError.message.includes('32767')) {
            console.log('Character limit exceeded, automatically switching to categorized export...');
            alert('Content is too large for a single Excel file. Creating separate files by category...');
            await createCategorizedExport(dateStr);
          } else {
            throw singleFileError; // Re-throw if it's a different error
          }
        }
        
      } else {
        // Content is pre-determined to be too long - split by categories
        console.log('Content is too large, creating categorized export...');
        await createCategorizedExport(dateStr);
      }
      
    } catch (error) {
      console.error('Error during Excel export:', error);
      console.error('Error stack:', error.stack);
      alert(`Excel export failed: ${error.message}\n\nCheck browser console for details.`);
    }
  };

  // Show login screen if user is not authenticated
  if (showLoginScreen && !userId) {
    return (
      <LoginScreen 
        authError={authError}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        handleAnonymousLogin={handleAnonymousLogin}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <>
    <div className="min-h-screen flex flex-col items-center p-6 font-inter bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-gray-900 dark:to-indigo-950 text-slate-800 dark:text-slate-100 transition-all duration-700 ease-out backdrop-blur-sm"
         style={{
           background: 'linear-gradient(135deg, #ffffff 0%, #fefeff 25%, #fdfdff 50%, #fefffe 75%, #ffffff 100%)',
           backgroundSize: '400% 400%',
           animation: 'gradientShift 15s ease infinite',
           paddingTop: '280px',
           paddingBottom: '50px',
           scrollPaddingTop: '280px'
         }}>
      {/* Combined Header Panel */}
      <div className="fixed top-6 left-6 right-6 z-50" style={{ position: 'fixed', top: '24px', left: '24px', right: '24px', zIndex: 9999 }}>
        <div className="backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-700/50 dark:border-blue-700/50 p-8 relative" style={{ backgroundColor: 'rgba(147, 197, 253, 0.7)' }}>
          {/* Top Row - Navigation and Logo */}
          <div className="flex items-center justify-between mb-6">
            
            {/* Left Section - Navigation Buttons */}
            <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setShowCreateCardForm(false);
              setShowUploadCsvForm(false);
            }}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Study Cards
            </span>
          </button>
          <button
            onClick={() => {
              setShowCreateCardForm(true);
              setShowUploadCsvForm(false);
            }}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Card
            </span>
          </button>
          <button
            onClick={() => {
              setShowUploadCsvForm(true);
              setShowCreateCardForm(false);
            }}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import File
            </span>
          </button>
          <button
            onClick={handleShowExportModal}
            className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-blue-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export File
            </span>
          </button>

          {/* Login Button - Only show when not logged in */}
          {!userId && (
            <button
              onClick={() => setShowLoginModal(true)}
              className="group relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-800 dark:to-green-800 text-emerald-700 dark:text-emerald-200 hover:from-emerald-200 hover:to-green-200 dark:hover:from-emerald-700 dark:hover:to-green-700 focus:ring-emerald-400 shadow-md hover:shadow-lg"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </span>
            </button>
          )}

            </div>
            
            {/* Center Section - FSRS Logo */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700 dark:from-blue-400 dark:to-purple-500">
                FSRS Flashcards
              </h1>
            </div>
            
            {/* Right Section - Statistics */}
            <div className="flex items-center">
              {/* Statistics */}
              <div className="flex flex-col space-y-3 text-right">
                {showDueTodayOnly ? (
                  <>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">
                            {selectedCategory === 'All' ? "Today" : selectedCategory}
                          </p>
                          <p className="text-amber-600 dark:text-amber-400 text-xs font-bold">{cardsReviewedToday}/{cardsDueToday}</p>
                        </div>
                        {selectedCategory !== 'All' && (() => {
                        // Calculate overall today progress (all categories)
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        
                        const totalReviewedToday = flashcards.filter(card => {
                          if (!card.lastReview) return false;
                          const lastReviewDate = card.lastReview.toDate ? card.lastReview.toDate() : new Date(card.lastReview);
                          return lastReviewDate >= today && lastReviewDate < tomorrow;
                        }).length;
                        
                        const totalDueToday = flashcards.filter(card => {
                          // Check if reviewed today
                          if (card.lastReview) {
                            const lastReviewDate = card.lastReview.toDate ? card.lastReview.toDate() : new Date(card.lastReview);
                            if (lastReviewDate >= today && lastReviewDate < tomorrow) {
                              return true;
                            }
                          }
                          
                          // Check if still due
                          if (card.nextReview) {
                            const nextReviewDate = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
                            const endOfToday = new Date(today);
                            endOfToday.setHours(23, 59, 59, 999);
                            return nextReviewDate <= endOfToday;
                          }
                          
                          return !card.nextReview;
                        }).length;
                        
                        return (
                          <div className="flex items-center gap-2">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">Today</p>
                            <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">{totalReviewedToday}/{totalDueToday}</p>
                          </div>
                        );
                      })()}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">
                          {selectedCategory === 'All' ? 'Reviewed' : 'Reviewed'}
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">{reviewedCount}</p>
                        {selectedCategory !== 'All' && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs">in {selectedCategory}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⏳</span>
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">
                          {selectedCategory === 'All' ? 'To Review' : 'To Review'}
                        </p>
                        <p className="text-orange-600 dark:text-orange-400 text-sm font-semibold">{toReviewCount}</p>
                        {selectedCategory !== 'All' && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs">in {selectedCategory}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Bottom Right */}
          <div className="absolute bottom-6 right-6" style={{ position: 'absolute', bottom: '24px', right: '24px' }}>
            <div className="flex items-center gap-2">
              {/* Calendar Button */}
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowCalendarModal(true);
                }}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg border border-blue-700 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Show calendar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              {/* Settings Icon Button */}
              <button
                onClick={() => {
                  setShowCalendarModal(false);
                  setShowSettingsModal(true);
                }}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg border border-blue-700 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Open settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.942 3.33.83 2.891 2.673a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.942 1.543-.83 3.33-2.673 2.891a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.942-3.33-.83-2.891-2.673a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.942-1.543.83-3.33 2.673-2.891a1.724 1.724 0 002.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Logout Button - Only show when logged in */}
              {userId && (
                <button
                  onClick={handleLogout}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg border border-blue-700 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Category Filter, Sort Options, and Due Today Toggle - Side by side */}
          {flashcards.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300/50 dark:border-gray-600/50">
              <div className="flex flex-row items-end gap-2">
                {/* Category Filter */}
                <div className="flex-grow">
                  <label htmlFor="category-filter" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                    Filter by Category:
                  </label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full py-2 px-3 border-0 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold cursor-pointer text-slate-700 dark:text-slate-200 transition-all duration-300"
                  >
                    {categoriesWithCounts.map(cat => (
                      <option key={cat.name} value={cat.name} className="py-1">
                        {cat.name} ({cat.count} {showDueTodayOnly ? 'due' : 'cards'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Sort */}
                <div className="flex-shrink-0" style={{ minWidth: '120px' }}>
                  <label htmlFor="category-sort" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                    Sort by:
                  </label>
                  <select
                    id="category-sort"
                    value={categorySortBy}
                    onChange={(e) => setCategorySortBy(e.target.value)}
                    className="block w-full py-2 px-3 border-0 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold cursor-pointer text-slate-700 dark:text-slate-200 transition-all duration-300"
                  >
                    <option value="alphabetical">A-Z</option>
                    <option value="most-due">Most Due</option>
                    <option value="least-due">Least Due</option>
                  </select>
                </div>

                {/* Due Today Toggle - Only show when logged in */}
                {userId && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => setShowDueTodayOnly(!showDueTodayOnly)}
                      className={`px-4 py-2 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold cursor-pointer transition-all duration-300 whitespace-nowrap ${
                        showDueTodayOnly 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-white/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600'
                      }`}
                      title={showDueTodayOnly ? 'Show all cards' : 'Show only cards due today'}
                    >
                      {showDueTodayOnly ? 'Due Today' : 'All Cards'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Status text below both controls */}
              {userId && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {showDueTodayOnly 
                    ? `Showing ${filteredFlashcards.length} cards due today` 
                    : `Showing ${filteredFlashcards.length} of ${flashcards.length} total cards`
                  }
                </p>
              )}
            </div>
          )}
          
        </div>
      </div>


      {showCreateCardForm ? (
        // Create New Card Form
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 mb-8 transition-all duration-500 ease-in-out transform scale-100 opacity-100 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center dark:text-gray-200">Add New Flashcard</h2>
          <form onSubmit={handleAddCard} className="space-y-6">
            <div>
              <label htmlFor="question" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Question:
              </label>
              <textarea
                id="question"
                ref={newCardQuestionRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows="4"
                placeholder="Enter the question for the flashcard..."
              ></textarea>
            </div>
            <div>
              <label htmlFor="answer" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Answer:
              </label>
              <textarea
                id="answer"
                ref={newCardAnswerRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows="4"
                placeholder="Enter the answer for the flashcard..."
              ></textarea>
              {/* Gemini API Suggest Answer Button */}
              <button
                type="button"
                onClick={handleSuggestAnswer}
                disabled={isGeneratingAnswer}
                className={`w-full mt-3 py-2 px-4 rounded-lg font-semibold transition-all duration-300 transform shadow-md
                           ${isGeneratingAnswer ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                           text-black focus:outline-none focus:ring-4 focus:ring-purple-300 dark:bg-purple-800 dark:hover:bg-purple-700`}
              >
                {isGeneratingAnswer ? 'Suggesting...' : 'Suggest Answer ✨'}
              </button>
            </div>
            <div>
              <label htmlFor="category" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Category (Optional):
              </label>
              <input
                id="category"
                type="text"
                ref={newCardCategoryRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="e.g., Spring, Algorithms, Databases"
              />
            </div>
            {/* New Additional Info section */}
            <div>
              <label htmlFor="additional-info" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Additional Information (Optional):
              </label>
              <textarea
                id="additional-info"
                ref={newCardAdditionalInfoRef}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows="3"
                placeholder="Add extra notes, context, or code examples here..."
              ></textarea>
            </div>
            <div className="flex space-x-4">
            <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
              >
                Add Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCardForm(false);
                  // Clear form fields
                  if (newCardQuestionRef.current) newCardQuestionRef.current.value = '';
                  if (newCardAnswerRef.current) newCardAnswerRef.current.value = '';
                  if (newCardCategoryRef.current) newCardCategoryRef.current.value = '';
                  if (newCardAdditionalInfoRef.current) newCardAdditionalInfoRef.current.value = '';
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
              >
                Cancel
              </button>
              
            </div>
          </form>
        </div>
      ) : showUploadCsvForm ? (
        // New CSV Upload Form
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 mb-8 transition-all duration-500 ease-in-out transform scale-100 opacity-100 dark:bg-gray-800">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center dark:text-gray-200">Upload Flashcards from File</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="csv-upload" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                Select File(s) (CSV, Excel, Numbers):
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,.xlsx,.numbers"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="block w-full text-sm text-gray-500
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100 cursor-pointer
                           dark:file:bg-blue-800 dark:file:text-blue-100 dark:hover:file:bg-blue-700 dark:text-gray-300"
              />
              {selectedUploadFiles.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-h-20 overflow-y-auto">
                  Files selected:
                  <ul className="list-disc list-inside ml-2">
                    {selectedUploadFiles.map((file, index) => (
                      <li key={index} className="font-semibold">{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleUploadButtonClick} // New upload button
              disabled={selectedUploadFiles.length === 0 || uploadMessage.startsWith('Processing')}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform shadow-md hover:shadow-lg active:shadow-inner
                         ${selectedUploadFiles.length === 0 || uploadMessage.startsWith('Processing') ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                         text-black focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95`}
            >
              {uploadMessage.startsWith('Processing') ? 'Uploading...' : `Upload Selected File${selectedUploadFiles.length > 1 ? 's' : ''}`}
            </button>

            {uploadMessage && !uploadMessage.startsWith('Processing') && (
              <p className="text-green-600 text-center font-bold">{uploadMessage}</p>
            )}
            {uploadError && (
              <p className="text-red-600 text-center font-bold">{uploadError}</p>
            )}

            {/* Prompt for Generating Flashcards - Now a collapsible dropdown */}
            <div className="bg-blue-100 dark:bg-gray-700 dark:text-gray-300 p-4 rounded-lg text-sm text-gray-700 overflow-auto max-h-60">
              <div className="flex justify-between items-center w-full focus:outline-none">
                <button
                  onClick={() => setShowGenerationPrompt(!showGenerationPrompt)}
                  className="flex items-center w-full focus:outline-none"
                >
                  <h3 className="font-bold mr-2">Prompt for Generating Flashcards:</h3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-700 dark:text-gray-200 transition-transform duration-300 ${
                      showGenerationPrompt ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleCopyPrompt}
                  className="ml-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-semibold shadow-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
                  title="Copy prompt to clipboard"
                >
                  {copyFeedback || 'Copy'}
                </button>
              </div>
              {showGenerationPrompt && (
                <pre className="whitespace-pre-wrap font-mono text-xs p-2 bg-gray-200 rounded-md dark:bg-gray-900 dark:text-gray-100 mt-2">
                  {generationPromptContent.trim()}
                </pre>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Flashcard Study View
        <div className="flex flex-col md:flex-row items-start justify-center w-full max-w-7xl gap-4"> {/* Outer wrapper for side-by-side layout */}
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 w-full" role="alert">
              <strong className="font-bold">Firebase Authentication Error:</strong>
              <span className="block sm:inline ml-2">{authError}</span>
            </div>
          )}
          {filteredFlashcards.length > 0 && currentCard ? (
            <>
              <div className="flex items-center justify-center w-full md:w-3/4 flex-col"> {/* Main card wrapper and AI buttons container */}
                <div className="flex items-center justify-center w-full"> {/* Card container */}
                  {/* Flashcard Panel Container with navigation layout */}
                  <div className="flashcard-container relative backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-700/50 dark:border-blue-700/50 p-16" style={{ backgroundColor: 'rgba(147, 197, 253, 0.7)', borderRadius: '1.5rem', overflow: 'visible', minHeight: '56rem', minWidth: '80rem' }}>
                    
                    {/* Spacer for top */}
                    <div className="h-8"></div>
                    
                    {/* Main content area with arrows positioned in space between card and panel edges */}
                    <div className="relative flex items-center justify-center">
                      
                      {/* Left Arrow Button - Positioned just outside card edge within panel */}
                      <button
                        onClick={prevCard}
                        className="absolute top-1/2 transform -translate-y-1/2 group flex items-center justify-center p-3 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-900/90 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
                        style={{ left: '2rem' }}
                        aria-label="Previous card (Left Arrow)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Flashcard Container */}
                      <div className="flex justify-center items-center">
                    {/* Flashcard (main content area) */}
                    <div
                      className="relative w-full max-w-7xl h-[58rem] backdrop-blur-2xl bg-gradient-to-br from-white/90 via-blue-50/80 to-indigo-100/90 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-indigo-900/90 rounded-3xl shadow-2xl border border-white/30 dark:border-slate-600/30 flex flex-col items-center justify-center text-center p-14 cursor-pointer transform transition-all duration-700 ease-out hover:scale-[1.02] hover:shadow-3xl"
                      onClick={() => setShowAnswer(!showAnswer)}
                      style={{ 
                        minHeight: '58rem', 
                        minWidth: '1050px',
                        borderRadius: '1.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240, 249, 255, 0.8) 25%, rgba(224, 231, 255, 0.8) 75%, rgba(255,255,255,0.9) 100%)',
                        overflow: 'hidden'
                      }}
                    >
                    <div className="absolute inset-0 backdrop-blur-sm bg-white dark:bg-slate-100 flex flex-col justify-start p-10 text-slate-800 dark:text-slate-900 transition-all duration-700 ease-out backface-hidden border-2 border-slate-200 dark:border-slate-600 shadow-lg" style={{ borderRadius: '2rem', transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                      <div className="text-4xl font-bold mb-8 overflow-auto max-h-full leading-relaxed text-center mt-8">
                        <div className="text-3xl text-blue-600 dark:text-blue-400 mb-4 font-bold">Question</div>
                        <div 
                          className="text-slate-700 dark:text-slate-200 leading-relaxed text-2xl"
                          dangerouslySetInnerHTML={{ __html: currentCard.question }}
                        ></div>
                      </div>
                    </div>

                    <div className="absolute inset-0 backdrop-blur-sm bg-white dark:bg-slate-100 flex flex-col justify-between p-10 text-slate-800 dark:text-slate-900 transition-all duration-700 ease-out backface-hidden border-2 border-slate-200 dark:border-slate-600 shadow-lg" style={{ borderRadius: '2rem', transform: showAnswer ? 'rotateY(0deg)' : 'rotateY(-180deg)', backfaceVisibility: 'hidden' }}>
                      {/* Display answer with improved formatting */}
                      <div className="mb-6 overflow-y-auto w-full flex-grow mt-8" style={{ maxHeight: 'calc(100% - 200px)' }}>
                        <div className="text-3xl text-emerald-600 dark:text-emerald-400 mb-6 font-bold text-center">Answer</div>
                        <div className="prose prose-lg max-w-none dark:prose-invert px-8 mx-4">
                          <div 
                            className="text-2xl leading-relaxed font-bold text-slate-700 dark:text-slate-200 text-left"
                            dangerouslySetInnerHTML={{ __html: currentCard.answer }}
                          ></div>
                          </div>
                        </div>
                      </div>
                      {/* Additional Info / Generated Content within the card */}
                      {currentCard.additional_info && (
                        <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-100 rounded-lg max-h-20 overflow-auto w-full dark:bg-gray-600 dark:text-gray-300">
                          <strong>Additional Info:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard.additional_info }}></span>
                        </div>
                      )}
                      {generatedExample && (
                        <div className="mt-3 p-2 bg-gray-100 rounded-lg text-sm text-gray-700 text-left overflow-auto w-full dark:bg-gray-600 dark:text-gray-200">
                          <h4 className="font-bold mb-1">Example:</h4>
                          <pre className="whitespace-pre-wrap font-mono text-xs dark:text-gray-100 p-2 bg-gray-200 dark:bg-gray-800 rounded-md">
                            <code>{generatedExample}</code>
                          </pre>
                        </div>
                      )}
                      {geminiExplanation && (
                        <div className="mt-3 p-2 bg-gray-100 rounded-lg text-sm text-gray-700 text-left overflow-auto w-full dark:bg-gray-600 dark:text-gray-200">
                          <h4 className="font-bold mb-1">Explanation:</h4>
                          <pre className="whitespace-pre-wrap font-mono text-xs dark:text-gray-100">
                            {geminiExplanation}
                          </pre>
                        </div>
                      )}

                      {/* AI Buttons aligned at the very bottom inside the card */}
                      <div className="w-full flex justify-around space-x-2 mt-auto pt-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleGenerateExample(currentCard.question, currentCard.answer); }}
                          disabled={isGeneratingExample}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isGeneratingExample ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}
                                     text-black focus:outline-none focus:ring-4 focus:ring-teal-300 active:scale-95`}
                        >
                          {isGeneratingExample ? 'Generating...' : 'Example ✨'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleGenerateQuestions(currentCard.question, currentCard.answer); }}
                          disabled={isGeneratingQuestions}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isGeneratingQuestions ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}
                                     text-black focus:outline-none focus:ring-4 focus:ring-orange-300 active:scale-95`}
                        >
                          {isGeneratingQuestions ? 'Generating...' : 'Related Questions ✨'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleExplainConcept(currentCard.question, currentCard.answer); }}
                          disabled={isExplainingConcept}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 transform shadow-md
                                     ${isExplainingConcept ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700'}
                                     text-black focus:outline-none focus:ring-4 focus:ring-pink-300 active:scale-95`}
                        >
                          {isExplainingConcept ? 'Explaining...' : 'Explain ✨'}
                        </button>
                      </div>
                    </div>
                      </div>

                      {/* Right Arrow Button - Positioned just outside card edge within panel */}
                      <button
                        onClick={nextCard}
                        className="absolute top-1/2 transform -translate-y-1/2 group flex items-center justify-center p-3 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-900/90 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
                        style={{ right: '2rem' }}
                        aria-label="Next card (Right Arrow)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Spacer for bottom */}
                    <div className="h-8"></div>
                    
                    {/* Edit Card Button - Bottom right of panel */}
                    <button
                      onClick={() => handleEditCard(currentCard)}
                      className="absolute bottom-4 right-4 group flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-900/90 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-semibold z-10"
                      aria-label="Edit card"
                      style={{ position: 'absolute', bottom: '16px', right: '16px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                      </svg>
                      Edit Card
                    </button>
                  </div>
                </div>

                {filteredFlashcards.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center w-full">
                    Click card or press SPACE to flip.
                  </p>
                )}

                <div className="flex flex-wrap sm:flex-nowrap mt-4 gap-2 sm:gap-4 justify-center">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard && !isReviewing) {
                        reviewCard(1, currentCard);
                      }
                    }}
                    disabled={isReviewing}
                    className={`flex-1 sm:flex-none ${isReviewing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg shadow-md transition-all duration-300 transform ${isReviewing ? '' : 'hover:scale-105 active:scale-95'} focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-800 dark:hover:bg-red-700 text-sm sm:text-base`}
                  >
                    Again (1)
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard && !isReviewing) {
                        reviewCard(2, currentCard);
                      }
                    }}
                    disabled={isReviewing}
                    className={`flex-1 sm:flex-none ${isReviewing ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'} text-white font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg shadow-md transition-all duration-300 transform ${isReviewing ? '' : 'hover:scale-105 active:scale-95'} focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-sm sm:text-base`}
                  >
                    Hard (2)
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard && !isReviewing) {
                        reviewCard(3, currentCard);
                      }
                    }}
                    disabled={isReviewing}
                    className={`flex-1 sm:flex-none ${isReviewing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg shadow-md transition-all duration-300 transform ${isReviewing ? '' : 'hover:scale-105 active:scale-95'} focus:outline-none focus:ring-4 focus:ring-green-300 dark:bg-green-800 dark:hover:bg-green-700 text-sm sm:text-base`}
                  >
                    Good (3)
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentCard && !isReviewing) {
                        reviewCard(4, currentCard);
                      }
                    }}
                    disabled={isReviewing}
                    className={`flex-1 sm:flex-none ${isReviewing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg shadow-md transition-all duration-300 transform ${isReviewing ? '' : 'hover:scale-105 active:scale-95'} focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700 text-sm sm:text-base`}
                  >
                    Easy (4)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="w-full max-w-lg bg-white rounded-lg shadow-xl p-8 mb-8 text-center text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {(() => {
                  // Check if there are cards in the selected category (ignoring due date filter)
                  const cardsInCategory = selectedCategory === 'All' 
                    ? flashcards 
                    : flashcards.filter(card => card.category === selectedCategory);
                  
                  if (cardsInCategory.length === 0) {
                    return (
                      <div>
                        <p className="text-xl mb-4">No flashcards available in this category.</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Please add some cards or change the category filter.</p>
                      </div>
                    );
                  } else {
                    // Check if there are cards due in other categories
                    const today = new Date();
                    const categoriesWithDueCards = [];
                    
                    if (selectedCategory !== 'All') {
                      // Get all unique categories
                      const allCategories = [...new Set(flashcards.map(card => card.category))];
                      
                      // Check each category for due cards
                      allCategories.forEach(category => {
                        if (category !== selectedCategory) {
                          const dueCardsInCategory = flashcards.filter(card => {
                            if (card.category !== category) return false;
                            
                            // Check if card is due
                            if (!card.nextReview) return true; // New cards are always due
                            const nextReview = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
                            return nextReview <= today;
                          });
                          
                          if (dueCardsInCategory.length > 0) {
                            categoriesWithDueCards.push({
                              name: category,
                              count: dueCardsInCategory.length
                            });
                          }
                        }
                      });
                    }
                    
                    // If there are other categories with due cards, show option to switch
                    if (categoriesWithDueCards.length > 0 && selectedCategory !== 'All') {
                      return (
                        <div>
                          <div className="text-4xl mb-4">📝</div>
                          <p className="text-xl mb-4 font-semibold text-gray-600 dark:text-gray-400">No more cards in "{selectedCategory}"</p>
                          <p className="text-md mb-4 text-gray-600 dark:text-gray-300">
                            Would you like to continue with another category?
                          </p>
                          <div className="space-y-2 mb-6">
                            {categoriesWithDueCards.slice(0, 3).map((cat, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSelectedCategory(cat.name);
                                  setCurrentCardIndex(0);
                                  setShowAnswer(false);
                                }}
                                className="w-full flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg px-4 py-3 transition-all duration-200"
                              >
                                <span className="font-medium">{cat.name}</span>
                                <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm">
                                  {cat.count} due
                                </span>
                              </button>
                            ))}
                            {categoriesWithDueCards.length > 3 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                ...and {categoriesWithDueCards.length - 3} more
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedCategory('All')}
                            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-gray-300"
                          >
                            Review All Categories
                          </button>
                        </div>
                      );
                    } else {
                      // Calculate total cards due across ALL categories (not filtered)
                      const today = new Date();
                      const totalCardsDueTodayAllCategories = flashcards.filter(card => {
                        // Check if card is due today (no category filter)
                        if (!card.nextReview) return true; // New cards are always due
                        const nextReview = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
                        const endOfToday = new Date(today);
                        endOfToday.setHours(23, 59, 59, 999);
                        return nextReview <= endOfToday;
                      }).length;
                      
                      // Calculate total cards reviewed today across ALL categories
                      const totalCardsReviewedTodayAllCategories = flashcards.filter(card => {
                        if (!card.lastReview) return false;
                        const lastReviewDate = card.lastReview.toDate ? card.lastReview.toDate() : new Date(card.lastReview);
                        const todayStart = new Date(today);
                        todayStart.setHours(0, 0, 0, 0);
                        const tomorrow = new Date(todayStart);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return lastReviewDate >= todayStart && lastReviewDate < tomorrow;
                      }).length;
                      
                      // Check if ALL cards due today (across all categories) have been reviewed
                      // Only show congratulations if:
                      // 1. User is viewing "All" categories (not a specific category)
                      // 2. There were cards due today AND they've all been reviewed
                      const allDueCardsReviewed = selectedCategory === 'All' &&
                                                  totalCardsDueTodayAllCategories > 0 && 
                                                  (totalCardsReviewedTodayAllCategories >= totalCardsDueTodayAllCategories);
                      
                      if (allDueCardsReviewed) {
                        // All cards completed for the day - show congratulations
                        return (
                          <div>
                            <div className="text-6xl mb-4">🎉</div>
                            <p className="text-xl mb-4 font-semibold text-green-600 dark:text-green-400">Congratulations!</p>
                            <p className="text-lg mb-2">You've completed all {totalCardsReviewedTodayAllCategories} cards due today!</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Check back tomorrow for more cards to review.</p>
                          </div>
                        );
                      } else {
                        // Not all cards reviewed yet - check remaining due cards
                        const remainingDueCards = totalCardsDueTodayAllCategories - totalCardsReviewedTodayAllCategories;
                        
                        // Calculate categories with due cards if not already calculated
                        const categoriesWithDue = [];
                        const allCategories = [...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
                        
                        allCategories.forEach(category => {
                          if (category !== selectedCategory || selectedCategory === 'All') {
                            const dueCardsInCategory = flashcards.filter(card => {
                              if ((card.category || 'Uncategorized') !== category) return false;
                              
                              // Check if card is due
                              if (!card.nextReview) return true; // New cards are always due
                              const nextReview = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
                              const endOfToday = new Date();
                              endOfToday.setHours(23, 59, 59, 999);
                              return nextReview <= endOfToday;
                            });
                            
                            if (dueCardsInCategory.length > 0) {
                              categoriesWithDue.push({
                                name: category,
                                count: dueCardsInCategory.length
                              });
                            }
                          }
                        });
                        
                        // Sort according to user's preference
                        switch (categorySortBy) {
                          case 'most-due':
                            categoriesWithDue.sort((a, b) => b.count - a.count);
                            break;
                          case 'least-due':
                            categoriesWithDue.sort((a, b) => a.count - b.count);
                            break;
                          case 'alphabetical':
                          default:
                            categoriesWithDue.sort((a, b) => a.name.localeCompare(b.name));
                            break;
                        }
                        
                        // Find the next category with due cards (first in sorted list)
                        const nextCategoryWithDue = categoriesWithDue.length > 0 ? categoriesWithDue[0] : null;
                        
                        return (
                          <div>
                            <div className="text-4xl mb-4">📚</div>
                            <p className="text-xl mb-4 font-semibold text-blue-600 dark:text-blue-400">Keep going!</p>
                            <p className="text-lg mb-4">You've reviewed {totalCardsReviewedTodayAllCategories} of {totalCardsDueTodayAllCategories} cards due today.</p>
                            <p className="text-md mb-4 text-gray-600 dark:text-gray-300">
                              There {remainingDueCards === 1 ? 'is' : 'are'} still {remainingDueCards} {remainingDueCards === 1 ? 'card' : 'cards'} due in other categories.
                            </p>
                            {nextCategoryWithDue ? (
                              <button
                                onClick={() => {
                                  setSelectedCategory(nextCategoryWithDue.name);
                                  setCurrentCardIndex(0);
                                  setShowAnswer(false);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
                              >
                                Continue with "{nextCategoryWithDue.name}" ({nextCategoryWithDue.count} cards)
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedCategory('All');
                                  setCurrentCardIndex(0);
                                  setShowAnswer(false);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
                              >
                                Show All Categories
                              </button>
                            )}
                          </div>
                        );
                      }
                    }
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Card Edit Modal */}
      {isEditingCard && editCardData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 py-8 overflow-y-auto" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[calc(100vh-4rem)] flex flex-col transform transition-all duration-300 scale-100 opacity-100 dark:bg-gray-800 my-4">
            {/* Fixed Header with X button */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Edit Flashcard</h2>
              <button
                onClick={() => { setIsEditingCard(false); setGeneratedQuestions([]); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                title="Close"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f1f5f9',
              scrollBehavior: 'smooth',
              minHeight: '200px'
            }}>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="edit-question" className="block text-gray-700 text-sm font-bold dark:text-gray-300">
                    Question:
                  </label>
                  <button
                    type="button"
                    onClick={handleFormatQuestion}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    ✨ Format Question
                  </button>
                </div>
                <RichTextEditor
                  value={editQuestion}
                  onChange={setEditQuestion}
                  placeholder="Enter your question..."
                  minHeight="100px"
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="edit-answer" className="block text-gray-700 text-sm font-bold dark:text-gray-300">
                    Answer:
                  </label>
                  <button
                    type="button"
                    onClick={handleFormatAnswer}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    ✨ Format Answer
                  </button>
                </div>
                <RichTextEditor
                  value={editAnswer}
                  onChange={setEditAnswer}
                  placeholder="Enter your answer..."
                  minHeight="250px"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="edit-category" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                  Category:
                </label>
                <input
                  id="edit-category"
                  type="text"
                  ref={editCategoryRef}
                  defaultValue={editCardData.category || 'Uncategorized'}
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="edit-additional-info" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                  Additional Information:
                </label>
                <textarea
                  id="edit-additional-info"
                  ref={editAdditionalInfoRef}
                  defaultValue={editCardData.additional_info || ''}
                  className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y whitespace-pre-wrap dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  rows="3"
                ></textarea>
              </div>

              {/* Generate Similar Questions Button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateQuestions(editCardData.question, editCardData.answer);
                    // The modal will open automatically when questions are generated via the existing logic
                  }}
                  disabled={isGeneratingQuestions}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300 dark:bg-green-800 dark:hover:bg-green-700 dark:disabled:bg-green-600"
                >
                  {isGeneratingQuestions ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Questions...
                    </>
                  ) : (
                    <>🤖 Generate Similar Questions</>
                  )}
                </button>
              </div>


            </div>
            </div>
            {/* Fixed Footer with Action Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-600 p-6 flex-shrink-0">
              <div className="flex justify-between space-x-4">
                <button
                  onClick={handleSaveCardChanges}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-black font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => { setIsEditingCard(false); setGeneratedQuestions([]); }} // Clear on cancel
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-black font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-800 dark:hover:bg-red-700"
                >
                  Delete Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 20000 }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 dark:text-gray-100">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6 dark:text-gray-300">Are you sure you want to delete this flashcard? This action cannot be undone.</p>
            <div className="flex justify-around space-x-4">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-black font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 dark:bg-red-800 dark:hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[400px] max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Review Schedule</h2>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <Calendar calendarDates={calendarDates} onClose={() => setShowCalendarModal(false)} isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>
      )}

      {/* Generated Questions Modal */}
      {showGeneratedQuestionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 10010 }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Related Questions</h2>
              <button
                onClick={() => {
                  setShowGeneratedQuestionsModal(false);
                  setGeneratedQuestions([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isGeneratingQuestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-300">Generating related questions...</span>
                </div>
              ) : generatedQuestions.length > 0 ? (
                <div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Select the questions you'd like to create new flashcards for:
                  </p>
                  <div className="space-y-3">
                    {generatedQuestions.map((question) => (
                      <div key={question.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <input
                          type="checkbox"
                          id={`question-${question.id}`}
                          checked={question.selected || false}
                          onChange={() => handleGeneratedQuestionCheckboxChange(question.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`question-${question.id}`}
                          className="flex-1 text-gray-800 dark:text-gray-200 cursor-pointer"
                        >
                          {question.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">No questions generated yet.</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            {generatedQuestions.length > 0 && !isGeneratingQuestions && (
              <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {generatedQuestions.filter(q => q.selected).length} of {generatedQuestions.length} selected
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowGeneratedQuestionsModal(false);
                      setGeneratedQuestions([]);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateSelectedCards}
                    disabled={isGeneratingSelectedCards || generatedQuestions.filter(q => q.selected).length === 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    {isGeneratingSelectedCards ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating Cards...</span>
                      </>
                    ) : (
                      <span>Create {generatedQuestions.filter(q => q.selected).length} Card(s)</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Export Flashcards</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Export {filteredFlashcards.length} flashcard(s) to your preferred format.
                </p>
                
                {/* Format Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Choose Export Format</h3>
                  <div className="space-y-3">
                    <label className="flex items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="csv"
                        checked={exportFormat === 'csv'}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3"
                      />
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100">CSV Format</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Compatible with Excel, Google Sheets, and text editors</div>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="excel"
                        checked={exportFormat === 'excel'}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3"
                      />
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100">Excel Format (.xlsx)</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Native Excel format with proper column widths</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Directory Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">Download Location</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        The file will be downloaded to your browser's default download folder. You can change this location in your browser settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Filename: flashcards_export_{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).replace(/,/g, '').replace(/ /g, '_')}.{exportFormat === 'csv' ? 'csv' : 'xlsx'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportConfirm}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export {filteredFlashcards.length} Card(s)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal - Popout Style */}
      {showSettingsModal && (
        <>
          {/* Invisible backdrop for click-to-close */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowSettingsModal(false)}></div>
          {/* Settings panel */}
          <div 
            className="fixed top-24 right-6 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 backdrop-blur-xl bg-white/95 dark:bg-gray-800/95"
            style={{ zIndex: 10001 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.942 3.33.83 2.891 2.673a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.942 1.543-.83 3.33-2.673 2.891a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.942-3.33-.83-2.891-2.673a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.942-1.543.83-3.33 2.673-2.891a1.724 1.724 0 002.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-white hover:bg-opacity-50 transition-all duration-200 dark:text-gray-400 dark:hover:bg-gray-600"
                aria-label="Close settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <div className="p-6 space-y-5">
              {/* User Information Section */}
              <section className="bg-blue-100 dark:bg-gray-700 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 border-txb-2 border-txb-black">
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Your Information</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showUserInfo ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserInfo && (
                  <div className="mt-5">
                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                      {userId ? (
                        <div className="space-y-4">
                          {/* Login Name */}
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg border border-purple-200 dark:border-purple-600">
                            <div className="flex items-center">
                              <div className="p-2 bg-purple-100 dark:bg-purple-800/80 rounded-full mr-3 ring-2 ring-purple-200 dark:ring-purple-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <span className="text-gray-700 dark:text-gray-200 font-medium">Login Name</span>
                            </div>
                            <span className="text-purple-700 dark:text-purple-200 font-bold text-lg">{userDisplayName}</span>
                          </div>

                          {/* Total Cards */}
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg border border-blue-200 dark:border-blue-600">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 dark:bg-blue-800/80 rounded-full mr-3 ring-2 ring-blue-200 dark:ring-blue-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <span className="text-gray-700 dark:text-gray-200 font-medium">Total Cards</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-blue-700 dark:text-blue-200 font-bold text-2xl mr-2">{flashcards.length}</span>
                              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-800/80 rounded-full ring-1 ring-blue-200 dark:ring-blue-700">
                                <span className="text-blue-700 dark:text-blue-200 text-xs font-medium">cards</span>
                              </div>
                            </div>
                          </div>

                          {/* User ID */}
                          <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/60 dark:to-slate-800/60 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center mb-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full mr-3 ring-2 ring-gray-200 dark:ring-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                                </svg>
                              </div>
                              <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">User ID</span>
                            </div>
                            <span className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md text-gray-800 dark:text-gray-100 block border border-gray-200 dark:border-gray-600">{userId}</span>
                            <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                              🔒 This unique identifier securely stores your flashcards and settings
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg border border-red-200 dark:border-red-600">
                          <div className="p-3 bg-red-100 dark:bg-red-800/80 rounded-full mr-3 ring-2 ring-red-200 dark:ring-red-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <span className="text-red-700 dark:text-red-200 font-semibold">Not logged in</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* API Keys Configuration Section */}
              <section className="bg-blue-100 dark:bg-gray-700 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 border-tx-2 border-tx-black">
                <button
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">AI API Configuration</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showApiKeys ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showApiKeys && (
                  <div className="mt-5 space-y-4">
                    <p className="text-gray-600 text-sm dark:text-gray-300">
                      Configure your AI API keys to enable features like answer suggestions, examples, and explanations.
                    </p>

                    {/* API Provider Selection */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <label htmlFor="apiProvider" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        Primary AI Provider:
                      </label>
                      <select
                        id="apiProvider"
                        value={selectedApiProvider}
                        onChange={(e) => updateSelectedApiProvider(e.target.value)}
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100 transition-all"
                      >
                        <option value="gemini">🤖 Google Gemini</option>
                        <option value="anthropic">🧠 Anthropic Claude</option>
                        <option value="openai">⚡ OpenAI GPT</option>
                      </select>
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        Gemini and Anthropic Claude are fully supported. OpenAI support coming soon.
                      </p>
                    </div>

                    {/* Gemini API Key */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <label htmlFor="geminiApiKey" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        🤖 Google Gemini API Key:
                      </label>
                      <input
                        type="password"
                        id="geminiApiKey"
                        value={apiKeys.gemini}
                        onChange={(e) => updateApiKey('gemini', e.target.value)}
                        placeholder="Enter your Gemini API key"
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100 transition-all"
                      />
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 underline">Google AI Studio</a>
                      </p>
                    </div>

                    {/* Anthropic API Key */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <label htmlFor="anthropicApiKey" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        🧠 Anthropic Claude API Key:
                      </label>
                      <input
                        type="password"
                        id="anthropicApiKey"
                        value={apiKeys.anthropic}
                        onChange={(e) => updateApiKey('anthropic', e.target.value)}
                        placeholder="Enter your Anthropic API key..."
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-500 dark:text-gray-100 transition-all"
                      />
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 underline">Anthropic Console</a>
                      </p>
                    </div>

                    {/* OpenAI API Key */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 opacity-60">
                      <label htmlFor="openaiApiKey" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                        ⚡ OpenAI API Key:
                      </label>
                      <input
                        type="password"
                        id="openaiApiKey"
                        value={apiKeys.openai}
                        onChange={(e) => updateApiKey('openai', e.target.value)}
                        placeholder="Coming soon..."
                        disabled
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">
                        🚧 Integration in development
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                        </svg>
                        <p className="text-blue-800 text-xs dark:text-blue-200">
                          <strong>Security:</strong> API keys are encrypted and stored securely in your user settings. They are only used for direct AI feature requests and never shared with third parties.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* FSRS Configuration Section */}
              <section className="bg-blue-100 dark:bg-gray-700 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 border-tx-2 border-tx-black">
                <button
                  onClick={() => setShowFsrsFactors(!showFsrsFactors)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 012-2zm0 0h2a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">FSRS Review Factors</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showFsrsFactors ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showFsrsFactors && (
                  <div className="mt-5 space-y-4">
                    <p className="text-gray-600 text-sm dark:text-gray-300">
                      Adjust these factors to customize how aggressively intervals change based on your recall performance.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Easy Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="easyFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Easy Factor: <span className="text-green-600 dark:text-green-400 font-bold">{fsrsParams.easyFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="easyFactor"
                          min="1.0"
                          max="3.0"
                          step="0.1"
                          value={fsrsParams.easyFactor}
                          onChange={(e) => updateFsrsParameter('easyFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-green"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval growth after "Easy" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{calculateEstimatedReviewDays(fsrsParams.easyFactor, 10)} days
                          </span>
                        </div>
                      </div>

                      {/* Good Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="goodFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Good Factor: <span className="text-blue-600 dark:text-blue-400 font-bold">{fsrsParams.goodFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="goodFactor"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={fsrsParams.goodFactor}
                          onChange={(e) => updateFsrsParameter('goodFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-blue"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval growth after "Good" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{calculateEstimatedReviewDays(fsrsParams.goodFactor, 3)} days
                          </span>
                        </div>
                      </div>

                      {/* Hard Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="hardFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Hard Factor: <span className="text-yellow-600 dark:text-yellow-400 font-bold">{fsrsParams.hardFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="hardFactor"
                          min="0.3"
                          max="1.0"
                          step="0.1"
                          value={fsrsParams.hardFactor}
                          onChange={(e) => updateFsrsParameter('hardFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-yellow"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval growth after "Hard" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{Math.max(1, calculateEstimatedReviewDays(fsrsParams.hardFactor, 1))} day{Math.max(1, calculateEstimatedReviewDays(fsrsParams.hardFactor, 1)) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Again Factor Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="againFactor" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Again Factor: <span className="text-red-600 dark:text-red-400 font-bold">{fsrsParams.againFactor.toFixed(2)}x</span>
                        </label>
                        <input
                          type="range"
                          id="againFactor"
                          min="0.1"
                          max="0.5"
                          step="0.05"
                          value={fsrsParams.againFactor}
                          onChange={(e) => updateFsrsParameter('againFactor', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-red"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Interval reduction after "Again" recall</p>
                        <div className="mt-2 text-center">
                          <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm font-semibold">
                            ~{Math.max(1, calculateEstimatedReviewDays(fsrsParams.againFactor, 1))} day{Math.max(1, calculateEstimatedReviewDays(fsrsParams.againFactor, 1)) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Initial Difficulty Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="initialDifficulty" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Initial Difficulty: <span className="text-purple-600 dark:text-purple-400 font-bold">{fsrsParams.initialDifficulty.toFixed(0)}</span>
                        </label>
                        <input
                          type="range"
                          id="initialDifficulty"
                          min="1"
                          max="10"
                          step="1"
                          value={fsrsParams.initialDifficulty}
                          onChange={(e) => updateFsrsParameter('initialDifficulty', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-purple"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Default difficulty for new cards</p>
                      </div>

                      {/* Initial Stability Slider */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label htmlFor="initialStability" className="block text-gray-700 font-semibold mb-2 dark:text-gray-300">
                          Initial Stability: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{fsrsParams.initialStability.toFixed(1)} days</span>
                        </label>
                        <input
                          type="range"
                          id="initialStability"
                          min="0.1"
                          max="5.0"
                          step="0.1"
                          value={fsrsParams.initialStability}
                          onChange={(e) => updateFsrsParameter('initialStability', e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider-indigo"
                        />
                        <p className="text-gray-500 text-xs mt-2 dark:text-gray-400">Base stability for new cards</p>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-800 text-xs dark:text-green-200">
                          <strong>FSRS Algorithm:</strong> Free Spaced Repetition Scheduler calculates optimal review intervals based on your performance. Higher factors = longer intervals.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* CSV Upload Guide Section */}
              <section className="bg-blue-100 dark:bg-gray-700 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 border-tx-2 border-tx-black">
                <button
                  onClick={() => setShowCsvGuide(!showCsvGuide)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.586l6.243-6.243C11.978 9.927 12 9.464 12 9a6 6 0 016-6z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">File Upload Format Guide</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showCsvGuide ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCsvGuide && (
                  <div className="mt-5">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 max-h-96 overflow-auto">
                      <pre className="whitespace-pre-wrap font-mono text-xs text-gray-700 dark:text-gray-300">
                        {csvUploadGuideContent.trim()}
                      </pre>
                    </div>
                  </div>
                )}
              </section>
                            {/* Feedback Section */}
                            <section className="bg-blue-100 dark:bg-gray-700 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 border-tx-2 border-tx-black">
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-700 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1.586l-4.707 4.707z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">💬 Feedback</h3>
                  </div>
                  <svg
                    className={`w-5 h-5 text-blue-600 dark:text-blue-300 transition-transform ${showFeedback ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showFeedback && (
                  <div className="mt-5">
                    <p className="text-blue-700 dark:text-blue-300 mb-4">
                      We'd love to hear your thoughts! Share your feedback, suggestions, or report any issues.
                    </p>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Enter your feedback here..."
                      className="w-full h-32 p-4 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-700 dark:text-gray-200 resize-none"
                    />
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={handleSendFeedback}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-300 transform shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95 flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Email
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Initial Review Intervals Section */}
              <section className="bg-purple-100 dark:bg-gray-700 p-5 rounded-xl shadow-sm border border-purple-200 dark:border-gray-600 border-txb-2 border-txb-black">
                <button
                  onClick={() => setShowIntervalSettings(!showIntervalSettings)}
                  className="flex justify-between items-center w-full focus:outline-none group"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Initial Review Intervals</h3>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                      showIntervalSettings ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showIntervalSettings && (
                  <div className="mt-5 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Set how many days after the first review each rating should schedule the next review.
                    </p>
                    
                    {/* Again Interval */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-red-600 dark:text-red-400">Again</label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Review again in:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={fsrsParams.initialAgainInterval}
                          onChange={(e) => updateFsrsParameter('initialAgainInterval', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-gray-200"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">day(s)</span>
                      </div>
                    </div>

                    {/* Hard Interval */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-orange-600 dark:text-orange-400">Hard</label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Review again in:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={fsrsParams.initialHardInterval}
                          onChange={(e) => updateFsrsParameter('initialHardInterval', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">day(s)</span>
                      </div>
                    </div>

                    {/* Good Interval */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-green-600 dark:text-green-400">Good</label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Review again in:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={fsrsParams.initialGoodInterval}
                          onChange={(e) => updateFsrsParameter('initialGoodInterval', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-200"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">day(s)</span>
                      </div>
                    </div>

                    {/* Easy Interval */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-blue-600 dark:text-blue-400">Easy</label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Review again in:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={fsrsParams.initialEasyInterval}
                          onChange={(e) => updateFsrsParameter('initialEasyInterval', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">day(s)</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Theme Section - Moved to bottom */}
              <section className="bg-blue-100 dark:bg-gray-700 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 border-txb-2 border-txb-black">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Theme</h3>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform shadow-md focus:outline-none focus:ring-4 active:scale-95 ${
                      isDarkMode
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900 focus:ring-yellow-300'
                        : 'bg-gray-800 hover:bg-gray-900 text-black focus:ring-gray-300'
                    }`}
                  >
                    {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                  </button>
                </div>
              </section>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Calendar Modal */}
      
    </div>
    </>
  );
}

export default App;
