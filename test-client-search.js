// Simple test script for the new client search API
// Run this with: node test-client-search.js

const testClientSearch = async () => {
  try {
    // Test the new endpoint
    const response = await fetch('http://localhost:3000/v1/file-manager/search-clients?query=Abhishe&limit=10&page=1', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Search successful!');
      console.log('Results:', data.results.length);
      console.log('Total:', data.totalResults);
      console.log('First result:', data.results[0]);
    } else {
      console.error('❌ Search failed:', response.status, response.statusText);
      const errorData = await response.json();
      console.error('Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Uncomment the line below to run the test (after adding your auth token)
// testClientSearch();

console.log('🔍 Client Search API Test Script');
console.log('URL: GET /v1/file-manager/search-clients?query=Abhishe&limit=10&page=1');
console.log('Features:');
console.log('- Searches only client subfolders');
console.log('- Optimized for client name searches');
console.log('- Returns clean, formatted results');
console.log('- Includes pagination support');
console.log('');
console.log('To test:');
console.log('1. Add your auth token to the script');
console.log('2. Uncomment the testClientSearch() call');
console.log('3. Run: node test-client-search.js');
