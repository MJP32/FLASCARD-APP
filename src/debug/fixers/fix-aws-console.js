// Browser Console Script to Fix AWS Cards
// Copy and paste this entire script into your browser console while your app is running

console.log('🔧 AWS CARDS FIX SCRIPT LOADING...');

// Firebase imports (assuming they're available globally)
const { db } = window; // Get Firebase db from global scope
const { collection, getDocs, updateDoc, doc, query, where } = window; // Get Firestore functions

async function fixAWSCardsConsole() {
  console.log('🚀 Starting AWS cards fix...');
  
  try {
    // Get userId from the app
    let userId = null;
    
    // Try multiple ways to get userId
    if (window.userId) {
      userId = window.userId;
    } else if (localStorage.getItem('userId')) {
      userId = localStorage.getItem('userId');
    } else {
      // Try to get from React component state (more complex)
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement._reactInternals) {
        console.log('⚛️ Attempting to get userId from React state...');
        // This is a simplified attempt - actual React state inspection is complex
      }
    }
    
    if (!userId) {
      console.error('❌ User ID not found. Make sure you are logged in.');
      console.log('💡 Try running: localStorage.getItem("userId") to check if userId is stored');
      return;
    }
    
    console.log('👤 Found userId:', userId);
    
    // Get all flashcards for the user
    const flashcardsRef = collection(db, 'flashcards');
    const userCardsQuery = query(flashcardsRef, where('userId', '==', userId));
    const snapshot = await getDocs(userCardsQuery);
    
    let totalCards = 0;
    let awsCards = 0;
    let fixedCards = 0;
    let alreadyActiveCards = 0;
    
    const updatePromises = [];
    
    console.log('📋 Scanning flashcards...');
    
    snapshot.forEach((docSnapshot) => {
      const card = docSnapshot.data();
      totalCards++;
      
      // Check if this is an AWS card (case insensitive)
      const category = (card.category || '').toLowerCase();
      if (category === 'aws') {
        awsCards++;
        
        console.log(`🔍 Found AWS card: "${card.question?.substring(0, 50)}..." - Active: ${card.active}`);
        
        // Check if the card needs fixing
        if (card.active === false) {
          console.log(`📝 Fixing AWS card: ${card.question?.substring(0, 50)}...`);
          
          // Create update promise
          const cardRef = doc(db, 'flashcards', docSnapshot.id);
          updatePromises.push(
            updateDoc(cardRef, { active: true })
              .then(() => {
                fixedCards++;
                console.log(`✅ Fixed card: ${docSnapshot.id}`);
              })
              .catch((error) => {
                console.error(`❌ Failed to fix card ${docSnapshot.id}:`, error);
              })
          );
        } else {
          alreadyActiveCards++;
          console.log(`✅ AWS card already active: ${card.question?.substring(0, 50)}...`);
        }
      }
    });
    
    // Wait for all updates to complete
    if (updatePromises.length > 0) {
      console.log(`⏳ Updating ${updatePromises.length} AWS cards...`);
      await Promise.all(updatePromises);
    }
    
    const result = {
      totalCards,
      awsCards,
      fixedCards,
      alreadyActiveCards,
      success: true
    };
    
    console.log('🎉 AWS cards fix completed!');
    console.log('📊 Final Results:');
    console.log(`   📋 Total cards scanned: ${totalCards}`);
    console.log(`   🎯 AWS cards found: ${awsCards}`);
    console.log(`   🔧 Cards fixed: ${fixedCards}`);
    console.log(`   ✅ Already active: ${alreadyActiveCards}`);
    
    if (fixedCards > 0) {
      console.log('🔄 Refresh the page to see the updated AWS cards.');
      
      // Optionally auto-refresh after a delay
      console.log('⏰ Auto-refreshing in 3 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      console.log('ℹ️ No AWS cards needed fixing.');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error fixing AWS cards:', error);
    
    // Provide helpful debugging info
    console.log('🔍 Debug Information:');
    console.log('   - Make sure you are logged in to the app');
    console.log('   - Make sure Firebase is properly initialized');
    console.log('   - Check if the app is running correctly');
    
    throw error;
  }
}

// Make the function available globally
window.fixAWSCardsConsole = fixAWSCardsConsole;

// Auto-run the fix
console.log('🎯 Ready to fix AWS cards!');
console.log('💡 Run: fixAWSCardsConsole() to execute the fix');
console.log('');

// Optionally auto-run (uncomment the line below to auto-execute)
// fixAWSCardsConsole();