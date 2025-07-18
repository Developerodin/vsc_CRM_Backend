import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Fix frequency status with configuration script starting...');

/**
 * Generate frequency periods based on frequency type and configuration
 * @param {string} frequency - Frequency type
 * @param {Object} frequencyConfig - Frequency configuration
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<string>} - Array of period identifiers
 */
const generateFrequencyPeriods = (frequency, frequencyConfig, startDate, endDate) => {
  const periods = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Helper function to get day name
  const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };
  
  // Helper function to get month name
  const getMonthName = (date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()];
  };
  
  switch (frequency) {
    case 'Hourly':
      if (frequencyConfig.hourlyInterval) {
        let currentHour = new Date(start);
        while (currentHour <= end) {
          const period = currentHour.toISOString().slice(0, 13).replace('T', '-');
          periods.push(period);
          currentHour.setHours(currentHour.getHours() + frequencyConfig.hourlyInterval);
        }
      }
      break;
      
    case 'Daily':
      if (frequencyConfig.dailyTime) {
        let currentDay = new Date(start);
        while (currentDay <= end) {
          const period = currentDay.toISOString().slice(0, 10);
          periods.push(period);
          currentDay.setDate(currentDay.getDate() + 1);
        }
      }
      break;
      
    case 'Weekly':
      if (frequencyConfig.weeklyDays && frequencyConfig.weeklyDays.length > 0 && frequencyConfig.weeklyTime) {
        let currentDate = new Date(start);
        while (currentDate <= end) {
          const dayName = getDayName(currentDate);
          if (frequencyConfig.weeklyDays.includes(dayName)) {
            const period = currentDate.toISOString().slice(0, 10);
            periods.push(period);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      break;
      
    case 'Monthly':
      if (frequencyConfig.monthlyDay && frequencyConfig.monthlyTime) {
        let currentDate = new Date(start);
        while (currentDate <= end) {
          // Set to the specified day of the month
          const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), frequencyConfig.monthlyDay);
          
          // Check if this date is within our range
          if (targetDate >= start && targetDate <= end) {
            const period = targetDate.toISOString().slice(0, 10);
            periods.push(period);
          }
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
      break;
      
    case 'Quarterly':
      if (frequencyConfig.quarterlyMonths && frequencyConfig.quarterlyMonths.length > 0 && 
          frequencyConfig.quarterlyDay && frequencyConfig.quarterlyTime) {
        let currentDate = new Date(start);
        while (currentDate <= end) {
          const monthName = getMonthName(currentDate);
          if (frequencyConfig.quarterlyMonths.includes(monthName)) {
            // Set to the specified day of the month
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), frequencyConfig.quarterlyDay);
            
            // Check if this date is within our range
            if (targetDate >= start && targetDate <= end) {
              const period = targetDate.toISOString().slice(0, 10);
              periods.push(period);
            }
          }
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
      break;
      
    case 'Yearly':
      if (frequencyConfig.yearlyMonth && frequencyConfig.yearlyMonth.length > 0 && 
          frequencyConfig.yearlyDate && frequencyConfig.yearlyTime) {
        let currentDate = new Date(start);
        while (currentDate <= end) {
          const monthName = getMonthName(currentDate);
          if (frequencyConfig.yearlyMonth.includes(monthName)) {
            // Set to the specified day of the month
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), frequencyConfig.yearlyDate);
            
            // Check if this date is within our range
            if (targetDate >= start && targetDate <= end) {
              const period = targetDate.toISOString().slice(0, 10);
              periods.push(period);
            }
          }
          
          // Move to next year
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
      }
      break;
  }
  
  return periods;
};

/**
 * Initialize frequency status for a timeline
 * @param {Object} timeline - Timeline object
 * @returns {Array} - Array of frequency status objects
 */
const initializeFrequencyStatus = (timeline) => {
  if (!timeline.startDate || !timeline.endDate) {
    return [];
  }
  
  const periods = generateFrequencyPeriods(
    timeline.frequency,
    timeline.frequencyConfig,
    timeline.startDate,
    timeline.endDate
  );
  
  return periods.map(period => ({
    period,
    status: 'pending',
    completedAt: null,
    notes: ''
  }));
};

/**
 * Determine initial status based on existing timeline status
 * @param {string} timelineStatus - Current timeline status
 * @returns {string} - Initial frequency status
 */
const getInitialFrequencyStatus = (timelineStatus) => {
  switch (timelineStatus) {
    case 'completed':
      return 'completed';
    case 'delayed':
      return 'delayed';
    case 'ongoing':
      return 'ongoing';
    default:
      return 'pending';
  }
};

const main = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    
    // Import the Timeline model
    await import('../src/models/timeline.model.js');
    const Timeline = mongoose.model('Timeline');
    
    // Find all timelines with frequency status
    const timelines = await Timeline.find({
      frequencyStatus: { $exists: true, $ne: [] }
    });
    
    console.log(`Found ${timelines.length} timelines with frequency status`);
    
    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const timeline of timelines) {
      try {
        console.log(`\nProcessing timeline ${timeline._id}:`);
        console.log(`  Frequency: ${timeline.frequency}`);
        console.log(`  Status: ${timeline.status}`);
        console.log(`  Start Date: ${timeline.startDate}`);
        console.log(`  End Date: ${timeline.endDate}`);
        console.log(`  Current periods: ${timeline.frequencyStatus.length}`);
        
        let newFrequencyStatus = [];
        
        // If timeline has start and end dates, generate proper frequency periods
        if (timeline.startDate && timeline.endDate) {
          newFrequencyStatus = initializeFrequencyStatus(timeline);
          
          // If timeline is already completed, mark all periods as completed
          if (timeline.status === 'completed') {
            newFrequencyStatus = newFrequencyStatus.map(fs => ({
              ...fs,
              status: 'completed',
              completedAt: timeline.updatedAt || new Date()
            }));
          } else if (timeline.status === 'delayed') {
            // Mark first period as delayed, rest as pending
            newFrequencyStatus = newFrequencyStatus.map((fs, index) => ({
              ...fs,
              status: index === 0 ? 'delayed' : 'pending'
            }));
          } else if (timeline.status === 'ongoing') {
            // Mark first period as ongoing, rest as pending
            newFrequencyStatus = newFrequencyStatus.map((fs, index) => ({
              ...fs,
              status: index === 0 ? 'ongoing' : 'pending'
            }));
          }
          
          console.log(`  New periods: ${newFrequencyStatus.length}`);
          
          if (newFrequencyStatus.length > 0) {
            // Update the timeline with new frequency status
            await Timeline.updateOne(
              { _id: timeline._id },
              { $set: { frequencyStatus: newFrequencyStatus } }
            );
            
            fixedCount++;
            console.log(`  ✅ Fixed timeline with ${newFrequencyStatus.length} periods`);
          } else {
            skippedCount++;
            console.log(`  ⚠️ Skipped - no periods generated (missing frequency config)`);
          }
        } else {
          // For timelines without start/end dates, create a single period
          const currentYear = new Date().getFullYear();
          let period = currentYear.toString();
          
          // Adjust period based on frequency
          switch (timeline.frequency) {
            case 'Hourly':
              period = new Date().toISOString().slice(0, 13).replace('T', '-');
              break;
            case 'Daily':
              period = new Date().toISOString().slice(0, 10);
              break;
            case 'Weekly':
              const weekNumber = Math.ceil((new Date().getDate() + new Date(currentYear, 0, 1).getDay()) / 7);
              period = `${currentYear}-W${weekNumber.toString().padStart(2, '0')}`;
              break;
            case 'Monthly':
              period = new Date().toISOString().slice(0, 7);
              break;
            case 'Quarterly':
              const month = new Date().getMonth();
              const quarter = Math.floor(month / 3) + 1;
              period = `${currentYear}-Q${quarter}`;
              break;
          }
          
          newFrequencyStatus = [{
            period,
            status: getInitialFrequencyStatus(timeline.status),
            completedAt: timeline.status === 'completed' ? (timeline.updatedAt || new Date()) : null,
            notes: ''
          }];
          
          // Update the timeline with new frequency status
          await Timeline.updateOne(
            { _id: timeline._id },
            { $set: { frequencyStatus: newFrequencyStatus } }
          );
          
          fixedCount++;
          console.log(`  ✅ Fixed timeline with single period: ${period}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error fixing timeline ${timeline._id}: ${error.message}`);
      }
    }
    
    console.log(`\nFix completed!`);
    console.log(`- Fixed: ${fixedCount} timelines`);
    console.log(`- Skipped: ${skippedCount} timelines`);
    console.log(`- Errors: ${errorCount} timelines`);
    
    // Verify the fix
    const totalTimelines = await Timeline.countDocuments({
      frequencyStatus: { $exists: true, $ne: [] }
    });
    
    console.log(`\nVerification:`);
    console.log(`- Total timelines with frequency status: ${totalTimelines}`);
    
    // Show some examples
    const sampleTimelines = await Timeline.find({
      frequencyStatus: { $exists: true, $ne: [] }
    }).limit(3);
    
    console.log(`\nSample results:`);
    for (const timeline of sampleTimelines) {
      console.log(`\nTimeline ${timeline._id}:`);
      console.log(`  Frequency: ${timeline.frequency}`);
      console.log(`  Periods: ${timeline.frequencyStatus.length}`);
      if (timeline.frequencyStatus.length > 0) {
        console.log(`  First period: ${timeline.frequencyStatus[0].period} - ${timeline.frequencyStatus[0].status}`);
        if (timeline.frequencyStatus.length > 1) {
          console.log(`  Last period: ${timeline.frequencyStatus[timeline.frequencyStatus.length - 1].period} - ${timeline.frequencyStatus[timeline.frequencyStatus.length - 1].status}`);
        }
      }
    }
    
    console.log('\nFix script completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error(`Fix script failed: ${error.message}`);
    process.exit(1);
  }
};

main(); 