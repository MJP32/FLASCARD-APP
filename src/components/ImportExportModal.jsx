import React, { useState, useRef, useEffect } from 'react';
import { exportToCSV, exportToExcel, exportToAnki } from '../services/exportService';
import { parseCSV, parseExcel, readFileAsText, readFileAsArrayBuffer } from '../services/fileParser';
import { SUPPORTED_FILE_TYPES, FILE_SIZE_LIMITS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

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
  const [showPreview, setShowPreview] = useState(false);
  const [previewCards, setPreviewCards] = useState([]);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [editingCard, setEditingCard] = useState(null);

  const fileInputRef = useRef(null);

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200001,
      padding: '20px'
    },
    modal: {
      background: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      color: 'white',
      padding: '20px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      margin: 0,
      fontSize: '20px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    closeBtn: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      color: 'white',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s'
    },
    tabs: {
      display: 'flex',
      borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      background: isDarkMode ? '#0f172a' : '#f8fafc'
    },
    tab: {
      flex: 1,
      padding: '14px 20px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.2s',
      position: 'relative'
    },
    tabActive: {
      color: '#7c3aed',
      background: isDarkMode ? '#1e293b' : '#ffffff'
    },
    tabIndicator: {
      position: 'absolute',
      bottom: '-1px',
      left: 0,
      right: 0,
      height: '3px',
      background: '#7c3aed',
      borderRadius: '3px 3px 0 0'
    },
    body: {
      padding: '24px',
      overflowY: 'auto',
      flex: 1
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    formatGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '20px'
    },
    formatCard: {
      padding: '16px',
      borderRadius: '12px',
      border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center',
      background: isDarkMode ? '#0f172a' : '#ffffff'
    },
    formatCardActive: {
      borderColor: '#7c3aed',
      background: isDarkMode ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.05)'
    },
    formatIcon: {
      fontSize: '28px',
      marginBottom: '8px'
    },
    formatName: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px'
    },
    formatDesc: {
      fontSize: '11px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      background: isDarkMode ? '#0f172a' : '#f8fafc',
      borderRadius: '8px',
      cursor: 'pointer',
      marginBottom: '16px'
    },
    checkboxLabel: {
      fontSize: '14px',
      color: isDarkMode ? '#e2e8f0' : '#374151'
    },
    statsBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: isDarkMode ? '#0f172a' : '#f0fdf4',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    statLabel: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#166534'
    },
    statValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#4ade80' : '#16a34a'
    },
    button: {
      width: '100%',
      padding: '14px 24px',
      borderRadius: '10px',
      border: 'none',
      fontWeight: '600',
      fontSize: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      color: 'white'
    },
    secondaryBtn: {
      background: isDarkMode ? '#334155' : '#e2e8f0',
      color: isDarkMode ? '#e2e8f0' : '#374151'
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      margin: '24px 0',
      color: isDarkMode ? '#64748b' : '#94a3b8'
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: isDarkMode ? '#334155' : '#e2e8f0'
    },
    textarea: {
      width: '100%',
      minHeight: '150px',
      padding: '14px',
      borderRadius: '10px',
      border: `1px solid ${isDarkMode ? '#334155' : '#d1d5db'}`,
      background: isDarkMode ? '#0f172a' : '#ffffff',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '13px',
      fontFamily: 'monospace',
      resize: 'vertical',
      marginBottom: '12px'
    },
    fileDropZone: {
      border: `2px dashed ${isDarkMode ? '#475569' : '#d1d5db'}`,
      borderRadius: '12px',
      padding: '32px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: isDarkMode ? '#0f172a' : '#f8fafc',
      marginBottom: '16px'
    },
    fileIcon: {
      fontSize: '40px',
      marginBottom: '12px'
    },
    fileText: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '8px'
    },
    fileHint: {
      fontSize: '12px',
      color: isDarkMode ? '#64748b' : '#94a3b8'
    },
    selectedFile: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: isDarkMode ? '#0f172a' : '#f0f9ff',
      borderRadius: '8px',
      marginBottom: '8px'
    },
    fileName: {
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#0369a1'
    },
    fileSize: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    message: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginTop: '16px',
      fontSize: '14px'
    },
    successMessage: {
      background: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
      color: isDarkMode ? '#4ade80' : '#166534',
      border: `1px solid ${isDarkMode ? '#166534' : '#bbf7d0'}`
    },
    errorMessage: {
      background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
      color: isDarkMode ? '#f87171' : '#dc2626',
      border: `1px solid ${isDarkMode ? '#7f1d1d' : '#fecaca'}`
    },
    previewModal: {
      maxWidth: '800px'
    },
    previewCard: {
      background: isDarkMode ? '#0f172a' : '#f8fafc',
      border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px'
    },
    previewQuestion: {
      fontSize: '15px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px'
    },
    previewAnswer: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '12px'
    },
    previewMeta: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    previewTag: {
      fontSize: '11px',
      padding: '4px 8px',
      borderRadius: '4px',
      background: isDarkMode ? '#334155' : '#e0e7ff',
      color: isDarkMode ? '#94a3b8' : '#4f46e5'
    },
    previewActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
    },
    smallBtn: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    editBtn: {
      background: '#3b82f6',
      color: 'white'
    },
    deleteBtn: {
      background: '#ef4444',
      color: 'white'
    },
    footer: {
      padding: '16px 24px',
      borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setImportError('');
    setImportMessage('');
  };

  const validateFile = (file) => {
    if (file.size > FILE_SIZE_LIMITS.IMPORT_MAX_SIZE) {
      throw new Error(ERROR_MESSAGES.IMPORT.FILE_TOO_LARGE);
    }
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
      const cards = parseCSV(csvText);
      if (cards.length === 0) {
        throw new Error('No valid cards found in the pasted CSV data.');
      }
      setPreviewCards(cards.map((card, index) => ({ ...card, id: `preview-${index}` })));
      setShowPreview(true);
    } catch (error) {
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
      setPreviewCards(allCards.map((card, index) => ({ ...card, id: `preview-${index}` })));
      setShowPreview(true);
    } catch (error) {
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
      } else if (exportFormat === 'anki') {
        exportToAnki(flashcards, true);
      } else {
        await exportToExcel(flashcards, preserveFormatting, true);
      }
      setImportMessage(SUCCESS_MESSAGES.EXPORT_SUCCESS);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setImportError(error.message || ERROR_MESSAGES.EXPORT.EXPORT_FAILED);
    } finally {
      setIsExporting(false);
    }
  };

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

  const handleDeleteCard = (index) => {
    setPreviewCards(cards => cards.filter((_, i) => i !== index));
    if (editingCardIndex === index) {
      setEditingCardIndex(null);
      setEditingCard(null);
    }
  };

  const handleConfirmImport = async () => {
    if (previewCards.length === 0) return;
    setIsImporting(true);
    try {
      const cardsToImport = previewCards.map(({ id, ...card }) => card);
      await onImport(cardsToImport);
      setImportMessage(`Successfully imported ${cardsToImport.length} cards!`);
      setShowPreview(false);
      setPreviewCards([]);
      setCsvText('');
      setSelectedFiles([]);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      setImportError(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setImportMessage('');
    setImportError('');
    setSelectedFiles([]);
    setCsvText('');
    setShowPreview(false);
    setPreviewCards([]);
    setEditingCardIndex(null);
    setEditingCard(null);
    onClose();
  };

  useEffect(() => {
    if (!showPreview) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (editingCardIndex !== null) {
          setEditingCardIndex(null);
          setEditingCard(null);
        } else {
          setShowPreview(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPreview, editingCardIndex]);

  if (!isVisible) return null;

  // Preview Screen
  if (showPreview) {
    return (
      <div style={styles.overlay} onClick={handleClose}>
        <div style={{ ...styles.modal, ...styles.previewModal }} onClick={e => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>Preview Import ({previewCards.length} cards)</h2>
            <button style={styles.closeBtn} onClick={handleClose}>×</button>
          </div>

          <div style={styles.body}>
            {previewCards.map((card, index) => (
              <div key={card.id} style={styles.previewCard}>
                {editingCardIndex === index ? (
                  <div>
                    <textarea
                      style={{ ...styles.textarea, minHeight: '60px', marginBottom: '8px' }}
                      value={editingCard?.question || ''}
                      onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                      placeholder="Question"
                    />
                    <textarea
                      style={{ ...styles.textarea, minHeight: '60px', marginBottom: '8px' }}
                      value={editingCard?.answer || ''}
                      onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                      placeholder="Answer"
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{ ...styles.smallBtn, ...styles.secondaryBtn }}
                        onClick={() => { setEditingCardIndex(null); setEditingCard(null); }}
                      >
                        Cancel
                      </button>
                      <button
                        style={{ ...styles.smallBtn, ...styles.editBtn }}
                        onClick={handleSaveEdit}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={styles.previewQuestion}>Q: {card.question}</div>
                    <div style={styles.previewAnswer}>A: {card.answer}</div>
                    <div style={styles.previewMeta}>
                      {card.category && <span style={styles.previewTag}>{card.category}</span>}
                      {card.sub_category && <span style={styles.previewTag}>{card.sub_category}</span>}
                    </div>
                    <div style={styles.previewActions}>
                      <button style={{ ...styles.smallBtn, ...styles.editBtn }} onClick={() => handleEditCard(index)}>
                        Edit
                      </button>
                      <button style={{ ...styles.smallBtn, ...styles.deleteBtn }} onClick={() => handleDeleteCard(index)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={styles.footer}>
            <button style={{ ...styles.button, ...styles.secondaryBtn, width: 'auto' }} onClick={() => setShowPreview(false)}>
              Back
            </button>
            <button
              style={{ ...styles.button, ...styles.primaryBtn, width: 'auto', opacity: isImporting ? 0.7 : 1 }}
              onClick={handleConfirmImport}
              disabled={isImporting || previewCards.length === 0}
            >
              {isImporting ? 'Importing...' : `Import ${previewCards.length} Cards`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Modal
  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Import & Export</h2>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'export' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('export')}
          >
            Export
            {activeTab === 'export' && <div style={styles.tabIndicator} />}
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'import' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('import')}
          >
            Import
            {activeTab === 'import' && <div style={styles.tabIndicator} />}
          </button>
        </div>

        <div style={styles.body}>
          {activeTab === 'export' && (
            <>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Choose Format</div>
                <div style={styles.formatGrid}>
                  {[
                    { id: 'csv', icon: '📄', name: 'CSV', desc: 'Universal format' },
                    { id: 'excel', icon: '📊', name: 'Excel', desc: 'Organized by category' },
                    { id: 'anki', icon: '🎴', name: 'Anki', desc: 'Flashcard app' }
                  ].map(format => (
                    <div
                      key={format.id}
                      style={{ ...styles.formatCard, ...(exportFormat === format.id ? styles.formatCardActive : {}) }}
                      onClick={() => setExportFormat(format.id)}
                    >
                      <div style={styles.formatIcon}>{format.icon}</div>
                      <div style={styles.formatName}>{format.name}</div>
                      <div style={styles.formatDesc}>{format.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={preserveFormatting}
                  onChange={(e) => setPreserveFormatting(e.target.checked)}
                />
                <span style={styles.checkboxLabel}>Preserve rich text formatting</span>
              </label>

              <div style={styles.statsBar}>
                <span style={styles.statLabel}>Cards to export</span>
                <span style={styles.statValue}>{flashcards.length}</span>
              </div>

              <button
                style={{ ...styles.button, ...styles.primaryBtn, opacity: isExporting ? 0.7 : 1 }}
                onClick={handleExport}
                disabled={isExporting || flashcards.length === 0}
              >
                {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
              </button>
            </>
          )}

          {activeTab === 'import' && (
            <>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Paste CSV Data</div>
                <textarea
                  style={styles.textarea}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`question,answer,category
"What is React?","A JavaScript library","Programming"
"Capital of France?","Paris","Geography"`}
                />
                <button
                  style={{ ...styles.button, ...styles.primaryBtn, opacity: isPastingCsv ? 0.7 : 1 }}
                  onClick={handleCsvPaste}
                  disabled={isPastingCsv || !csvText.trim()}
                >
                  {isPastingCsv ? 'Processing...' : 'Import from CSV Text'}
                </button>
              </div>

              <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span>OR</span>
                <div style={styles.dividerLine} />
              </div>

              <div style={styles.section}>
                <div style={styles.sectionTitle}>Upload File</div>
                <div
                  style={styles.fileDropZone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={styles.fileIcon}>📁</div>
                  <div style={styles.fileText}>Click to select files</div>
                  <div style={styles.fileHint}>CSV or Excel files (max 10MB)</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={`${SUPPORTED_FILE_TYPES.CSV},${SUPPORTED_FILE_TYPES.EXCEL}`}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {selectedFiles.map((file, i) => (
                  <div key={i} style={styles.selectedFile}>
                    <span style={styles.fileName}>{file.name}</span>
                    <span style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}

                {selectedFiles.length > 0 && (
                  <button
                    style={{ ...styles.button, ...styles.primaryBtn, marginTop: '12px', opacity: isImporting ? 0.7 : 1 }}
                    onClick={handleImport}
                    disabled={isImporting}
                  >
                    {isImporting ? 'Processing...' : `Import ${selectedFiles.length} File(s)`}
                  </button>
                )}
              </div>
            </>
          )}

          {importMessage && (
            <div style={{ ...styles.message, ...styles.successMessage }}>{importMessage}</div>
          )}
          {importError && (
            <div style={{ ...styles.message, ...styles.errorMessage }}>{importError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportExportModal;
