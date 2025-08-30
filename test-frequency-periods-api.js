import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test the frequency periods logic
const testFrequencyPeriods = () => {
  console.log('\n🧪 Testing Frequency Periods Logic...\n');
  
  // Test Monthly frequency
  console.log('📅 MONTHLY FREQUENCY:');
  const monthlyPeriods = getMonthlyPeriods('2025-2026');
  monthlyPeriods.forEach((period, index) => {
    console.log(`  ${index + 1}. ${period.period} (${period.startDate.toDateString()} - ${period.endDate.toDateString()})`);
  });
  
  console.log('\n📅 QUARTERLY FREQUENCY:');
  const quarterlyPeriods = getQuarterlyPeriods('2025-2026');
  quarterlyPeriods.forEach((period, index) => {
    console.log(`  ${index + 1}. ${period.period} (${period.startDate.toDateString()} - ${period.endDate.toDateString()})`);
    console.log(`     Months: ${period.months.join(', ')}`);
  });
  
  console.log('\n📅 YEARLY FREQUENCY:');
  const yearlyPeriods = getYearlyPeriods('2025-2026');
  yearlyPeriods.forEach((period, index) => {
    console.log(`  ${index + 1}. ${period.period} (${period.startDate.toDateString()} - ${period.endDate.toDateString()})`);
  });
};

// Helper functions (same logic as in the service)
const getMonthlyPeriods = (financialYear) => {
  const periods = [];
  const [startYear, endYear] = financialYear.split('-').map(Number);
  
  for (let month = 3; month <= 14; month++) {
    const monthIndex = month % 12;
    const monthName = getMonthName(monthIndex);
    const periodYear = monthIndex >= 3 ? startYear : endYear;
    const period = `${monthName}-${periodYear}`;
    
    periods.push({
      period,
      month: monthName,
      year: periodYear,
      monthIndex,
      startDate: new Date(periodYear, monthIndex, 1),
      endDate: new Date(periodYear, monthIndex + 1, 0),
      displayName: `${monthName} ${periodYear}`
    });
  }
  
  return periods;
};

const getQuarterlyPeriods = (financialYear) => {
  const periods = [];
  const [startYear, endYear] = financialYear.split('-').map(Number);
  
  const quarters = [
    { name: 'Q1', months: [3, 4, 5], startMonth: 3, endMonth: 5 },
    { name: 'Q2', months: [6, 7, 8], startMonth: 6, endMonth: 8 },
    { name: 'Q3', months: [9, 10, 11], startMonth: 9, endMonth: 11 },
    { name: 'Q4', months: [0, 1, 2], startMonth: 0, endMonth: 2 }
  ];

  for (const quarter of quarters) {
    const period = `${quarter.name}-${financialYear}`;
    const startDate = new Date(startYear, quarter.startMonth, 1);
    const endDate = new Date(endYear, quarter.endMonth + 1, 0);
    
    periods.push({
      period,
      quarter: quarter.name,
      months: quarter.months.map(m => getMonthName(m)),
      startDate,
      endDate,
      displayName: `${quarter.name} ${financialYear}`,
      financialYear
    });
  }
  
  return periods;
};

const getYearlyPeriods = (financialYear) => {
  const [startYear, endYear] = financialYear.split('-').map(Number);
  
  return [{
    period: financialYear,
    year: startYear,
    startDate: new Date(startYear, 3, 1),
    endDate: new Date(endYear, 2, 31),
    displayName: `Financial Year ${financialYear}`,
    financialYear
  }];
};

const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

// Test different financial years
const testDifferentYears = () => {
  console.log('\n🧪 Testing Different Financial Years...\n');
  
  const years = ['2024-2025', '2025-2026', '2026-2027'];
  
  years.forEach(year => {
    console.log(`\n📅 Financial Year: ${year}`);
    
    // Monthly
    const monthly = getMonthlyPeriods(year);
    console.log(`  Monthly periods: ${monthly.length} (${monthly[0].period} to ${monthly[monthly.length - 1].period})`);
    
    // Quarterly
    const quarterly = getQuarterlyPeriods(year);
    console.log(`  Quarterly periods: ${quarterly.length} (${quarterly.map(q => q.period).join(', ')})`);
    
    // Yearly
    const yearly = getYearlyPeriods(year);
    console.log(`  Yearly periods: ${yearly.length} (${yearly[0].period})`);
  });
};

// Main test function
const runTest = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Starting Frequency Periods API Test...\n');
    
    // Test the logic
    testFrequencyPeriods();
    
    // Test different years
    testDifferentYears();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the test
console.log('🚀 Starting frequency periods test...');
runTest();
