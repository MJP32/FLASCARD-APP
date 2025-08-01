import React, { useState, useEffect } from 'react';

/**
 * Modal for managing flashcard active/inactive states
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Array} props.flashcards - All flashcards
 * @param {Function} props.onToggleActive - Callback to toggle card active state
 * @param {Function} props.onCreateCard - Callback to create new card
 * @param {Function} props.onImportExport - Callback to open import/export modal
 * @param {boolean} props.isDarkMode - Dark mode state
 * @returns {JSX.Element} Manage cards modal component
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
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'alphabetical', 'category', 'dueDateAsc', 'dueDateDesc'

  // Get unique categories
  const categories = ['All', ...new Set(flashcards.map(card => card.category || 'Uncategorized'))];
  
  // Get unique sub-categories based on selected category
  const subCategories = ['All', ...new Set(
    flashcards
      .filter(card => selectedCategory === 'All' || card.category === selectedCategory)
      .map(card => card.sub_category)
      .filter(subCat => subCat && subCat.trim() !== '')
  )];
  
  // Calculate subcategory stats
  const getSubCategoryStats = () => {
    const stats = {};
    const now = new Date();
    
    flashcards.forEach(card => {
      if (selectedCategory !== 'All' && card.category !== selectedCategory) return;
      if (!card.sub_category || !card.sub_category.trim()) return;
      
      const subCat = card.sub_category;
      if (!stats[subCat]) {
        stats[subCat] = { total: 0, due: 0, active: 0, inactive: 0 };
      }
      
      stats[subCat].total++;
      
      if (card.active !== false) {
        stats[subCat].active++;
        const dueDate = card.dueDate || new Date(0);
        if (dueDate <= now) {
          stats[subCat].due++;
        }
      } else {
        stats[subCat].inactive++;
      }
    });
    
    return stats;
  };
  
  const subCategoryStats = getSubCategoryStats();

  // Filter and sort cards
  const filteredCards = flashcards
    .filter(card => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        card.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.answer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.category?.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === 'All' || 
        card.category === selectedCategory ||
        (selectedCategory === 'Uncategorized' && !card.category);

      // Sub-category filter
      const matchesSubCategory = selectedSubCategory === 'All' ||
        card.sub_category === selectedSubCategory;

      // Status filter
      const isActive = card.active !== false; // Default to true if not set
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
          // Convert to Date objects for comparison - earliest first
          const dateAAsc = a.dueDate ? (a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate)) : new Date(0);
          const dateBAsc = b.dueDate ? (b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate)) : new Date(0);
          return dateAAsc - dateBAsc; // Earliest due dates first
        case 'dueDateDesc':
          // Convert to Date objects for comparison - latest first
          const dateADesc = a.dueDate ? (a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate)) : new Date(9999, 11, 31);
          const dateBDesc = b.dueDate ? (b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate)) : new Date(9999, 11, 31);
          return dateBDesc - dateADesc; // Latest due dates first
        default:
          return 0;
      }
    });

  // Stats
  const activeCount = flashcards.filter(card => card.active !== false).length;
  const inactiveCount = flashcards.filter(card => card.active === false).length;


  if (!isVisible) return null;

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className={`modal-content manage-cards-modal ${isDarkMode ? 'dark' : ''}`}>
        <div className="modal-header">
          <h2>📋 Manage Cards</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="manage-cards-stats">
          <div className="stat-item">
            <span className="stat-label">Total Cards:</span>
            <span className="stat-value">{flashcards.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active:</span>
            <span className="stat-value" style={{ color: 'var(--success-color)' }}>{activeCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Inactive:</span>
            <span className="stat-value" style={{ color: 'var(--warning-color)' }}>{inactiveCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions" style={{marginBottom: '20px'}}>
          {/* Card Management Actions */}
          <div className="card-management-actions">
            <button 
              className="btn btn-primary"
              onClick={onCreateCard}
              title="Create a new flashcard"
            >
              ➕ New Card
            </button>
            <button 
              className="btn btn-secondary"
              onClick={onImportExport}
              title="Import or export flashcards"
            >
              📁 Import/Export
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="bulk-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Are you sure you want to activate all filtered cards?')) {
                  filteredCards.forEach(card => {
                    if (card.active === false) {
                      onToggleActive(card.id, true);
                    }
                  });
                }
              }}
              disabled={filteredCards.length === 0}
              title="Activate all cards matching current filters"
            >
              ✅ Activate All Filtered
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Are you sure you want to deactivate all filtered cards?')) {
                  filteredCards.forEach(card => {
                    if (card.active !== false) {
                      onToggleActive(card.id, false);
                    }
                  });
                }
              }}
              disabled={filteredCards.length === 0}
              title="Deactivate all cards matching current filters"
            >
              ⏸️ Deactivate All Filtered
            </button>
          </div>

          {/* Close Action */}
          <div className="close-actions">
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="manage-cards-filters">
          <input
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubCategory('All'); // Reset sub-category when category changes
            }}
            className="filter-select"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {subCategories.length > 1 && (
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Sub-Categories</option>
              {subCategories.filter(sub => sub !== 'All').map(subCat => {
                const stats = subCategoryStats[subCat] || { total: 0, due: 0, active: 0 };
                return (
                  <option key={subCat} value={subCat}>
                    {subCat} (Due: {stats.due}, Active: {stats.active}/{stats.total})
                  </option>
                );
              })}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="category">By Category</option>
            <option value="dueDateAsc">Due Date (Earliest First)</option>
            <option value="dueDateDesc">Due Date (Latest First)</option>
          </select>
        </div>

        <div className="manage-cards-content">
          {filteredCards.length === 0 ? (
            <div className="no-cards-message">
              <p>No cards found matching your filters.</p>
            </div>
          ) : (
            <div className="cards-list">
              {filteredCards.map(card => {
                const isActive = card.active !== false;
                const dueDate = card.dueDate ? (card.dueDate.toDate ? card.dueDate.toDate() : new Date(card.dueDate)) : null;
                
                return (
                  <div key={card.id} style={{
                    background: 'white',
                    border: '1px solid #ccc',
                    margin: '8px 0',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{flex: 1}}>
                      <div style={{marginBottom: '8px', fontSize: '14px'}}>
                        <strong style={{color: '#4f46e5'}}>Q:</strong> 
                        <span style={{marginLeft: '8px'}}>{card.question || 'No question'}</span>
                      </div>
                      <div style={{marginBottom: '8px', fontSize: '14px'}}>
                        <strong style={{color: '#4f46e5'}}>A:</strong> 
                        <span style={{marginLeft: '8px'}}>{card.answer || 'No answer'}</span>
                      </div>
                      <div style={{fontSize: '12px', color: '#666'}}>
                        <span>{card.category || 'Uncategorized'}</span>
                        {card.sub_category && <span> / {card.sub_category}</span>}
                        <span> • Reviews: {card.reviewCount || 0}</span>
                        {dueDate && (
                          <span> • Due: {dueDate.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div style={{marginLeft: '12px'}}>
                      <button
                        onClick={() => onToggleActive(card.id, !isActive)}
                        style={{
                          background: isActive ? '#10b981' : '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {isActive ? '✅ Active' : '⏸️ Inactive'}
                      </button>
                    </div>
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