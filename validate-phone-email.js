import fs from 'fs';
import validator from 'validator';

const fileContent = fs.readFileSync('./data.js', 'utf8');
const data = eval(fileContent);

console.log('🔍 Validating phone numbers and emails...\n');

const invalidPhones = [];
const invalidEmails = [];
const invalidEmail2 = [];

data.forEach((client, idx) => {
  // Check phone validation (same as model)
  if (client.phone && client.phone.trim() !== '') {
    if (!validator.isMobilePhone(client.phone, 'any')) {
      invalidPhones.push({
        index: idx,
        name: client.name,
        phone: client.phone
      });
    }
  }
  
  // Check email validation
  if (client.email && client.email.trim() !== '') {
    if (!validator.isEmail(client.email)) {
      invalidEmails.push({
        index: idx,
        name: client.name,
        email: client.email
      });
    }
  }
  
  // Check email2 validation (empty string should pass, but let's check)
  if (client.email2 && client.email2.trim() !== '') {
    if (!validator.isEmail(client.email2)) {
      invalidEmail2.push({
        index: idx,
        name: client.name,
        email2: client.email2
      });
    }
  }
});

console.log(`❌ Invalid phones: ${invalidPhones.length}`);
if (invalidPhones.length > 0) {
  console.log('First 30 invalid phones:');
  invalidPhones.slice(0, 30).forEach((item, i) => {
    console.log(`  ${i + 1}. Index ${item.index} (${item.name}): "${item.phone}"`);
  });
  if (invalidPhones.length > 30) {
    console.log(`  ... and ${invalidPhones.length - 30} more`);
  }
}

console.log(`\n❌ Invalid emails: ${invalidEmails.length}`);
if (invalidEmails.length > 0) {
  console.log('First 30 invalid emails:');
  invalidEmails.slice(0, 30).forEach((item, i) => {
    console.log(`  ${i + 1}. Index ${item.index} (${item.name}): "${item.email}"`);
  });
}

console.log(`\n❌ Invalid email2: ${invalidEmail2.length}`);
if (invalidEmail2.length > 0) {
  console.log('First 30 invalid email2:');
  invalidEmail2.slice(0, 30).forEach((item, i) => {
    console.log(`  ${i + 1}. Index ${item.index} (${item.name}): "${item.email2}"`);
  });
}

console.log('\n📊 Summary:');
console.log(`Total entries: ${data.length}`);
console.log(`Invalid phones: ${invalidPhones.length}`);
console.log(`Invalid emails: ${invalidEmails.length}`);
console.log(`Invalid email2: ${invalidEmail2.length}`);
console.log(`Total validation issues: ${invalidPhones.length + invalidEmails.length + invalidEmail2.length}`);

// These are the entries that will likely fail
const failingIndices = new Set([
  ...invalidPhones.map(p => p.index),
  ...invalidEmails.map(e => e.index),
  ...invalidEmail2.map(e => e.index)
]);

console.log(`\n⚠️  Unique entries that will fail: ${failingIndices.size}`);
if (failingIndices.size > 0 && failingIndices.size <= 50) {
  console.log('Failing indices:', Array.from(failingIndices).sort((a, b) => a - b).join(', '));
}


