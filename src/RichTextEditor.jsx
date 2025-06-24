import React, { useRef, useState, useEffect } from 'react';
import './RichTextEditor.css';

const RichTextEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text...', 
  className = '',
  style = {},
  minHeight = '150px'
}) => {
  const editorRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const inputTimeout = useRef(null);
  const onChangeTimeout = useRef(null);
  const isFormatting = useRef(false);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0',
    '#808080', '#9999FF', '#993366', '#FFFFCC', '#CCFFFF', '#660066', '#FF8080',
    '#0066CC', '#CCCCFF', '#000080', '#FF00FF', '#FFFF00', '#00FFFF', '#800080'
  ];

  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
    'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact'
  ];

  const fontSizes = [
    { label: 'Very Small', value: '1' },
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Medium', value: '4' },
    { label: 'Large', value: '5' },
    { label: 'Very Large', value: '6' },
    { label: 'Huge', value: '7' }
  ];

  const saveToHistory = (content) => {
    if (isUndoRedoAction.current) return;
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(content);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const debouncedOnChange = (content) => {
    if (isUndoRedoAction.current || isFormatting.current) return;
    
    clearTimeout(onChangeTimeout.current);
    onChangeTimeout.current = setTimeout(() => {
      if (onChange) {
        onChange(content);
      }
    }, 150); // Short delay to prevent cursor jumping
  };

  const applyFormat = (command, value = null) => {
    if (command === 'undo') {
      handleUndo();
      return;
    }
    if (command === 'redo') {
      handleRedo();
      return;
    }
    
    // Mark as formatting operation
    isFormatting.current = true;
    
    // Save history before formatting
    saveToHistory(editorRef.current.innerHTML);
    
    document.execCommand(command, false, value);
    editorRef.current.focus();
    
    // Use debounced onChange after formatting
    setTimeout(() => {
      isFormatting.current = false;
      debouncedOnChange(editorRef.current.innerHTML);
    }, 50);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const previousContent = history[historyIndex - 1];
      editorRef.current.innerHTML = previousContent;
      setHistoryIndex(prev => prev - 1);
      
      if (onChange) {
        onChange(previousContent);
      }
      
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 100);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextContent = history[historyIndex + 1];
      editorRef.current.innerHTML = nextContent;
      setHistoryIndex(prev => prev + 1);
      
      if (onChange) {
        onChange(nextContent);
      }
      
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 100);
    }
  };

  const insertDropdown = () => {
    // Save current state before inserting dropdown
    saveToHistory(editorRef.current.innerHTML);
    
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    // Check if we're inside any dropdown content
    let currentNode = selection.anchorNode;
    let insideDropdown = false;
    let dropdownContent = null;
    
    while (currentNode && currentNode !== editorRef.current) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        if (currentNode.classList && currentNode.classList.contains('dropdown-content')) {
          insideDropdown = true;
          dropdownContent = currentNode;
          break;
        }
      }
      currentNode = currentNode.parentNode;
    }
    
    // Create dropdown elements programmatically
    const dropdownSection = document.createElement('div');
    dropdownSection.className = 'dropdown-section';
    dropdownSection.style.cssText = 'border: 1px solid #e2e8f0; border-radius: 6px; margin: 8px 0; overflow: hidden;';
    
    const dropdownHeader = document.createElement('div');
    dropdownHeader.className = 'dropdown-header';
    dropdownHeader.style.cssText = 'background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 10px 12px; cursor: pointer; user-select: none; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; font-weight: 500;';
    
    const arrow = document.createElement('span');
    arrow.style.marginRight = '8px';
    arrow.textContent = '▼';
    
    const headerText = document.createElement('strong');
    headerText.textContent = 'Click to expand';
    
    dropdownHeader.appendChild(arrow);
    dropdownHeader.appendChild(headerText);
    
    const newDropdownContent = document.createElement('div');
    newDropdownContent.className = 'dropdown-content';
    newDropdownContent.style.cssText = 'padding: 12px; background: white; display: block;';
    newDropdownContent.innerHTML = selectedText || 'Add your content here...';
    
    // Add click handler
    dropdownHeader.addEventListener('click', function() {
      const content = newDropdownContent;
      const arrowSpan = arrow;
      if (content.style.display === 'none') {
        content.style.display = 'block';
        arrowSpan.textContent = '▼';
        } else {
          content.style.display = 'none';
          arrowSpan.textContent = '▶';
        }
      });
      
      dropdownSection.appendChild(dropdownHeader);
      dropdownSection.appendChild(newDropdownContent);
      
      // Add a line break after the dropdown for easy continuation
      const lineBreak = document.createElement('br');
      
      if (insideDropdown && dropdownContent) {
        // If we're inside a dropdown, insert the new dropdown after the parent dropdown
        const parentDropdown = dropdownContent.closest('.dropdown-section');
        if (parentDropdown && parentDropdown.parentNode) {
          // Insert after the parent dropdown
          parentDropdown.parentNode.insertBefore(dropdownSection, parentDropdown.nextSibling);
          parentDropdown.parentNode.insertBefore(lineBreak, dropdownSection.nextSibling);
          
          // Clear the selection
          selection.removeAllRanges();
          
          // Focus after the new dropdown
          const newRange = document.createRange();
          newRange.setStartAfter(lineBreak);
          newRange.setEndAfter(lineBreak);
          selection.addRange(newRange);
        }
      } else if (selection.rangeCount > 0) {
        // Normal insertion when not inside a dropdown
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(lineBreak);
        range.insertNode(dropdownSection);
        
        // Position cursor after the dropdown
        const newRange = document.createRange();
        newRange.setStartAfter(lineBreak);
        newRange.setEndAfter(lineBreak);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      // Focus the editor
      editorRef.current.focus();
      
      // Trigger onChange
      setTimeout(() => {
        if (onChange) {
          onChange(editorRef.current.innerHTML);
        }
      }, 100);
  };

  const insertAdvancedCodeBlock = () => {
    // Mark as formatting operation to prevent cursor jumping
    isFormatting.current = true;
    saveToHistory(editorRef.current.innerHTML);
    
    const uniqueId = 'code-' + Date.now();
    const languages = [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'python', label: 'Python' },
      { value: 'java', label: 'Java' },
      { value: 'html', label: 'HTML' },
      { value: 'css', label: 'CSS' },
      { value: 'sql', label: 'SQL' },
      { value: 'bash', label: 'Bash' },
      { value: 'json', label: 'JSON' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'php', label: 'PHP' },
      { value: 'cpp', label: 'C++' },
      { value: 'csharp', label: 'C#' },
      { value: 'ruby', label: 'Ruby' },
      { value: 'go', label: 'Go' },
      { value: 'rust', label: 'Rust' }
    ];
    
    const languageOptions = languages.map(lang => 
      `<option value="${lang.value}">${lang.label}</option>`
    ).join('');
    
    const codeBlockHtml = `
      <div class="advanced-code-block" data-code-id="${uniqueId}" data-selected-lang="javascript" style="border: 2px solid #374151; border-radius: 8px; margin: 12px 0; background: #1f2937; overflow: hidden;">
        <div class="code-header" style="background: linear-gradient(135deg, #374151 0%, #4b5563 100%); padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4b5563;">
          <div style="display: flex; align-items: center; color: white; font-weight: 500;">
            <span style="margin-right: 8px;">💻</span>
            <strong>Code Block</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="format-code-btn" data-target="${uniqueId}" style="background: #059669; color: white; border: 1px solid #047857; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; font-weight: 500; position: relative; z-index: 10;" title="Format & Highlight Code" onclick="console.log('Inline onclick fired!')">
              ✨ Format
            </button>
            <select class="language-selector" data-target="${uniqueId}" style="background: #4b5563; color: white; border: 1px solid #6b7280; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer;">
              ${languageOptions}
            </select>
          </div>
        </div>
        <div style="background: #1f2937; position: relative;">
          <div class="code-content" data-lang="javascript" style="margin: 0; padding: 16px; background: transparent; color: #e5e7eb; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 14px; line-height: 1.4; min-height: 100px; white-space: pre-wrap; outline: none; border: none; word-wrap: break-word;" contenteditable="true" spellcheck="false" tabindex="0">// Enter your code here
function greetUser(name) {
    console.log("Hello, " + name + "!");
}

greetUser("World");</div>
        </div>
      </div>
    `;
    
    // Insert the HTML using execCommand to maintain cursor position
    document.execCommand('insertHTML', false, codeBlockHtml);
    
    // Apply syntax highlighting and set up language selector after insertion
    setTimeout(() => {
      setupNewCodeBlocks();
      
      isFormatting.current = false;
      debouncedOnChange(editorRef.current.innerHTML);
    }, 100);
  };

  const setupCodeBlockFeatures = (codeBlock, uniqueId) => {
    console.log('Setting up code block features for:', uniqueId);
    const languageSelector = codeBlock.querySelector('.language-selector');
    const codeContent = codeBlock.querySelector('.code-content');
    const formatButton = codeBlock.querySelector('.format-code-btn');
    
    console.log('Found elements:', {
      languageSelector: !!languageSelector,
      codeContent: !!codeContent,
      formatButton: !!formatButton
    });
    
    if (!languageSelector || !codeContent) return;
    
    // Clean up any existing event listeners by removing them
    if (codeBlock._eventListeners) {
      codeBlock._eventListeners.forEach(cleanup => cleanup());
    }
    codeBlock._eventListeners = [];
    
    // Check if language is already stored in the code block's data attribute
    const savedLang = codeBlock.getAttribute('data-selected-lang') || 'javascript';
    languageSelector.value = savedLang;
    codeContent.setAttribute('data-lang', savedLang);
    
    // Apply initial syntax highlighting
    applySyntaxHighlighting(codeContent, savedLang);
    
    // Handle language changes
    const handleLanguageChange = function(e) {
      e.stopPropagation();
      const newLang = this.value;
      
      // Store the language selection in the code block itself
      codeBlock.setAttribute('data-selected-lang', newLang);
      codeContent.setAttribute('data-lang', newLang);
      
      applySyntaxHighlighting(codeContent, newLang);
      
      // Trigger a debounced onChange to save the selection
      setTimeout(() => {
        if (onChange) {
          onChange(editorRef.current.innerHTML);
        }
      }, 100);
    };
    
    // Handle format button click
    const handleFormatClick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Format button clicked!');
      
      try {
        const currentLang = codeContent.getAttribute('data-lang') || savedLang;
        console.log('Format button clicked for language:', currentLang);
        console.log('Code content before formatting:', codeContent.textContent);
        
        formatCode(codeContent, currentLang);
        console.log('Code content after formatting:', codeContent.textContent);
        
        // Trigger onChange to save formatted content
        setTimeout(() => {
          if (onChange) {
            onChange(editorRef.current.innerHTML);
          }
        }, 100);
      } catch (error) {
        console.error('Error formatting code:', error);
      }
    };
    
    // Direct Tab handler for this code block
    const handleKeyDown = function(e) {
      console.log('Individual block key handler:', e.key);
      
      if (e.key === 'Tab') {
        console.log('Tab key in individual block - handling directly');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Insert 2 spaces
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Delete any selected content
        range.deleteContents();
        
        // Insert 2 spaces
        const textNode = document.createTextNode('  ');
        range.insertNode(textNode);
        
        // Move cursor after the spaces
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('Tab spaces inserted successfully');
        return false;
      }
    };
    
    // Handle content changes
    const handleContentInput = function() {
      // Check if Enter was just pressed and clean up any unwanted elements
      if (this.getAttribute('data-enter-pressed') === 'true') {
        this.removeAttribute('data-enter-pressed');
        
        console.log('Cleaning up after Enter press');
        
        // Save cursor position
        const selection = window.getSelection();
        let cursorOffset = 0;
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          cursorOffset = range.startOffset;
        }
        
        // Get the text content and clean it
        const textContent = this.textContent;
        
        // Replace any double newlines with single newlines
        const cleanedText = textContent.replace(/\n\n+/g, '\n');
        
        // If the text changed, update it
        if (cleanedText !== textContent) {
          console.log('Cleaning up extra newlines');
          this.textContent = cleanedText;
          
          // Restore cursor position
          if (this.firstChild) {
            const range = document.createRange();
            const textNode = this.firstChild;
            range.setStart(textNode, Math.min(cursorOffset, textNode.textContent.length));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        
        // Remove any <div> or <br> elements that might have been created
        const divs = this.querySelectorAll('div');
        divs.forEach(div => {
          const textNode = document.createTextNode(div.textContent + '\n');
          div.parentNode.replaceChild(textNode, div);
        });
        
        const brs = this.querySelectorAll('br');
        brs.forEach(br => {
          const textNode = document.createTextNode('\n');
          br.parentNode.replaceChild(textNode, br);
        });
      }
      
      // Check if this was formatted - if so, don't re-apply syntax highlighting
      if (this.getAttribute('data-formatted') === 'true') {
        this.removeAttribute('data-formatted');
        return;
      }
      
      const currentLang = this.getAttribute('data-lang') || codeBlock.getAttribute('data-selected-lang') || 'javascript';
      // Debounce highlighting to avoid performance issues
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = setTimeout(() => {
        applySyntaxHighlighting(this, currentLang);
      }, 300);
    };
    
    // Attach event listeners
    languageSelector.addEventListener('change', handleLanguageChange);
    if (formatButton) {
      console.log('Format button found, attaching event listener for block:', uniqueId);
      console.log('Format button element:', formatButton);
      formatButton.addEventListener('click', handleFormatClick);
      console.log('Format button event listener attached for block:', uniqueId);
      
      // Test if button is clickable by adding a direct test
      formatButton.style.border = '2px solid red';
      setTimeout(() => {
        formatButton.style.border = '1px solid #047857';
      }, 1000);
      
    } else {
      console.warn('Format button not found for block:', uniqueId);
      console.log('All buttons in code block:', codeBlock.querySelectorAll('button'));
    }
    codeContent.addEventListener('input', handleContentInput);
    codeContent.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    console.log('Keydown event listener attached to code content for block:', uniqueId);
    
    // Store cleanup functions
    codeBlock._eventListeners = [
      () => languageSelector.removeEventListener('change', handleLanguageChange),
      formatButton ? () => formatButton.removeEventListener('click', handleFormatClick) : null,
      () => codeContent.removeEventListener('input', handleContentInput),
      () => codeContent.removeEventListener('keydown', handleKeyDown, true)
    ].filter(Boolean);
  };

  const applySyntaxHighlightingClean = (element, language) => {
    // This version uses classes instead of inline styles
    const text = element.textContent;
    element.textContent = text; // Keep plain text for now
    // We'll rely on the CSS classes for styling rather than inline styles
  };

  const applySyntaxHighlighting = (element, language) => {
    const text = element.textContent;
    console.log('applySyntaxHighlighting called with:', { text, language });
    
    const syntaxRules = {
      javascript: {
        keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends'],
        builtins: ['console', 'window', 'document', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON'],
        strings: [/"[^"]*"/g, /'[^']*'/g, /`[^`]*`/g],
        comments: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        numbers: /\b\d+(\.\d+)?\b/g
      },
      python: {
        keywords: ['def', 'class', 'import', 'from', 'if', 'else', 'elif', 'for', 'while', 'return', 'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'lambda'],
        builtins: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'tuple', 'set', 'bool', 'type', 'isinstance'],
        strings: [/"[^"]*"/g, /'[^']*'/g, /"""[\s\S]*?"""/g, /'''[\s\S]*?'''/g],
        comments: [/#.*$/gm],
        numbers: /\b\d+(\.\d+)?\b/g
      },
      java: {
        keywords: [
          // Control flow
          'if', 'else', 'switch', 'case', 'default', 'for', 'while', 'do', 'break', 'continue', 'return',
          // Exception handling
          'try', 'catch', 'finally', 'throw', 'throws',
          // Class and object
          'class', 'interface', 'enum', 'extends', 'implements', 'new', 'this', 'super',
          // Modifiers
          'public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized', 'volatile', 'transient', 'native', 'strictfp',
          // Other keywords
          'package', 'import', 'instanceof', 'assert'
        ],
        types: [
          // Primitive types and literals
          'void', 'boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double',
          'true', 'false', 'null'
        ],
        builtins: [
          // Common classes
          'String', 'Object', 'Class', 'System', 'Math', 'Thread', 'Runnable',
          // Wrapper classes
          'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character', 'Byte', 'Short',
          // Collections
          'List', 'ArrayList', 'LinkedList', 'Set', 'HashSet', 'TreeSet', 'Map', 'HashMap', 'TreeMap',
          'Collection', 'Collections', 'Iterator', 'Comparable', 'Comparator',
          // I/O
          'File', 'InputStream', 'OutputStream', 'Reader', 'Writer', 'BufferedReader', 'PrintWriter',
          // Exceptions
          'Exception', 'RuntimeException', 'IOException', 'NullPointerException', 'IllegalArgumentException'
        ],
        annotations: /@\w+/g,
        methods: /\b\w+(?=\s*\()/g, // Method calls and declarations
        fields: [
          // Field declarations after type: "int count", "String name", etc.
          /(?<=\b(?:int|long|short|byte|char|float|double|boolean|String|Object|List|Map|Set|ArrayList|HashMap)\s+)\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*[;=,])/g,
          // Field access: "this.field", "object.field"
          /(?<=\bthis\.)\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g,
          /(?<=\b\w+\.)\b[a-z][a-zA-Z0-9_$]*\b(?!\s*\()/g,
          // Assignment to fields: "field = value"
          /\b[a-z][a-zA-Z0-9_$]*(?=\s*=(?!=))/g
        ],
        strings: [/"[^"]*"/g, /'[^']*'/g],
        comments: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        numbers: /\b\d+(\.\d+)?[fFdDlL]?\b/g
      },
      html: {
        keywords: ['html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'link', 'meta'],
        strings: [/"[^"]*"/g, /'[^']*'/g],
        comments: [/<!--[\s\S]*?-->/g],
        numbers: /\b\d+(\.\d+)?\b/g
      },
      css: {
        keywords: ['color', 'background', 'margin', 'padding', 'display', 'position', 'width', 'height', 'border', 'font', 'text', 'flex', 'grid', 'transform', 'transition', 'animation'],
        strings: [/"[^"]*"/g, /'[^']*'/g],
        comments: [/\/\*[\s\S]*?\*\//g],
        numbers: /\b\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|pc|in|cm|mm)?\b/g
      }
    };
    
    const rules = syntaxRules[language] || syntaxRules.javascript;
    
    // Escape HTML first
    let highlightedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Create an array to hold all the replacements to prevent interference
    const replacements = [];
    
    // Collect all matches first (order matters: comments first, then strings, then keywords)
    
    // 1. Comments (highest priority - should not be processed further)
    if (rules.comments) {
      rules.comments.forEach(commentRegex => {
        let match;
        const regex = new RegExp(commentRegex.source, commentRegex.flags);
        while ((match = regex.exec(highlightedText)) !== null) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `<span class="syntax-comment">${match[0]}</span>`,
            priority: 1
          });
        }
      });
    }
    
    // 2. Strings (second priority)
    if (rules.strings) {
      rules.strings.forEach(stringRegex => {
        let match;
        const regex = new RegExp(stringRegex.source, stringRegex.flags);
        while ((match = regex.exec(highlightedText)) !== null) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `<span class="syntax-string">${match[0]}</span>`,
            priority: 2
          });
        }
      });
    }
    
    // 3. Keywords (third priority)
    if (rules.keywords) {
      rules.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        let match;
        while ((match = regex.exec(highlightedText)) !== null) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `<span class="syntax-keyword">${keyword}</span>`,
            priority: 3
          });
        }
      });
    }
    
    // 4. Types (fourth priority)
    if (rules.types) {
      rules.types.forEach(type => {
        const regex = new RegExp(`\\b${type}\\b`, 'g');
        let match;
        while ((match = regex.exec(highlightedText)) !== null) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `<span class="syntax-type">${type}</span>`,
            priority: 4
          });
        }
      });
    }
    
    // 5. Built-ins (fifth priority)
    if (rules.builtins) {
      rules.builtins.forEach(builtin => {
        const regex = new RegExp(`\\b${builtin}\\b`, 'g');
        let match;
        while ((match = regex.exec(highlightedText)) !== null) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `<span class="syntax-builtin">${builtin}</span>`,
            priority: 5
          });
        }
      });
    }
    
    // 6. Annotations (sixth priority)
    if (rules.annotations) {
      let match;
      const regex = new RegExp(rules.annotations.source, rules.annotations.flags);
      while ((match = regex.exec(highlightedText)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          replacement: `<span class="syntax-annotation">${match[0]}</span>`,
          priority: 6
        });
      }
    }
    
    // 7. Methods (seventh priority)
    if (rules.methods) {
      let match;
      const regex = new RegExp(rules.methods.source, rules.methods.flags);
      while ((match = regex.exec(highlightedText)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          replacement: `<span class="syntax-method">${match[0]}</span>`,
          priority: 7
        });
      }
    }
    
    // 8. Fields (eighth priority)
    if (rules.fields) {
      const fieldPatterns = Array.isArray(rules.fields) ? rules.fields : [rules.fields];
      fieldPatterns.forEach(fieldRegex => {
        let match;
        const regex = new RegExp(fieldRegex.source, fieldRegex.flags);
        while ((match = regex.exec(highlightedText)) !== null) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `<span class="syntax-field">${match[0]}</span>`,
            priority: 8
          });
        }
      });
    }
    
    // 9. Numbers (lowest priority)
    if (rules.numbers) {
      let match;
      const regex = new RegExp(rules.numbers.source, rules.numbers.flags);
      while ((match = regex.exec(highlightedText)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          replacement: `<span class="syntax-number">${match[0]}</span>`,
          priority: 9
        });
      }
    }
    
    // Sort by position and priority (higher priority = lower number)
    replacements.sort((a, b) => {
      if (a.start === b.start) {
        return a.priority - b.priority;
      }
      return a.start - b.start;
    });
    
    // Remove overlapping replacements (keep higher priority ones)
    const filteredReplacements = [];
    let lastEnd = 0;
    
    for (const replacement of replacements) {
      if (replacement.start >= lastEnd) {
        filteredReplacements.push(replacement);
        lastEnd = replacement.end;
      }
    }
    
    // Apply replacements from right to left to preserve indices
    let result = highlightedText;
    for (let i = filteredReplacements.length - 1; i >= 0; i--) {
      const { start, end, replacement } = filteredReplacements[i];
      result = result.slice(0, start) + replacement + result.slice(end);
    }
    
    // Save cursor position
    const selection = window.getSelection();
    let cursorPosition = 0;
    if (selection.rangeCount > 0 && element.contains(selection.anchorNode)) {
      cursorPosition = selection.anchorOffset;
    }
    
    // Update content
    element.innerHTML = result;
    console.log('Applied syntax highlighting, final HTML:', element.innerHTML);
    
    // Restore cursor position approximately
    if (element.firstChild) {
      const range = document.createRange();
      const textNode = getTextNode(element);
      if (textNode && cursorPosition <= textNode.textContent.length) {
        range.setStart(textNode, Math.min(cursorPosition, textNode.textContent.length));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const formatCode = (element, language) => {
    console.log('formatCode called with language:', language);
    
    // First, get clean text content by removing all HTML formatting
    // Create a temporary element to extract clean text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.innerHTML;
    let code = tempDiv.textContent || tempDiv.innerText || '';
    
    // If the text still looks corrupted (contains HTML fragments), try to clean it
    if (code.includes('syntax-') || code.includes('class=') || code.includes('<span')) {
      console.log('Detected corrupted text, attempting to clean...');
      // Try to extract just the actual code by removing HTML artifacts
      code = code
        .replace(/syntax-\w+[">]+/g, '') // Remove syntax-keyword"> etc
        .replace(/class="[^"]*"/g, '') // Remove class attributes
        .replace(/<\/?span[^>]*>/g, '') // Remove span tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
    }
    
    console.log('Clean code extracted:', code);
    
    // If we still don't have clean code, try one more approach
    if (!code || code.includes('syntax-') || code.includes('<span')) {
      console.log('Still corrupted, trying alternative extraction...');
      // Get the original text from the parent or try to reconstruct it
      const lines = element.textContent.split('\n');
      const cleanLines = lines.map(line => {
        // Remove everything that looks like HTML artifacts
        return line.replace(/^[^a-zA-Z0-9\s\/\*]*/, '').trim();
      }).filter(line => line && !line.includes('syntax-'));
      
      if (cleanLines.length > 0) {
        code = cleanLines.join('\n');
      } else {
        // Last resort: try to get some reasonable default
        code = 'const example = "code";';
      }
    }
    
    console.log('Final clean code for formatting:', code);
    
    // Clear all existing HTML and styles
    element.innerHTML = '';
    
    let formattedCode = '';
    
    // Language-specific formatting rules
    switch (language) {
      case 'javascript':
      case 'typescript':
        formattedCode = formatJavaScript(code);
        break;
      case 'python':
        formattedCode = formatPython(code);
        break;
      case 'java':
      case 'csharp':
        formattedCode = formatJava(code);
        break;
      case 'html':
        formattedCode = formatHTML(code);
        break;
      case 'css':
        formattedCode = formatCSS(code);
        break;
      case 'json':
        formattedCode = formatJSON(code);
        break;
      default:
        formattedCode = formatGeneric(code);
    }
    
    console.log('Formatted code:', formattedCode);
    
    // Set the formatted plain text
    element.textContent = formattedCode;
    console.log('Element after setting textContent:', element.textContent);
    
    // Add a flag to prevent immediate re-highlighting during input event
    element.setAttribute('data-formatted', 'true');
    
    // Clear any pending highlight timeout
    if (element.highlightTimeout) {
      clearTimeout(element.highlightTimeout);
    }
    
    // Apply syntax highlighting after a short delay
    setTimeout(() => {
      applySyntaxHighlighting(element, language);
      element.removeAttribute('data-formatted');
    }, 50);
    
    console.log('formatCode completed');
  };

  const formatJavaScript = (code) => {
    console.log('formatJavaScript input:', code);
    
    // First, let's split the code properly - handle single-line code
    // Replace common patterns to add newlines
    let processedCode = code
      .replace(/\{/g, '{\n')  // Add newline after opening braces
      .replace(/\}/g, '\n}')  // Add newline before closing braces
      .replace(/;/g, ';\n')   // Add newline after semicolons
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .trim();
    
    let formatted = '';
    let indentLevel = 0;
    const indentSize = 2;
    const lines = processedCode.split('\n').map(line => line.trim()).filter(line => line);
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i];
      
      // Decrease indent BEFORE the line for closing braces
      if (trimmed.startsWith('}') || trimmed === '};') {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add the line with current indentation
      formatted += ' '.repeat(indentLevel * indentSize) + trimmed + '\n';
      
      // Increase indent AFTER the line for opening braces
      if (trimmed.endsWith('{') && !trimmed.startsWith('}')) {
        indentLevel++;
      }
      
      // Add blank line after closing braces of functions/classes
      if (trimmed === '}' && i < lines.length - 1 && !lines[i + 1].startsWith('}')) {
        formatted += '\n';
      }
    }
    
    console.log('formatJavaScript output:', formatted);
    return formatted.trim();
  };

  const formatPython = (code) => {
    console.log('formatPython input:', code);
    let formatted = '';
    let indentLevel = 0;
    const indentSize = 4;
    const lines = code.split('\n').map(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i];
      
      // Skip empty lines
      if (!trimmed) {
        if (formatted && !formatted.endsWith('\n\n')) {
          formatted += '\n';
        }
        continue;
      }
      
      // Handle dedent keywords (except, elif, else, finally)
      if (trimmed.match(/^(except|elif|else|finally)/)) {
        indentLevel = Math.max(0, indentLevel - 1);
        formatted += ' '.repeat(indentLevel * indentSize) + trimmed + '\n';
        if (trimmed.endsWith(':')) {
          indentLevel++;
        }
        continue;
      }
      
      // Add the line with current indentation
      formatted += ' '.repeat(indentLevel * indentSize) + trimmed + '\n';
      
      // Increase indent after colon
      if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
        indentLevel++;
      }
      
      // Decrease indent after return/break/continue/pass if next line isn't indented
      if (trimmed.match(/^(return|break|continue|pass)/) && i < lines.length - 1) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.endsWith(':')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
      }
    }
    
    console.log('formatPython output:', formatted);
    return formatted.trim();
  };

  const formatJava = (code) => {
    console.log('formatJava input:', code);
    
    // First, let's split the code properly - handle single-line code
    // Replace common patterns to add newlines
    let processedCode = code
      .replace(/\{/g, '{\n')  // Add newline after opening braces
      .replace(/\}/g, '\n}')  // Add newline before closing braces
      .replace(/;/g, ';\n')   // Add newline after semicolons
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .trim();
    
    let formatted = '';
    let indentLevel = 0;
    const indentSize = 4;
    const lines = processedCode.split('\n').map(line => line.trim()).filter(line => line);
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i];
      
      // Decrease indent BEFORE the line for closing braces
      if (trimmed.startsWith('}') || trimmed === '};') {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add the line with current indentation
      formatted += ' '.repeat(indentLevel * indentSize) + trimmed + '\n';
      
      // Increase indent AFTER the line for opening braces
      if (trimmed.endsWith('{') && !trimmed.startsWith('}')) {
        indentLevel++;
      }
      
      // Add blank line after closing braces of methods/classes
      if (trimmed === '}' && i < lines.length - 1 && !lines[i + 1].startsWith('}')) {
        formatted += '\n';
      }
    }
    
    console.log('formatJava output:', formatted);
    return formatted.trim();
  };

  const formatHTML = (code) => {
    let formatted = '';
    let indentLevel = 0;
    const indentSize = 2;
    const lines = code.split('\n');
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        formatted += '\n';
        continue;
      }
      
      // Decrease indent for closing tags
      if (trimmed.startsWith('</')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add indentation
      formatted += ' '.repeat(indentLevel * indentSize) + trimmed + '\n';
      
      // Increase indent for opening tags (but not self-closing)
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
        indentLevel++;
      }
    }
    
    return formatted.trim();
  };

  const formatCSS = (code) => {
    console.log('formatCSS input:', code);
    
    // First, let's split the code properly - handle single-line CSS
    // Replace common patterns to add newlines
    let processedCode = code
      .replace(/\{/g, '{\n')  // Add newline after opening braces
      .replace(/\}/g, '\n}')  // Add newline before closing braces
      .replace(/;/g, ';\n')   // Add newline after semicolons
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .trim();
    
    let formatted = '';
    let indentLevel = 0;
    const indentSize = 2;
    const lines = processedCode.split('\n').map(line => line.trim()).filter(line => line);
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i];
      
      // Decrease indent BEFORE the line for closing braces
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add the line with current indentation
      formatted += ' '.repeat(indentLevel * indentSize) + trimmed + '\n';
      
      // Increase indent AFTER the line for opening braces
      if (trimmed.endsWith('{')) {
        indentLevel++;
      }
      
      // Add blank line after closing braces for better readability
      if (trimmed === '}' && i < lines.length - 1) {
        formatted += '\n';
      }
    }
    
    console.log('formatCSS output:', formatted);
    return formatted.trim();
  };

  const formatJSON = (code) => {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If not valid JSON, just format as generic
      return formatGeneric(code);
    }
  };

  const formatGeneric = (code) => {
    console.log('formatGeneric input:', code);
    
    // First, let's split the code properly - handle single-line code
    // Replace common patterns to add newlines
    let processedCode = code
      .replace(/\{/g, '{\n')  // Add newline after opening braces
      .replace(/\}/g, '\n}')  // Add newline before closing braces
      .replace(/;/g, ';\n')   // Add newline after semicolons
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .trim();
    
    let formatted = '';
    let indentLevel = 0;
    const indentSize = 2;
    const lines = processedCode.split('\n').map(line => line.trim()).filter(line => line);
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i];
      
      // Decrease indent BEFORE the line for closing braces/brackets
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.endsWith('end')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add the line with current indentation
      formatted += ' '.repeat(indentLevel * indentSize) + trimmed + '\n';
      
      // Increase indent AFTER the line for opening braces/brackets
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('begin')) {
        indentLevel++;
      }
    }
    
    console.log('formatGeneric output:', formatted);
    return formatted.trim();
  };


  const getTextNode = (element) => {
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    for (let child of element.childNodes) {
      const textNode = getTextNode(child);
      if (textNode) return textNode;
    }
    return null;
  };

  const handleInput = () => {
    // Use debounced onChange for typing
    debouncedOnChange(editorRef.current.innerHTML);
    
    // Debounce history saving for typing
    clearTimeout(inputTimeout.current);
    inputTimeout.current = setTimeout(() => {
      saveToHistory(editorRef.current.innerHTML);
    }, 1000);
  };

  const closeAllDropdowns = () => {
    setShowColorPicker(false);
    setShowHighlightPicker(false);
    setShowFontPicker(false);
    setShowSizePicker(false);
  };

  const handleColorSelect = (color) => {
    applyFormat('foreColor', color);
    closeAllDropdowns();
  };

  const handleHighlightSelect = (color) => {
    applyFormat('backColor', color);
    closeAllDropdowns();
  };

  const handleFontSelect = (font) => {
    applyFormat('fontName', font);
    closeAllDropdowns();
  };

  const handleSizeSelect = (size) => {
    applyFormat('fontSize', size);
    closeAllDropdowns();
  };

  const toggleColorPicker = () => {
    closeAllDropdowns();
    setShowColorPicker(true);
  };

  const toggleHighlightPicker = () => {
    closeAllDropdowns();
    setShowHighlightPicker(true);
  };

  const toggleFontPicker = () => {
    closeAllDropdowns();
    setShowFontPicker(true);
  };

  const toggleSizePicker = () => {
    closeAllDropdowns();
    setShowSizePicker(true);
  };

  // Initialize history when value changes from parent
  useEffect(() => {
    if (value && history.length === 0) {
      setHistory([value]);
      setHistoryIndex(0);
    }
  }, [value, history.length]);

  // Update editor content only when value prop changes from parent (not from internal changes)
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== undefined && !isUndoRedoAction.current && !isFormatting.current) {
      // Only update if the content is actually different
      if (editor.innerHTML !== value) {
        // Save current cursor position
        const selection = window.getSelection();
        let cursorPosition = 0;
        let cursorNode = null;
        
        if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
          cursorNode = selection.anchorNode;
          cursorPosition = selection.anchorOffset;
        }
        
        // Store language selections before updating content
        const languageSelections = {};
        const codeBlocks = editor.querySelectorAll('.advanced-code-block');
        codeBlocks.forEach(block => {
          const id = block.getAttribute('data-code-id');
          const lang = block.getAttribute('data-selected-lang');
          if (id && lang) {
            languageSelections[id] = lang;
          }
        });
        
        // Update content
        editor.innerHTML = value;
        
        // Restore language selections
        setTimeout(() => {
          const newCodeBlocks = editor.querySelectorAll('.advanced-code-block');
          newCodeBlocks.forEach(block => {
            const id = block.getAttribute('data-code-id');
            if (id && languageSelections[id]) {
              block.setAttribute('data-selected-lang', languageSelections[id]);
              const selector = block.querySelector('.language-selector');
              const content = block.querySelector('.code-content');
              if (selector) {
                selector.value = languageSelections[id];
              }
              if (content) {
                content.setAttribute('data-lang', languageSelections[id]);
              }
            }
          });
          
          // Setup code blocks
          setupNewCodeBlocks();
          
          // Try to restore cursor position
          if (cursorNode && cursorPosition >= 0) {
            try {
              const range = document.createRange();
              const newSelection = window.getSelection();
              
              // Find similar node in new content
              const walker = document.createTreeWalker(
                editor,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              let textNode;
              while (textNode = walker.nextNode()) {
                if (textNode.textContent.length >= cursorPosition) {
                  range.setStart(textNode, Math.min(cursorPosition, textNode.textContent.length));
                  range.collapse(true);
                  newSelection.removeAllRanges();
                  newSelection.addRange(range);
                  break;
                }
              }
            } catch (e) {
              // Cursor restoration failed, that's okay
            }
          }
        }, 50);
      }
    }
  }, [value]);

  // Handle dropdown clicks in editor content
  useEffect(() => {
    const handleEditorClick = (event) => {
      // Handle regular dropdown header clicks
      if (event.target.closest('.dropdown-header')) {
        const header = event.target.closest('.dropdown-header');
        const content = header.nextElementSibling;
        const arrow = header.querySelector('span');
        
        if (content && arrow) {
          if (content.style.display === 'none') {
            content.style.display = 'block';
            arrow.textContent = '▼';
          } else {
            content.style.display = 'none';
            arrow.textContent = '▶';
          }
        }
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('click', handleEditorClick);
      return () => {
        editor.removeEventListener('click', handleEditorClick);
      };
    }
  }, []);

  // Setup code blocks only when needed (not on every value change)
  useEffect(() => {
    // Only setup code blocks when the component first mounts with initial value
    if (value && editorRef.current) {
      const setupExistingCodeBlocks = () => {
        const editor = editorRef.current;
        if (!editor) return;
        
        const codeBlocks = editor.querySelectorAll('.advanced-code-block');
        console.log('Setting up existing code blocks:', codeBlocks.length);
        
        codeBlocks.forEach(codeBlock => {
          const uniqueId = codeBlock.getAttribute('data-code-id');
          const isSetup = codeBlock.getAttribute('data-setup');
          
          // Only setup if not already setup
          if (uniqueId && !isSetup) {
            console.log('Setting up existing code block:', uniqueId);
            codeBlock.setAttribute('data-setup', 'true');
            setupCodeBlockFeatures(codeBlock, uniqueId);
          }
        });
      };
      
      // Delay to ensure DOM is ready
      setTimeout(setupExistingCodeBlocks, 50);
    }
  }, []);

  // Setup new code blocks when they're added
  const setupNewCodeBlocks = () => {
    setTimeout(() => {
      const editor = editorRef.current;
      if (!editor) return;
      
      const codeBlocks = editor.querySelectorAll('.advanced-code-block');
      console.log('Setting up', codeBlocks.length, 'code blocks');
      
      codeBlocks.forEach(codeBlock => {
        const uniqueId = codeBlock.getAttribute('data-code-id');
        const isSetup = codeBlock.getAttribute('data-setup');
        
        if (uniqueId && !isSetup) {
          console.log('Setting up code block:', uniqueId);
          codeBlock.setAttribute('data-setup', 'true');
          setupCodeBlockFeatures(codeBlock, uniqueId);
        }
      });
    }, 100);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.rich-text-editor')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add event delegation for format buttons
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleFormatButtonClick = (e) => {
      console.log('Click detected on:', e.target);
      console.log('Target classes:', e.target.className);
      console.log('Target tag:', e.target.tagName);
      
      // Also check if we clicked on the text inside the button
      const formatBtn = e.target.closest('.format-code-btn');
      if (formatBtn || e.target.classList.contains('format-code-btn')) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Format button clicked via delegation!');
        
        // Find the parent code block
        const codeBlock = (formatBtn || e.target).closest('.advanced-code-block');
        if (!codeBlock) {
          console.error('Could not find parent code block');
          return;
        }
        
        const codeContent = codeBlock.querySelector('.code-content');
        if (!codeContent) {
          console.error('Could not find code content');
          return;
        }
        
        const currentLang = codeContent.getAttribute('data-lang') || 'javascript';
        console.log('Formatting code with language:', currentLang);
        console.log('Code before formatting:', codeContent.textContent);
        
        try {
          formatCode(codeContent, currentLang);
          console.log('Code after formatting:', codeContent.textContent);
          
          // Trigger onChange to save formatted content
          setTimeout(() => {
            if (onChange) {
              onChange(editor.innerHTML);
            }
          }, 100);
        } catch (error) {
          console.error('Error formatting code:', error);
        }
      }
    };

    editor.addEventListener('click', handleFormatButtonClick);
    
    // Also add debugging to see ALL button clicks
    const debugAllButtons = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.parentElement?.tagName === 'BUTTON') {
        console.log('BUTTON CLICKED!', {
          target: e.target,
          innerHTML: e.target.innerHTML,
          className: e.target.className,
          parentClassName: e.target.parentElement?.className
        });
      }
    };
    
    editor.addEventListener('click', debugAllButtons, true);
    
    return () => {
      editor.removeEventListener('click', handleFormatButtonClick);
      editor.removeEventListener('click', debugAllButtons, true);
    };
  }, [onChange]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor) {
        const codeBlocks = editor.querySelectorAll('.advanced-code-block');
        codeBlocks.forEach(codeBlock => {
          if (codeBlock._eventListeners) {
            codeBlock._eventListeners.forEach(cleanup => cleanup());
          }
        });
      }
    };
  }, []);

  // Minimal approach - just let Tab work naturally and handle copy/paste simply
  useEffect(() => {
    if (!editorRef.current) return;
    
    const handleKeyDown = (e) => {
      // Check if Tab key is pressed and we're in a code block or dropdown content
      if (e.key === 'Tab' && (e.target.classList.contains('code-content') || 
                             e.target.classList.contains('dropdown-content') ||
                             e.target.closest('.dropdown-content'))) {
        e.preventDefault();
        // Insert tab character or spaces
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Use spaces for better compatibility
        const spaces = document.createTextNode('    '); // 4 spaces
        range.insertNode(spaces);
        range.setStartAfter(spaces);
        range.setEndAfter(spaces);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    };
    
    editorRef.current.addEventListener('keydown', handleKeyDown);
    
    return () => {
      editorRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Removed complex document-level handler - using simple approach now

  return (
    <div className={`rich-text-editor ${className} border rounded-lg overflow-hidden`} style={style}>
      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b flex flex-wrap gap-1 items-center">
        {/* Text Formatting */}
        <div className="flex gap-1 mr-3">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('strikeThrough')}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Strikethrough"
          >
            <s>S</s>
          </button>
        </div>

        {/* Headers */}
        <div className="flex gap-1 mr-3">
          <button
            type="button"
            onClick={() => applyFormat('formatBlock', 'h1')}
            className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            title="Header 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => applyFormat('formatBlock', 'h2')}
            className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            title="Header 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => applyFormat('formatBlock', 'h3')}
            className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            title="Header 3"
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 mr-3">
          <button
            type="button"
            onClick={() => applyFormat('insertUnorderedList')}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Bullet List"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => applyFormat('insertOrderedList')}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Numbered List"
          >
            1.
          </button>
        </div>

        {/* Colors */}
        <div className="flex gap-1 mr-3 relative">
          <div className="relative">
            <button
              type="button"
              onClick={toggleColorPicker}
              className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              title="Text Color"
            >
              🎨
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 mt-1">
                <div className="grid grid-cols-7 gap-1 w-48">
                  {colors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={toggleHighlightPicker}
              className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              title="Highlight"
            >
              🖍
            </button>
            {showHighlightPicker && (
              <div className="absolute top-full left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 mt-1">
                <div className="grid grid-cols-7 gap-1 w-48">
                  {colors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleHighlightSelect(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Font Controls */}
        <div className="flex gap-1 mr-3">
          <div className="relative">
            <button
              type="button"
              onClick={toggleFontPicker}
              className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              title="Font Family"
            >
              Font
            </button>
            {showFontPicker && (
              <div className="absolute top-full left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 mt-1 w-40 max-h-48 overflow-y-auto">
                {fonts.map((font, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleFontSelect(font)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm dark:text-white"
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={toggleSizePicker}
              className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              title="Font Size"
            >
              Size
            </button>
            {showSizePicker && (
              <div className="absolute top-full left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 mt-1 w-32">
                {fontSizes.map((size, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSizeSelect(size.value)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm dark:text-white"
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Special Actions */}
        <div className="flex gap-1 mr-3">
          <button
            type="button"
            onClick={() => applyFormat('undo')}
            disabled={historyIndex <= 0}
            className={`px-2 py-1 rounded text-sm ${
              historyIndex <= 0 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Undo"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={() => applyFormat('redo')}
            disabled={historyIndex >= history.length - 1}
            className={`px-2 py-1 rounded text-sm ${
              historyIndex >= history.length - 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Redo"
          >
            ↷
          </button>
        </div>

        {/* Other Actions */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={insertDropdown}
            className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            title="Insert Dropdown"
          >
            📋
          </button>
          <button
            type="button"
            onClick={insertAdvancedCodeBlock}
            className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            title="Code Block with Syntax Highlighting"
          >
            💻
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onKeyDown={(e) => {
          console.log('Key pressed:', e.key, 'Target:', e.target, 'Classes:', e.target.classList?.value);
          
          // Handle Tab key for all rich text editing, not just code blocks
          if (e.key === 'Tab') {
            console.log('Tab key detected - preventing default and inserting spaces');
            e.preventDefault();
            e.stopPropagation();
            
            // Insert 2 spaces for indentation
            document.execCommand('insertText', false, '  ');
            console.log('Inserted 2 spaces via execCommand');
            
            return false;
          }
          
          // Check if we're in a code block using multiple methods
          const isInCodeBlock = e.target.classList?.contains('code-content') || 
                               e.target.closest('.code-content') ||
                               e.target.closest('.advanced-code-block');
          
          if (isInCodeBlock) {
            console.log('Detected key in code block:', e.key, 'Element:', e.target.tagName);
            
            // For Enter, let the browser handle it naturally but clean up after
            if (e.key === 'Enter') {
              console.log('Enter pressed in code block - letting browser handle');
              // Don't prevent default, let browser handle it
              e.target.setAttribute('data-enter-pressed', 'true');
            }
          }
        }}
        onPaste={(e) => {
          console.log('=== PASTE EVENT DEBUG ===');
          console.log('Target:', e.target);
          console.log('Target classes:', e.target.className);
          console.log('Available clipboard types:', e.clipboardData.types);
          
          // Check if we're in a code block (strip formatting) - improved detection
          const isInCodeBlock = e.target.classList?.contains('code-content') || 
                               e.target.closest('.code-content') ||
                               e.target.closest('.advanced-code-block') ||
                               // Also check if we're inside a syntax-highlighted element within code
                               (e.target.closest('.syntax-keyword, .syntax-string, .syntax-comment, .syntax-number, .syntax-builtin, .syntax-type, .syntax-annotation, .syntax-method, .syntax-field') && 
                                e.target.closest('.advanced-code-block'));
          
          if (isInCodeBlock) {
            console.log('=== CODE BLOCK PASTE DETECTED ===');
            console.log('Target element:', e.target);
            console.log('Target tag:', e.target.tagName);
            console.log('Target classes:', e.target.className);
            console.log('Closest code-content:', e.target.closest('.code-content'));
            console.log('Closest advanced-code-block:', e.target.closest('.advanced-code-block'));
            
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            
            console.log('Original text:', JSON.stringify(text));
            
            // For code blocks, preserve line breaks but avoid excessive spacing
            // More aggressive line break cleanup
            let cleanText = text
              .replace(/\r\n/g, '\n')     // Normalize Windows line endings
              .replace(/\r/g, '\n')       // Normalize Mac line endings
              .replace(/\n\s*\n\s*\n/g, '\n\n')  // Replace 3+ lines with just 2
              .replace(/^\s+|\s+$/g, '')  // Trim leading/trailing whitespace
              .replace(/[ \t]+$/gm, '');  // Remove trailing spaces on each line
            
            console.log('Cleaned text:', JSON.stringify(cleanText));
            console.log('Line count - original:', (text.match(/\n/g) || []).length + 1);
            console.log('Line count - cleaned:', (cleanText.match(/\n/g) || []).length + 1);
            
            // Use a more controlled insertion method
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              
              // Insert as text node to avoid HTML interpretation
              const textNode = document.createTextNode(cleanText);
              range.insertNode(textNode);
              
              // Position cursor at end
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              // Fallback to execCommand
              document.execCommand('insertText', false, cleanText);
            }
            
            console.log('=== CODE BLOCK PASTE COMPLETE ===');
            return;
          }
          
          // Check if we're in a dropdown content area or regular content (preserve formatting)
          const isInDropdown = e.target.classList.contains('dropdown-content') || 
                              e.target.closest('.dropdown-content');
          
          if (isInDropdown) {
            console.log('Pasting into dropdown content - preserving formatting');
          } else {
            console.log('Pasting into regular content - preserving formatting');
          }
          
          // For both dropdown and regular content, preserve HTML formatting
          e.preventDefault();
          
          // Try to get HTML data first
          let htmlData = e.clipboardData.getData('text/html');
          const plainData = e.clipboardData.getData('text/plain');
          
          console.log('HTML data length:', htmlData?.length || 0);
          console.log('Plain data length:', plainData?.length || 0);
          console.log('HTML data preview:', htmlData?.substring(0, 200));
          
          if (htmlData && htmlData.trim()) {
            // Clean up potentially problematic HTML but keep formatting
            htmlData = htmlData
              .replace(/<meta[^>]*>/gi, '')
              .replace(/<link[^>]*>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<!--[\s\S]*?-->/gi, '')
              .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '') // Remove Office namespace tags
              .replace(/<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi, ''); // Remove IE conditionals
            
            console.log('Cleaned HTML data preview:', htmlData.substring(0, 200));
            
            // Insert the HTML content
            const success = document.execCommand('insertHTML', false, htmlData);
            console.log('HTML insertion success:', success);
            
            if (!success) {
              console.log('HTML insertion failed, falling back to plain text');
              document.execCommand('insertText', false, plainData);
            }
          } else {
            console.log('No HTML data available, using plain text');
            document.execCommand('insertText', false, plainData);
          }
          
          // Trigger onChange to save the pasted content
          setTimeout(() => {
            if (onChange) {
              onChange(editorRef.current.innerHTML);
            }
          }, 100);
        }}
        className="p-4 focus:outline-none dark:bg-gray-800 dark:text-white"
        style={{ 
          minHeight: minHeight,
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      />

    </div>
  );
};

export default RichTextEditor;