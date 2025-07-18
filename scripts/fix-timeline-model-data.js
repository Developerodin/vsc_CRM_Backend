import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Fix timeline model data script starting...');

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
 * Clean and validate frequency configuration
 * @param {string} frequency - Frequency type
 * @param {Object} frequencyConfig - Frequency configuration
 * @returns {Object} - Cleaned frequency configuration
 */
const cleanFrequencyConfig = (frequency, frequencyConfig) => {
  if (!frequencyConfig) {
    return {};
  }

  const cleaned = {};

  switch (frequency) {
    case 'Hourly':
      if (frequencyConfig.hourlyInterval && frequencyConfig.hourlyInterval >= 1 && frequencyConfig.hourlyInterval <= 24) {
        cleaned.hourlyInterval = frequencyConfig.hourlyInterval;
      }
      break;
      
    case 'Daily':
      if (frequencyConfig.dailyTime && /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.dailyTime)) {
        cleaned.dailyTime = frequencyConfig.dailyTime;
      }
      break;
      
    case 'Weekly':
      if (frequencyConfig.weeklyDays && Array.isArray(frequencyConfig.weeklyDays) && frequencyConfig.weeklyDays.length > 0) {
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        cleaned.weeklyDays = frequencyConfig.weeklyDays.filter(day => validDays.includes(day));
      }
      if (frequencyConfig.weeklyTime && /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.weeklyTime)) {
        cleaned.weeklyTime = frequencyConfig.weeklyTime;
      }
      break;
      
    case 'Monthly':
      if (frequencyConfig.monthlyDay && frequencyConfig.monthlyDay >= 1 && frequencyConfig.monthlyDay <= 31) {
        cleaned.monthlyDay = frequencyConfig.monthlyDay;
      }
      if (frequencyConfig.monthlyTime && /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.monthlyTime)) {
        cleaned.monthlyTime = frequencyConfig.monthlyTime;
      }
      break;
      
    case 'Quarterly':
      if (frequencyConfig.quarterlyMonths && Array.isArray(frequencyConfig.quarterlyMonths) && frequencyConfig.quarterlyMonths.length > 0) {
        const validMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        cleaned.quarterlyMonths = frequencyConfig.quarterlyMonths.filter(month => validMonths.includes(month));
      }
      if (frequencyConfig.quarterlyDay && frequencyConfig.quarterlyDay >= 1 && frequencyConfig.quarterlyDay <= 31) {
        cleaned.quarterlyDay = frequencyConfig.quarterlyDay;
      }
      if (frequencyConfig.quarterlyTime && /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.quarterlyTime)) {
        cleaned.quarterlyTime = frequencyConfig.quarterlyTime;
      }
      break;
      
    case 'Yearly':
      if (frequencyConfig.yearlyMonth && Array.isArray(frequencyConfig.yearlyMonth) && frequencyConfig.yearlyMonth.length > 0) {
        const validMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        cleaned.yearlyMonth = frequencyConfig.yearlyMonth.filter(month => validMonths.includes(month));
      }
      if (frequencyConfig.yearlyDate && frequencyConfig.yearlyDate >= 1 && frequencyConfig.yearlyDate <= 31) {
        cleaned.yearlyDate = frequencyConfig.yearlyDate;
      }
      if (frequencyConfig.yearlyTime && /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.yearlyTime)) {
        cleaned.yearlyTime = frequencyConfig.yearlyTime;
      }
      break;
  }

  return cleaned;
};

/**
 * Create default frequency configuration based on frequency type
 * @param {string} frequency - Frequency type
 * @returns {Object} - Default frequency configuration
 */
const createDefaultFrequencyConfig = (frequency) => {
  switch (frequency) {
    case 'Hourly':
      return { hourlyInterval: 1 };
    case 'Daily':
      return { dailyTime: '9:00 AM' };
    case 'Weekly':
      return { weeklyDays: ['Monday'], weeklyTime: '9:00 AM' };
    case 'Monthly':
      return { monthlyDay: 1, monthlyTime: '9:00 AM' };
    case 'Quarterly':
      return { 
        quarterlyMonths: ['January', 'April', 'July', 'October'], 
        quarterlyDay: 1, 
        quarterlyTime: '9:00 AM' 
      };
    case 'Yearly':
      return { 
        yearlyMonth: ['January'], 
        yearlyDate: 1, 
        yearlyTime: '9:00 AM' 
      };
    default:
      return {};
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
    
    // Find all timelines
    const timelines = await Timeline.find({});
    
    console.log(`Found ${timelines.length} total timelines`);
    
    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const timeline of timelines) {
      try {
        console.log(`\nProcessing timeline ${timeline._id}:`);
        console.log(`  Frequency: ${timeline.frequency}`);
        console.log(`  Status: ${timeline.status}`);
        
        let updates = {};
        let needsUpdate = false;
        
        // 1. Fix frequencyConfig
        if (!timeline.frequencyConfig || Object.keys(timeline.frequencyConfig).length === 0) {
          console.log(`  ⚠️ Missing frequencyConfig - creating default`);
          updates.frequencyConfig = createDefaultFrequencyConfig(timeline.frequency);
          needsUpdate = true;
        } else {
          // Clean existing frequencyConfig
          const cleanedConfig = cleanFrequencyConfig(timeline.frequency, timeline.frequencyConfig);
          if (Object.keys(cleanedConfig).length === 0) {
            console.log(`  ⚠️ Invalid frequencyConfig - creating default`);
            updates.frequencyConfig = createDefaultFrequencyConfig(timeline.frequency);
            needsUpdate = true;
          } else if (JSON.stringify(cleanedConfig) !== JSON.stringify(timeline.frequencyConfig)) {
            console.log(`  🔧 Cleaning frequencyConfig`);
            updates.frequencyConfig = cleanedConfig;
            needsUpdate = true;
          }
        }
        
        // 2. Fix frequencyStatus
        if (!timeline.frequencyStatus || timeline.frequencyStatus.length === 0) {
          console.log(`  ⚠️ Missing frequencyStatus - initializing`);
          const newFrequencyStatus = initializeFrequencyStatus(timeline);
          if (newFrequencyStatus.length > 0) {
            updates.frequencyStatus = newFrequencyStatus;
            needsUpdate = true;
          }
        } else {
          // Validate existing frequencyStatus
          const validStatuses = ['pending', 'completed', 'delayed', 'ongoing'];
          let hasInvalidStatus = false;
          
          for (const fs of timeline.frequencyStatus) {
            if (!fs.period || !validStatuses.includes(fs.status)) {
              hasInvalidStatus = true;
              break;
            }
          }
          
          if (hasInvalidStatus) {
            console.log(`  🔧 Fixing invalid frequencyStatus`);
            const newFrequencyStatus = initializeFrequencyStatus(timeline);
            if (newFrequencyStatus.length > 0) {
              updates.frequencyStatus = newFrequencyStatus;
              needsUpdate = true;
            }
          }
        }
        
        // 3. Fix status enum
        const validStatuses = ['pending', 'completed', 'delayed', 'ongoing'];
        if (!validStatuses.includes(timeline.status)) {
          console.log(`  🔧 Fixing invalid status: ${timeline.status} -> pending`);
          updates.status = 'pending';
          needsUpdate = true;
        }
        
        // 4. Fix frequency enum
        const validFrequencies = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
        if (!validFrequencies.includes(timeline.frequency)) {
          console.log(`  🔧 Fixing invalid frequency: ${timeline.frequency} -> Daily`);
          updates.frequency = 'Daily';
          updates.frequencyConfig = createDefaultFrequencyConfig('Daily');
          needsUpdate = true;
        }
        
        // 5. Fix required fields
        if (!timeline.activity) {
          console.log(`  ❌ Missing required field: activity`);
          errorCount++;
          continue;
        }
        
        if (!timeline.client) {
          console.log(`  ❌ Missing required field: client`);
          errorCount++;
          continue;
        }
        
        if (!timeline.assignedMember) {
          console.log(`  ❌ Missing required field: assignedMember`);
          errorCount++;
          continue;
        }
        
        if (!timeline.branch) {
          console.log(`  ❌ Missing required field: branch`);
          errorCount++;
          continue;
        }
        
        // 6. Fix date fields
        if (timeline.startDate && !(timeline.startDate instanceof Date)) {
          console.log(`  🔧 Fixing startDate format`);
          updates.startDate = new Date(timeline.startDate);
          needsUpdate = true;
        }
        
        if (timeline.endDate && !(timeline.endDate instanceof Date)) {
          console.log(`  🔧 Fixing endDate format`);
          updates.endDate = new Date(timeline.endDate);
          needsUpdate = true;
        }
        
        // 7. Fix turnover field
        if (timeline.turnover !== undefined && timeline.turnover !== null) {
          if (typeof timeline.turnover !== 'number' || isNaN(timeline.turnover)) {
            console.log(`  🔧 Fixing turnover format`);
            updates.turnover = null;
            needsUpdate = true;
          }
        }
        
        // 8. Fix udin array
        if (timeline.udin && Array.isArray(timeline.udin)) {
          let hasInvalidUdin = false;
          const validFrequencies = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
          
          for (const udinItem of timeline.udin) {
            if (!udinItem.fieldName || !udinItem.udin || !validFrequencies.includes(udinItem.frequency)) {
              hasInvalidUdin = true;
              break;
            }
          }
          
          if (hasInvalidUdin) {
            console.log(`  🔧 Fixing invalid udin items`);
            updates.udin = timeline.udin.filter(item => 
              item.fieldName && 
              item.udin && 
              validFrequencies.includes(item.frequency)
            );
            needsUpdate = true;
          }
        }
        
        // Apply updates if needed
        if (needsUpdate) {
          await Timeline.updateOne(
            { _id: timeline._id },
            { $set: updates }
          );
          
          fixedCount++;
          console.log(`  ✅ Fixed timeline`);
        } else {
          skippedCount++;
          console.log(`  ⏭️ No fixes needed`);
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
    const totalTimelines = await Timeline.countDocuments({});
    const validTimelines = await Timeline.countDocuments({
      activity: { $exists: true, $ne: null },
      client: { $exists: true, $ne: null },
      assignedMember: { $exists: true, $ne: null },
      branch: { $exists: true, $ne: null },
      frequency: { $in: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] },
      status: { $in: ['pending', 'completed', 'delayed', 'ongoing'] }
    });
    
    console.log(`\nVerification:`);
    console.log(`- Total timelines: ${totalTimelines}`);
    console.log(`- Valid timelines: ${validTimelines}`);
    console.log(`- Invalid timelines: ${totalTimelines - validTimelines}`);
    
    // Show some examples
    const sampleTimelines = await Timeline.find({}).limit(3);
    
    console.log(`\nSample results:`);
    for (const timeline of sampleTimelines) {
      console.log(`\nTimeline ${timeline._id}:`);
      console.log(`  Frequency: ${timeline.frequency}`);
      console.log(`  Status: ${timeline.status}`);
      console.log(`  Has frequencyConfig: ${!!timeline.frequencyConfig}`);
      console.log(`  Has frequencyStatus: ${timeline.frequencyStatus?.length || 0} periods`);
      console.log(`  Has activity: ${!!timeline.activity}`);
      console.log(`  Has client: ${!!timeline.client}`);
      console.log(`  Has assignedMember: ${!!timeline.assignedMember}`);
      console.log(`  Has branch: ${!!timeline.branch}`);
    }
    
    console.log('\nFix script completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error(`Fix script failed: ${error.message}`);
    process.exit(1);
  }
};

main(); 