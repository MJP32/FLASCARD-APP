// Text formatting utilities for converting between HTML and Markdown

/**
 * Convert HTML to Markdown while preserving formatting
 * @param {string} html - HTML string to convert
 * @returns {string} Markdown string with style metadata
 */
export const htmlToMarkdown = (html) => {
  if (!html) return '';
  
  console.log('htmlToMarkdown input:', html);
  
  try {
    // First, let's flatten nested elements into a format we can work with better
    // This approach directly processes the HTML string to capture all formatting
    
    let result = html;
    
    // Step 1: Extract and preserve complex styles from spans and fonts
    // Use a more specific regex to properly capture nested content
    result = result.replace(/<(span|font)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
      let styles = [];
      let markdownContent = content;
      
      // First, process any nested HTML in the content
      // This ensures we capture formatting like <u><i>text</i></u> inside font tags
      markdownContent = markdownContent
        .replace(/<(strong|b)([^>]*)>([\s\S]*?)<\/\1>/gi, '**$3**')
        .replace(/<(em|i)([^>]*)>([\s\S]*?)<\/\1>/gi, '*$3*')
        .replace(/<u([^>]*)>([\s\S]*?)<\/u>/gi, '<u>$2</u>')
        .replace(/<(del|s|strike)([^>]*)>([\s\S]*?)<\/\1>/gi, '~~$3~~')
        .replace(/<mark([^>]*)>([\s\S]*?)<\/mark>/gi, '==$2==');
      
      // Extract styles from span elements
      if (tag.toLowerCase() === 'span') {
        const styleMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i);
        if (styleMatch) {
          const styleString = styleMatch[1];
          
          // Parse individual style properties
          const styleProps = styleString.split(';').filter(s => s.trim());
          for (const prop of styleProps) {
            const [key, value] = prop.split(':').map(s => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case 'color':
                  styles.push(`{color:${value}}`);
                  break;
                case 'background-color':
                  styles.push(`{bg:${value}}`);
                  break;
                case 'font-family':
                  styles.push(`{font:${value.replace(/['"]/g, '')}}`);
                  break;
                case 'font-size':
                  styles.push(`{size:${value}}`);
                  break;
                case 'font-weight':
                  if (value === 'bold' || parseInt(value) >= 700) {
                    markdownContent = `**${markdownContent}**`;
                  }
                  break;
                case 'font-style':
                  if (value === 'italic') {
                    markdownContent = `*${markdownContent}*`;
                  }
                  break;
                case 'text-decoration':
                  if (value.includes('underline')) {
                    markdownContent = `<u>${markdownContent}</u>`;
                  }
                  if (value.includes('line-through')) {
                    markdownContent = `~~${markdownContent}~~`;
                  }
                  break;
                default:
                  // Ignore unsupported style properties
                  break;
              }
            }
          }
        }
      }
      
      // Extract styles from font elements
      if (tag.toLowerCase() === 'font') {
        // Handle both attribute-based and style-based properties
        const colorMatch = attrs.match(/color\s*=\s*["']?([^"'\s>]+)/i);
        const faceMatch = attrs.match(/face\s*=\s*["']?([^"'\s>]+)/i);
        const sizeMatch = attrs.match(/size\s*=\s*["']?([^"'\s>]+)/i);
        
        if (colorMatch) styles.push(`{color:${colorMatch[1]}}`);
        if (faceMatch) styles.push(`{font:${faceMatch[1]}}`);
        if (sizeMatch) styles.push(`{size:${sizeMatch[1]}}`);
        
        // Also check for style attribute in font tags
        const styleMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i);
        if (styleMatch) {
          const styleString = styleMatch[1];
          
          // Parse individual style properties
          const styleProps = styleString.split(';').filter(s => s.trim());
          for (const prop of styleProps) {
            const [key, value] = prop.split(':').map(s => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case 'color':
                  styles.push(`{color:${value}}`);
                  break;
                case 'background-color':
                  styles.push(`{bg:${value}}`);
                  break;
                case 'font-family':
                  styles.push(`{font:${value.replace(/['"]/g, '')}}`);
                  break;
                case 'font-size':
                  styles.push(`{size:${value}}`);
                  break;
                case 'font-weight':
                  if (value === 'bold' || parseInt(value) >= 700) {
                    markdownContent = `**${markdownContent}**`;
                  }
                  break;
                case 'font-style':
                  if (value === 'italic') {
                    markdownContent = `*${markdownContent}*`;
                  }
                  break;
                case 'text-decoration':
                  if (value.includes('underline')) {
                    markdownContent = `<u>${markdownContent}</u>`;
                  }
                  if (value.includes('line-through')) {
                    markdownContent = `~~${markdownContent}~~`;
                  }
                  break;
                default:
                  // Ignore unsupported style properties
                  break;
              }
            }
          }
        }
      }
      
      // Apply styles to content
      return styles.join('') + markdownContent;
    });
    
    // Step 2: Handle basic formatting tags
    result = result
      // Bold
      .replace(/<(strong|b)([^>]*)>([\s\S]*?)<\/\1>/gi, '**$3**')
      // Italic  
      .replace(/<(em|i)([^>]*)>([\s\S]*?)<\/\1>/gi, '*$3*')
      // Underline
      .replace(/<u([^>]*)>([\s\S]*?)<\/u>/gi, '<u>$2</u>')
      // Strikethrough
      .replace(/<(del|s|strike)([^>]*)>([\s\S]*?)<\/\1>/gi, '~~$3~~')
      // Mark/highlight
      .replace(/<mark([^>]*)>([\s\S]*?)<\/mark>/gi, '==$2==')
      // Code
      .replace(/<code([^>]*)>([\s\S]*?)<\/code>/gi, '`$2`')
      // Pre
      .replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, '```\n$2\n```')
      // Headers
      .replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/gi, '# $2\n')
      .replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, '## $2\n')
      .replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/gi, '### $2\n')
      .replace(/<h4([^>]*)>([\s\S]*?)<\/h4>/gi, '#### $2\n')
      .replace(/<h5([^>]*)>([\s\S]*?)<\/h5>/gi, '##### $2\n')
      .replace(/<h6([^>]*)>([\s\S]*?)<\/h6>/gi, '###### $2\n')
      // Paragraphs and divs
      .replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, '$2\n\n')
      .replace(/<div([^>]*)>([\s\S]*?)<\/div>/gi, '$2\n')
      // Line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Lists
      .replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, '- $2\n')
      .replace(/<(ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi, '$3\n')
      // Links
      .replace(/<a([^>]*href\s*=\s*["']([^"']*)["'][^>]*)>([\s\S]*?)<\/a>/gi, '[$3]($2)')
      // Images - convert to markdown with base64 data preserved
      .replace(/<img([^>]*src\s*=\s*["']([^"']*)["'][^>]*alt\s*=\s*["']([^"']*)["'][^>]*)>/gi, '![$3]($2)')
      .replace(/<img([^>]*alt\s*=\s*["']([^"']*)["'][^>]*src\s*=\s*["']([^"']*)["'][^>]*)>/gi, '![$2]($3)')
      .replace(/<img([^>]*src\s*=\s*["']([^"']*)["'][^>]*)>/gi, '![Image]($2)')
      // Remove any remaining HTML tags
      .replace(/<[^>]*>/g, '');
    
    // Step 3: Clean up whitespace
    result = result
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Convert multiple newlines to double newlines
      .replace(/\n\s+/g, '\n') // Remove leading spaces from lines
      .replace(/\s+$/, '') // Remove trailing whitespace
      .trim();
    
    console.log('htmlToMarkdown output:', result);
    return result;
  } catch (error) {
    console.error('Error in htmlToMarkdown:', error);
    console.error('Input that caused error:', html);
    // Fallback to simple tag stripping
    return html.replace(/<[^>]*>/g, '');
  }
};

/**
 * Convert Markdown back to HTML for import
 * @param {string} markdown - Markdown string with style metadata
 * @returns {string} HTML string
 */
export const markdownToHtml = (markdown) => {
  if (!markdown) return '';
  
  console.log('markdownToHtml input:', markdown);
  
  let html = markdown;
  
  // First, handle the style metadata format {color:red}{font:Arial}text
  html = html.replace(/(\{[^}]+\})+([^{]*?)(?=\{|$)/g, (match, styleGroups, content) => {
    if (!content.trim()) return match;
    
    // Parse the style groups
    const styles = [];
    let fontSize = null;
    const styleMatches = styleGroups.match(/\{([^:]+):([^}]+)\}/g);
    
    if (styleMatches) {
      styleMatches.forEach(styleMatch => {
        const [, prop, value] = styleMatch.match(/\{([^:]+):([^}]+)\}/);
        switch (prop) {
          case 'color':
            styles.push(`color: ${value}`);
            break;
          case 'bg':
            styles.push(`background-color: ${value}`);
            break;
          case 'font':
            styles.push(`font-family: ${value}`);
            break;
          case 'size':
            // Handle font size - if it's a number 1-7, use font tag
            if (/^[1-7]$/.test(value)) {
              fontSize = value;
            } else {
              styles.push(`font-size: ${value}`);
            }
            break;
          default:
            // Ignore unsupported style properties
            break;
        }
      });
    }
    
    if (fontSize !== null) {
      // Use font tag for numeric sizes 1-7
      const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
      return `<font size="${fontSize}"${styleAttr}>${content}</font>`;
    } else if (styles.length > 0) {
      return `<span style="${styles.join('; ')}">${content}</span>`;
    }
    return content;
  });
  
  html = html
    // Convert headers
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Convert code blocks (must be before inline code)
    .replace(/```\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')
    .replace(/```(.*?)\n([\s\S]*?)\n```/g, '<pre><code class="language-$1">$2</code></pre>')
    
    // Convert inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Convert emphasis and strong with better regex that handles nested content
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    
    // Handle formatting that might span multiple words
    .replace(/\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+(?:[^*\n])*)\*/g, '<em>$1</em>')
    
    // Convert underline, highlight, strikethrough
    .replace(/<u>([^<]+)<\/u>/g, '<u>$1</u>') // Already HTML, preserve
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    
    // Convert links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    
    // Convert images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />')
    
    // Convert lists
    .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
    
    // Convert line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    
    // Wrap in paragraphs if not already wrapped
    .replace(/^(?!<[hul])/gm, '<p>')
    .replace(/(?<!>)$/gm, '</p>')
    
    // Clean up extra paragraph tags
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
    .replace(/(<\/[hul][^>]*>)<\/p>/g, '$1');
  
  console.log('markdownToHtml output:', html);
  return html;
};

/**
 * Detect if text contains markdown formatting
 * @param {string} text - Text to check
 * @returns {boolean} True if markdown formatting is detected
 */
export const containsMarkdown = (text) => {
  if (!text) return false;
  
  const markdownPatterns = [
    /\*\*.*?\*\*/,     // Bold
    /\*.*?\*/,         // Italic
    /`.*?`/,           // Inline code
    /```[\s\S]*?```/,  // Code blocks
    /^#{1,6}\s/m,      // Headers
    /^\s*[-*+]\s/m,    // Unordered lists
    /^\s*\d+\.\s/m,    // Ordered lists
    /\[.*?\]\(.*?\)/,  // Links
    /!\[.*?\]\(.*?\)/, // Images
    /~~.*?~~/,         // Strikethrough
    /==.*?==/,         // Highlight
    /\{[^:]+:[^}]+\}/  // Style metadata
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
};

/**
 * Prepare text for Excel export with formatting preservation
 * @param {string} text - HTML text to prepare
 * @param {boolean} preserveFormatting - Whether to preserve formatting
 * @param {number} maxLength - Maximum length for Excel cell
 * @returns {string} Prepared text
 */
export const prepareTextForExcel = (text, preserveFormatting = true, maxLength = 30000) => {
  console.log('prepareTextForExcel called with:', { text: text?.substring(0, 100), preserveFormatting });
  
  if (!text) return '';
  
  if (preserveFormatting) {
    console.log('Using formatting preservation mode');
    // Convert to markdown to preserve formatting in a more Excel-friendly way
    let formattedText = htmlToMarkdown(text);
    
    // Handle large base64 images that might exceed Excel limits
    formattedText = handleLargeImages(formattedText);
    
    // Truncate if too long
    if (formattedText.length > maxLength) {
      formattedText = formattedText.substring(0, maxLength - 50) + '... [CONTENT TRUNCATED]';
      console.warn(`Content truncated from ${text.length} to ${formattedText.length} characters`);
    }
    
    console.log('prepareTextForExcel result:', formattedText?.substring(0, 100));
    return formattedText;
  } else {
    console.log('Using plain text mode');
    // Original cleaning function for compatibility mode
    let cleanText = text.replace(/<[^>]*>/g, '');
    cleanText = cleanText
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    if (cleanText.length > maxLength) {
      cleanText = cleanText.substring(0, maxLength - 50) + '... [CONTENT TRUNCATED FOR EXCEL COMPATIBILITY]';
    }
    
    console.log('prepareTextForExcel result:', cleanText?.substring(0, 100));
    return cleanText;
  }
};

/**
 * Handle large base64 images in export
 * @param {string} markdown - Markdown text with images
 * @returns {string} Markdown with large images replaced by placeholders
 */
export const handleLargeImages = (markdown) => {
  return markdown.replace(/!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g, (match, altText, dataUrl) => {
    // Check if the base64 data is too large (>50KB in base64)
    if (dataUrl.length > 66667) { // 50KB * 4/3 (base64 expansion ratio)
      // Extract image type and create a placeholder
      const imageType = dataUrl.match(/data:image\/([^;]+)/)?.[1] || 'image';
      return `![${altText || 'Large Image'}](IMAGE_TOO_LARGE_FOR_EXPORT_${imageType.toUpperCase()})`;
    }
    return match;
  });
};

/**
 * Escape CSV field
 * @param {string} field - Field to escape
 * @returns {string} Properly escaped field
 */
export const escapeCSVField = (field) => {
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