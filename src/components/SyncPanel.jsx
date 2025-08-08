import React, { useState } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const SyncPanel = ({ firebaseApp, flashcards }) => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [showPanel, setShowPanel] = useState(true);

  const syncToFirestore = async () => {
    setSyncing(true);
    setProgress(0);
    
    const auth = getAuth(firebaseApp);
    const db = getFirestore(firebaseApp);
    const user = auth.currentUser;
    
    if (!user) {
      setResults({ error: 'Not logged in!' });
      setSyncing(false);
      return;
    }

    const results = {
      total: flashcards.length,
      synced: 0,
      errors: 0,
      errorMessages: []
    };

    try {
      for (let i = 0; i < flashcards.length; i++) {
        const card = flashcards[i];
        setProgress(Math.round((i / flashcards.length) * 100));
        
        try {
          // Create new document with current user's ID
          await addDoc(collection(db, 'flashcards'), {
            question: card.question || '',
            answer: card.answer || '',
            category: card.category || 'Uncategorized',
            sub_category: card.sub_category || '',
            difficulty: card.difficulty || 5,
            interval: card.interval || 1,
            repetitions: card.repetitions || 0,
            easeFactor: card.easeFactor || 2.5,
            dueDate: card.dueDate || new Date(),
            lastReviewed: card.lastReviewed || null,
            reviewCount: card.reviewCount || 0,
            starred: card.starred || false,
            active: card.active !== false,
            userId: user.uid,
            createdAt: serverTimestamp(),
            originalId: card.id // Keep reference to old ID
          });
          
          results.synced++;
        } catch (error) {
          results.errors++;
          results.errorMessages.push(`Card ${i + 1}: ${error.message}`);
        }
      }
      
      setProgress(100);
      setResults(results);
    } catch (error) {
      setResults({ error: error.message });
    }
    
    setSyncing(false);
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#ff9800',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        🔄 Sync Cards
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #ff9800',
      borderRadius: '10px',
      padding: '20px',
      width: '350px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>🔄 Sync Local Cards to Firestore</h3>
        <button 
          onClick={() => setShowPanel(false)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      <div style={{ 
        background: '#fff3cd', 
        padding: '15px', 
        borderRadius: '5px', 
        marginBottom: '15px',
        fontSize: '14px'
      }}>
        <strong>⚠️ Issue Detected:</strong><br />
        You have {flashcards.length} local cards that don't exist in Firestore.
        This is why you're getting "card not found" errors.
      </div>

      {!syncing && !results && (
        <>
          <p style={{ fontSize: '14px', marginBottom: '15px' }}>
            Click below to upload all your local cards to Firestore. This will create new cards with proper IDs.
          </p>
          <button
            onClick={syncToFirestore}
            style={{
              width: '100%',
              padding: '12px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            🚀 Start Sync ({flashcards.length} cards)
          </button>
        </>
      )}

      {syncing && (
        <div>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>
            Syncing cards to Firestore...
          </p>
          <div style={{
            background: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '10px'
          }}>
            <div style={{
              background: '#4CAF50',
              height: '20px',
              width: `${progress}%`,
              transition: 'width 0.3s'
            }} />
          </div>
          <p style={{ fontSize: '14px', textAlign: 'center' }}>
            {progress}%
          </p>
        </div>
      )}

      {results && (
        <div>
          {results.error ? (
            <div style={{
              background: '#f8d7da',
              padding: '15px',
              borderRadius: '5px',
              fontSize: '14px'
            }}>
              <strong>❌ Error:</strong><br />
              {results.error}
            </div>
          ) : (
            <div style={{
              background: '#d4edda',
              padding: '15px',
              borderRadius: '5px',
              fontSize: '14px'
            }}>
              <strong>✅ Sync Complete!</strong><br />
              Total: {results.total}<br />
              Synced: {results.synced}<br />
              Errors: {results.errors}
              
              {results.errors > 0 && (
                <details style={{ marginTop: '10px' }}>
                  <summary>View errors</summary>
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {results.errorMessages.join('\n')}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              marginTop: '15px',
              padding: '12px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh App
          </button>
        </div>
      )}
    </div>
  );
};

export default SyncPanel;