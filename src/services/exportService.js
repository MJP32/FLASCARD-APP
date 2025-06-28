import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { htmlToMarkdown, escapeCSVField, prepareTextForExcel } from '../utils/textFormatter';

/**
 * Export flashcards to CSV format
 * @param {Array} flashcards - Array of flashcard objects
 * @param {boolean} preserveFormatting - Whether to preserve HTML formatting
 * @returns {void} Triggers download
 */
export const exportToCSV = (flashcards, preserveFormatting = true) => {
  console.log('CSV Export called with preserveFormatting:', preserveFormatting);
  console.log('Sample card for testing:', flashcards[0]);
  
  const dateStr = new Date().toISOString().split('T')[0];
  
  // Create CSV content matching new import format: question,answer,category,sub_category,level,additional_info
  const headers = ['question', 'answer', 'category', 'sub_category', 'level', 'additional_info'];
  const csvContent = [
    headers.join(','),
    ...flashcards.map((card, index) => {
      // Debug the current card
      const currentCard = card;
      console.log('=== CSV EXPORT DEBUG ===');
      console.log('Raw card data:', currentCard);
      console.log('Question HTML:', currentCard.question);
      console.log('Answer HTML:', currentCard.answer);
      console.log('Additional info HTML:', currentCard.additional_info);

      let questionExport, answerExport, additionalInfoExport;
      
      if (preserveFormatting) {
        questionExport = htmlToMarkdown(card.question);
        answerExport = htmlToMarkdown(card.answer);
        additionalInfoExport = htmlToMarkdown(card.additional_info);
      } else {
        // Remove all HTML tags for plain text export
        questionExport = (card.question || '').replace(/<[^>]*>/g, '');
        answerExport = (card.answer || '').replace(/<[^>]*>/g, '');
        additionalInfoExport = (card.additional_info || '').replace(/<[^>]*>/g, '');
      }
      
      if (index === 0) {
        console.log('Export comparison for first card:');
        console.log('Original question:', card.question);
        console.log('Exported question:', questionExport);
        console.log('Original answer:', card.answer);
        console.log('Exported answer:', answerExport);
      }

      // Map FSRS parameters back to level
      const getLevel = (card) => {
        if (card.level) return card.level;
        
        // Infer level from FSRS parameters if level is not set
        const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
        
        if (difficulty >= 8) return 'again';
        if (difficulty >= 7) return 'hard';
        if (difficulty <= 3 && easeFactor >= 2.8) return 'easy';
        if (interval >= 4) return 'good';
        return 'new';
      };

      const row = [
        escapeCSVField(questionExport),
        escapeCSVField(answerExport),
        escapeCSVField(card.category || 'Uncategorized'),
        escapeCSVField(card.sub_category || ''),
        escapeCSVField(getLevel(card)),
        escapeCSVField(additionalInfoExport)
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

/**
 * Create Excel workbook from flashcards
 * @param {Array} cards - Array of flashcard objects
 * @param {string} categoryName - Category name for the sheet
 * @param {boolean} preserveFormatting - Whether to preserve formatting
 * @returns {Object} XLSX workbook object
 */
const createExcelWorkbook = (cards, categoryName = 'Flashcards', preserveFormatting = true) => {
  const workbook = XLSX.utils.book_new();
  
  // Create data array with headers
  const data = [
    ['question', 'answer', 'category', 'sub_category', 'level', 'additional_info']
  ];
  
  // Map FSRS parameters back to level
  const getLevel = (card) => {
    if (card.level) return card.level;
    
    // Infer level from FSRS parameters if level is not set
    const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
    
    if (difficulty >= 8) return 'again';
    if (difficulty >= 7) return 'hard';
    if (difficulty <= 3 && easeFactor >= 2.8) return 'easy';
    if (interval >= 4) return 'good';
    return 'new';
  };
  
  // Add card data
  cards.forEach(card => {
    data.push([
      prepareTextForExcel(card.question, preserveFormatting, 20000),
      prepareTextForExcel(card.answer, preserveFormatting, 20000),
      card.category || 'Uncategorized',
      card.sub_category || '',
      getLevel(card),
      prepareTextForExcel(card.additional_info, preserveFormatting, 20000)
    ]);
  });
  
  // Create worksheet from data
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  const columnWidths = [
    { wch: 50 }, // question
    { wch: 50 }, // answer
    { wch: 20 }, // category
    { wch: 15 }, // sub_category
    { wch: 10 }, // level
    { wch: 40 }  // additional_info
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, categoryName.substring(0, 31)); // Excel sheet names limited to 31 chars
  
  return workbook;
};

/**
 * Export flashcards to Excel format
 * @param {Array} flashcards - Array of flashcard objects
 * @param {boolean} preserveFormatting - Whether to preserve formatting
 * @param {boolean} forceCategorized - Force categorized export
 * @returns {Promise<void>} Triggers download
 */
export const exportToExcel = async (flashcards, preserveFormatting = true, forceCategorized = false) => {
  console.log('Excel export called with:', { 
    cardCount: flashcards.length, 
    preserveFormatting, 
    forceCategorized,
    sample: flashcards[0] 
  });
  
  const dateStr = new Date().toISOString().split('T')[0];
  
  try {
    // Always do categorized export to handle large content
    if (forceCategorized || true) { // Always categorized for safety
      console.log('Using categorized export for Excel');
      
      // Group cards by category
      const cardsByCategory = {};
      flashcards.forEach(card => {
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
          // Check content length for this category
          const maxLength = Math.max(
            ...categoryCards.map(card => 
              Math.max(
                (card.question || '').length,
                (card.answer || '').length,
                (card.additional_info || '').length
              )
            )
          );
          
          console.log(`Category ${category} max field length: ${maxLength}`);
          
          // If any field is too long, use CSV instead of Excel for this category
          if (maxLength > 20000) {
            console.warn(`Category ${category} has content too long for Excel, using CSV format`);
            
            // Map FSRS parameters back to level
            const getLevel = (card) => {
              if (card.level) return card.level;
              const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
              if (difficulty >= 8) return 'again';
              if (difficulty >= 7) return 'hard';
              if (difficulty <= 3 && easeFactor >= 2.8) return 'easy';
              if (interval >= 4) return 'good';
              return 'new';
            };
            
            const csvData = [
              ['question', 'answer', 'category', 'sub_category', 'level', 'additional_info'],
              ...categoryCards.map(card => [
                (preserveFormatting ? htmlToMarkdown(card.question) : (card.question || '').replace(/<[^>]*>/g, '')),
                (preserveFormatting ? htmlToMarkdown(card.answer) : (card.answer || '').replace(/<[^>]*>/g, '')),
                card.category || 'Uncategorized',
                card.sub_category || '',
                getLevel(card),
                (preserveFormatting ? htmlToMarkdown(card.additional_info) : (card.additional_info || '').replace(/<[^>]*>/g, ''))
              ])
            ].map(row => row.map(field => {
              // Properly quote CSV fields that contain commas, quotes, or newlines
              const fieldStr = String(field || '');
              if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
                return '"' + fieldStr.replace(/"/g, '""') + '"';
              }
              return fieldStr;
            }).join(',')).join('\n');
            
            folder.file(`${sanitizedCategory}_${categoryCards.length}_cards.csv`, csvData);
            console.log(`📄 Added ${sanitizedCategory} as CSV (content too long for Excel)`);
          } else {
            // Content is manageable, create Excel file
            const workbook = createExcelWorkbook(categoryCards, sanitizedCategory, preserveFormatting);
            const workbookBlob = XLSX.write(workbook, { 
              bookType: 'xlsx', 
              type: 'array',
              compression: true 
            });
            folder.file(`${sanitizedCategory}_${categoryCards.length}_cards.xlsx`, workbookBlob);
            console.log(`📊 Added ${sanitizedCategory} as Excel`);
          }
        } catch (error) {
          console.error(`Error processing category ${category}:`, error);
          // Fallback to CSV for this category
          // Map FSRS parameters back to level
          const getLevel = (card) => {
            if (card.level) return card.level;
            const { difficulty = 5, easeFactor = 2.5, interval = 1 } = card;
            if (difficulty >= 8) return 'again';
            if (difficulty >= 7) return 'hard';
            if (difficulty <= 3 && easeFactor >= 2.8) return 'easy';
            if (interval >= 4) return 'good';
            return 'new';
          };
          
          const csvData = [
            ['question', 'answer', 'category', 'sub_category', 'level', 'additional_info'],
            ...categoryCards.map(card => [
              // Fallback content processing - preserve some formatting if possible
              (preserveFormatting && card.question ? htmlToMarkdown(card.question) : (card.question || '').replace(/<[^>]*>/g, '')).substring(0, 10000),
              (preserveFormatting && card.answer ? htmlToMarkdown(card.answer) : (card.answer || '').replace(/<[^>]*>/g, '')).substring(0, 10000),
              card.category || 'Uncategorized',
              card.sub_category || '',
              getLevel(card),
              (preserveFormatting && card.additional_info ? htmlToMarkdown(card.additional_info) : (card.additional_info || '').replace(/<[^>]*>/g, '')).substring(0, 10000)
            ])
          ].map(row => row.map(field => {
            // Properly quote CSV fields that contain commas, quotes, or newlines
            const fieldStr = String(field || '');
            if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
              return '"' + fieldStr.replace(/"/g, '""') + '"';
            }
            return fieldStr;
          }).join(',')).join('\n');
          
          folder.file(`${sanitizedCategory}_${categoryCards.length}_cards.csv`, csvData);
          console.log(`📄 Added ${sanitizedCategory} as CSV fallback (error recovery)`);
        }
      }
      
      // Add a summary file
      const summaryData = [
        ['Category', 'Card Count', 'File Name'],
        ...categories.map(category => [
          category,
          cardsByCategory[category].length,
          `${category.replace(/[<>:"/\\|?*]/g, '_')}_${cardsByCategory[category].length}_cards`
        ])
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      const summaryWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(summaryWorkbook, summarySheet, 'Summary');
      const summaryBlob = XLSX.write(summaryWorkbook, { bookType: 'xlsx', type: 'array' });
      folder.file('0_Summary.xlsx', summaryBlob);
      
      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `flashcards_categorized_${dateStr}.zip`;
      link.click();
      
      console.log('✅ Categorized Excel export completed successfully');
    }
  } catch (error) {
    console.error('Excel export failed:', error);
    throw error;
  }
};

/**
 * Download a file blob
 * @param {Blob} blob - File blob to download
 * @param {string} filename - Filename for download
 */
export const downloadBlob = (blob, filename) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};