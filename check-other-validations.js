import fs from 'fs';

const fileContent = fs.readFileSync('./data.js', 'utf8');
const data = eval(fileContent);

console.log('🔍 Checking for other validation issues...\n');

const issues = [];

data.forEach((client, idx) => {
  const clientIssues = [];
  
  // Check for empty email2 strings (might cause issues)
  if (client.email2 === '') {
    clientIssues.push('empty email2 string');
  }
  
  // Check GST numbers - required fields
  if (client.gstNumbers && Array.isArray(client.gstNumbers)) {
    client.gstNumbers.forEach((gst, gstIdx) => {
      if (!gst.state || gst.state.trim() === '') {
        clientIssues.push(`GST[${gstIdx}]: missing state`);
      }
      if (!gst.gstNumber || gst.gstNumber.trim() === '') {
        clientIssues.push(`GST[${gstIdx}]: missing gstNumber`);
      }
      if (!gst.dateOfRegistration) {
        clientIssues.push(`GST[${gstIdx}]: missing dateOfRegistration`);
      }
      if (!gst.gstUserId || gst.gstUserId.trim() === '') {
        clientIssues.push(`GST[${gstIdx}]: missing gstUserId`);
      }
      
      // Check date format (might fail parsing)
      if (gst.dateOfRegistration) {
        const dateStr = gst.dateOfRegistration;
        // Check if it's in DD.MM.YYYY format
        if (typeof dateStr === 'string' && dateStr.includes('.')) {
          const parts = dateStr.split('.');
          if (parts.length !== 3) {
            clientIssues.push(`GST[${gstIdx}]: invalid date format "${dateStr}"`);
          }
        }
      }
    });
  }
  
  // Check TAN format
  if (client.tanNumber && client.tanNumber.trim() !== '') {
    if (!/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(client.tanNumber)) {
      clientIssues.push(`invalid TAN format: "${client.tanNumber}"`);
    }
  }
  
  // Check CIN format
  if (client.cinNumber && client.cinNumber.trim() !== '') {
    if (!/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(client.cinNumber)) {
      clientIssues.push(`invalid CIN format: "${client.cinNumber}"`);
    }
  }
  
  // Check Udyam format
  if (client.udyamNumber && client.udyamNumber.trim() !== '') {
    if (!/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/.test(client.udyamNumber)) {
      clientIssues.push(`invalid Udyam format: "${client.udyamNumber}"`);
    }
  }
  
  // Check IEC format
  if (client.iecCode && client.iecCode.trim() !== '') {
    if (!/^[0-9]{10}$/.test(client.iecCode)) {
      clientIssues.push(`invalid IEC format: "${client.iecCode}"`);
    }
  }
  
  // Check DOB - empty string might cause issues
  if (client.dob === '') {
    clientIssues.push('empty dob string');
  }
  
  if (clientIssues.length > 0) {
    issues.push({
      index: idx,
      name: client.name,
      issues: clientIssues
    });
  }
});

console.log(`⚠️  Entries with potential issues: ${issues.length}\n`);

if (issues.length > 0) {
  // Group by issue type
  const issueTypes = {};
  issues.forEach(item => {
    item.issues.forEach(issue => {
      const issueType = issue.split(':')[0];
      if (!issueTypes[issueType]) {
        issueTypes[issueType] = [];
      }
      issueTypes[issueType].push(item);
    });
  });
  
  console.log('Issue breakdown:');
  Object.keys(issueTypes).forEach(type => {
    const uniqueEntries = new Set(issueTypes[type].map(i => i.index));
    console.log(`  ${type}: ${uniqueEntries.size} entries`);
  });
  
  console.log('\nFirst 30 entries with issues:');
  issues.slice(0, 30).forEach((item, i) => {
    console.log(`  ${i + 1}. Index ${item.index} (${item.name}):`);
    item.issues.forEach(issue => {
      console.log(`     - ${issue}`);
    });
  });
  
  if (issues.length > 30) {
    console.log(`  ... and ${issues.length - 30} more entries with issues`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`Total entries: ${data.length}`);
console.log(`Entries with issues: ${issues.length}`);
console.log(`Clean entries: ${data.length - issues.length}`);

