/**
 * Simple Polar API connection test
 * Tests basic API connectivity without organization headers
 */

async function testPolarConnection() {
  console.log('\n🔍 Testing Polar API Connection\n');
  console.log('================================');
  
  const isDev = process.env.NODE_ENV === 'development';
  const apiKey = isDev 
    ? process.env.POLAR_SANDBOX_API_KEY 
    : process.env.POLAR_API_KEY;
  
  const baseUrl = isDev
    ? 'https://sandbox-api.polar.sh/v1'
    : 'https://api.polar.sh/v1';
    
  console.log(`Mode: ${isDev ? '🧪 SANDBOX' : '🚀 PRODUCTION'}`);
  console.log(`API Endpoint: ${baseUrl}`);
  console.log(`API Key: ${apiKey ? '✅ Set' : '❌ Not set'}`);
  
  if (!apiKey) {
    console.error('\n❌ API key not set. Cannot continue.');
    process.exit(1);
  }
  
  // Test 1: Basic connection without organization header
  console.log('\n📡 Test 1: Basic API Connection (no organization header)');
  console.log('----------------------------------------------------------');
  
  try {
    const response = await fetch(`${baseUrl}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful!');
      console.log(`Products found: ${data.items?.length || 0}`);
      
      if (data.items && data.items.length > 0) {
        console.log('\n📦 Available Products:');
        data.items.forEach((product: any, index: number) => {
          console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ API request failed: ${errorText}`);
    }
  } catch (error: any) {
    console.error(`❌ Connection error: ${error.message}`);
  }
  
  // Test 2: With organization header
  const orgId = isDev
    ? process.env.POLAR_SANDBOX_ORGANIZATION_ID
    : process.env.POLAR_ORGANIZATION_ID;
    
  if (orgId) {
    console.log('\n📡 Test 2: API Connection with Organization Header');
    console.log('---------------------------------------------------');
    console.log(`Organization ID: ${orgId}`);
    
    try {
      const response = await fetch(`${baseUrl}/products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Polar-Organization': orgId
        }
      });
      
      console.log(`Response Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection with organization successful!');
        console.log(`Products found: ${data.items?.length || 0}`);
        
        if (data.items && data.items.length > 0) {
          console.log('\n📦 Products for this organization:');
          data.items.forEach((product: any, index: number) => {
            console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`);
            
            // Check if this matches configured IDs
            const proId = isDev 
              ? process.env.POLAR_SANDBOX_PRO_PRODUCT_ID 
              : process.env.POLAR_PRO_PRODUCT_ID;
            const entId = isDev
              ? process.env.POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID
              : process.env.POLAR_ENTERPRISE_PRODUCT_ID;
              
            if (product.id === proId) {
              console.log(`     ✅ This matches your configured Pro Product ID`);
            }
            if (product.id === entId) {
              console.log(`     ✅ This matches your configured Enterprise Product ID`);
            }
          });
          
          // Show which configured products are missing
          const proId = isDev 
            ? process.env.POLAR_SANDBOX_PRO_PRODUCT_ID 
            : process.env.POLAR_PRO_PRODUCT_ID;
          const entId = isDev
            ? process.env.POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID
            : process.env.POLAR_ENTERPRISE_PRODUCT_ID;
            
          const productIds = data.items.map((p: any) => p.id);
          
          if (proId && !productIds.includes(proId)) {
            console.log(`\n⚠️  Pro Product ID (${proId}) not found in this organization!`);
          }
          if (entId && !productIds.includes(entId)) {
            console.log(`⚠️  Enterprise Product ID (${entId}) not found in this organization!`);
          }
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ API request with organization failed: ${errorText}`);
      }
    } catch (error: any) {
      console.error(`❌ Connection error: ${error.message}`);
    }
  }
  
  // Test 3: Try to get user info (to verify API key permissions)
  console.log('\n📡 Test 3: API Key Permissions Check');
  console.log('-------------------------------------');
  
  try {
    const response = await fetch(`${baseUrl}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API key has valid permissions');
      console.log(`User: ${data.username || data.email || 'Unknown'}`);
    } else if (response.status === 401) {
      console.log('❌ API key is invalid or expired');
    } else if (response.status === 403) {
      console.log('⚠️  API key lacks necessary permissions');
    } else {
      const errorText = await response.text();
      console.log(`❌ Unexpected error: ${errorText}`);
    }
  } catch (error: any) {
    console.error(`❌ Connection error: ${error.message}`);
  }
  
  console.log('\n================================\n');
}

// Run the test
testPolarConnection().catch(console.error);