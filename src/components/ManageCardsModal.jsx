import React, { useState } from 'react';

/**
 * Modal for managing flashcard active/inactive states
 */
const ManageCardsModal = ({
  isVisible,
  onClose,
  flashcards,
  onToggleActive,
  onCreateCard,
  onImportExport,
  isDarkMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

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

  // Stats
  const activeCount = flashcards.filter(card => card.active !== false).length;
  const inactiveCount = flashcards.filter(card => card.active === false).length;

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
          {/* Stats Row */}
          <div style={modalStyles.statsRow}>
            <div style={{...modalStyles.statCard, background: '#eff6ff', border: '2px solid #bfdbfe'}}>
              <div style={{fontSize: '28px', fontWeight: '700', color: '#2563eb'}}>{flashcards.length}</div>
              <div style={{fontSize: '13px', color: '#3b82f6', fontWeight: '600'}}>Total Cards</div>
            </div>
            <div style={{...modalStyles.statCard, background: '#f0fdf4', border: '2px solid #bbf7d0'}}>
              <div style={{fontSize: '28px', fontWeight: '700', color: '#16a34a'}}>{activeCount}</div>
              <div style={{fontSize: '13px', color: '#22c55e', fontWeight: '600'}}>Active</div>
            </div>
            <div style={{...modalStyles.statCard, background: '#fefce8', border: '2px solid #fde047'}}>
              <div style={{fontSize: '28px', fontWeight: '700', color: '#ca8a04'}}>{inactiveCount}</div>
              <div style={{fontSize: '13px', color: '#eab308', fontWeight: '600'}}>Inactive</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={modalStyles.actionsRow}>
            <button
              style={{...modalStyles.actionBtn, background: '#2563eb', color: 'white'}}
              onClick={onCreateCard}
            >
              + New Card
            </button>
            <button
              style={{...modalStyles.actionBtn, background: '#7c3aed', color: 'white'}}
              onClick={onImportExport}
            >
              Import/Export
            </button>
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

          {/* Results Count */}
          <div style={modalStyles.resultsCount}>
            Showing {filteredCards.length} of {flashcards.length} cards
          </div>

          {/* Cards List */}
          {filteredCards.length === 0 ? (
            <div style={modalStyles.noCards}>
              <div style={{fontSize: '48px', marginBottom: '12px'}}>📭</div>
              <p style={{margin: 0}}>No cards found matching your filters.</p>
            </div>
          ) : (
            <div style={modalStyles.cardsList}>
              {filteredCards.map(card => {
                const isActive = card.active !== false;
                const dueDate = card.dueDate ? (card.dueDate.toDate ? card.dueDate.toDate() : new Date(card.dueDate)) : null;

                return (
                  <div
                    key={card.id}
                    style={{
                      ...modalStyles.cardItem,
                      borderColor: isActive ? '#e2e8f0' : '#fde047',
                      background: isActive ? '#f8fafc' : '#fffbeb'
                    }}
                  >
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
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCardsModal;
