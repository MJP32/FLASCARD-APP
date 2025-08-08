// Fix all cards to have current user's ID
window.fixCardOwnership = async function() {
  console.log('🔧 FIXING CARD OWNERSHIP');
  console.log('========================');
  
  try {
    const { getAuth } = await import('firebase/auth');
    const { getFirestore, collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      alert('❌ Please log in first');
      return;
    }
    
    console.log('Current user ID:', currentUser.uid);
    
    const db = getFirestore();
    const flashcardsRef = collection(db, 'flashcards');
    const snapshot = await getDocs(flashcardsRef);
    
    console.log(`Found ${snapshot.size} flashcards to check`);
    
    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const cardId = docSnapshot.id;
      
      if (data.userId !== currentUser.uid) {
        console.log(`Fixing card ${cardId}: ${data.userId} → ${currentUser.uid}`);
        try {
          await updateDoc(doc(db, 'flashcards', cardId), {
            userId: currentUser.uid
          });
          fixed++;
        } catch (error) {
          console.log(`Error fixing ${cardId}:`, error.message);
          errors++;
        }
      } else {
        alreadyCorrect++;
      }
    }
    
    const summary = `
OWNERSHIP FIX COMPLETE:
- Fixed: ${fixed} cards
- Already correct: ${alreadyCorrect} cards  
- Errors: ${errors} cards
- Total: ${snapshot.size} cards

${fixed > 0 ? '✅ Cards should now be updatable!' : 'ℹ️ All cards already had correct ownership'}
    `;
    
    console.log(summary);
    alert(summary);
    
  } catch (error) {
    const errorMsg = `❌ Failed to fix ownership: ${error.message}`;
    console.log(errorMsg);
    alert(errorMsg);
  }
};

// Ask for confirmation before running
if (confirm('This will update ALL flashcards to be owned by your current user. Continue?')) {
  window.fixCardOwnership();
} else {
  console.log('Operation cancelled');
}