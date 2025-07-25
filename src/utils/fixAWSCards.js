// Fix AWS Cards - Set active: true for all AWS category cards
// This script fixes the issue where AWS cards are not showing up due to active: false

import { db } from '../firebase.js';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

/**
 * Fix AWS cards by setting active: true for all AWS category cards
 * @param {string} userId - User ID to update cards for
 * @returns {Promise<Object>} Result object with statistics
 */
export async function fixAWSCards(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  console.log('🔧 Starting AWS cards fix...');
  
  try {
    // Get all flashcards for the user
    const flashcardsRef = collection(db, 'flashcards');
    const userCardsQuery = query(flashcardsRef, where('userId', '==', userId));
    const snapshot = await getDocs(userCardsQuery);
    
    let totalCards = 0;
    let awsCards = 0;
    let fixedCards = 0;
    let alreadyActiveCards = 0;
    
    const updatePromises = [];
    
    snapshot.forEach((docSnapshot) => {
      const card = docSnapshot.data();
      totalCards++;
      
      // Check if this is an AWS card (case insensitive)
      const category = (card.category || '').toLowerCase();
      if (category === 'aws') {
        awsCards++;
        
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
    console.log('📊 Results:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error fixing AWS cards:', error);
    throw error;
  }
}

/**
 * Browser console helper function
 * Run this in your browser console while the app is running
 */
window.fixAWSCards = async function() {
  // Get userId from the app
  const userId = window.userId || localStorage.getItem('userId');
  
  if (!userId) {
    console.error('❌ User ID not found. Make sure you are logged in.');
    return;
  }
  
  try {
    const result = await fixAWSCards(userId);
    console.log('✅ AWS cards fix completed:', result);
    
    // Suggest refreshing the page
    console.log('🔄 Refresh the page to see the updated AWS cards.');
    
    return result;
  } catch (error) {
    console.error('❌ Failed to fix AWS cards:', error);
  }
};

// Auto-export for module usage
export default fixAWSCards;