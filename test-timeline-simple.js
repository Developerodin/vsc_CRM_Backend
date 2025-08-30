import { getCurrentFinancialYear, generateTimelineDates } from './src/utils/financialYear.js';

// Test financial year calculation
console.log('🧪 Testing Financial Year Calculation...\n');

const fy = getCurrentFinancialYear();
console.log(`Current Financial Year: ${fy.yearString}`);
console.log(`Start Date: ${fy.start.toDateString()}`);
console.log(`End Date: ${fy.end.toDateString()}`);

// Test timeline date generation for different frequencies
console.log('\n🧪 Testing Timeline Date Generation...\n');

// Test Monthly frequency
const monthlyConfig = {
  monthlyDay: 20,
  monthlyTime: '09:00 AM'
};

console.log('📅 Monthly Frequency (20th of each month):');
const monthlyDates = generateTimelineDates(monthlyConfig, 'Monthly');
monthlyDates.slice(0, 6).forEach((date, index) => {
  console.log(`  ${index + 1}. ${date.toDateString()} at 09:00 AM`);
});

// Test Quarterly frequency
const quarterlyConfig = {
  quarterlyMonths: ['April', 'July', 'October', 'January'],
  quarterlyDay: 15,
  quarterlyTime: '10:00 AM'
};

console.log('\n📅 Quarterly Frequency (15th of Apr, Jul, Oct, Jan):');
const quarterlyDates = generateTimelineDates(quarterlyConfig, 'Quarterly');
quarterlyDates.forEach((date, index) => {
  console.log(`  ${index + 1}. ${date.toDateString()} at 10:00 AM`);
});

// Test Yearly frequency
const yearlyConfig = {
  yearlyMonth: 'March',
  yearlyDate: 31,
  yearlyTime: '02:00 PM'
};

console.log('\n📅 Yearly Frequency (31st March):');
const yearlyDates = generateTimelineDates(yearlyConfig, 'Yearly');
yearlyDates.forEach((date, index) => {
  console.log(`  ${index + 1}. ${date.toDateString()} at 02:00 PM`);
});

// Test Weekly frequency
const weeklyConfig = {
  weeklyDays: ['Monday', 'Wednesday', 'Friday'],
  weeklyTime: '11:00 AM'
};

console.log('\n📅 Weekly Frequency (Mon, Wed, Fri at 11:00 AM):');
const weeklyDates = generateTimelineDates(weeklyConfig, 'Weekly');
weeklyDates.slice(0, 9).forEach((date, index) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  console.log(`  ${index + 1}. ${dayNames[date.getDay()]} ${date.toDateString()} at 11:00 AM`);
});

// Test Daily frequency
const dailyConfig = {
  dailyTime: '09:30 AM'
};

console.log('\n📅 Daily Frequency (9:30 AM daily):');
const dailyDates = generateTimelineDates(dailyConfig, 'Daily');
dailyDates.slice(0, 7).forEach((date, index) => {
  console.log(`  ${index + 1}. ${date.toDateString()} at 09:30 AM`);
});

console.log('\n✅ Timeline generation test completed!');
console.log('\n📊 Summary:');
console.log(`- Financial Year: ${fy.yearString}`);
console.log(`- Monthly timelines: ${monthlyDates.length}`);
console.log(`- Quarterly timelines: ${quarterlyDates.length}`);
console.log(`- Yearly timelines: ${yearlyDates.length}`);
console.log(`- Weekly timelines: ${weeklyDates.length}`);
console.log(`- Daily timelines: ${dailyDates.length}`);
