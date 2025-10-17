import { PolarClient } from './polar';

async function debugPolarSetup() {
  console.log('\n🔍 Polar Sandbox Debug Tool\n');
  console.log('===============================');
  
  const isDev = process.env.NODE_ENV === 'development';
  
  // Check environment variables
  console.log('\n📋 Environment Configuration:');
  console.log('----------------------------');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`Mode: ${isDev ? '🧪 SANDBOX' : '🚀 PRODUCTION'}`);
  
  const apiKey = isDev 
    ? process.env.POLAR_SANDBOX_API_KEY 
    : process.env.POLAR_API_KEY;
  
  const orgId = isDev
    ? process.env.POLAR_SANDBOX_ORGANIZATION_ID
    : process.env.POLAR_ORGANIZATION_ID;
    
  const proProductId = isDev
    ? process.env.POLAR_SANDBOX_PRO_PRODUCT_ID
    : process.env.POLAR_PRO_PRODUCT_ID;
    
  const enterpriseProductId = isDev
    ? process.env.POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID
    : process.env.POLAR_ENTERPRISE_PRODUCT_ID;
  
  console.log(`API Key: ${apiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`Organization ID: ${orgId || 'Not set (will be fetched from API)'}`);
  console.log(`Pro Product ID: ${proProductId || 'Not set'}`);
  console.log(`Enterprise Product ID: ${enterpriseProductId || 'Not set'}`);
  
  if (!apiKey) {
    console.error('\n❌ Error: API key is not set. Cannot continue.');
    process.exit(1);
  }
  
  const client = new PolarClient();
  
  try {
    // Get organization info
    console.log('\n🏢 Fetching Organization Info...');
    console.log('--------------------------------');
    
    const orgResponse = await client.request('/organizations', {
      method: 'GET'
    });
    
    if (orgResponse.items && orgResponse.items.length > 0) {
      console.log(`Found ${orgResponse.items.length} organization(s):`);
      orgResponse.items.forEach((org: any, index: number) => {
        console.log(`\n  Organization ${index + 1}:`);
        console.log(`    ID: ${org.id}`);
        console.log(`    Name: ${org.name}`);
        console.log(`    Slug: ${org.slug}`);
        
        // Check if this matches our configured org ID
        if (orgId && org.id === orgId) {
          console.log(`    ✅ This matches your configured organization ID`);
        }
      });
      
      // If no org ID is configured, suggest using the first one
      if (!orgId && orgResponse.items.length > 0) {
        const firstOrg = orgResponse.items[0];
        console.log(`\n💡 Suggestion: Set ${isDev ? 'POLAR_SANDBOX_ORGANIZATION_ID' : 'POLAR_ORGANIZATION_ID'}=${firstOrg.id}`);
      }
    } else {
      console.log('❌ No organizations found. You may need to create one in Polar.');
    }
    
    // List products
    console.log('\n📦 Fetching Products...');
    console.log('----------------------');
    
    const productsResponse = await client.request('/products', {
      method: 'GET'
    });
    
    if (productsResponse.items && productsResponse.items.length > 0) {
      console.log(`Found ${productsResponse.items.length} product(s):`);
      
      const proProducts = [];
      const enterpriseProducts = [];
      
      productsResponse.items.forEach((product: any, index: number) => {
        console.log(`\n  Product ${index + 1}:`);
        console.log(`    ID: ${product.id}`);
        console.log(`    Name: ${product.name}`);
        console.log(`    Description: ${product.description || 'No description'}`);
        
        // Handle different price structures
        if (product.prices && product.prices.length > 0) {
          console.log(`    Prices:`);
          product.prices.forEach((price: any) => {
            const amount = price.amount_type === 'fixed' 
              ? `$${(price.price_amount / 100).toFixed(2)}` 
              : 'Custom amount';
            const recurring = price.recurring_interval 
              ? `/${price.recurring_interval}` 
              : ' (one-time)';
            console.log(`      - ${amount}${recurring}`);
          });
        } else {
          console.log(`    Price: Not configured`);
        }
        
        // Check if this matches our configured products
        if (proProductId && product.id === proProductId) {
          console.log(`    ✅ This matches your configured Pro Product ID`);
        }
        if (enterpriseProductId && product.id === enterpriseProductId) {
          console.log(`    ✅ This matches your configured Enterprise Product ID`);
        }
        
        // Categorize products for suggestions
        const productName = product.name?.toLowerCase() || '';
        if (productName.includes('pro') || productName.includes('premium')) {
          proProducts.push(product);
        } else if (productName.includes('enterprise') || productName.includes('business')) {
          enterpriseProducts.push(product);
        }
      });
      
      // Provide suggestions if products aren't configured
      console.log('\n💡 Configuration Suggestions:');
      console.log('------------------------------');
      
      if (!proProductId && proProducts.length > 0) {
        console.log(`Set ${isDev ? 'POLAR_SANDBOX_PRO_PRODUCT_ID' : 'POLAR_PRO_PRODUCT_ID'}=${proProducts[0].id}`);
      } else if (!proProductId) {
        console.log(`No "Pro" product found. Create one in Polar or use any product ID for testing.`);
      }
      
      if (!enterpriseProductId && enterpriseProducts.length > 0) {
        console.log(`Set ${isDev ? 'POLAR_SANDBOX_ENTERPRISE_PRODUCT_ID' : 'POLAR_ENTERPRISE_PRODUCT_ID'}=${enterpriseProducts[0].id}`);
      } else if (!enterpriseProductId) {
        console.log(`No "Enterprise" product found. Create one in Polar or use any product ID for testing.`);
      }
      
      // If no products match the configured IDs, show what to do
      if (proProductId && !productsResponse.items.find((p: any) => p.id === proProductId)) {
        console.log(`\n⚠️  Warning: Configured Pro Product ID (${proProductId}) not found!`);
        if (productsResponse.items.length > 0) {
          console.log(`   Available product IDs: ${productsResponse.items.map((p: any) => p.id).join(', ')}`);
        }
      }
      
      if (enterpriseProductId && !productsResponse.items.find((p: any) => p.id === enterpriseProductId)) {
        console.log(`\n⚠️  Warning: Configured Enterprise Product ID (${enterpriseProductId}) not found!`);
      }
      
    } else {
      console.log('❌ No products found.');
      console.log('\n📝 To create products:');
      console.log('1. Go to https://sandbox.polar.sh (for development)');
      console.log('2. Navigate to your organization');
      console.log('3. Go to the "Products" section');
      console.log('4. Create products for your subscription tiers');
      console.log('5. Copy the product IDs and set them in your environment variables');
    }
    
    // Test checkout creation with first available product
    if (productsResponse.items && productsResponse.items.length > 0) {
      console.log('\n🧪 Testing Checkout Creation...');
      console.log('--------------------------------');
      
      const testProduct = productsResponse.items[0];
      console.log(`Using product: ${testProduct.name} (${testProduct.id})`);
      
      try {
        const checkoutSession = await client.createCheckoutSession({
          productId: testProduct.id,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          customerEmail: 'test@example.com'
        });
        
        console.log('✅ Checkout session created successfully!');
        console.log(`   Checkout URL: ${checkoutSession.checkoutUrl}`);
        console.log('\n🎉 Your Polar integration is working correctly!');
      } catch (checkoutError: any) {
        console.log('❌ Failed to create checkout session:');
        console.log(`   ${checkoutError.message}`);
        console.log('\nPossible reasons:');
        console.log('- Product may not be properly configured with pricing');
        console.log('- Organization settings may need adjustment');
        console.log('- API key permissions may be insufficient');
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Error connecting to Polar:');
    console.error(error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\nYour API key appears to be invalid. Please check:');
      console.error(`1. The ${isDev ? 'POLAR_SANDBOX_API_KEY' : 'POLAR_API_KEY'} is correct`);
      console.error('2. The key has the necessary permissions');
      console.error('3. You are using the right environment (sandbox vs production)');
    }
  }
  
  console.log('\n===============================\n');
}

// Run the debug tool
debugPolarSetup().catch(console.error);