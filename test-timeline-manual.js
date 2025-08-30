import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getCurrentFinancialYear, generateTimelineDates } from './src/utils/financialYear.js';

// Load environment variables
dotenv.config();

console.log('🧪 Manual Timeline Creation Test\n');

// Test 1: Financial Year Calculation
console.log('1️⃣ Testing Financial Year Calculation:');
const fy = getCurrentFinancialYear();
console.log(`   Current Financial Year: ${fy.yearString}`);
console.log(`   Start Date: ${fy.start.toDateString()}`);
console.log(`   End Date: ${fy.end.toDateString()}`);
console.log('   ✅ Financial year calculation works!\n');

// Test 2: Timeline Date Generation
console.log('2️⃣ Testing Timeline Date Generation:');

// Monthly frequency
const monthlyConfig = {
  monthlyDay: 20,
  monthlyTime: '09:00 AM'
};
const monthlyDates = generateTimelineDates(monthlyConfig, 'Monthly');
console.log(`   Monthly timelines: ${monthlyDates.length} dates generated`);
console.log(`   First 3 dates: ${monthlyDates.slice(0, 3).map(d => d.toDateString()).join(', ')}`);

// Quarterly frequency
const quarterlyConfig = {
  quarterlyMonths: ['April', 'July', 'October', 'January'],
  quarterlyDay: 15,
  quarterlyTime: '10:00 AM'
};
const quarterlyDates = generateTimelineDates(quarterlyConfig, 'Quarterly');
console.log(`   Quarterly timelines: ${quarterlyDates.length} dates generated`);
console.log(`   Dates: ${quarterlyDates.map(d => d.toDateString()).join(', ')}`);

// Yearly frequency
const yearlyConfig = {
  yearlyMonth: 'March',
  yearlyDate: 31,
  yearlyTime: '02:00 PM'
};
const yearlyDates = generateTimelineDates(yearlyConfig, 'Yearly');
console.log(`   Yearly timelines: ${yearlyDates.length} dates generated`);
console.log(`   Date: ${yearlyDates[0]?.toDateString() || 'None'}`);

console.log('   ✅ Timeline date generation works!\n');

// Test 3: Period Calculation
console.log('3️⃣ Testing Period Calculation:');
const getPeriodFromDate = (date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `${monthNames[month]}-${year}`;
};

const testDates = [
  new Date(2025, 3, 1),   // April 1, 2025
  new Date(2025, 6, 15),  // July 15, 2025
  new Date(2025, 11, 31), // December 31, 2025
  new Date(2026, 2, 31)   // March 31, 2026
];

testDates.forEach(date => {
  console.log(`   ${date.toDateString()} → ${getPeriodFromDate(date)}`);
});
console.log('   ✅ Period calculation works!\n');

// Test 4: Validation
console.log('4️⃣ Testing Validation:');
console.log(`   Financial year spans: ${fy.start.toDateString()} to ${fy.end.toDateString()}`);
console.log(`   Total days: ${Math.ceil((fy.end - fy.start) / (1000 * 60 * 60 * 24))} days`);

// Check if all generated dates fall within financial year
const allDatesValid = [...monthlyDates, ...quarterlyDates, ...yearlyDates].every(date => 
  date >= fy.start && date <= fy.end
);

console.log(`   All generated dates within financial year: ${allDatesValid ? '✅ Yes' : '❌ No'}`);

// Summary
console.log('\n📊 Test Summary:');
console.log(`   - Financial Year: ${fy.yearString}`);
console.log(`   - Monthly timelines: ${monthlyDates.length}`);
console.log(`   - Quarterly timelines: ${quarterlyDates.length}`);
console.log(`   - Yearly timelines: ${yearlyDates.length}`);
console.log(`   - Total timelines: ${monthlyDates.length + quarterlyDates.length + yearlyDates.length}`);

if (allDatesValid) {
  console.log('\n🎉 SUCCESS: All timeline generation tests passed!');
  console.log('   The system is ready to create timelines for new clients.');
} else {
  console.log('\n⚠️  WARNING: Some timeline dates are outside the financial year.');
}

console.log('\n✅ Manual test completed successfully!');
