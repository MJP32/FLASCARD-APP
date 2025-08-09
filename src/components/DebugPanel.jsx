import React, { useState, useEffect } from 'react';
import { getFirestore, collection, doc, getDoc, getDocs, query, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const DebugPanel = ({ firebaseApp, flashcards, currentCard }) => {
  const [debugInfo, setDebugInfo] = useState({
    currentUser: null,
    currentCardLocal: null,
    currentCardFirestore: null,
    firestoreCards: [],
    localCardsCount: 0,
    firestoreCardsCount: 0,
    error: null
  });
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const auth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);
        const user = auth.currentUser;

        const info = {
          currentUser: user ? { uid: user.uid, email: user.email } : null,
          auth: user ? {
            isAuthenticated: true,
            isAnonymous: user.isAnonymous,
            uid: user.uid,
            email: user.email
          } : { isAuthenticated: false, isAnonymous: false },
          currentCardLocal: currentCard,
          localCardsCount: flashcards?.length || 0,
          flashcards: {
            local: flashcards?.length || 0,
            firestore: 0 // Will be updated below
          },
          error: null
        };

        // Check if current card exists in Firestore
        if (currentCard?.id) {
          try {
            const cardDoc = await getDoc(doc(db, 'flashcards', currentCard.id));
            info.currentCardFirestore = cardDoc.exists() ? { id: cardDoc.id, ...cardDoc.data() } : null;
          } catch (error) {
            info.currentCardFirestore = { error: error.message };
          }
        }

        // Get some cards from Firestore
        try {
          const q = query(collection(db, 'flashcards'), limit(5));
          const querySnapshot = await getDocs(q);
          info.firestoreCards = [];
          info.firestoreCardsCount = querySnapshot.size;
          info.flashcards.firestore = querySnapshot.size;
          
          querySnapshot.forEach((doc) => {
            info.firestoreCards.push({
              id: doc.id,
              question: doc.data().question?.substring(0, 50) + '...',
              userId: doc.data().userId
            });
          });
        } catch (error) {
          info.error = error.message;
        }

        setDebugInfo(info);
      } catch (error) {
        setDebugInfo(prev => ({ ...prev, error: error.message }));
      }
    };

    if (firebaseApp) {
      fetchDebugInfo();
    }
  }, [firebaseApp, currentCard, flashcards]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#ff6b6b',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 9999
        }}
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #ff6b6b',
      borderRadius: '10px',
      padding: '20px',
      maxWidth: '400px',
      maxHeight: '80vh',
      overflowY: 'auto',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>🐛 Debug Panel</h3>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: '14px' }}>
        <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
          <strong>👤 Current User:</strong><br />
          {debugInfo.auth?.isAuthenticated ? (
            <>
              UID: {debugInfo.auth.uid}<br />
              Email: {debugInfo.auth.email || 'Anonymous'}<br />
              <span style={{
                color: debugInfo.auth.isAnonymous ? '#f59e0b' : '#10b981',
                fontWeight: 'bold'
              }}>
                {debugInfo.auth.isAnonymous ? '🔓 Anonymous User' : '🔐 Registered User'}
              </span>
            </>
          ) : 'Not logged in'}
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
          <strong>📋 Current Card (Local):</strong><br />
          {debugInfo.currentCardLocal ? (
            <>
              ID: {debugInfo.currentCardLocal.id}<br />
              Question: {debugInfo.currentCardLocal.question?.substring(0, 30)}...
            </>
          ) : 'No card selected'}
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', background: debugInfo.currentCardFirestore ? '#d4edda' : '#f8d7da', borderRadius: '5px' }}>
          <strong>🔥 Current Card (Firestore):</strong><br />
          {debugInfo.currentCardFirestore ? (
            debugInfo.currentCardFirestore.error ? (
              `Error: ${debugInfo.currentCardFirestore.error}`
            ) : (
              <>
                ✅ EXISTS in Firestore<br />
                ID: {debugInfo.currentCardFirestore.id}<br />
                UserId: {debugInfo.currentCardFirestore.userId}
              </>
            )
          ) : '❌ NOT FOUND in Firestore'}
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', background: '#e7f5ff', borderRadius: '5px' }}>
          <strong>📊 Card Counts:</strong><br />
          Local cards: {debugInfo.localCardsCount}<br />
          Firestore cards: {debugInfo.firestoreCardsCount}+
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
          <strong>🗂️ Sample Firestore Cards:</strong><br />
          {debugInfo.firestoreCards.map(card => (
            <div key={card.id} style={{ marginTop: '5px', fontSize: '12px' }}>
              ID: {card.id}<br />
              Q: {card.question}<br />
              User: {card.userId || 'undefined'}
              <hr style={{ margin: '5px 0' }} />
            </div>
          ))}
        </div>

        {debugInfo.error && (
          <div style={{ padding: '10px', background: '#f8d7da', borderRadius: '5px', color: '#721c24' }}>
            <strong>❌ Error:</strong><br />
            {debugInfo.error}
          </div>
        )}

        {/* Force create default card button for users with no cards */}
        {debugInfo.flashcards?.local === 0 && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
            <div style={{ marginBottom: '5px', fontSize: '12px', color: '#856404' }}>
              <strong>🎯 No cards found - Create demo card</strong>
            </div>
            <div style={{ marginBottom: '8px', fontSize: '11px', color: '#856404' }}>
              Anonymous: {debugInfo.auth?.isAnonymous ? 'Yes' : 'No'}<br/>
              Has addLocalFlashcard: {!!window.addLocalFlashcard ? 'Yes' : 'No'}<br/>
              Has createAnonymousDefaultCard: {!!window.createAnonymousDefaultCard ? 'Yes' : 'No'}
            </div>
            <button
              onClick={async () => {
                try {
                  console.log('🎯 Manual demo card creation started');

                  const demoCard = {
                    id: 'demo-manual-' + Date.now(),
                    question: 'What is 2 + 2?',
                    answer: '4',
                    category: 'Math',
                    subCategory: 'Addition',
                    sub_category: 'Addition',
                    active: true,
                    createdAt: new Date(),
                    lastReviewedAt: null,
                    nextReviewAt: new Date(),
                    dueDate: new Date(),
                    difficulty: 5,
                    easeFactor: 2.5,
                    interval: 1,
                    reviewCount: 0,
                    level: 'new',
                    isDemo: true,
                    tags: ['demo', 'sample']
                  };

                  // Direct localStorage method (most reliable)
                  console.log('📱 Using direct localStorage method');
                  const existingCards = JSON.parse(localStorage.getItem('anonymous_flashcards') || '[]');

                  // Remove any existing demo cards first
                  const filteredCards = existingCards.filter(card => card.question !== 'What is 2 + 2?');
                  filteredCards.push(demoCard);

                  localStorage.setItem('anonymous_flashcards', JSON.stringify(filteredCards));
                  console.log('✅ Demo card saved to localStorage');

                  // Force reload to ensure card appears
                  alert('✅ Demo card created! The page will reload to show the card.');
                  window.location.reload();

                } catch (error) {
                  console.error('❌ Failed to create demo card:', error);
                  alert('❌ Failed to create default card: ' + error.message);
                }
              }}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🎯 Create Demo Card Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;