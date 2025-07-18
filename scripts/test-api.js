import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/v1';

// Test the frequency status API endpoints
const testFrequencyStatusAPI = async () => {
  try {
    console.log('Testing Frequency Status API...\n');
    
    // First, get a timeline ID to test with
    const timelinesResponse = await fetch(`${BASE_URL}/timelines?limit=1`);
    const timelinesData = await timelinesResponse.json();
    
    if (!timelinesData.results || timelinesData.results.length === 0) {
      console.log('No timelines found to test with');
      return;
    }
    
    const timelineId = timelinesData.results[0]._id;
    console.log(`Testing with timeline ID: ${timelineId}\n`);
    
    // Test 1: Get frequency status
    console.log('1. Testing GET frequency status...');
    const getStatusResponse = await fetch(`${BASE_URL}/timelines/${timelineId}/frequency-status`);
    const getStatusData = await getStatusResponse.json();
    
    if (getStatusResponse.ok) {
      console.log('✅ GET frequency status successful');
      console.log(`   Frequency: ${getStatusData.frequency}`);
      console.log(`   Overall Status: ${getStatusData.overallStatus}`);
      console.log(`   Frequency Status Count: ${getStatusData.frequencyStatus.length}`);
      
      if (getStatusData.frequencyStatus.length > 0) {
        const firstPeriod = getStatusData.frequencyStatus[0];
        console.log(`   First Period: ${firstPeriod.period} - ${firstPeriod.status}`);
        
        // Test 2: Update frequency status
        console.log('\n2. Testing PATCH frequency status...');
        const updateData = {
          status: 'completed',
          notes: 'Test update from API'
        };
        
        const updateResponse = await fetch(
          `${BASE_URL}/timelines/${timelineId}/frequency-status/${firstPeriod.period}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
          }
        );
        
        if (updateResponse.ok) {
          console.log('✅ PATCH frequency status successful');
          const updateResult = await updateResponse.json();
          console.log(`   Updated timeline status: ${updateResult.status}`);
        } else {
          const errorData = await updateResponse.json();
          console.log(`❌ PATCH failed: ${errorData.message}`);
        }
      }
    } else {
      console.log(`❌ GET failed: ${getStatusData.message}`);
    }
    
    // Test 3: Test error handling with invalid period
    console.log('\n3. Testing error handling with invalid period...');
    const errorResponse = await fetch(
      `${BASE_URL}/timelines/${timelineId}/frequency-status/invalid-period`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' })
      }
    );
    
    if (!errorResponse.ok) {
      const errorData = await errorResponse.json();
      console.log(`✅ Error handling working: ${errorData.message} (${errorData.code})`);
    } else {
      console.log('❌ Error handling not working as expected');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

// Run the test
testFrequencyStatusAPI(); 