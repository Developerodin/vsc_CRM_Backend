import fs from 'fs';

const fileContent = fs.readFileSync('./data.js', 'utf8');
const data = eval(fileContent);

console.log('🔍 Checking for duplicates and issues...\n');

// Check for duplicate emails
const emailMap = new Map();
const duplicateEmails = [];
data.forEach((c, idx) => {
  if (c.email && c.email.trim() !== '') {
    const email = c.email.toLowerCase().trim();
    if (emailMap.has(email)) {
      duplicateEmails.push({ index: idx, name: c.name, email: email, firstIndex: emailMap.get(email) });
    } else {
      emailMap.set(email, idx);
    }
  }
});

console.log('📧 Duplicate emails:', duplicateEmails.length);
if (duplicateEmails.length > 0) {
  console.log('First 10 duplicate emails:');
  duplicateEmails.slice(0, 10).forEach((dup, i) => {
    console.log(`  ${i + 1}. Index ${dup.index} (${dup.name}) - Email: ${dup.email} (first seen at index ${dup.firstIndex})`);
  });
}

// Check for duplicate phones
const phoneMap = new Map();
const duplicatePhones = [];
data.forEach((c, idx) => {
  if (c.phone && c.phone.trim() !== '') {
    const phone = c.phone.trim();
    if (phoneMap.has(phone)) {
      duplicatePhones.push({ index: idx, name: c.name, phone: phone, firstIndex: phoneMap.get(phone) });
    } else {
      phoneMap.set(phone, idx);
    }
  }
});

console.log('\n📱 Duplicate phones:', duplicatePhones.length);
if (duplicatePhones.length > 0) {
  console.log('First 10 duplicate phones:');
  duplicatePhones.slice(0, 10).forEach((dup, i) => {
    console.log(`  ${i + 1}. Index ${dup.index} (${dup.name}) - Phone: ${dup.phone} (first seen at index ${dup.firstIndex})`);
  });
}

// Check for entries that might fail validation silently
const problematicEntries = [];

data.forEach((c, idx) => {
  const issues = [];
  
  // Check email2 validation (empty string might fail)
  if (c.email2 === '') {
    issues.push('empty email2 string');
  }
  
  // Check if branch name exists (will be converted to ObjectId)
  if (!c.branch || c.branch.trim() === '') {
    issues.push('missing branch');
  }
  
  if (issues.length > 0) {
    problematicEntries.push({ index: idx, name: c.name, issues });
  }
});

console.log('\n⚠️  Entries with potential issues:', problematicEntries.length);
if (problematicEntries.length > 0) {
  console.log('First 20 problematic entries:');
  problematicEntries.slice(0, 20).forEach((entry, i) => {
    console.log(`  ${i + 1}. Index ${entry.index} (${entry.name}): ${entry.issues.join(', ')}`);
  });
}

console.log('\n📊 Summary:');
console.log(`Total entries: ${data.length}`);
console.log(`Duplicate emails: ${duplicateEmails.length}`);
console.log(`Duplicate phones: ${duplicatePhones.length}`);
console.log(`Problematic entries: ${problematicEntries.length}`);
console.log(`Expected created: ${data.length}`);
console.log(`Actually created: 878`);
console.log(`Missing: ${data.length - 878}`);


