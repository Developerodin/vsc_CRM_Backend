const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/v1';
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

// Test the new task dashboard APIs
async function testTaskAPIs() {
  try {
    console.log('🧪 Testing Task Dashboard APIs...\n');

    // Test 1: Get total tasks and status breakdown
    console.log('1. Testing /total-tasks-and-status');
    try {
      const response1 = await axios.get(`${BASE_URL}/dashboard/total-tasks-and-status`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      console.log('✅ Success:', response1.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get task analytics with date filtering
    console.log('2. Testing /task-analytics');
    try {
      const response2 = await axios.get(`${BASE_URL}/dashboard/task-analytics`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'status'
        }
      });
      console.log('✅ Success:', response2.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Get task trends over time
    console.log('3. Testing /task-trends');
    try {
      const response3 = await axios.get(`${BASE_URL}/dashboard/task-trends`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          interval: 'month'
        }
      });
      console.log('✅ Success:', response3.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Get task analytics grouped by priority
    console.log('4. Testing /task-analytics with priority grouping');
    try {
      const response4 = await axios.get(`${BASE_URL}/dashboard/task-analytics`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'priority'
        }
      });
      console.log('✅ Success:', response4.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Get task analytics grouped by month
    console.log('5. Testing /task-analytics with month grouping');
    try {
      const response5 = await axios.get(`${BASE_URL}/dashboard/task-analytics`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'month'
        }
      });
      console.log('✅ Success:', response5.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }

    console.log('\n🎉 Task Dashboard API testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testTaskAPIs();
