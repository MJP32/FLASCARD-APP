// Debug script that uses alerts instead of console
window.debugFirestoreAlert = async function() {
  let results = [];
  
  try {
    // 1. Check authentication
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      alert('❌ NO USER LOGGED IN - You need to log in first!');
      return;
    }
    
    results.push('✅ User logged in');
    results.push('UID: ' + user.uid);
    results.push('Anonymous: ' + user.isAnonymous);
    
    // 2. Test Firestore
    const { getFirestore, doc, updateDoc, collection, addDoc } = await import('firebase/firestore');
    const db = getFirestore();
    
    // 3. Test creating NEW document
    try {
      const testData = {
        question: 'TEST-' + Date.now(),
        answer: 'Test',
        userId: user.uid,
        category: 'Test',
        active: true
      };
      
      const newDoc = await addDoc(collection(db, 'flashcards'), testData);
      results.push('✅ CREATE TEST: SUCCESS');
      
      // Try updating it
      await updateDoc(doc(db, 'flashcards', newDoc.id), {
        updated: Date.now()
      });
      results.push('✅ UPDATE TEST: SUCCESS');
      
    } catch (err) {
      results.push('❌ FIRESTORE TEST FAILED: ' + err.code);
    }
    
    // 4. Test current card
    const currentCard = window.flashcardHook?.getCurrentCard?.();
    if (currentCard) {
      results.push('Current card ID: ' + currentCard.id);
      results.push('Card userId: ' + currentCard.userId);
      results.push('Your userId: ' + user.uid);
      results.push('Match: ' + (currentCard.userId === user.uid));
      
      try {
        await updateDoc(doc(db, 'flashcards', currentCard.id), {
          test: Date.now()
        });
        results.push('✅ CURRENT CARD UPDATE: SUCCESS');
      } catch (err) {
        results.push('❌ CURRENT CARD UPDATE: ' + err.code);
      }
    }
    
    alert(results.join('\n'));
    
  } catch (error) {
    alert('Fatal error: ' + error.message);
  }
};

// Run it
window.debugFirestoreAlert();