// Test Firestore using REST API (bypasses SDK issues)
window.testFirestoreRest = async function() {
  console.log('🌐 TESTING FIRESTORE VIA REST API');
  console.log('=================================');
  
  const projectId = 'flashcard-app-3f2a3';
  
  try {
    // Get auth token if available
    let authToken = null;
    try {
      const user = window.firebase?.auth?.currentUser;
      if (user) {
        authToken = await user.getIdToken();
        console.log('✅ Got auth token');
      } else {
        console.log('⚠️ No auth token available');
      }
    } catch (e) {
      console.log('⚠️ Could not get auth token:', e.message);
    }
    
    // Test 1: List documents (read test)
    console.log('\n1️⃣ Testing READ via REST API...');
    const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/flashcards`;
    
    const readHeaders = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      readHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    
    const readResponse = await fetch(listUrl, {
      method: 'GET',
      headers: readHeaders
    });
    
    console.log(`   Read response status: ${readResponse.status}`);
    
    if (readResponse.ok) {
      const data = await readResponse.json();
      console.log(`   ✅ Read successful! Found ${data.documents?.length || 0} documents`);
    } else {
      const error = await readResponse.text();
      console.log(`   ❌ Read failed: ${error}`);
    }
    
    // Test 2: Create document (write test)
    console.log('\n2️⃣ Testing WRITE via REST API...');
    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/flashcards`;
    
    const testDoc = {
      fields: {
        question: { stringValue: 'REST API TEST - ' + new Date().toISOString() },
        answer: { stringValue: 'This is a REST API test document' },
        userId: { stringValue: 'rest-test-user' },
        category: { stringValue: 'Test' },
        active: { booleanValue: true },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };
    
    const writeHeaders = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      writeHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    
    const writeResponse = await fetch(createUrl, {
      method: 'POST',
      headers: writeHeaders,
      body: JSON.stringify(testDoc)
    });
    
    console.log(`   Write response status: ${writeResponse.status}`);
    
    if (writeResponse.ok) {
      const result = await writeResponse.json();
      console.log(`   ✅ Write successful! Document created: ${result.name}`);
      console.log('\n🎉 FIRESTORE IS WORKING VIA REST API!');
      console.log('\n💡 This means the issue is with Firebase SDK, not Firestore itself');
    } else {
      const error = await writeResponse.text();
      console.log(`   ❌ Write failed: ${error}`);
      
      if (writeResponse.status === 403) {
        console.log('\n🚨 PERMISSION DENIED VIA REST API');
        console.log('   This confirms the Firestore rules are blocking operations');
        console.log('   The rules deployment may have failed');
      }
    }
    
  } catch (error) {
    console.log(`❌ REST API test failed: ${error.message}`);
  }
};

window.testFirestoreRest();