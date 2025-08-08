import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FirestoreRulesChecker = ({ firebaseApp }) => {
  const [testResults, setTestResults] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [cardCheckResults, setCardCheckResults] = useState(null);

  const runFirestoreTests = useCallback(async () => {
    setIsTesting(true);
    const results = {
      timestamp: new Date().toLocaleString(),
      auth: null,
      firestore: null,
      testCard: null,
      readTest: null,
      writeTest: null,
      errors: [],
      recommendations: []
    };

    try {
      if (!firebaseApp) {
        results.errors.push('Firebase app not available');
        setTestResults(results);
        setIsTesting(false);
        return;
      }

      // Check auth
      const auth = getAuth(firebaseApp);
      const user = auth.currentUser;
      
      results.auth = {
        available: !!auth,
        user: user ? {
          uid: user.uid,
          email: user.email,
          isAnonymous: user.isAnonymous
        } : null
      };

      if (!user) {
        results.errors.push('No authenticated user - cannot test Firestore rules');
        setTestResults(results);
        setIsTesting(false);
        return;
      }

      // Check Firestore
      const db = getFirestore(firebaseApp);
      results.firestore = {
        available: !!db,
        projectId: firebaseApp.options?.projectId,
        appName: firebaseApp.name
      };

      // Try to find a test card from localStorage flashcards
      let testCardId = null;
      const flashcardsData = localStorage.getItem('flashcards');
      if (flashcardsData) {
        try {
          const flashcards = JSON.parse(flashcardsData);
          if (flashcards.length > 0) {
            // Find a card that belongs to current user
            const userCard = flashcards.find(card => card.userId === user.uid);
            if (userCard) {
              testCardId = userCard.id;
              results.testCard = {
                id: testCardId,
                userId: userCard.userId,
                belongsToCurrentUser: true
              };
            } else {
              // Use any card for testing (will likely fail due to userId mismatch)
              testCardId = flashcards[0].id;
              results.testCard = {
                id: testCardId,
                userId: flashcards[0].userId,
                belongsToCurrentUser: false
              };
              results.errors.push(`Test card belongs to different user: ${flashcards[0].userId} vs current ${user.uid}`);
            }
          }
        } catch (parseError) {
          results.errors.push('Failed to parse flashcards from localStorage');
        }
      }

      if (!testCardId) {
        results.errors.push('No flashcards found to test with');
        setTestResults(results);
        setIsTesting(false);
        return;
      }

      // Test READ permission
      try {
        const cardRef = doc(db, 'flashcards', testCardId);
        const cardDoc = await getDoc(cardRef);

        if (cardDoc.exists()) {
          const data = cardDoc.data();
          results.readTest = {
            success: true,
            cardExists: true,
            cardUserId: data.userId,
            currentUserId: user.uid,
            userMatch: data.userId === user.uid,
            cardData: {
              id: data.id,
              question: data.question?.substring(0, 50) + '...',
              hasUserId: 'userId' in data,
              userIdType: typeof data.userId,
              userIdValue: data.userId
            }
          };

          if (!data.userId) {
            results.errors.push('Card has no userId field - this will cause permission denied');
            results.recommendations.push('Cards must have a userId field matching the authenticated user');
          } else if (data.userId !== user.uid) {
            results.errors.push(`Card userId (${data.userId}) doesn't match current user (${user.uid})`);
            results.recommendations.push('This card belongs to a different user - you need cards with your userId');
          }
        } else {
          results.readTest = {
            success: true,
            cardExists: false
          };
          results.errors.push('Test card does not exist in Firestore');
        }
      } catch (readError) {
        results.readTest = {
          success: false,
          error: readError.message,
          code: readError.code
        };
        results.errors.push(`READ failed: ${readError.code} - ${readError.message}`);

        if (readError.code === 'permission-denied') {
          results.recommendations.push('READ permission denied - check if card has correct userId field');
        }
      }

      // Test WRITE permission - now test regardless of userId match since rules are permissive
      if (results.readTest?.success && results.readTest?.cardExists) {
        try {
          const cardRef = doc(db, 'flashcards', testCardId);
          await updateDoc(cardRef, {
            lastTestUpdate: Timestamp.fromDate(new Date()),
            testField: 'rules-test-' + Date.now()
          });

          results.writeTest = {
            success: true,
            message: 'Write permission working correctly'
          };
        } catch (writeError) {
          results.writeTest = {
            success: false,
            error: writeError.message,
            code: writeError.code,
            fullError: writeError
          };
          results.errors.push(`WRITE failed: ${writeError.code} - ${writeError.message}`);

          if (writeError.code === 'permission-denied') {
            results.recommendations.push('Permission denied even with permissive rules - check Firebase project settings');
            results.recommendations.push('Verify you are connected to the correct Firebase project');
            results.recommendations.push('Check if Firestore is enabled in your Firebase project');
          }
        }

        // Also test with exact review data structure
        try {
          const reviewData = {
            easeFactor: 2.5,
            interval: 1,
            repetitions: 1,
            difficulty: 5,
            stability: 2,
            dueDate: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            lastReviewed: Timestamp.fromDate(new Date()),
            reviewCount: 1,
            level: 'good'
          };

          await updateDoc(doc(db, 'flashcards', testCardId), reviewData);

          results.reviewTest = {
            success: true,
            message: 'Review data update successful'
          };
        } catch (reviewError) {
          results.reviewTest = {
            success: false,
            error: reviewError.message,
            code: reviewError.code
          };
          results.errors.push(`REVIEW UPDATE failed: ${reviewError.code} - ${reviewError.message}`);
        }
      } else {
        results.writeTest = {
          success: false,
          skipped: true,
          reason: 'Skipped due to read failure'
        };
      }

    } catch (error) {
      results.errors.push(`Test error: ${error.message}`);
    }

    setTestResults(results);
    setIsTesting(false);
    
    // Auto-show if there are errors
    if (results.errors.length > 0) {
      setIsVisible(true);
    }
  }, [firebaseApp]);

  useEffect(() => {
    if (firebaseApp) {
      runFirestoreTests();
    }
  }, [firebaseApp, runFirestoreTests]);

  const getRecommendedRules = () => {
    return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own flashcards
    match /flashcards/{cardId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Allow users to read/write their own user documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;
  };

  const runEmergencyFix = async () => {
    const confirmed = window.confirm(`🚨 BULK IMPORT ALL CARDS\n\nThis will import all 650+ cards from localStorage to Firestore with your user ID.\n\nThis may take a few minutes. Continue?`);
    if (!confirmed) return;

    setIsTesting(true);

    try {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const user = auth.currentUser;

      if (!user) {
        alert('❌ No authenticated user');
        setIsTesting(false);
        return;
      }

      // Get flashcards from localStorage
      const flashcardsData = localStorage.getItem('flashcards');
      if (!flashcardsData) {
        alert('❌ No flashcards in localStorage');
        setIsTesting(false);
        return;
      }

      const flashcards = JSON.parse(flashcardsData);

      let successCount = 0;
      let errorCount = 0;
      let currentBatch = 0;

      // Import setDoc for creating documents
      const { setDoc } = await import('firebase/firestore');

      // Update test results to show progress
      setTestResults(prev => ({
        ...prev,
        importProgress: {
          total: flashcards.length,
          processed: 0,
          success: 0,
          errors: 0,
          currentBatch: 0,
          totalBatches: Math.ceil(flashcards.length / 10)
        }
      }));

      // Process cards in smaller batches
      const batchSize = 10;
      for (let i = 0; i < flashcards.length; i += batchSize) {
        const batch = flashcards.slice(i, i + batchSize);
        currentBatch = Math.floor(i/batchSize) + 1;

        // Update progress - capture values to avoid loop closure issues
        const processedCount = i;
        const batchNumber = currentBatch;
        setTestResults(prev => ({
          ...prev,
          importProgress: {
            ...prev.importProgress,
            currentBatch: batchNumber,
            processed: processedCount
          }
        }));

        for (const card of batch) {
          try {
            const cardRef = doc(db, 'flashcards', String(card.id));

            // Create a comprehensive card object
            const cleanCard = {
              id: String(card.id),
              userId: user.uid, // Set to current user
              question: String(card.question || ''),
              answer: String(card.answer || ''),
              category: String(card.category || 'Uncategorized'),
              subCategory: String(card.subCategory || 'Uncategorized'),
              difficulty: Number(card.difficulty || 5),
              stability: Number(card.stability || 2.5),
              state: String(card.state || 'new'),
              reviewCount: Number(card.reviewCount || 0),
              interval: Number(card.interval || 1),
              repetitions: Number(card.repetitions || 0),
              easeFactor: Number(card.easeFactor || 2.5),
              level: String(card.level || 'new'),
              createdAt: Timestamp.fromDate(new Date()),
              updatedAt: Timestamp.fromDate(new Date())
            };

            // Add optional timestamp fields if they exist
            if (card.lastReview) {
              cleanCard.lastReview = card.lastReview;
            }
            if (card.dueDate) {
              cleanCard.dueDate = card.dueDate;
            }
            if (card.lastReviewed) {
              cleanCard.lastReviewed = card.lastReviewed;
            }

            // Use setDoc to create or replace the document
            await setDoc(cardRef, cleanCard);
            successCount++;

          } catch (error) {
            errorCount++;
          }
        }

        // Update final progress for this batch - capture values to avoid loop closure issues
        const finalProcessedCount = i + batch.length;
        const currentSuccessCount = successCount;
        const currentErrorCount = errorCount;
        setTestResults(prev => ({
          ...prev,
          importProgress: {
            ...prev.importProgress,
            processed: finalProcessedCount,
            success: currentSuccessCount,
            errors: currentErrorCount
          }
        }));

        // Small delay between batches to avoid overwhelming Firestore
        if (i + batchSize < flashcards.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Final results
      setTestResults(prev => ({
        ...prev,
        importProgress: {
          ...prev.importProgress,
          completed: true,
          finalSuccess: successCount,
          finalErrors: errorCount
        }
      }));

      if (successCount > 0) {
        alert(`✅ IMPORT COMPLETE!\n\n${successCount} cards imported to Firestore.\n${errorCount} errors.\n\nTry reviewing flashcards now!`);
      } else {
        alert(`❌ IMPORT FAILED!\n\nNo cards were imported. ${errorCount} errors occurred.`);
      }

    } catch (error) {
      alert('Import failed: ' + error.message);
    }

    setIsTesting(false);
  };

  const fixCardOwnership = async () => {
    setIsTesting(true);
    try {
      const auth = getAuth(firebaseApp);
      const user = auth.currentUser;
      const db = getFirestore(firebaseApp);

      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log(`🔧 Starting comprehensive card fix for user: ${user.uid}`);

      // Get flashcards from localStorage
      const flashcardsData = localStorage.getItem('flashcards');
      if (!flashcardsData) {
        throw new Error('No flashcards found in localStorage');
      }

      const flashcards = JSON.parse(flashcardsData);
      let fixedCount = 0;
      let errorCount = 0;

      console.log(`🔧 Attempting to fix ${flashcards.length} cards...`);

      for (const card of flashcards) {
        try {
          const cardRef = doc(db, 'flashcards', card.id);

          // First, try to read the current document to see what's wrong
          let currentDoc;
          try {
            currentDoc = await getDoc(cardRef);
            console.log(`📖 Card ${card.id} exists:`, currentDoc.exists());
            if (currentDoc.exists()) {
              const data = currentDoc.data();
              console.log(`📖 Card ${card.id} current userId:`, data.userId, typeof data.userId);
            }
          } catch (readErr) {
            console.log(`📖 Failed to read card ${card.id}:`, readErr.message);
          }

          // Create a clean update object with proper data types
          const updateData = {
            userId: user.uid, // Ensure this is a string
            lastOwnershipUpdate: Timestamp.fromDate(new Date()),
            // Ensure all fields are proper types
            id: String(card.id),
            question: String(card.question || ''),
            answer: String(card.answer || ''),
            category: String(card.category || 'Uncategorized'),
            difficulty: Number(card.difficulty || 5),
            stability: Number(card.stability || 2.5),
            state: String(card.state || 'new'),
            reviewCount: Number(card.reviewCount || 0),
            interval: Number(card.interval || 1),
            repetitions: Number(card.repetitions || 0),
            easeFactor: Number(card.easeFactor || 2.5)
          };

          // Add optional fields only if they exist and are valid
          if (card.lastReview) {
            updateData.lastReview = card.lastReview;
          }
          if (card.dueDate) {
            updateData.dueDate = card.dueDate;
          }
          if (card.subCategory) {
            updateData.subCategory = String(card.subCategory);
          }
          if (card.level) {
            updateData.level = String(card.level);
          }

          await updateDoc(cardRef, updateData);

          fixedCount++;
          console.log(`✅ Fixed card ${card.id}`);

        } catch (error) {
          errorCount++;
          console.log(`❌ Failed to fix card ${card.id}:`, error.code, error.message);

          // Log more details about the error
          if (error.code === 'permission-denied') {
            console.log(`❌ Permission denied for card ${card.id} - even with permissive rules!`);
          }
        }
      }

      console.log(`🎉 Fix complete: ${fixedCount} fixed, ${errorCount} errors`);

      // Update results
      setTestResults(prev => ({
        ...prev,
        fixResults: {
          attempted: flashcards.length,
          fixed: fixedCount,
          errors: errorCount
        }
      }));

      // Re-run tests
      setTimeout(() => {
        runFirestoreTests();
      }, 1000);

    } catch (error) {
      console.error('Fix failed:', error);
      setTestResults(prev => ({
        ...prev,
        errors: [...(prev.errors || []), `Fix failed: ${error.message}`]
      }));
    }
    setIsTesting(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '10px',
      zIndex: 99999,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          background: testResults.errors?.length > 0 ? '#ef4444' : '#8b5cf6',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '5px'
        }}
      >
        🔒 Firestore Rules {testResults.errors?.length > 0 && `(${testResults.errors.length} issues)`}
      </button>

      {/* Test Panel */}
      {isVisible && (
        <div style={{
          background: 'white',
          border: '2px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
          maxWidth: '500px',
          maxHeight: '600px',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Firestore Rules Test</h3>
            <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ marginBottom: '10px', fontSize: '10px', color: '#666' }}>
            Last tested: {testResults.timestamp}
          </div>

          {/* Errors */}
          {testResults.errors && testResults.errors.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 5px 0' }}>❌ Issues ({testResults.errors.length})</h4>
              {testResults.errors.map((error, index) => (
                <div key={index} style={{ background: '#fef2f2', padding: '5px', margin: '2px 0', borderRadius: '3px', color: '#dc2626', fontSize: '11px' }}>
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {testResults.recommendations && testResults.recommendations.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 5px 0' }}>💡 Recommendations</h4>
              {testResults.recommendations.map((rec, index) => (
                <div key={index} style={{ background: '#fffbeb', padding: '5px', margin: '2px 0', borderRadius: '3px', color: '#d97706', fontSize: '11px' }}>
                  {rec}
                </div>
              ))}
            </div>
          )}

          {/* Import Progress */}
          {testResults.importProgress && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 5px 0' }}>📥 Import Progress</h4>
              <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                {testResults.importProgress.completed ? (
                  <div>
                    <div style={{ color: '#059669', fontWeight: 'bold' }}>✅ Import Complete!</div>
                    <div>Success: {testResults.importProgress.finalSuccess}</div>
                    <div>Errors: {testResults.importProgress.finalErrors}</div>
                    <div>Total: {testResults.importProgress.total}</div>
                  </div>
                ) : (
                  <div>
                    <div>Batch {testResults.importProgress.currentBatch} of {testResults.importProgress.totalBatches}</div>
                    <div>Processed: {testResults.importProgress.processed} / {testResults.importProgress.total}</div>
                    <div>Success: {testResults.importProgress.success}</div>
                    <div>Errors: {testResults.importProgress.errors}</div>
                    <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', marginTop: '5px' }}>
                      <div
                        style={{
                          background: '#f59e0b',
                          height: '100%',
                          borderRadius: '4px',
                          width: `${(testResults.importProgress.processed / testResults.importProgress.total) * 100}%`,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Results */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>🧪 Test Results</h4>
            
            {testResults.readTest && (
              <div style={{ marginBottom: '8px' }}>
                <strong>READ Test:</strong> {testResults.readTest.success ? '✅' : '❌'}
                {testResults.readTest.userMatch !== undefined && (
                  <span style={{ color: testResults.readTest.userMatch ? '#10b981' : '#ef4444' }}>
                    {' '}(User match: {testResults.readTest.userMatch ? 'Yes' : 'No'})
                  </span>
                )}
              </div>
            )}
            
            {testResults.writeTest && (
              <div style={{ marginBottom: '8px' }}>
                <strong>WRITE Test:</strong> {testResults.writeTest.success ? '✅' : '❌'}
                {testResults.writeTest.skipped && <span style={{ color: '#9ca3af' }}> (Skipped)</span>}
              </div>
            )}
          </div>

          {/* Card Check Results */}
          {cardCheckResults && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#8b5cf6', margin: '0 0 5px 0' }}>🔍 Card Check Results</h4>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                <div><strong>Card ID:</strong> {cardCheckResults.cardId}</div>
                <div><strong>Checked:</strong> {cardCheckResults.timestamp}</div>

                <div style={{ marginTop: '8px' }}>
                  <strong>📱 LocalStorage:</strong> {cardCheckResults.localStorage?.found ? '✅ Found' : '❌ Not Found'}
                  {cardCheckResults.localStorage?.found && (
                    <div style={{ marginLeft: '10px', fontSize: '10px', color: '#666' }}>
                      Question: {cardCheckResults.localStorage.question}<br/>
                      ID Type: {cardCheckResults.localStorage.idType}<br/>
                      ID Value: {cardCheckResults.localStorage.idValue}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <strong>🔥 Firestore:</strong> {cardCheckResults.firestore?.found ? '✅ Found' : '❌ Not Found'}
                  {cardCheckResults.firestore?.found && (
                    <div style={{ marginLeft: '10px', fontSize: '10px', color: '#666' }}>
                      Question: {cardCheckResults.firestore.question}<br/>
                      User ID: {cardCheckResults.firestore.userId}<br/>
                      Current User: {cardCheckResults.firestore.currentUser}<br/>
                      Match: {cardCheckResults.firestore.userMatch ? '✅' : '❌'}
                    </div>
                  )}
                </div>

                {cardCheckResults.action && (
                  <div style={{ marginTop: '8px', background: cardCheckResults.success ? '#f0f9ff' : '#fef2f2', padding: '5px', borderRadius: '3px' }}>
                    <strong>Action:</strong> {cardCheckResults.action}
                  </div>
                )}

                {cardCheckResults.error && (
                  <div style={{ marginTop: '8px', background: '#fef2f2', padding: '5px', borderRadius: '3px', color: '#dc2626' }}>
                    <strong>Error:</strong> {cardCheckResults.error}
                  </div>
                )}

                <div style={{ marginTop: '8px' }}>
                  <strong>Result:</strong> {cardCheckResults.success ? '✅ Success' : '❌ Failed'}
                </div>
              </div>

              <button
                onClick={() => setCardCheckResults(null)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  marginTop: '5px'
                }}
              >
                Clear Results
              </button>
            </div>
          )}

          {/* Recommended Rules */}
          {testResults.errors?.some(e => e.includes('permission-denied') || e.includes('WRITE failed')) && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#3b82f6', margin: '0 0 5px 0' }}>📋 Recommended Firestore Rules</h4>
              <textarea
                readOnly
                value={getRecommendedRules()}
                style={{
                  width: '100%',
                  height: '200px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '8px'
                }}
              />
              <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                Copy this to your Firebase Console → Firestore → Rules
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setIsTesting(false); // Reset testing state first
                runFirestoreTests();
              }}
              disabled={isTesting}
              style={{
                background: isTesting ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: isTesting ? 'not-allowed' : 'pointer',
                fontSize: '11px'
              }}
            >
              {isTesting ? '⏳ Testing...' : '🔄 Re-test'}
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(getRecommendedRules());
                alert('Firestore rules copied to clipboard!');
              }}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              📋 Copy Rules
            </button>

            {/* Always show Emergency Fix button */}
            <button
              onClick={runEmergencyFix}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🚨 Import All Cards
            </button>

            {/* Check specific card button */}
            <button
              onClick={async () => {
                const cardId = prompt('Enter the card ID that failed (e.g., WL2tVUL6jMOxM6XQy9xN):');
                if (!cardId) return;

                const results = {
                  cardId,
                  timestamp: new Date().toLocaleString(),
                  localStorage: null,
                  firestore: null,
                  action: null,
                  success: false,
                  error: null
                };

                try {
                  const auth = getAuth(firebaseApp);
                  const db = getFirestore(firebaseApp);
                  const user = auth.currentUser;

                  if (!user) {
                    results.error = 'No authenticated user';
                    setCardCheckResults(results);
                    return;
                  }

                  // Check if card exists in localStorage
                  const flashcardsData = localStorage.getItem('flashcards');
                  if (flashcardsData) {
                    const flashcards = JSON.parse(flashcardsData);
                    const localCard = flashcards.find(c => c.id === cardId);
                    results.localStorage = {
                      found: !!localCard,
                      question: localCard?.question?.substring(0, 50) + '...' || 'N/A',
                      idType: typeof localCard?.id,
                      idValue: localCard?.id
                    };
                  } else {
                    results.localStorage = { found: false, reason: 'No flashcards in localStorage' };
                  }

                  // Check if card exists in Firestore
                  const cardRef = doc(db, 'flashcards', cardId);
                  const cardDoc = await getDoc(cardRef);

                  if (cardDoc.exists()) {
                    const data = cardDoc.data();
                    results.firestore = {
                      found: true,
                      question: data.question?.substring(0, 50) + '...' || 'N/A',
                      userId: data.userId,
                      currentUser: user.uid,
                      userMatch: data.userId === user.uid
                    };
                    results.success = true;
                  } else {
                    results.firestore = { found: false };

                    // Try to create it if it exists in localStorage
                    if (results.localStorage?.found) {
                      const flashcards = JSON.parse(flashcardsData);
                      const localCard = flashcards.find(c => c.id === cardId);

                      const { setDoc, Timestamp } = await import('firebase/firestore');

                      const cleanCard = {
                        id: String(localCard.id),
                        userId: user.uid,
                        question: String(localCard.question || ''),
                        answer: String(localCard.answer || ''),
                        category: String(localCard.category || 'Uncategorized'),
                        subCategory: String(localCard.subCategory || 'Uncategorized'),
                        difficulty: Number(localCard.difficulty || 5),
                        stability: Number(localCard.stability || 2.5),
                        state: String(localCard.state || 'new'),
                        reviewCount: Number(localCard.reviewCount || 0),
                        interval: Number(localCard.interval || 1),
                        repetitions: Number(localCard.repetitions || 0),
                        easeFactor: Number(localCard.easeFactor || 2.5),
                        level: String(localCard.level || 'new'),
                        createdAt: Timestamp.fromDate(new Date()),
                        updatedAt: Timestamp.fromDate(new Date())
                      };

                      await setDoc(cardRef, cleanCard);
                      results.action = 'Created missing card in Firestore';
                      results.success = true;
                    } else {
                      results.action = 'Card not found in localStorage - cannot create';
                    }
                  }

                } catch (error) {
                  results.error = error.message;
                }

                setCardCheckResults(results);
              }}
              style={{
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🔍 Check Card
            </button>

            {/* Always show fix button if there are any errors */}
            {testResults.errors && testResults.errors.length > 0 && (
              <button
                onClick={fixCardOwnership}
                disabled={isTesting}
                style={{
                  background: isTesting ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: isTesting ? 'not-allowed' : 'pointer',
                  fontSize: '11px'
                }}
              >
                {isTesting ? '⏳ Fixing...' : '🔧 Fix Card Ownership'}
              </button>
            )}

            {/* Emergency fix button - always visible */}
            <button
              onClick={fixCardOwnership}
              disabled={isTesting}
              style={{
                background: isTesting ? '#9ca3af' : '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: isTesting ? 'not-allowed' : 'pointer',
                fontSize: '11px'
              }}
            >
              {isTesting ? '⏳ Fixing...' : '🚨 Emergency Fix'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirestoreRulesChecker;
