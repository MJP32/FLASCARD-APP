import React from 'react';
import './RichTextEditor.css';

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
  // Template buttons data (simplified to avoid React conflicts)
  const templateButtons = [
    { title: 'Insert List Template', icon: '📋' },
    { title: 'Insert Code Template', icon: '💻' },
    { title: 'Insert Notes Template', icon: '📝' },
    { title: 'Insert Examples Template', icon: '💡' }
  ];

  // Always use textarea-based approach to avoid React DOM conflicts
  return (
    <div className={`rich-text-editor-container ${className || ''}`} style={style}>
      {!hideToolbar && (
        <div className="rich-text-toolbar">
          {/* Template Controls */}
          <div className="template-controls-group">
            {templateButtons.map((button, index) => (
              <button
                key={index}
                type="button"
                className="toolbar-btn template-btn"
                onClick={() => {
                  const currentValue = value || '';
                  const template = getTemplate(button.title);
                  const newValue = currentValue ? `${currentValue}\n\n${template}` : template;
                  onChange && onChange(newValue);
                }}
                title={button.title}
              >
                {button.icon}
              </button>
            ))}
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

      <textarea
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        className={`rich-text-content-textarea ${className || ''}`}
        style={{
          width: '100%',
          minHeight: className?.includes('notes-textarea-permanent') ? '650px' : minHeight,
          height: className?.includes('notes-textarea-permanent') ? 'auto' : 'auto',
          flex: className?.includes('notes-textarea-permanent') ? '1' : 'none',
          resize: 'vertical',
          ...style,
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          outline: 'none',
          backgroundColor: 'white',
          fontSize: '14px',
          lineHeight: '1.5',
          fontFamily: 'inherit',
          ...style
        }}
        id={className?.includes('notes-textarea-permanent') ? 'notes-editor-debug' : undefined}
        placeholder={placeholder}
      />
    </div>
  );

  // Helper function to get template content
  function getTemplate(title) {
    switch(title) {
      case 'Insert List Template':
        return '• Item 1\n• Item 2\n• Item 3';
      case 'Insert Code Template':
        return '```\n// Your code here\nconsole.log("Hello World");\n```';
      case 'Insert Notes Template':
        return '**Notes:**\nYour notes here...';
      case 'Insert Examples Template':
        return '**Examples:**\n• Example 1\n• Example 2';
      default:
        return '';
    }
  }

};

export default RichTextEditor;