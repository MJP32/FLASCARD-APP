import * as XLSX from 'xlsx';
import { containsMarkdown, markdownToHtml } from '../utils/textFormatter';

/**
 * Parse CSV string into flashcard objects
 * @param {string} csvString - CSV content as string
 * @returns {Array} Array of flashcard objects
 * @throws {Error} If CSV parsing fails
 */
export const parseCSV = (csvString) => {
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
    
    // Map header names to their indices
    const headerMap = {};
    headerFields.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim().replace(/\s+/g, '_');
      headerMap[normalizedHeader] = index;
    });
    
    console.log('Header mapping:', headerMap);
    
    rows.shift(); // Remove header row (first row is headers)
    console.log('Rows after removing header:', rows.length);
    const cards = [];
    
    rows.forEach((row, index) => {
      if (!row.trim()) return; // Skip empty rows
      
      const fields = parseRow(row);
      console.log(`Row ${index + 1} parsed into ${fields.length} fields`);
      
      // Extract fields based on header mapping
      const getField = (name) => {
        const idx = headerMap[name];
        return idx !== undefined ? fields[idx] || '' : '';
      };
      
      // Get required fields
      const question = getField('question');
      const answer = getField('answer');
      
      // Get optional fields
      const category = getField('category')?.trim() || 'Uncategorized';
      const sub_category = getField('sub_category')?.trim() || '';
      const levelRaw = getField('level')?.trim().toLowerCase() || 'new';
      const additional_info = getField('additional_info') || '';
      
      // Validate level value
      const validLevels = ['new', 'again', 'hard', 'good', 'easy'];
      const level = validLevels.includes(levelRaw) ? levelRaw : 'new';
      
      console.log(`Row ${index + 1} field extraction:`, { 
        question: question?.substring(0, 50),
        answer: answer?.substring(0, 50),
        category,
        sub_category,
        level,
        additional_info: additional_info?.substring(0, 30)
      });
      
      // Validate that we have non-empty question and answer after trimming whitespace
      if (question?.trim() && answer?.trim()) {
        console.log(`Processing row ${index + 1}:`, { question: question.substring(0, 50), answer: answer.substring(0, 50) });
        
        // Convert markdown back to HTML if formatting is detected
        const questionHasMarkdown = containsMarkdown(question);
        const answerHasMarkdown = containsMarkdown(answer);
        const additionalInfoHasMarkdown = additional_info && containsMarkdown(additional_info);
        
        console.log('CSV Import - Markdown detection:', {
          questionHasMarkdown,
          answerHasMarkdown, 
          additionalInfoHasMarkdown
        });
        
        const processedQuestion = questionHasMarkdown ? markdownToHtml(question) : question;
        const processedAnswer = answerHasMarkdown ? markdownToHtml(answer) : answer;
        const processedAdditionalInfo = additionalInfoHasMarkdown ? markdownToHtml(additional_info) : additional_info;
        
        // Map level to initial FSRS parameters
        const levelToParams = {
          'new': { difficulty: 5, easeFactor: 2.5, interval: 1 },
          'again': { difficulty: 8, easeFactor: 1.3, interval: 1 },
          'hard': { difficulty: 7, easeFactor: 2.0, interval: 2 },
          'good': { difficulty: 5, easeFactor: 2.5, interval: 4 },
          'easy': { difficulty: 3, easeFactor: 2.8, interval: 7 }
        };
        
        const fsrsParams = levelToParams[level];
        
        cards.push({
          category,
          sub_category,
          question: processedQuestion,
          answer: processedAnswer,
          additional_info: processedAdditionalInfo || null,
          level,
          ...fsrsParams
        });
      } else {
        console.warn(`Skipping row ${index + 1} due to missing Question or Answer. Question: "${question}", Answer: "${answer}"`);
      }
    });

    // Validate that we parsed some cards
    if (cards.length === 0) {
      const formatExample = 'question,answer,category,sub_category,level,additional_info';
      throw new Error(`No valid flashcards found in CSV. Please check that your file has the correct format: ${formatExample}`);
    }
    
    return cards;

  } catch (error) {
    console.error('CSV parsing error:', error);
    // Re-throw with context if it's not already a detailed error
    if (error.message.includes('CSV file') || error.message.includes('No valid flashcards')) {
      throw error;
    } else {
      throw new Error(`Failed to parse CSV file: ${error.message}. Please ensure your file is a valid CSV.`);
    }
  }
};

/**
 * Parse Excel file to flashcard objects
 * @param {ArrayBuffer} buffer - Excel file buffer
 * @param {string} filename - Original filename
 * @returns {Array} Array of flashcard objects
 * @throws {Error} If Excel parsing fails
 */
export const parseExcel = (buffer, filename) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }
    
    // Convert Excel data to CSV format and use CSV parser
    const csvContent = jsonData.map(row => {
      return row.map(cell => {
        const cellStr = String(cell || '');
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    return parseCSV(csvContent);
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file "${filename}": ${error.message}`);
  }
};

/**
 * Read file as text
 * @param {File} file - File object
 * @returns {Promise<string>} File content as string
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Read file as ArrayBuffer
 * @param {File} file - File object
 * @returns {Promise<ArrayBuffer>} File content as ArrayBuffer
 */
export const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
};