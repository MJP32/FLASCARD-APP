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
          currentCardLocal: currentCard,
          localCardsCount: flashcards?.length || 0,
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
          {debugInfo.currentUser ? (
            <>
              UID: {debugInfo.currentUser.uid}<br />
              Email: {debugInfo.currentUser.email || 'Anonymous'}
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
      </div>
    </div>
  );
};

export default DebugPanel;