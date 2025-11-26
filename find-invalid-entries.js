import fs from 'fs';

const fileContent = fs.readFileSync('./data.js', 'utf8');
const data = eval(fileContent);

console.log('🔍 Finding entries with invalid formats that will fail validation...\n');

const invalidEntries = [];

data.forEach((client, idx) => {
  const errors = [];
  
  // Check TAN format
  if (client.tanNumber && client.tanNumber.trim() !== '') {
    if (!/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(client.tanNumber)) {
      errors.push(`Invalid TAN: "${client.tanNumber}"`);
    }
  }
  
  // Check CIN format
  if (client.cinNumber && client.cinNumber.trim() !== '') {
    if (!/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(client.cinNumber)) {
      errors.push(`Invalid CIN: "${client.cinNumber}"`);
    }
  }
  
  // Check Udyam format
  if (client.udyamNumber && client.udyamNumber.trim() !== '') {
    if (!/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/.test(client.udyamNumber)) {
      errors.push(`Invalid Udyam: "${client.udyamNumber}"`);
    }
  }
  
  // Check IEC format
  if (client.iecCode && client.iecCode.trim() !== '') {
    if (!/^[0-9]{10}$/.test(client.iecCode)) {
      errors.push(`Invalid IEC: "${client.iecCode}"`);
    }
  }
  
  if (errors.length > 0) {
    invalidEntries.push({
      index: idx,
      name: client.name,
      errors: errors
    });
  }
});

console.log(`❌ Found ${invalidEntries.length} entries with invalid formats:\n`);

invalidEntries.forEach((entry, i) => {
  console.log(`${i + 1}. Index ${entry.index} - ${entry.name}:`);
  entry.errors.forEach(err => {
    console.log(`   - ${err}`);
  });
});

console.log(`\n📊 Summary:`);
console.log(`Total entries: ${data.length}`);
console.log(`Entries with invalid formats: ${invalidEntries.length}`);
console.log(`Expected to fail: ${invalidEntries.length}`);
console.log(`Actually missing: 24`);
console.log(`\n⚠️  These ${invalidEntries.length} entries will definitely fail validation and not be created.`);


