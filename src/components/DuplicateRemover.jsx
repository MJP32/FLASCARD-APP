import React, { useState } from 'react';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const DuplicateRemover = ({ firebaseApp }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [scanResults, setScanResults] = useState(null);
  const [deleteResults, setDeleteResults] = useState(null);

  const scanForDuplicates = async () => {
    setScanning(true);
    setDuplicates([]);
    setScanResults(null);
    setDeleteResults(null);

    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const user = auth.currentUser;

      if (!user) {
        setScanResults({ error: 'Not logged in!' });
        setScanning(false);
        return;
      }

      // Get all cards from Firestore
      const querySnapshot = await getDocs(collection(db, 'flashcards'));
      const cards = [];
      
      querySnapshot.forEach((doc) => {
        cards.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Group cards by question+answer combination
      const cardGroups = {};
      
      cards.forEach(card => {
        // Skip cards with missing essential data
        if (!card.id) {
          console.warn('Skipping card with missing ID:', card);
          return;
        }
        
        // Create a key from question and answer
        const question = (card.question || '').trim();
        const answer = (card.answer || '').trim();
        
        // Skip cards with empty question and answer
        if (!question && !answer) {
          console.warn('Skipping card with empty question and answer:', card.id);
          return;
        }
        
        const key = `${question}|||${answer}`;
        
        if (!cardGroups[key]) {
          cardGroups[key] = [];
        }
        cardGroups[key].push(card);
      });

      // Find duplicates
      const duplicateGroups = [];
      let totalDuplicates = 0;

      Object.entries(cardGroups).forEach(([key, group]) => {
        if (group.length > 1) {
          try {
            // Sort by various criteria to keep the best version
            group.sort((a, b) => {
              // Ensure both cards have required fields
              if (!a || !b) return 0;
              
              // Prefer cards with current user's ID
              const aUserId = a.userId || '';
              const bUserId = b.userId || '';
              if (aUserId === user.uid && bUserId !== user.uid) return -1;
              if (bUserId === user.uid && aUserId !== user.uid) return 1;
              
              // Prefer cards with more reviews
              const aReviews = Number(a.reviewCount) || 0;
              const bReviews = Number(b.reviewCount) || 0;
              if (aReviews !== bReviews) return bReviews - aReviews;
              
              // Prefer cards with lastReviewed date
              if (a.lastReviewed && !b.lastReviewed) return -1;
              if (!a.lastReviewed && b.lastReviewed) return 1;
              
              // Prefer older cards (lower ID usually means older)
              const aId = String(a.id || '');
              const bId = String(b.id || '');
              return aId.localeCompare(bId);
            });

            duplicateGroups.push({
              key,
              cards: group,
              keep: group[0], // First one after sorting is the best
              remove: group.slice(1) // Rest are duplicates
            });

            totalDuplicates += group.length - 1;
          } catch (sortError) {
            console.warn('Error sorting duplicate group:', sortError, group);
            // Still add the group but without sorting
            duplicateGroups.push({
              key,
              cards: group,
              keep: group[0],
              remove: group.slice(1)
            });
            totalDuplicates += group.length - 1;
          }
        }
      });

      setDuplicates(duplicateGroups);
      setScanResults({
        totalCards: cards.length,
        uniqueCards: Object.keys(cardGroups).length,
        duplicateGroups: duplicateGroups.length,
        totalDuplicates
      });

    } catch (error) {
      setScanResults({ error: error.message });
    }

    setScanning(false);
  };

  const deleteDuplicates = async () => {
    if (!window.confirm(`Are you sure you want to delete ${scanResults.totalDuplicates} duplicate cards?`)) {
      return;
    }

    setDeleting(true);
    setDeleteResults(null);

    const results = {
      attempted: 0,
      deleted: 0,
      errors: []
    };

    try {
      const db = getFirestore(firebaseApp);

      for (const group of duplicates) {
        for (const card of group.remove) {
          results.attempted++;
          
          try {
            await deleteDoc(doc(db, 'flashcards', card.id));
            results.deleted++;
          } catch (error) {
            results.errors.push({
              cardId: card.id,
              error: error.message
            });
          }
        }
      }

      setDeleteResults(results);
      
      // Clear duplicates after deletion
      if (results.deleted > 0) {
        setTimeout(() => {
          scanForDuplicates(); // Re-scan to verify
        }, 1000);
      }

    } catch (error) {
      setDeleteResults({ error: error.message });
    }

    setDeleting(false);
  };

  const toggleDuplicateSelection = (groupIndex, cardIndex) => {
    const newDuplicates = [...duplicates];
    const group = newDuplicates[groupIndex];
    const cards = group.cards;
    
    // Swap the keep/remove selection
    const newKeep = cards[cardIndex];
    
    group.keep = newKeep;
    group.remove = cards.filter(c => c.id !== newKeep.id);
    
    setDuplicates(newDuplicates);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '140px',
          right: '20px',
          background: '#9c27b0',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 99999,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        🧹 Duplicate Remover
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '20px',
      background: 'white',
      border: '2px solid #9c27b0',
      borderRadius: '10px',
      padding: '20px',
      width: '500px',
      maxHeight: '70vh',
      overflowY: 'auto',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 99999
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>🧹 Duplicate Card Remover</h3>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      {!scanning && !scanResults && (
        <>
          <p style={{ fontSize: '14px', marginBottom: '15px' }}>
            This tool will scan your Firestore flashcards for duplicates based on question and answer content.
          </p>
          <button
            onClick={scanForDuplicates}
            style={{
              width: '100%',
              padding: '12px',
              background: '#673ab7',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            🔍 Scan for Duplicates
          </button>
        </>
      )}

      {scanning && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <p>Scanning for duplicate cards...</p>
        </div>
      )}

      {scanResults && !scanResults.error && (
        <div>
          <div style={{
            background: scanResults.totalDuplicates > 0 ? '#fff3cd' : '#d4edda',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            <strong>📊 Scan Results:</strong><br />
            Total cards: {scanResults.totalCards}<br />
            Unique cards: {scanResults.uniqueCards}<br />
            Duplicate groups: {scanResults.duplicateGroups}<br />
            <strong>Total duplicates to remove: {scanResults.totalDuplicates}</strong>
          </div>

          {duplicates.length > 0 && (
            <>
              <div style={{ marginBottom: '15px' }}>
                <h4>Duplicate Groups (click to change which to keep):</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {duplicates.map((group, groupIndex) => (
                    <div key={groupIndex} style={{
                      background: '#f8f9fa',
                      padding: '10px',
                      marginBottom: '10px',
                      borderRadius: '5px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ fontSize: '12px', marginBottom: '5px', color: '#6c757d' }}>
                        Group {groupIndex + 1} - {group.cards.length} copies
                      </div>
                      {group.cards.map((card, cardIndex) => (
                        <div 
                          key={card.id}
                          onClick={() => toggleDuplicateSelection(groupIndex, cardIndex)}
                          style={{
                            padding: '8px',
                            marginBottom: '5px',
                            background: card.id === group.keep.id ? '#d4edda' : '#f8d7da',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '10px' }}>
                              {card.id === group.keep.id ? '✅ KEEP' : '❌ DELETE'}
                            </span>
                            <span style={{ flex: 1 }}>
                              ID: {card.id.substring(0, 8)}...
                            </span>
                          </div>
                          <div style={{ marginTop: '5px', color: '#666' }}>
                            User: {card.userId || 'none'} | 
                            Reviews: {card.reviewCount || 0} | 
                            Last: {card.lastReviewed ? 'Yes' : 'No'}
                          </div>
                          <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
                            Q: {card.question?.substring(0, 50)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={deleteDuplicates}
                disabled={deleting}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: deleting ? '#6c757d' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  cursor: deleting ? 'not-allowed' : 'pointer'
                }}
              >
                {deleting ? '⏳ Deleting...' : `🗑️ Delete ${scanResults.totalDuplicates} Duplicates`}
              </button>
            </>
          )}

          {scanResults.totalDuplicates === 0 && (
            <p style={{ textAlign: 'center', color: '#28a745', marginTop: '20px' }}>
              ✅ No duplicate cards found!
            </p>
          )}
        </div>
      )}

      {deleteResults && (
        <div style={{
          background: deleteResults.error ? '#f8d7da' : '#d4edda',
          padding: '15px',
          borderRadius: '5px',
          marginTop: '15px',
          fontSize: '14px'
        }}>
          {deleteResults.error ? (
            <>
              <strong>❌ Error:</strong><br />
              {deleteResults.error}
            </>
          ) : (
            <>
              <strong>✅ Deletion Complete!</strong><br />
              Attempted: {deleteResults.attempted}<br />
              Deleted: {deleteResults.deleted}<br />
              Errors: {deleteResults.errors.length}
              
              {deleteResults.errors.length > 0 && (
                <details style={{ marginTop: '10px' }}>
                  <summary>View errors</summary>
                  <pre style={{ fontSize: '11px', overflow: 'auto' }}>
                    {JSON.stringify(deleteResults.errors, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {scanResults?.error && (
        <div style={{
          background: '#f8d7da',
          padding: '15px',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>❌ Error:</strong><br />
          {scanResults.error}
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#6c757d' }}>
        <strong>How it works:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Cards with identical questions and answers are considered duplicates</li>
          <li>The tool keeps the card with: your user ID, most reviews, or oldest ID</li>
          <li>Click on cards to change which one to keep</li>
        </ul>
      </div>
    </div>
  );
};

export default DuplicateRemover;