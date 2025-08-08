// Comprehensive Firestore debugging script
// Copy and paste this entire script into your browser console

window.debugFirestoreFinal = async function() {
  console.clear();
  console.log('🔍 COMPREHENSIVE FIRESTORE DEBUG');
  console.log('================================');
  
  try {
    // 1. Check authentication
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    console.log('\n1️⃣ AUTHENTICATION CHECK:');
    if (!user) {
      console.log('❌ NO USER LOGGED IN - This is the problem!');
      console.log('💡 Solution: Log in first');
      return;
    }
    
    console.log('✅ User is logged in');
    console.log('   - UID:', user.uid);
    console.log('   - Email:', user.email || '(none)');
    console.log('   - Anonymous:', user.isAnonymous);
    
    // 2. Check Firestore connection
    const { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc } = await import('firebase/firestore');
    const db = getFirestore();
    
    console.log('\n2️⃣ FIRESTORE CONNECTION:');
    console.log('✅ Firestore connected');
    
    // 3. Test creating a NEW document (bypasses userId field issues)
    console.log('\n3️⃣ TEST: Creating NEW test document...');
    try {
      const testCollection = collection(db, 'flashcards');
      const testData = {
        question: 'TEST CARD - ' + new Date().toISOString(),
        answer: 'This is a test',
        userId: user.uid,
        category: 'Test',
        createdAt: new Date(),
        active: true
      };
      
      const newDoc = await addDoc(testCollection, testData);
      console.log('✅ CREATE SUCCESS - Document ID:', newDoc.id);
      
      // Now try to update it
      console.log('\n4️⃣ TEST: Updating the test document...');
      try {
        await updateDoc(doc(db, 'flashcards', newDoc.id), {
          testUpdate: 'Updated at ' + new Date().toISOString()
        });
        console.log('✅ UPDATE SUCCESS');
        console.log('🎉 FIRESTORE IS WORKING CORRECTLY!');
      } catch (updateErr) {
        console.log('❌ UPDATE FAILED:', updateErr.code, updateErr.message);
      }
      
    } catch (createErr) {
      console.log('❌ CREATE FAILED:', createErr.code, createErr.message);
    }
    
    // 4. Test with current card
    console.log('\n5️⃣ TEST: Current card update...');
    const currentCard = window.flashcardHook?.getCurrentCard?.();
    if (currentCard) {
      console.log('Current card ID:', currentCard.id);
      console.log('Current card userId:', currentCard.userId);
      console.log('Does userId match?', currentCard.userId === user.uid);
      
      try {
        const cardRef = doc(db, 'flashcards', currentCard.id);
        const cardDoc = await getDoc(cardRef);
        
        if (!cardDoc.exists()) {
          console.log('❌ Card does not exist in Firestore!');
        } else {
          console.log('✅ Card exists in Firestore');
          const data = cardDoc.data();
          console.log('   - Firestore userId:', data.userId);
          console.log('   - Your userId:', user.uid);
          console.log('   - Match?', data.userId === user.uid);
          
          // Try direct update
          try {
            await updateDoc(cardRef, {
              directTest: 'Direct update test - ' + Date.now()
            });
            console.log('✅ DIRECT UPDATE SUCCESS!');
          } catch (directErr) {
            console.log('❌ DIRECT UPDATE FAILED:', directErr.code);
          }
        }
      } catch (err) {
        console.log('❌ Error accessing card:', err.code, err.message);
      }
    }
    
    // 5. Check the actual rules
    console.log('\n6️⃣ CURRENT RULES CHECK:');
    console.log('Expected rules should allow any authenticated user.');
    console.log('If updates still fail, the rules may not have deployed correctly.');
    console.log('\n📋 SUMMARY:');
    console.log('- Authentication:', user ? 'OK' : 'FAILED');
    console.log('- Firestore connection: OK');
    console.log('- Current user UID:', user?.uid);
    
  } catch (error) {
    console.log('❌ Fatal error:', error);
  }
};

// Run it automatically
window.debugFirestoreFinal();