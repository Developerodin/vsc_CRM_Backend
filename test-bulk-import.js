import fs from 'fs';
import axios from 'axios';

// Read and parse the data file (it's a JS array, not JSON)
const fileContent = fs.readFileSync('./data.js', 'utf8');
const data = eval(fileContent);

const API_URL = 'http://localhost:4000/v1/clients/bulk-import';

console.log('📊 Preparing to import data...');
console.log(`Total entries in data: ${data.length}`);

// Prepare the request payload
const payload = {
  clients: data
};

console.log(`\n🚀 Sending bulk import request to ${API_URL}...`);
console.log(`Payload contains ${payload.clients.length} clients\n`);

try {
  const response = await axios.post(API_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      // You may need to add authorization token here
      // 'Authorization': 'Bearer YOUR_TOKEN'
    },
    timeout: 300000 // 5 minutes timeout
  });

  console.log('\n✅ Bulk import completed!');
  console.log('📊 Results:');
  console.log(JSON.stringify(response.data, null, 2));

  const results = response.data;
  
  console.log('\n📋 Summary:');
  console.log(`   Total Processed: ${results.totalProcessed}`);
  console.log(`   Created: ${results.created}`);
  console.log(`   Updated: ${results.updated || 0}`);
  console.log(`   Errors: ${results.errors?.length || 0}`);
  
  if (results.errors && results.errors.length > 0) {
    console.log('\n❌ Errors found:');
    console.log(`   Total errors: ${results.errors.length}`);
    
    // Group errors by type
    const errorTypes = {};
    results.errors.forEach(err => {
      const errorType = err.error?.split(':')[0] || 'Unknown';
      if (!errorTypes[errorType]) {
        errorTypes[errorType] = [];
      }
      errorTypes[errorType].push(err);
    });
    
    console.log('\n   Error breakdown:');
    Object.keys(errorTypes).forEach(type => {
      console.log(`   - ${type}: ${errorTypes[type].length}`);
    });
    
    console.log('\n   First 20 errors:');
    results.errors.slice(0, 20).forEach((err, idx) => {
      console.log(`   ${idx + 1}. Index ${err.index}: ${err.error}`);
      if (err.data?.name) {
        console.log(`      Client: ${err.data.name}`);
      }
    });
    
    if (results.errors.length > 20) {
      console.log(`   ... and ${results.errors.length - 20} more errors`);
    }
  }
  
  // Calculate missing
  const expected = data.length;
  const actual = results.created + (results.updated || 0);
  const missing = expected - actual;
  
  if (missing > 0) {
    console.log(`\n⚠️  WARNING: ${missing} clients are missing!`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Created: ${results.created}`);
    console.log(`   Updated: ${results.updated || 0}`);
    console.log(`   Total: ${actual}`);
    
    if (results.errors && results.errors.length < missing) {
      console.log(`\n   ⚠️  Only ${results.errors.length} errors reported, but ${missing} clients are missing!`);
      console.log(`   This suggests silent validation failures.`);
    }
  } else {
    console.log('\n✅ All clients processed successfully!');
  }
  
} catch (error) {
  console.error('\n❌ Error during bulk import:');
  if (error.response) {
    console.error(`   Status: ${error.response.status}`);
    console.error(`   Message: ${error.response.data?.message || error.message}`);
    console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.error('   No response received from server');
    console.error('   Make sure the server is running on http://localhost:4000');
  } else {
    console.error(`   Error: ${error.message}`);
  }
  process.exit(1);
}

