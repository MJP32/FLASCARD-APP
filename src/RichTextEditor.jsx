import React, { useRef, useState, forwardRef } from 'react';
import './RichTextEditor.css';

// ContentEditable component for rich text editing
const RichTextContentEditable = forwardRef(({ 
  value, 
  onChange, 
  className, 
  style, 
  minHeight, 
  currentFont, 
  currentFontSize 
}, ref) => {
  const isUpdating = React.useRef(false);
  const lastContent = React.useRef(value);
  
  // Only set initial content 
  React.useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = value || '';
    }
  }, []);
  
  // Handle external content changes (but not while user is typing)
  React.useEffect(() => {
    if (ref.current && value !== lastContent.current && !isUpdating.current) {
      ref.current.innerHTML = value || '';
      lastContent.current = value;
    }
  }, [value]);
  
  const handleInput = (e) => {
    isUpdating.current = true;
    const html = e.currentTarget.innerHTML;
    lastContent.current = html;
    onChange && onChange(html);
    setTimeout(() => { isUpdating.current = false; }, 0);
  };
  
  return (
    <div
      ref={ref}
      contentEditable
      className={`rich-text-content-editable ${className || ''}`}
      style={{
        width: '100%',
        minHeight: className?.includes('notes-textarea-permanent') ? '650px' : minHeight,
        height: className?.includes('notes-textarea-permanent') ? 'auto' : 'auto',
        flex: className?.includes('notes-textarea-permanent') ? '1' : 'none',
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
        outline: 'none',
        backgroundColor: 'white',
        fontSize: `${currentFontSize}px`,
        lineHeight: '1.5',
        fontFamily: currentFont,
        transition: 'font-size 0.2s ease, font-family 0.2s ease',
        overflowY: 'auto',
        ...style
      }}
      onInput={handleInput}
      suppressContentEditableWarning={true}
    />
  );
});

const RichTextEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Type your notes here...', 
  className = '',
  style = {},
  minHeight = '150px',
  hideToolbar = false,
  enableRichText = false
}) => {
  const textareaRef = useRef(null);
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('14');
  const [showTextColorPalette, setShowTextColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);

  // Font families available
  const fontFamilies = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact'
  ];

  // Font sizes available
  const fontSizes = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36'];

  // Color palette for text and highlight colors
  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc',
    '#ff0000', '#ff6600', '#ffcc00', '#33cc33', '#0066cc',
    '#6600cc', '#cc0066', '#ffffff', '#ffff00', '#00ffff',
    '#ff00ff', '#c0c0c0', '#800000', '#808000', '#008000',
    '#800080', '#008080', '#000080', '#ff9999', '#ffcc99'
  ];

  // Helper function to get selected text for contentEditable
  const getContentEditableSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return {
        text: range.toString(),
        range: range
      };
    }
    return { text: '', range: null };
  };

  // Helper function to insert text in contentEditable
  const insertInContentEditable = (text) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Apply formatting to selected text
  const applyFormatting = (formatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (enableRichText) {
      // Handle contentEditable formatting
      const selection = getContentEditableSelection();
      const selectedText = selection.text;
      
      if (formatType === 'bold') {
        document.execCommand('bold');
      } else if (formatType === 'italic') {
        document.execCommand('italic');
      } else if (formatType === 'underline') {
        document.execCommand('underline');
      } else if (formatType === 'list') {
        document.execCommand('insertUnorderedList');
      } else if (formatType === 'numberedList') {
        document.execCommand('insertOrderedList');
      }
      
      // Update the value after formatting
      setTimeout(() => {
        onChange && onChange(textarea.innerHTML);
      }, 0);
      
      return;
    }

    // Handle textarea formatting (original logic)
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (formatType === 'list' || formatType === 'numberedList') {
      // Handle list formatting differently
      if (selectedText) {
        // Convert selected text to list
        const lines = selectedText.split('\n');
        let listItems;
        
        if (formatType === 'numberedList') {
          let counter = 1;
          listItems = lines.map(line => line.trim() ? `${counter++}. ${line.trim()}` : line).join('\n');
        } else {
          listItems = lines.map(line => line.trim() ? `• ${line.trim()}` : line).join('\n');
        }
        
        const newValue = value.substring(0, start) + listItems + value.substring(end);
        onChange && onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + listItems.length);
        }, 0);
      } else {
        // Insert list item at cursor
        const insertText = formatType === 'numberedList' ? '1. ' : '• ';
        const newValue = value.substring(0, start) + insertText + value.substring(end);
        onChange && onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + insertText.length, start + insertText.length);
        }, 0);
      }
      return;
    }
    
    if (selectedText) {
      let formattedText = '';
      
      switch (formatType) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'underline':
          formattedText = `<u>${selectedText}</u>`;
          break;
        case 'textColor':
          // This will be handled by applyColor function
          break;
        case 'highlight':
          // This will be handled by applyHighlight function
          break;
        default:
          formattedText = selectedText;
      }
      
      const newValue = value.substring(0, start) + formattedText + value.substring(end);
      onChange && onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + formattedText.length);
      }, 0);
    }
  };

  // Apply font family to textarea
  const applyFont = (fontFamily) => {
    setCurrentFont(fontFamily);
    if (textareaRef.current) {
      textareaRef.current.style.fontFamily = fontFamily;
    }
  };

  // Apply font size to textarea
  const applyFontSize = (fontSize) => {
    setCurrentFontSize(fontSize);
    if (textareaRef.current) {
      textareaRef.current.style.fontSize = `${fontSize}px`;
    }
  };

  // Apply text color to selected text
  const applyTextColor = (color) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (enableRichText) {
      // Handle contentEditable coloring
      document.execCommand('foreColor', false, color);
      setTimeout(() => {
        onChange && onChange(textarea.innerHTML);
      }, 0);
    } else {
      // Handle textarea coloring (original logic)
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      
      if (selectedText) {
        const coloredText = `<span style="color: ${color}">${selectedText}</span>`;
        const newValue = value.substring(0, start) + coloredText + value.substring(end);
        onChange && onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + coloredText.length);
        }, 0);
      }
    }
    
    setShowTextColorPalette(false);
  };

  // Apply highlight color to selected text
  const applyHighlight = (color) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (enableRichText) {
      // Handle contentEditable highlighting
      document.execCommand('backColor', false, color);
      setTimeout(() => {
        onChange && onChange(textarea.innerHTML);
      }, 0);
    } else {
      // Handle textarea highlighting (original logic)
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      
      if (selectedText) {
        const highlightedText = `<span style="background-color: ${color}">${selectedText}</span>`;
        const newValue = value.substring(0, start) + highlightedText + value.substring(end);
        onChange && onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + highlightedText.length);
        }, 0);
      }
    }
    
    setShowHighlightPalette(false);
  };

  return (
    <div className={`rich-text-editor-container ${className || ''}`} style={style}>
      {!hideToolbar && (
        <div className="rich-text-toolbar">
          {/* Font Controls */}
          <div className="font-controls-group">
            <select
              value={currentFont}
              onChange={(e) => applyFont(e.target.value)}
              className="font-select"
              title="Font Family"
            >
              {fontFamilies.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
            
            <select
              value={currentFontSize}
              onChange={(e) => applyFontSize(e.target.value)}
              className="font-size-select"
              title="Font Size"
            >
              {fontSizes.map(size => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-divider"></div>

          {/* Formatting Controls */}
          <div className="formatting-controls-group">
            <button
              type="button"
              className="toolbar-btn format-btn"
              onClick={() => applyFormatting('bold')}
              title="Bold (Markdown: **text**)"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className="toolbar-btn format-btn"
              onClick={() => applyFormatting('italic')}
              title="Italic (Markdown: *text*)"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className="toolbar-btn format-btn"
              onClick={() => applyFormatting('underline')}
              title="Underline (HTML: <u>text</u>)"
            >
              <u>U</u>
            </button>
            <button
              type="button"
              className="toolbar-btn format-btn"
              onClick={() => applyFormatting('list')}
              title="Bullet List (• item)"
            >
              •
            </button>
            <button
              type="button"
              className="toolbar-btn format-btn"
              onClick={() => applyFormatting('numberedList')}
              title="Numbered List (1. item)"
            >
              1.
            </button>
          </div>

          <div className="toolbar-divider"></div>

          {/* Color Controls */}
          <div className="color-controls-group">
            <div className="color-control">
              <button
                type="button"
                className="color-dropdown-btn"
                onClick={() => {
                  setShowTextColorPalette(!showTextColorPalette);
                  setShowHighlightPalette(false);
                }}
                title="Text Color"
              >
                <span className="color-icon" style={{ color: '#000' }}>A</span>
              </button>
              {showTextColorPalette && (
                <div className="color-palette">
                  {colors.map((color, index) => (
                    <div
                      key={index}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => applyTextColor(color)}
                      title={`Text Color: ${color}`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="color-control">
              <button
                type="button"
                className="color-dropdown-btn"
                onClick={() => {
                  setShowHighlightPalette(!showHighlightPalette);
                  setShowTextColorPalette(false);
                }}
                title="Highlight Color"
              >
                <span className="color-icon highlight-icon">H</span>
              </button>
              {showHighlightPalette && (
                <div className="color-palette">
                  {colors.map((color, index) => (
                    <div
                      key={index}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => applyHighlight(color)}
                      title={`Highlight Color: ${color}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="toolbar-divider"></div>

          {/* Delete Controls */}
          <div className="delete-controls-group">
            <button
              type="button"
              className="toolbar-btn delete-btn"
              onClick={() => onChange && onChange('')}
              title="Clear All Content"
            >
              🗑️
            </button>
          </div>
        </div>
      )}

      {enableRichText ? (
        <RichTextContentEditable
          ref={textareaRef}
          value={value}
          onChange={onChange}
          className={className}
          style={style}
          minHeight={minHeight}
          currentFont={currentFont}
          currentFontSize={currentFontSize}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          className={`rich-text-content-textarea ${className || ''}`}
          style={{
            width: '100%',
            minHeight: className?.includes('notes-textarea-permanent') ? '650px' : minHeight,
            height: className?.includes('notes-textarea-permanent') ? 'auto' : 'auto',
            flex: className?.includes('notes-textarea-permanent') ? '1' : 'none',
            resize: 'vertical',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            outline: 'none',
            backgroundColor: 'white',
            fontSize: `${currentFontSize}px`,
            lineHeight: '1.5',
            fontFamily: currentFont,
            transition: 'font-size 0.2s ease, font-family 0.2s ease',
            ...style
          }}
          id={className?.includes('notes-textarea-permanent') ? 'notes-editor-debug' : undefined}
          placeholder={placeholder}
        />
      )}
    </div>
  );

};

export default RichTextEditor;