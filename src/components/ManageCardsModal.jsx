import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { processDuplicates, findSimilarConcepts } from '../utils/deduplication';

/**
 * Modal for managing flashcard active/inactive states with bulk operations
 */
const ManageCardsModal = ({
  isVisible,
  onClose,
  flashcards,
  onToggleActive,
  onCreateCard,
  onCreateCardsAI,
  onImportExport,
  onBulkDelete,
  onBulkUpdateCategory,
  isDarkMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkTargetCategory, setBulkTargetCategory] = useState('');
  const [bulkTargetSubCategory, setBulkTargetSubCategory] = useState('');

  // Deduplication state
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [dedupeProgress, setDedupeProgress] = useState(0);
  const [dedupeResults, setDedupeResults] = useState(null);
  const [showDedupeModal, setShowDedupeModal] = useState(false);
  const [isDeletingDupes, setIsDeletingDupes] = useState(false);
  const [dedupeMode, setDedupeMode] = useState('text'); // 'text' or 'concept'

  // Get unique categories
  const categories = ['All', ...new Set(flashcards.map(card => card.category || 'Uncategorized'))];

  // Get unique sub-categories based on selected category
  const subCategories = ['All', ...new Set(
    flashcards
      .filter(card => selectedCategory === 'All' || card.category === selectedCategory)
      .map(card => card.sub_category)
      .filter(subCat => subCat && subCat.trim() !== '')
  )];

  // Filter and sort cards
  const filteredCards = flashcards
    .filter(card => {
      const matchesSearch = searchTerm === '' ||
        card.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.answer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.category?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'All' ||
        card.category === selectedCategory ||
        (selectedCategory === 'Uncategorized' && !card.category);

      const matchesSubCategory = selectedSubCategory === 'All' ||
        card.sub_category === selectedSubCategory;

      const isActive = card.active !== false;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && isActive) ||
        (filterStatus === 'inactive' && !isActive);

      return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.createdAt || new Date(0)) - (a.createdAt || new Date(0));
        case 'oldest':
          return (a.createdAt || new Date(0)) - (b.createdAt || new Date(0));
        case 'alphabetical':
          return (a.question || '').localeCompare(b.question || '');
        case 'category':
          return (a.category || 'Uncategorized').localeCompare(b.category || 'Uncategorized');
        case 'dueDateAsc':
          const dateAAsc = a.dueDate ? (a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate)) : new Date(0);
          const dateBAsc = b.dueDate ? (b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate)) : new Date(0);
          return dateAAsc - dateBAsc;
        case 'dueDateDesc':
          const dateADesc = a.dueDate ? (a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate)) : new Date(9999, 11, 31);
          const dateBDesc = b.dueDate ? (b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate)) : new Date(9999, 11, 31);
          return dateBDesc - dateADesc;
        default:
          return 0;
      }
    });

  // All categories for bulk category change (without 'All' option)
  const allCategories = useMemo(() =>
    [...new Set(flashcards.map(card => card.category || 'Uncategorized'))].sort(),
    [flashcards]
  );

  // Bulk selection helpers
  const toggleCardSelection = (cardId) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const selectAllFiltered = () => {
    setSelectedCards(new Set(filteredCards.map(card => card.id)));
  };

  const deselectAll = () => {
    setSelectedCards(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedCards.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedCards.size} card(s)? This cannot be undone.`)) {
      if (onBulkDelete) {
        onBulkDelete([...selectedCards]);
      }
      setSelectedCards(new Set());
    }
  };

  const handleBulkCategoryChange = () => {
    if (selectedCards.size === 0 || !bulkTargetCategory) return;
    if (onBulkUpdateCategory) {
      onBulkUpdateCategory([...selectedCards], bulkTargetCategory, bulkTargetSubCategory);
    }
    setSelectedCards(new Set());
    setShowBulkCategoryModal(false);
    setBulkTargetCategory('');
    setBulkTargetSubCategory('');
  };

  const handleBulkActivate = () => {
    if (selectedCards.size === 0) return;
    selectedCards.forEach(cardId => onToggleActive(cardId, true));
    setSelectedCards(new Set());
  };

  const handleBulkDeactivate = () => {
    if (selectedCards.size === 0) return;
    selectedCards.forEach(cardId => onToggleActive(cardId, false));
    setSelectedCards(new Set());
  };

  // Deduplication handler (async with progress tracking)
  const handleFindDuplicates = useCallback(async () => {
    setIsDeduplicating(true);
    setDedupeProgress(0);
    setDedupeResults(null);
    setDedupeMode('text');

    try {
      const results = await processDuplicates(flashcards, 0.7, (progress) => {
        setDedupeProgress(progress);
      });
      setDedupeResults(results);
      setShowDedupeModal(true);
    } catch (error) {
      console.error('Deduplication error:', error);
      alert('Error finding duplicates: ' + error.message);
    } finally {
      setIsDeduplicating(false);
      setDedupeProgress(0);
    }
  }, [flashcards]);

  // Find similar concepts handler (semantic matching)
  const handleFindSimilarConcepts = useCallback(async () => {
    setIsDeduplicating(true);
    setDedupeProgress(0);
    setDedupeResults(null);
    setDedupeMode('concept');

    try {
      // Use 0.25 threshold to catch cards testing similar concepts
      const results = await findSimilarConcepts(flashcards, 0.25, (progress) => {
        setDedupeProgress(progress);
      });
      setDedupeResults(results);
      setShowDedupeModal(true);
    } catch (error) {
      console.error('Similar concepts error:', error);
      alert('Error finding similar concepts: ' + error.message);
    } finally {
      setIsDeduplicating(false);
      setDedupeProgress(0);
    }
  }, [flashcards]);

  const handleDeleteDuplicates = useCallback(async () => {
    if (!dedupeResults || dedupeResults.toDelete.length === 0) return;

    const count = dedupeResults.toDelete.length;
    if (window.confirm(`Delete ${count} duplicate card(s)? This keeps the best version of each duplicate group.`)) {
      const idsToDelete = dedupeResults.toDelete.map(card => card.id);
      setIsDeletingDupes(true);

      if (onBulkDelete) {
        try {
          await onBulkDelete(idsToDelete);
          setShowDedupeModal(false);
          setDedupeResults(null);
        } catch (error) {
          console.error('Error deleting duplicates:', error);
          alert('Error deleting some cards: ' + error.message);
        } finally {
          setIsDeletingDupes(false);
        }
      } else {
        setShowDedupeModal(false);
        setDedupeResults(null);
        setIsDeletingDupes(false);
      }
    }
  }, [dedupeResults, onBulkDelete]);

  // Strip HTML tags for display
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (!isVisible) return null;

  const modalStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200000,
      padding: '20px'
    },
    modal: {
      background: '#ffffff',
      borderRadius: '4px',
      width: '100%',
      maxWidth: '900px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    header: {
      background: '#2563eb',
      color: 'white',
      padding: '16px 24px',
      borderRadius: '4px 4px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      margin: 0,
      fontSize: '20px',
      fontWeight: '600'
    },
    closeBtn: {
      background: 'transparent',
      border: 'none',
      color: 'white',
      fontSize: '28px',
      cursor: 'pointer',
      padding: '0 8px',
      lineHeight: 1
    },
    body: {
      padding: '20px 24px',
      overflowY: 'auto',
      flex: 1
    },
    statsRow: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px'
    },
    statCard: {
      flex: 1,
      padding: '16px',
      borderRadius: '4px',
      textAlign: 'center'
    },
    actionsRow: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    actionBtn: {
      padding: '10px 16px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    filtersRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    },
    filterInput: {
      padding: '10px 14px',
      borderRadius: '4px',
      border: '2px solid #e2e8f0',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    cardsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    cardItem: {
      background: '#f8fafc',
      border: '2px solid #e2e8f0',
      borderRadius: '4px',
      padding: '14px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      transition: 'border-color 0.2s, box-shadow 0.2s'
    },
    cardContent: {
      flex: 1,
      minWidth: 0
    },
    cardQuestion: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '6px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    cardAnswer: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '8px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    cardMeta: {
      fontSize: '12px',
      color: '#94a3b8',
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
    },
    toggleBtn: {
      padding: '8px 14px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      whiteSpace: 'nowrap',
      transition: 'transform 0.1s'
    },
    noCards: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#64748b'
    },
    resultsCount: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '12px'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#2563eb'
    },
    selectionBar: {
      background: '#2563eb',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    },
    selectionInfo: {
      fontWeight: '600',
      fontSize: '14px'
    },
    selectionActions: {
      display: 'flex',
      gap: '8px'
    },
    selectionBtn: {
      padding: '6px 12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '12px',
      transition: 'opacity 0.2s'
    },
    bulkModal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      zIndex: 200001,
      minWidth: '320px'
    },
    bulkModalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 200001
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        {/* Header */}
        <div style={modalStyles.header}>
          <h2 style={modalStyles.headerTitle}>Manage Cards</h2>
          <button style={modalStyles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div style={modalStyles.body}>
          {/* Action Buttons - Grouped */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px'}}>
            {/* Row 1: Create & Import */}
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
              <span style={{fontSize: '12px', fontWeight: '600', color: '#64748b', minWidth: '50px'}}>Create</span>
              <button
                style={{...modalStyles.actionBtn, background: '#2563eb', color: 'white'}}
                onClick={onCreateCard}
              >
                + New Card
              </button>
              <button
                style={{...modalStyles.actionBtn, background: '#06b6d4', color: 'white'}}
                onClick={onCreateCardsAI}
                title="Use AI to create multiple flashcards at once"
              >
                AI Create
              </button>
              <div style={{width: '1px', height: '24px', background: '#e2e8f0', margin: '0 8px'}} />
              <button
                style={{...modalStyles.actionBtn, background: '#7c3aed', color: 'white'}}
                onClick={onImportExport}
              >
                Import/Export
              </button>
            </div>

            {/* Row 2: Bulk Status */}
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
              <span style={{fontSize: '12px', fontWeight: '600', color: '#64748b', minWidth: '50px'}}>Status</span>
              <button
                style={{...modalStyles.actionBtn, background: '#10b981', color: 'white'}}
                onClick={() => {
                  if (window.confirm(`Activate all ${filteredCards.length} filtered cards?`)) {
                    filteredCards.forEach(card => {
                      if (card.active === false) onToggleActive(card.id, true);
                    });
                  }
                }}
                disabled={filteredCards.length === 0}
              >
                Activate Filtered
              </button>
              <button
                style={{...modalStyles.actionBtn, background: '#f59e0b', color: 'white'}}
                onClick={() => {
                  if (window.confirm(`Deactivate all ${filteredCards.length} filtered cards?`)) {
                    filteredCards.forEach(card => {
                      if (card.active !== false) onToggleActive(card.id, false);
                    });
                  }
                }}
                disabled={filteredCards.length === 0}
              >
                Deactivate Filtered
              </button>
            </div>

            {/* Row 3: Cleanup */}
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
              <span style={{fontSize: '12px', fontWeight: '600', color: '#64748b', minWidth: '50px'}}>Cleanup</span>
              <button
                style={{...modalStyles.actionBtn, background: '#dc2626', color: 'white'}}
                onClick={handleFindDuplicates}
                disabled={isDeduplicating || flashcards.length < 2}
              >
                {isDeduplicating && dedupeMode === 'text'
                  ? `Finding... ${Math.round(dedupeProgress * 100)}%`
                  : 'Remove Duplicates'}
              </button>
              <button
                style={{...modalStyles.actionBtn, background: '#9333ea', color: 'white'}}
                onClick={handleFindSimilarConcepts}
                disabled={isDeduplicating || flashcards.length < 2}
                title="Find cards testing the same concept even if worded differently"
              >
                {isDeduplicating && dedupeMode === 'concept'
                  ? `Finding... ${Math.round(dedupeProgress * 100)}%`
                  : 'Similar Concepts'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={modalStyles.filtersRow}>
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{...modalStyles.filterInput, gridColumn: 'span 2'}}
            />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('All');
              }}
              style={modalStyles.filterInput}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {subCategories.length > 1 && (
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                style={modalStyles.filterInput}
              >
                {subCategories.map(sub => (
                  <option key={sub} value={sub}>{sub === 'All' ? 'All Sub-Categories' : sub}</option>
                ))}
              </select>
            )}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={modalStyles.filterInput}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={modalStyles.filterInput}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="category">By Category</option>
              <option value="dueDateAsc">Due Date ↑</option>
              <option value="dueDateDesc">Due Date ↓</option>
            </select>
          </div>

          {/* Results Count with Selection Controls */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
            <div style={modalStyles.resultsCount}>
              Showing {filteredCards.length} of {flashcards.length} cards
            </div>
            <div style={{display: 'flex', gap: '8px'}}>
              <button
                onClick={selectAllFiltered}
                style={{...modalStyles.selectionBtn, background: '#e2e8f0', color: '#475569'}}
                disabled={filteredCards.length === 0}
              >
                Select All ({filteredCards.length})
              </button>
              {selectedCards.size > 0 && (
                <button
                  onClick={deselectAll}
                  style={{...modalStyles.selectionBtn, background: '#fee2e2', color: '#dc2626'}}
                >
                  Deselect All
                </button>
              )}
            </div>
          </div>

          {/* Selection Action Bar - Shows when cards are selected */}
          {selectedCards.size > 0 && (
            <div style={modalStyles.selectionBar}>
              <div style={modalStyles.selectionInfo}>
                {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
              </div>
              <div style={modalStyles.selectionActions}>
                <button
                  onClick={handleBulkActivate}
                  style={{...modalStyles.selectionBtn, background: '#10b981', color: 'white'}}
                >
                  Activate
                </button>
                <button
                  onClick={handleBulkDeactivate}
                  style={{...modalStyles.selectionBtn, background: '#f59e0b', color: 'white'}}
                >
                  Deactivate
                </button>
                <button
                  onClick={() => setShowBulkCategoryModal(true)}
                  style={{...modalStyles.selectionBtn, background: '#8b5cf6', color: 'white'}}
                >
                  Change Category
                </button>
                <button
                  onClick={handleBulkDelete}
                  style={{...modalStyles.selectionBtn, background: '#ef4444', color: 'white'}}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Cards List */}
          {filteredCards.length === 0 ? (
            <div style={modalStyles.noCards}>
              <div style={{fontSize: '48px', marginBottom: '12px'}}>📭</div>
              <p style={{margin: 0, fontWeight: '600', fontSize: '16px'}}>No cards found</p>
              <p style={{margin: '8px 0 0 0', color: '#64748b', fontSize: '14px'}}>
                Try adjusting your search or filters above.
              </p>
              <div style={{marginTop: '16px', fontSize: '13px', color: '#94a3b8'}}>
                <p style={{margin: '4px 0'}}>💡 Clear the search field</p>
                <p style={{margin: '4px 0'}}>💡 Select "All" in category dropdown</p>
                <p style={{margin: '4px 0'}}>💡 Change status filter to "All Status"</p>
              </div>
            </div>
          ) : (
            <div style={modalStyles.cardsList}>
              {filteredCards.length > 50 ? (
                // Virtualized list for large card collections
                <List
                  height={400}
                  itemCount={filteredCards.length}
                  itemSize={110}
                  width="100%"
                  itemData={{
                    cards: filteredCards,
                    selectedCards,
                    toggleCardSelection,
                    onToggleActive,
                    stripHtml,
                    modalStyles
                  }}
                >
                  {({ index, style, data }) => {
                    const card = data.cards[index];
                    const isActive = card.active !== false;
                    const isSelected = data.selectedCards.has(card.id);
                    const dueDate = card.dueDate ? (card.dueDate.toDate ? card.dueDate.toDate() : new Date(card.dueDate)) : null;

                    return (
                      <div
                        style={{
                          ...style,
                          ...data.modalStyles.cardItem,
                          borderColor: isSelected ? '#2563eb' : (isActive ? '#e2e8f0' : '#fde047'),
                          background: isSelected ? '#eff6ff' : (isActive ? '#f8fafc' : '#fffbeb'),
                          boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                          marginBottom: '10px',
                          height: 'auto',
                          minHeight: '100px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => data.toggleCardSelection(card.id)}
                          style={data.modalStyles.checkbox}
                        />
                        <div style={data.modalStyles.cardContent}>
                          <div style={data.modalStyles.cardQuestion}>
                            {data.stripHtml(card.question) || 'No question'}
                          </div>
                          <div style={data.modalStyles.cardAnswer}>
                            {data.stripHtml(card.answer) || 'No answer'}
                          </div>
                          <div style={data.modalStyles.cardMeta}>
                            <span>{card.category || 'Uncategorized'}</span>
                            {card.sub_category && <span>/ {card.sub_category}</span>}
                            <span>Reviews: {card.reviewCount || 0}</span>
                            {dueDate && <span>Due: {dueDate.toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => data.onToggleActive(card.id, !isActive)}
                          style={{
                            ...data.modalStyles.toggleBtn,
                            background: isActive ? '#10b981' : '#f59e0b',
                            color: 'white'
                          }}
                        >
                          {isActive ? '✓ Active' : '⏸ Inactive'}
                        </button>
                      </div>
                    );
                  }}
                </List>
              ) : (
                // Regular rendering for smaller lists
                filteredCards.map(card => {
                  const isActive = card.active !== false;
                  const isSelected = selectedCards.has(card.id);
                  const dueDate = card.dueDate ? (card.dueDate.toDate ? card.dueDate.toDate() : new Date(card.dueDate)) : null;

                  return (
                    <div
                      key={card.id}
                      style={{
                        ...modalStyles.cardItem,
                        borderColor: isSelected ? '#2563eb' : (isActive ? '#e2e8f0' : '#fde047'),
                        background: isSelected ? '#eff6ff' : (isActive ? '#f8fafc' : '#fffbeb'),
                        boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCardSelection(card.id)}
                        style={modalStyles.checkbox}
                      />
                      <div style={modalStyles.cardContent}>
                        <div style={modalStyles.cardQuestion}>
                          {stripHtml(card.question) || 'No question'}
                        </div>
                        <div style={modalStyles.cardAnswer}>
                          {stripHtml(card.answer) || 'No answer'}
                        </div>
                        <div style={modalStyles.cardMeta}>
                          <span>{card.category || 'Uncategorized'}</span>
                          {card.sub_category && <span>/ {card.sub_category}</span>}
                          <span>Reviews: {card.reviewCount || 0}</span>
                          {dueDate && <span>Due: {dueDate.toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleActive(card.id, !isActive)}
                        style={{
                          ...modalStyles.toggleBtn,
                          background: isActive ? '#10b981' : '#f59e0b',
                          color: 'white'
                        }}
                      >
                        {isActive ? '✓ Active' : '⏸ Inactive'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Category Change Modal */}
      {showBulkCategoryModal && (
        <>
          <div style={modalStyles.bulkModalOverlay} onClick={() => setShowBulkCategoryModal(false)} />
          <div style={modalStyles.bulkModal}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b'}}>
              Change Category for {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''}
            </h3>
            <div style={{marginBottom: '12px'}}>
              <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#475569'}}>
                Category
              </label>
              <select
                value={bulkTargetCategory}
                onChange={(e) => setBulkTargetCategory(e.target.value)}
                style={{...modalStyles.filterInput, width: '100%'}}
              >
                <option value="">Select category...</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#475569'}}>
                Sub-Category (optional)
              </label>
              <input
                type="text"
                value={bulkTargetSubCategory}
                onChange={(e) => setBulkTargetSubCategory(e.target.value)}
                placeholder="Enter sub-category..."
                style={{...modalStyles.filterInput, width: '100%'}}
              />
            </div>
            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => {
                  setShowBulkCategoryModal(false);
                  setBulkTargetCategory('');
                  setBulkTargetSubCategory('');
                }}
                style={{...modalStyles.actionBtn, background: '#e2e8f0', color: '#475569'}}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCategoryChange}
                disabled={!bulkTargetCategory}
                style={{
                  ...modalStyles.actionBtn,
                  background: bulkTargetCategory ? '#2563eb' : '#cbd5e1',
                  color: 'white',
                  cursor: bulkTargetCategory ? 'pointer' : 'not-allowed'
                }}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </>
      )}

      {/* Deduplication Results Modal */}
      {showDedupeModal && dedupeResults && (
        <>
          <div style={modalStyles.bulkModalOverlay} onClick={() => setShowDedupeModal(false)} />
          <div style={{...modalStyles.bulkModal, maxWidth: '600px', maxHeight: '80vh', overflow: 'auto'}}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b'}}>
              {dedupeMode === 'concept' ? 'Similar Concept Cards Found' : 'Duplicate Cards Found'}
            </h3>

            {dedupeResults.toDelete.length === 0 ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
                <div style={{fontSize: '48px', marginBottom: '12px'}}>✓</div>
                <p>No {dedupeMode === 'concept' ? 'similar concept cards' : 'duplicate cards'} found!</p>
                <p style={{fontSize: '14px'}}>
                  Scanned {flashcards.length} cards. {dedupeMode === 'concept'
                    ? 'All your cards test different concepts.'
                    : 'All your cards are unique.'}
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  padding: '12px',
                  background: dedupeMode === 'concept' ? '#f3e8ff' : '#fef2f2',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: `1px solid ${dedupeMode === 'concept' ? '#d8b4fe' : '#fecaca'}`
                }}>
                  <p style={{margin: 0, color: dedupeMode === 'concept' ? '#7c3aed' : '#dc2626', fontWeight: '600'}}>
                    Found {dedupeResults.groups.length} {dedupeMode === 'concept' ? 'concept group(s)' : 'duplicate group(s)'} with {dedupeResults.toDelete.length} card(s) to remove
                  </p>
                  <p style={{margin: '8px 0 0 0', fontSize: '14px', color: dedupeMode === 'concept' ? '#5b21b6' : '#7f1d1d'}}>
                    {dedupeMode === 'concept'
                      ? 'These cards test similar concepts. The most complete version will be kept.'
                      : 'The best version of each duplicate will be kept.'}
                  </p>
                </div>

                <div style={{maxHeight: '300px', overflowY: 'auto', marginBottom: '16px'}}>
                  {dedupeResults.groups.map((group, groupIdx) => (
                    <div key={groupIdx} style={{
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{fontWeight: '600', marginBottom: '8px', color: '#1e293b'}}>
                        {dedupeMode === 'concept' ? 'Concept' : 'Group'} {groupIdx + 1} ({group.length} similar cards)
                      </div>
                      {group.map((card, cardIdx) => {
                        const isKeep = dedupeResults.toKeep.some(k => k.id === card.id);
                        const similarity = card._similarity;
                        return (
                          <div key={card.id} style={{
                            padding: '8px',
                            background: isKeep ? '#dcfce7' : '#fee2e2',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            fontSize: '13px'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '4px'
                            }}>
                              <span style={{
                                fontWeight: '600',
                                color: isKeep ? '#16a34a' : '#dc2626'
                              }}>
                                {isKeep ? '✓ Keep' : '✗ Delete'}
                                {similarity && !isKeep && (
                                  <span style={{fontWeight: '400', marginLeft: '8px', fontSize: '11px', color: '#6b7280'}}>
                                    ({Math.round(similarity * 100)}% match)
                                  </span>
                                )}
                              </span>
                              <span style={{fontSize: '11px', color: '#64748b'}}>
                                {card.category || 'Uncategorized'}
                              </span>
                            </div>
                            <div style={{color: '#374151'}}>
                              Q: {stripHtml(card.question).substring(0, 100)}
                              {stripHtml(card.question).length > 100 ? '...' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                  <button
                    onClick={() => {
                      setShowDedupeModal(false);
                      setDedupeResults(null);
                    }}
                    style={{...modalStyles.actionBtn, background: '#e2e8f0', color: '#475569'}}
                    disabled={isDeletingDupes}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteDuplicates}
                    disabled={isDeletingDupes}
                    style={{
                      ...modalStyles.actionBtn,
                      background: isDeletingDupes ? '#9ca3af' : (dedupeMode === 'concept' ? '#7c3aed' : '#dc2626'),
                      color: 'white',
                      cursor: isDeletingDupes ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isDeletingDupes
                      ? 'Deleting...'
                      : `Delete ${dedupeResults.toDelete.length} ${dedupeMode === 'concept' ? 'Similar Card(s)' : 'Duplicate(s)'}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ManageCardsModal;
