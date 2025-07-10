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
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'alphabetical', 'category'

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
      <div className="modal-content manage-cards-modal">
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
                return (
                  <div key={card.id} className={`card-item ${!isActive ? 'inactive' : ''}`}>
                    <div className="card-info">
                      <div className="card-content">
                        <div className="card-question">
                          <strong>Q:</strong> <span dangerouslySetInnerHTML={{ __html: card.question }} />
                        </div>
                        <div className="card-answer">
                          <strong>A:</strong> <span dangerouslySetInnerHTML={{ __html: card.answer }} />
                        </div>
                      </div>
                      <div className="card-meta">
                        <span className="card-category">
                          {card.category || 'Uncategorized'}
                        </span>
                        {card.sub_category && (
                          <span className="card-subcategory">
                            / {card.sub_category}
                          </span>
                        )}
                        <span className="card-separator">•</span>
                        <span className="card-stats">
                          Reviews: {card.reviewCount || 0}
                        </span>
                        {card.dueDate && (
                          <>
                            <span className="card-separator">•</span>
                            <span className="card-due">
                              Due: {new Date(card.dueDate.toDate ? card.dueDate.toDate() : card.dueDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        className={`toggle-btn ${isActive ? 'active' : 'inactive'}`}
                        onClick={() => onToggleActive(card.id, !isActive)}
                        title={isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {isActive ? '✅' : '⏸️'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-actions">
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
      </div>
    </div>
  );
};

export default ManageCardsModal;