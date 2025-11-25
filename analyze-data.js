import fs from 'fs';

// Read and parse the data file
const fileContent = fs.readFileSync('./data.js', 'utf8');
const data = eval(fileContent); // Since it's a JS array, we can eval it

console.log('📊 Data Analysis:');
console.log('Total entries:', data.length);
console.log('Entries with id:', data.filter(c => c.id).length);
console.log('Entries without id:', data.filter(c => !c.id).length);

// Check for missing required fields
const missingName = data.filter(c => !c.name || c.name.trim() === '');
const missingBranch = data.filter(c => !c.branch || c.branch.trim() === '');

console.log('\n❌ Missing required fields:');
console.log('Missing name:', missingName.length);
console.log('Missing branch:', missingBranch.length);

// Check for invalid emails (empty string is allowed, but invalid format is not)
const invalidEmails = data.filter(c => {
  if (!c.email || c.email.trim() === '') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !emailRegex.test(c.email);
});

const invalidEmail2 = data.filter(c => {
  if (!c.email2 || c.email2.trim() === '') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !emailRegex.test(c.email2);
});

console.log('\n❌ Invalid emails:');
console.log('Invalid email:', invalidEmails.length);
console.log('Invalid email2:', invalidEmail2.length);

// Check for invalid phone (empty is allowed)
const emptyPhones = data.filter(c => !c.phone || c.phone.trim() === '');

console.log('\n❌ Empty phones:', emptyPhones.length);

// Check for invalid PAN format (empty is allowed)
const invalidPAN = data.filter(c => {
  if (!c.pan || c.pan.trim() === '') return false;
  return !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(c.pan);
});

console.log('\n❌ Invalid PAN format:', invalidPAN.length);

// Show first few examples of each issue
if (missingName.length > 0) {
  console.log('\nFirst 5 missing names:');
  missingName.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. Index: ${data.indexOf(c)}, Name: "${c.name}"`);
  });
}

if (missingBranch.length > 0) {
  console.log('\nFirst 5 missing branches:');
  missingBranch.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. Index: ${data.indexOf(c)}, Branch: "${c.branch}"`);
  });
}

if (invalidEmails.length > 0) {
  console.log('\nFirst 5 invalid emails:');
  invalidEmails.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. Index: ${data.indexOf(c)}, Email: "${c.email}"`);
  });
}

if (invalidEmail2.length > 0) {
  console.log('\nFirst 5 invalid email2:');
  invalidEmail2.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. Index: ${data.indexOf(c)}, Email2: "${c.email2}"`);
  });
}

if (invalidPAN.length > 0) {
  console.log('\nFirst 5 invalid PAN:');
  invalidPAN.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. Index: ${data.indexOf(c)}, PAN: "${c.pan}"`);
  });
}

// Check GST numbers validation
let invalidGST = 0;
const invalidGSTEntries = [];
data.forEach((c, idx) => {
  if (c.gstNumbers && Array.isArray(c.gstNumbers)) {
    c.gstNumbers.forEach(gst => {
      if (gst.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.gstNumber)) {
        invalidGST++;
        if (invalidGSTEntries.length < 5) {
          invalidGSTEntries.push({ index: idx, name: c.name, gst: gst.gstNumber });
        }
      }
    });
  }
});

console.log('\n❌ Invalid GST numbers:', invalidGST);
if (invalidGSTEntries.length > 0) {
  console.log('First invalid GST entries:');
  invalidGSTEntries.forEach((entry, i) => {
    console.log(`  ${i + 1}. Index: ${entry.index}, Name: ${entry.name}, GST: ${entry.gst}`);
  });
}

// Summary
const totalIssues = missingName.length + missingBranch.length + invalidEmails.length + invalidEmail2.length + invalidPAN.length + invalidGST;
console.log('\n📋 Summary:');
console.log(`Total potential issues: ${totalIssues}`);
console.log(`Expected to create: ${data.length}`);
console.log(`Actually created: 878`);
console.log(`Missing: ${data.length - 878}`);
