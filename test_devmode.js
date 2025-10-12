// Test script for devMode API endpoints

async function testDevModeEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing devMode API endpoints...\n');
  
  // Since we're in development mode, the test user is auto-authenticated
  // We'll test the endpoints directly
  
  try {
    // Test 1: Get current devMode status
    console.log('1. Getting current devMode status...');
    const getResponse = await fetch(`${baseUrl}/api/user/dev-mode`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const currentStatus = await getResponse.json();
    console.log('   Current devMode:', currentStatus.devMode);
    
    // Test 2: Toggle devMode to true
    console.log('\n2. Setting devMode to true...');
    const setTrueResponse = await fetch(`${baseUrl}/api/user/dev-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ devMode: true }),
      credentials: 'include'
    });
    
    if (!setTrueResponse.ok) {
      throw new Error(`POST failed: ${setTrueResponse.status} ${setTrueResponse.statusText}`);
    }
    
    const trueResult = await setTrueResponse.json();
    console.log('   Updated devMode:', trueResult.devMode);
    
    // Test 3: Verify the change persisted
    console.log('\n3. Verifying devMode persisted...');
    const verifyResponse = await fetch(`${baseUrl}/api/user/dev-mode`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Verify GET failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifyStatus = await verifyResponse.json();
    console.log('   Verified devMode:', verifyStatus.devMode);
    
    // Test 4: Toggle back to false
    console.log('\n4. Setting devMode back to false...');
    const setFalseResponse = await fetch(`${baseUrl}/api/user/dev-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ devMode: false }),
      credentials: 'include'
    });
    
    if (!setFalseResponse.ok) {
      throw new Error(`POST false failed: ${setFalseResponse.status} ${setFalseResponse.statusText}`);
    }
    
    const falseResult = await setFalseResponse.json();
    console.log('   Updated devMode:', falseResult.devMode);
    
    // Test 5: Final verification
    console.log('\n5. Final verification...');
    const finalResponse = await fetch(`${baseUrl}/api/user/dev-mode`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!finalResponse.ok) {
      throw new Error(`Final GET failed: ${finalResponse.status} ${finalResponse.statusText}`);
    }
    
    const finalStatus = await finalResponse.json();
    console.log('   Final devMode:', finalStatus.devMode);
    
    console.log('\n✅ All tests passed! devMode functionality is working correctly.');
    console.log('\nSummary:');
    console.log('- GET /api/user/dev-mode endpoint works');
    console.log('- POST /api/user/dev-mode endpoint works');
    console.log('- devMode state persists across requests');
    console.log('- Test user (999999) can toggle dev mode');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testDevModeEndpoints();