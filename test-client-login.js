import axios from 'axios';

const BASE_URL = 'http://localhost:5000/v1';

// Test client login flow
async function testClientLogin() {
  try {
    console.log('🧪 Testing Client Login API...\n');

    // Step 1: Generate OTP
    console.log('1. Generating OTP...');
    const generateOTPResponse = await axios.post(`${BASE_URL}/client-auth/generate-otp`, {
      email: 'test@example.com'
    });
    
    console.log('✅ OTP Generation Response:', generateOTPResponse.data);
    
    // Note: In real scenario, OTP would be sent via email
    // For testing, we'll simulate with a mock OTP
    console.log('\n2. Verifying OTP (simulated)...');
    console.log('⚠️  Note: This will fail because no actual OTP was sent');
    console.log('   In production, check email for OTP and use it here\n');
    
    // Step 2: Verify OTP (this will fail without real OTP)
    try {
      const verifyOTPResponse = await axios.post(`${BASE_URL}/client-auth/verify-otp`, {
        email: 'test@example.com',
        otp: '123456' // Mock OTP
      });
      
      console.log('✅ OTP Verification Response:', verifyOTPResponse.data);
      
      // Step 3: Get Profile (if login successful)
      if (verifyOTPResponse.data.data?.access?.token) {
        console.log('\n3. Getting client profile...');
        const profileResponse = await axios.get(`${BASE_URL}/client-auth/profile`, {
          headers: {
            Authorization: `Bearer ${verifyOTPResponse.data.data.access.token}`
          }
        });
        
        console.log('✅ Profile Response:', profileResponse.data);
      }
      
    } catch (verifyError) {
      console.log('❌ OTP Verification Failed (expected):', verifyError.response?.data || verifyError.message);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

// Test API endpoints
async function testEndpoints() {
  try {
    console.log('🔍 Testing API Endpoints...\n');
    
    // Test generate OTP endpoint
    console.log('Testing /client-auth/generate-otp');
    const response = await axios.post(`${BASE_URL}/client-auth/generate-otp`, {
      email: 'test@example.com'
    });
    console.log('✅ Generate OTP endpoint working');
    
    // Test with invalid email
    try {
      await axios.post(`${BASE_URL}/client-auth/generate-otp`, {
        email: 'invalid-email'
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Email validation working');
      }
    }
    
    // Test with missing email
    try {
      await axios.post(`${BASE_URL}/client-auth/generate-otp`, {});
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Required field validation working');
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing endpoints:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Client Login API Tests\n');
  
  await testEndpoints();
  console.log('\n' + '='.repeat(50) + '\n');
  await testClientLogin();
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(console.error);
