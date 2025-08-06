import React, { useState, useRef, useEffect } from 'react';
import { exportToCSV, exportToExcel } from '../services/exportService';
import { parseCSV, parseExcel, readFileAsText, readFileAsArrayBuffer } from '../services/fileParser';
import { SUPPORTED_FILE_TYPES, FILE_SIZE_LIMITS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

/**
 * Modal component for import and export operations
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Array} props.flashcards - Available flashcards for export
 * @param {Function} props.onImport - Callback for successful import
 * @param {boolean} props.isDarkMode - Dark mode state
 * @returns {JSX.Element} Import/Export modal component
 */
const ImportExportModal = ({
  isVisible,
  onClose,
  flashcards = [],
  onImport,
  isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState('export');
  const [exportFormat, setExportFormat] = useState('csv');
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [csvText, setCsvText] = useState('');
  const [isPastingCsv, setIsPastingCsv] = useState(false);
  
  // Preview mode states
  const [showPreview, setShowPreview] = useState(false);
  const [previewCards, setPreviewCards] = useState([]);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setImportError('');
    setImportMessage('');
  };

  const validateFile = (file) => {
    // Check file size
    if (file.size > FILE_SIZE_LIMITS.IMPORT_MAX_SIZE) {
      throw new Error(ERROR_MESSAGES.IMPORT.FILE_TOO_LARGE);
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      throw new Error(ERROR_MESSAGES.IMPORT.INVALID_FILE);
    }

    return { isCSV, isExcel };
  };

  const handleCsvPaste = async () => {
    if (!csvText.trim()) {
      setImportError('Please paste CSV data before importing');
      return;
    }

    setIsPastingCsv(true);
    setImportError('');
    setImportMessage('');

    try {
      console.log(`Processing CSV with ${csvText.length} characters`);
      
      // Parse the CSV text directly
      const cards = parseCSV(csvText);

      if (cards.length === 0) {
        throw new Error('No valid cards found in the pasted CSV data. Please check the format.');
      }

      console.log(`Successfully parsed ${cards.length} cards`);

      // Show preview instead of directly importing
      const previewCardsWithIds = cards.map((card, index) => ({ ...card, id: `preview-${index}` }));
      setPreviewCards(previewCardsWithIds);
      setShowPreview(true);
      
    } catch (error) {
      console.error('CSV paste import error:', error);
      setImportError(error.message || ERROR_MESSAGES.IMPORT.GENERIC_ERROR);
    } finally {
      setIsPastingCsv(false);
    }
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setImportError('Please select a file to import');
      return;
    }

    setIsImporting(true);
    setImportError('');
    setImportMessage('');

    try {
      let allCards = [];

      for (const file of selectedFiles) {
        const { isCSV, isExcel } = validateFile(file);
        let cards = [];

        if (isCSV) {
          const content = await readFileAsText(file);
          cards = parseCSV(content);
        } else if (isExcel) {
          const buffer = await readFileAsArrayBuffer(file);
          cards = parseExcel(buffer, file.name);
        }

        allCards = [...allCards, ...cards];
      }

      if (allCards.length === 0) {
        throw new Error(ERROR_MESSAGES.IMPORT.NO_VALID_CARDS);
      }

      // Show preview instead of directly importing
      setPreviewCards(allCards.map((card, index) => ({ ...card, id: `preview-${index}` })));
      setShowPreview(true);

    } catch (error) {
      console.error('Import error:', error);
      setImportError(error.message || ERROR_MESSAGES.IMPORT.PARSE_ERROR);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    if (flashcards.length === 0) {
      setImportError(ERROR_MESSAGES.EXPORT.NO_CARDS);
      return;
    }

    setIsExporting(true);
    setImportError('');

    try {
      if (exportFormat === 'csv') {
        exportToCSV(flashcards, preserveFormatting);
      } else {
        await exportToExcel(flashcards, preserveFormatting, true);
      }
      
      setImportMessage(SUCCESS_MESSAGES.EXPORT_SUCCESS);
      
      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Export error:', error);
      setImportError(error.message || ERROR_MESSAGES.EXPORT.EXPORT_FAILED);
    } finally {
      setIsExporting(false);
    }
  };

  // Preview mode functions
  const handleEditCard = (index) => {
    setEditingCardIndex(index);
    setEditingCard({ ...previewCards[index] });
  };

  const handleSaveEdit = () => {
    if (editingCardIndex !== null && editingCard) {
      const updatedCards = [...previewCards];
      updatedCards[editingCardIndex] = editingCard;
      setPreviewCards(updatedCards);
      setEditingCardIndex(null);
      setEditingCard(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCardIndex(null);
    setEditingCard(null);
  };

  const handleDeleteCard = (index) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      const updatedCards = previewCards.filter((_, i) => i !== index);
      setPreviewCards(updatedCards);
      
      // If we're editing this card, cancel the edit
      if (editingCardIndex === index) {
        setEditingCardIndex(null);
        setEditingCard(null);
      } else if (editingCardIndex !== null && editingCardIndex > index) {
        // Adjust editing index if we deleted a card before it
        setEditingCardIndex(editingCardIndex - 1);
      }
    }
  };

  const handleAddCard = () => {
    const newCard = {
      id: `preview-${Date.now()}`,
      question: '',
      answer: '',
      category: '',
      sub_category: '',
      additional_info: ''
    };
    setPreviewCards([...previewCards, newCard]);
    setEditingCardIndex(previewCards.length);
    setEditingCard(newCard);
  };

  const handleConfirmImport = async () => {
    if (previewCards.length === 0) {
      setImportError('No cards to import');
      return;
    }

    setIsImporting(true);
    setImportError('');
    
    try {
      // Remove the preview IDs before importing
      const cardsToImport = previewCards.map(card => {
        const { id, ...cardWithoutId } = card;
        return cardWithoutId;
      });

      await onImport(cardsToImport);
      
      setImportMessage(`${SUCCESS_MESSAGES.IMPORT_SUCCESS}: ${cardsToImport.length} cards imported`);
      setShowPreview(false);
      setPreviewCards([]);
      setCsvText('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Close modal after successful import
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      setImportError(error.message || ERROR_MESSAGES.IMPORT.PARSE_ERROR);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewCards([]);
    setEditingCardIndex(null);
    setEditingCard(null);
  };

  // Add keyboard shortcuts for preview screen
  useEffect(() => {
    if (!showPreview) return;

    const handleKeyDown = (event) => {
      // Don't trigger shortcuts if user is typing in input/textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'd':
          event.preventDefault();
          if (editingCardIndex !== null) {
            // In edit mode - delete the card being edited
            handleDeleteCard(editingCardIndex);
          }
          break;
        case 'u':
          event.preventDefault();
          if (editingCardIndex !== null) {
            // In edit mode - save/update the current edit
            handleSaveEdit();
          }
          break;
        case 'escape':
          // Cancel current edit or close preview
          event.preventDefault();
          if (editingCardIndex !== null) {
            handleCancelEdit();
          } else {
            handleCancelPreview();
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
  }, [showPreview, previewCards, editingCardIndex, handleDeleteCard, handleSaveEdit]);

  const clearMessages = () => {
    setImportMessage('');
    setImportError('');
  };

  const handleClose = () => {
    clearMessages();
    setSelectedFiles([]);
    setCsvText('');
    setShowPreview(false);
    setPreviewCards([]);
    setEditingCardIndex(null);
    setEditingCard(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isVisible) {
    return null;
  }

  // Render preview screen if in preview mode
  if (showPreview) {
    return (
      <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
        <div className={`modal-content import-preview-modal ${isDarkMode ? 'dark' : ''}`}>
          <div className="modal-header">
            <h2>📋 Import Preview ({previewCards.length} cards)</h2>
            <button 
              className="close-btn"
              onClick={handleClose}
              disabled={isImporting}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>

          <div className="preview-content">
            <div className="preview-header">
              <p>Review your cards before importing. You can edit, delete, or add new cards.</p>
              <div className="keyboard-shortcuts-hint">
                <small>
                  <strong>Keyboard shortcuts (when editing):</strong> 
                  <kbd>U</kbd> save/update • 
                  <kbd>D</kbd> delete card • 
                  <kbd>Esc</kbd> cancel edit
                </small>
              </div>
              <div className="preview-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={handleAddCard}
                  disabled={isImporting}
                >
                  ➕ Add New Card
                </button>
                <div className="preview-buttons">
                  <button 
                    className="btn btn-outline"
                    onClick={handleCancelPreview}
                    disabled={isImporting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleConfirmImport}
                    disabled={isImporting || previewCards.length === 0}
                  >
                    {isImporting ? 'Importing...' : `Import ${previewCards.length} Cards`}
                  </button>
                </div>
              </div>
            </div>

            <div className="preview-cards-list">
              {previewCards.map((card, index) => {
                return (
                  <div key={card.id} style={{
                    border: '1px solid #ccc',
                    borderRadius: '12px',
                    background: '#f9f9f9',
                    marginBottom: '15px !important',
                    height: '800px !important',
                    minHeight: '800px !important',
                    maxHeight: '800px !important',
                    padding: '25px',
                    overflowY: 'scroll !important',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#999 #f1f1f1'
                  }}>
                  {editingCardIndex === index ? (
                    // Edit mode
                    <div className="card-edit-form">
                      <div className="form-row">
                        <label>Question:</label>
                        <textarea
                          value={editingCard?.question || ''}
                          onChange={(e) => setEditingCard({...editingCard, question: e.target.value})}
                          placeholder="Enter question"
                          rows="2"
                        />
                      </div>
                      <div className="form-row">
                        <label>Answer:</label>
                        <textarea
                          value={editingCard?.answer || ''}
                          onChange={(e) => setEditingCard({...editingCard, answer: e.target.value})}
                          placeholder="Enter answer"
                          rows="2"
                        />
                      </div>
                      <div className="form-row-inline">
                        <div className="form-col">
                          <label>Category:</label>
                          <input
                            type="text"
                            value={editingCard?.category || ''}
                            onChange={(e) => setEditingCard({...editingCard, category: e.target.value})}
                            placeholder="Category"
                          />
                        </div>
                        <div className="form-col">
                          <label>Sub-category:</label>
                          <input
                            type="text"
                            value={editingCard?.sub_category || ''}
                            onChange={(e) => setEditingCard({...editingCard, sub_category: e.target.value})}
                            placeholder="Sub-category"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <label>Additional Info:</label>
                        <textarea
                          value={editingCard?.additional_info || ''}
                          onChange={(e) => setEditingCard({...editingCard, additional_info: e.target.value})}
                          placeholder="Additional information (optional)"
                          rows="2"
                        />
                      </div>
                      <div className="card-edit-actions">
                        <button 
                          className="btn btn-outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn btn-primary"
                          onClick={handleSaveEdit}
                          disabled={!editingCard?.question?.trim() || !editingCard?.answer?.trim()}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'stretch',
                      gap: '30px',
                      height: '100%'
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '30px',
                        flex: 1,
                        borderRadius: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        overflow: 'visible'
                      }}>
                        <div style={{
                          marginBottom: '25px',
                          fontSize: '18px',
                          lineHeight: '1.6',
                          minHeight: '70px'
                        }}>
                          <strong style={{color: '#4f46e5', display: 'block', marginBottom: '5px'}}>Question:</strong>
                          <div style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            overflowX: 'auto',
                            padding: '20px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            color: '#333333',
                            minHeight: '80px'
                          }}>
                            {card.question || 'No question'}
                          </div>
                        </div>
                        <div style={{
                          marginBottom: '25px',
                          fontSize: '18px',
                          lineHeight: '1.6',
                          minHeight: '70px'
                        }}>
                          <strong style={{color: '#4f46e5', display: 'block', marginBottom: '5px'}}>Answer:</strong>
                          <div style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            overflowX: 'auto',
                            padding: '20px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            color: '#333333',
                            minHeight: '80px'
                          }}>
                            {card.answer || 'No answer'}
                          </div>
                        </div>
                        
                        {/* Category and Sub-category */}
                        <div style={{
                          marginBottom: '12px',
                          fontSize: '14px',
                          color: '#666'
                        }}>
                          <strong style={{color: '#4f46e5', marginRight: '8px'}}>Category:</strong>
                          <span style={{
                            background: '#e0e7ff',
                            color: '#4f46e5',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginRight: '8px'
                          }}>
                            {card.category || 'Uncategorized'}
                          </span>
                          {card.sub_category && card.sub_category.trim() !== '' && (
                            <>
                              <span style={{margin: '0 4px', color: '#999'}}>/</span>
                              <span style={{
                                background: '#f0f9ff',
                                color: '#0ea5e9',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {card.sub_category}
                              </span>
                            </>
                          )}
                        </div>


                        {/* Additional Info */}
                        {card.additional_info && (
                          <div style={{
                            marginBottom: '25px',
                            fontSize: '16px'
                          }}>
                            <strong style={{color: '#4f46e5', display: 'block', marginBottom: '8px'}}>Additional Info:</strong>
                            <div style={{
                              padding: '16px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              backgroundColor: '#f9f9f9',
                              fontSize: '14px',
                              color: '#666',
                              fontStyle: 'italic',
                              lineHeight: '1.6',
                              minHeight: '60px'
                            }}>
                              {card.additional_info}
                            </div>
                          </div>
                        )}
                        
                        {/* Add some bottom padding to ensure scrolling */}
                        <div style={{ height: '50px' }}></div>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        minWidth: '100px'
                      }}>
                        <button 
                          onClick={() => handleEditCard(index)}
                          style={{
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteCard(index)}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          {(importMessage || importError) && (
            <div className="message-section">
              {importMessage && (
                <div className="success-message">
                  ✅ {importMessage}
                </div>
              )}
              {importError && (
                <div className="error-message">
                  ❌ {importError}
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isImporting && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Importing flashcards...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className={`modal-content import-export-modal ${isDarkMode ? 'dark' : ''}`}>
        <div className="modal-header">
          <h2>Import & Export Flashcards</h2>
          <button 
            className="close-btn"
            onClick={handleClose}
            disabled={isImporting || isExporting || isPastingCsv}
            aria-label="Close import/export modal"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
            disabled={isImporting || isExporting || isPastingCsv}
          >
            Export
          </button>
          <button 
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
            disabled={isImporting || isExporting || isPastingCsv}
          >
            Import
          </button>
        </div>

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="tab-content export-tab">
            <div className="section">
              <h3>Export Options</h3>
              
              <div className="option-group">
                <label>Export Format:</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      disabled={isExporting}
                    />
                    CSV (Comma-separated values)
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      disabled={isExporting}
                    />
                    Excel (categorized with ZIP compression)
                  </label>
                </div>
              </div>

              <div className="option-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={preserveFormatting}
                    onChange={(e) => setPreserveFormatting(e.target.checked)}
                    disabled={isExporting}
                  />
                  Preserve rich text formatting
                </label>
                <small className="option-description">
                  When enabled, formatting like bold, italic, colors, and images will be preserved as markdown.
                </small>
              </div>

              <div className="export-info">
                <p><strong>Available cards:</strong> {flashcards.length}</p>
                {exportFormat === 'excel' && (
                  <p><small>Excel export will create separate files by category and compress them into a ZIP file.</small></p>
                )}
              </div>

              <button 
                className="btn btn-primary export-btn"
                onClick={handleExport}
                disabled={isExporting || flashcards.length === 0}
              >
                {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="tab-content import-tab">
            {/* CSV Paste Section */}
            <div className="section csv-paste-section">
              <h3>📋 Paste CSV Data</h3>
              <p className="section-description">
                Quickly create flashcards by pasting CSV-formatted data directly below.
              </p>
              
              <div className="csv-input-area">
                <label htmlFor="csv-text">Paste your CSV data here:</label>
                <textarea
                  id="csv-text"
                  className="csv-textarea"
                  placeholder={`Headers are optional! Default column order: question, answer, category, sub_category, level, additional_info

With headers:
question,answer,category,sub_category,level,additional_info
"What is React?","A JavaScript library for building user interfaces","Programming","JavaScript","new","Created by Facebook"

Without headers (same result):
"What is React?","A JavaScript library for building user interfaces","Programming","JavaScript","new","Created by Facebook"
"Capital of France?","Paris","Geography","Europe","new","Located in Western Europe"

Note: Level can be: new, again, hard, good, easy, beginner, intermediate, or advanced.`}
                  value={csvText}
                  onChange={(e) => {
                    console.log(`CSV text updated: ${e.target.value.length} characters`);
                    setCsvText(e.target.value);
                  }}
                  disabled={isPastingCsv || isImporting}
                  rows="12"
                  style={{ minHeight: '300px' }}
                />
                <div className="csv-char-count">
                  {csvText.length} characters • {csvText.split('\n').length} lines
                </div>
                
                <button 
                  className="btn btn-primary csv-import-btn"
                  onClick={handleCsvPaste}
                  disabled={isPastingCsv || isImporting || !csvText.trim()}
                >
                  {isPastingCsv ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Processing CSV...
                    </>
                  ) : (
                    <>
                      📋 Import from Pasted CSV
                    </>
                  )}
                </button>
                
                <div className="csv-format-info">
                  <h4>CSV Format Requirements:</h4>
                  <ul>
                    <li><strong>Required:</strong> question, answer</li>
                    <li><strong>Optional:</strong> category, sub_category, additional_info</li>
                    <li>Use quotes around text containing commas</li>
                    <li>First row should contain column headers</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="section-divider">
              <span>OR</span>
            </div>

            {/* File Import Section */}
            <div className="section">
              <h3>📁 Import from Files</h3>
              
              <div className="file-input-section">
                <label htmlFor="import-files">Select Files:</label>
                <input
                  ref={fileInputRef}
                  id="import-files"
                  type="file"
                  multiple
                  accept={`${SUPPORTED_FILE_TYPES.CSV},${SUPPORTED_FILE_TYPES.EXCEL}`}
                  onChange={handleFileSelect}
                  disabled={isImporting}
                  className="file-input"
                />
                <small className="file-help">
                  Supported formats: CSV (.csv), Excel (.xlsx, .xls). Maximum size: {FILE_SIZE_LIMITS.IMPORT_MAX_SIZE / (1024 * 1024)}MB per file.
                </small>
              </div>

              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <h4>Selected Files:</h4>
                  <ul>
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="import-info">
                <h4>Expected Format:</h4>
                <p>Your file should have these columns (with or without ID column):</p>
                <ul>
                  <li><strong>Question:</strong> The flashcard question</li>
                  <li><strong>Answer:</strong> The flashcard answer</li>
                  <li><strong>Category:</strong> Card category (optional, defaults to "Uncategorized")</li>
                  <li><strong>Additional Info:</strong> Extra information (optional)</li>
                </ul>
                <small>The import will automatically detect the column structure and handle formatted content.</small>
              </div>

              <button 
                className="btn btn-primary import-btn"
                onClick={handleImport}
                disabled={isImporting || isPastingCsv || selectedFiles.length === 0}
              >
                {isImporting ? 'Importing...' : `Import ${selectedFiles.length} file(s)`}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {(importMessage || importError) && (
          <div className="message-section">
            {importMessage && (
              <div className="success-message">
                ✅ {importMessage}
              </div>
            )}
            {importError && (
              <div className="error-message">
                ❌ {importError}
              </div>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {(isImporting || isExporting || isPastingCsv) && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>
              {isPastingCsv ? 'Processing CSV data...' : 
               isImporting ? 'Importing flashcards...' : 
               'Exporting flashcards...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExportModal;