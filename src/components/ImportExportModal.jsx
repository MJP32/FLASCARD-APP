import React, { useState, useRef } from 'react';
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

      // Call the import callback
      await onImport(allCards);
      
      setImportMessage(`${SUCCESS_MESSAGES.IMPORT_SUCCESS}: ${allCards.length} cards imported`);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Close modal after successful import
      setTimeout(() => {
        onClose();
      }, 2000);

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

  const clearMessages = () => {
    setImportMessage('');
    setImportError('');
  };

  const handleClose = () => {
    clearMessages();
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className="modal-content import-export-modal">
        <div className="modal-header">
          <h2>Import & Export Flashcards</h2>
          <button 
            className="close-btn"
            onClick={handleClose}
            disabled={isImporting || isExporting}
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
            disabled={isImporting || isExporting}
          >
            Export
          </button>
          <button 
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
            disabled={isImporting || isExporting}
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
            <div className="section">
              <h3>Import Flashcards</h3>
              
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
                disabled={isImporting || selectedFiles.length === 0}
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
        {(isImporting || isExporting) && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>{isImporting ? 'Importing flashcards...' : 'Exporting flashcards...'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExportModal;