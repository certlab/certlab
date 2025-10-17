import { PolarClient } from './polar';

async function testCheckout() {
  console.log('\n🔍 Testing Polar Checkout Creation\n');
  console.log('===================================');
  
  const client = new PolarClient();
  
  try {
    // Create a test checkout session
    const session = await client.createCheckoutSession({
      productId: process.env.POLAR_SANDBOX_ENTERPRISE_PRICE_ID || '916dbe48-3661-420d-9706-e88a971cb1f2',
      successUrl: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://example.com/cancel',
      customerEmail: 'test@test.com',
      customerName: 'Test User',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('\n✅ Checkout session created successfully!');
    console.log('\nSession Details:');
    console.log('----------------');
    console.log(`ID: ${session.id}`);
    console.log(`URL: ${session.url}`);
    console.log(`Status: ${session.status}`);
    console.log(`Expires: ${session.expires_at}`);
    
    // Check if URL exists and has expected format
    if (!session.url) {
      console.error('\n❌ ERROR: No checkout URL returned!');
      console.log('Full session object:', JSON.stringify(session, null, 2));
    } else {
      console.log('\n📎 Checkout URL Analysis:');
      console.log('-------------------------');
      const url = new URL(session.url);
      console.log(`Protocol: ${url.protocol}`);
      console.log(`Host: ${url.host}`);
      console.log(`Pathname: ${url.pathname}`);
      
      // Check if it's using the correct domain
      if (url.host.includes('sandbox-api.polar.sh')) {
        console.warn('\n⚠️  WARNING: Checkout URL points to API domain instead of checkout domain!');
        console.warn('This might cause CORS issues in the browser.');
      } else if (url.host.includes('sandbox.polar.sh')) {
        console.log('\n✅ Checkout URL uses correct sandbox checkout domain');
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Failed to create checkout session:');
    console.error(error.message);
  }
  
  console.log('\n===================================\n');
}

// Run the test
testCheckout().catch(console.error);