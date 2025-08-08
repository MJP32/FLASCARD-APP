// Basic Firestore connectivity test
window.testFirestoreBasic = async function() {
  // Enable console first
  if (window.enableDebugMode) window.enableDebugMode();
  
  console.log('🔍 BASIC FIRESTORE CONNECTIVITY TEST');
  console.log('====================================');
  
  let results = [];
  
  try {
    // Check if Firebase is initialized
    results.push('1️⃣ Firebase App Check:');
    const app = window.firebaseApp || window.firebase?.app();
    results.push(`   - Firebase app exists: ${!!app}`);
    
    if (!app) {
      alert('❌ Firebase app not initialized');
      return;
    }
    
    // Check Firestore initialization
    results.push('\n2️⃣ Firestore Check:');
    let db;
    try {
      // Try different ways to get Firestore
      if (window.firebase?.firestore) {
        db = window.firebase.firestore();
        results.push('   - Using window.firebase.firestore()');
      } else {
        // Try importing
        const { getFirestore } = await import('firebase/firestore');
        db = getFirestore(app);
        results.push('   - Using imported getFirestore()');
      }
      
      results.push(`   - Firestore instance: ${!!db}`);
      
    } catch (fsError) {
      results.push(`   - Firestore init error: ${fsError.message}`);
      alert(results.join('\n') + '\n\n❌ Firestore initialization failed');
      return;
    }
    
    // Test a simple operation
    results.push('\n3️⃣ Testing Basic Operation:');
    
    try {
      // Try to get any document (this tests rules and connectivity)
      const { collection, getDocs, limit, query } = await import('firebase/firestore');
      
      results.push('   - Attempting to read flashcards collection...');
      const testQuery = query(collection(db, 'flashcards'), limit(1));
      const snapshot = await getDocs(testQuery);
      
      results.push(`   ✅ Read successful! Found ${snapshot.size} docs`);
      
      // Now try to create a test document
      results.push('\n4️⃣ Testing Write Operation:');
      const { addDoc } = await import('firebase/firestore');
      
      const testDoc = await addDoc(collection(db, 'flashcards'), {
        question: 'CONNECTIVITY TEST - ' + new Date().toISOString(),
        answer: 'If you see this, Firestore is working',
        userId: 'test-user',
        category: 'Test',
        active: true,
        createdAt: new Date()
      });
      
      results.push(`   ✅ Write successful! Document ID: ${testDoc.id}`);
      results.push('\n🎉 FIRESTORE IS WORKING CORRECTLY!');
      
    } catch (opError) {
      results.push(`   ❌ Operation failed: ${opError.code} - ${opError.message}`);
      
      if (opError.code === 'permission-denied') {
        results.push('\n🔍 PERMISSION DENIED DETAILS:');
        results.push('   - This means Firestore rules are blocking the operation');
        results.push('   - Even though we set permissive rules, they may not be active');
        results.push('   - Check Firebase Console → Firestore → Rules');
      } else if (opError.code === 'unavailable') {
        results.push('\n🔍 UNAVAILABLE ERROR:');
        results.push('   - Firestore service may be down');
        results.push('   - Or network connectivity issues');
      }
    }
    
  } catch (error) {
    results.push(`❌ Fatal error: ${error.message}`);
  }
  
  const output = results.join('\n');
  console.log(output);
  alert(output);
};

window.testFirestoreBasic();