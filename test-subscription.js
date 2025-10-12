// Test script to verify mock subscription flow for test user
// Run this in the browser console while logged in as the test user

async function testMockSubscription() {
  console.log('Testing mock subscription flow for test user...');
  
  // Step 1: Check current subscription status
  console.log('\n1. Checking current subscription status...');
  const statusResponse = await fetch('/api/subscription/status');
  const currentStatus = await statusResponse.json();
  console.log('Current status:', currentStatus);
  
  if (currentStatus.plan === 'pro' || currentStatus.plan === 'enterprise') {
    console.log('User already has an active subscription. Cancelling first...');
    const cancelResponse = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelAtPeriodEnd: false })
    });
    const cancelResult = await cancelResponse.json();
    console.log('Cancelled:', cancelResult);
  }
  
  // Step 2: Create checkout for Pro plan
  console.log('\n2. Creating checkout for Pro plan...');
  const checkoutResponse = await fetch('/api/subscription/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: 'pro',
      billingInterval: 'monthly'
    })
  });
  
  if (!checkoutResponse.ok) {
    const error = await checkoutResponse.json();
    console.error('Checkout failed:', error);
    return;
  }
  
  const checkoutResult = await checkoutResponse.json();
  console.log('Checkout created:', checkoutResult);
  
  // Step 3: Check status again (should be updated immediately for test user)
  console.log('\n3. Checking subscription status after checkout...');
  const newStatusResponse = await fetch('/api/subscription/status');
  const newStatus = await newStatusResponse.json();
  console.log('New status:', newStatus);
  
  // Step 4: Verify benefits were persisted
  if (newStatus.plan === 'pro') {
    console.log('\n✅ SUCCESS: Test user subscription benefits updated!');
    console.log('Plan:', newStatus.plan);
    console.log('Quizzes per day:', newStatus.limits.quizzesPerDay || 'Unlimited');
    console.log('Categories access:', newStatus.limits.categoriesAccess);
    console.log('Analytics access:', newStatus.limits.analyticsAccess);
  } else {
    console.log('\n❌ FAILED: Test user subscription benefits not updated');
    console.log('Expected plan: pro, Got:', newStatus.plan);
  }
  
  return newStatus;
}

// Run the test
testMockSubscription().then(result => {
  console.log('\n=== Test Complete ===');
  console.log('Final subscription status:', result);
}).catch(err => {
  console.error('Test failed with error:', err);
});