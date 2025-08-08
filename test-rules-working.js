// Test if the new rules are actually working
window.testRulesWorking = async function() {
  console.log('🔍 TESTING IF NEW RULES ARE ACTIVE');
  console.log('==================================');
  
  try {
    // Test 1: Create a brand new document (should work with new rules)
    console.log('1️⃣ Testing CREATE operation...');
    
    const { getFirestore, collection, addDoc } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      alert('❌ Not logged in - please log in first');
      return;
    }
    
    console.log(`   User ID: ${user.uid}`);
    
    // Create a test document with DIFFERENT userId than current user
    const testDoc = {
      question: 'RULES TEST - ' + new Date().toISOString(),
      answer: 'Testing if new rules work',
      userId: 'different-user-id-12345', // Intentionally different
      category: 'Test',
      active: true,
      createdAt: new Date()
    };
    
    try {
      const docRef = await addDoc(collection(db, 'flashcards'), testDoc);
      console.log('   ✅ CREATE successful! Document ID:', docRef.id);
      
      // Test 2: Try to update the document we just created
      console.log('\n2️⃣ Testing UPDATE operation...');
      const { updateDoc, doc } = await import('firebase/firestore');
      
      try {
        await updateDoc(doc(db, 'flashcards', docRef.id), {
          testUpdate: 'Updated by different user - ' + new Date().toISOString()
        });
        
        console.log('   ✅ UPDATE successful!');
        console.log('\n🎉 NEW RULES ARE WORKING!');
        console.log('   You should now be able to update any flashcard');
        
        alert('✅ New rules are working! Try reviewing a card now.');
        
      } catch (updateError) {
        console.log('   ❌ UPDATE failed:', updateError.code, updateError.message);
        if (updateError.code === 'permission-denied') {
          console.log('\n🚨 Rules still not updated or cached');
          alert('❌ Rules still blocking updates. Wait a few minutes and try again.');
        }
      }
      
    } catch (createError) {
      console.log('   ❌ CREATE failed:', createError.code, createError.message);
      if (createError.code === 'permission-denied') {
        console.log('\n🚨 Rules deployment may have failed');
        alert('❌ Rules not working. Check Firebase Console rules again.');
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error);
    alert('❌ Test failed: ' + error.message);
  }
};

window.testRulesWorking();