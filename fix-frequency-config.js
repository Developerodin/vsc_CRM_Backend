#!/usr/bin/env node

/**
 * Fix Frequency Configuration Issues
 * 
 * This script fixes missing or incorrect frequency configurations in activities:
 * 1. Sets proper quarterlyMonths for quarterly subactivities
 * 2. Sets proper yearlyMonth for yearly subactivities
 * 3. Updates existing timelines with correct configurations
 */

import mongoose from 'mongoose';
import { Activity, Timeline } from './src/models/index.js';
import config from './src/config/config.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

/**
 * Default frequency configurations
 */
const DEFAULT_CONFIGS = {
  quarterly: {
    quarterlyMonths: ['April', 'July', 'October', 'January'], // Standard quarterly months
    quarterlyDay: 1
  },
  yearly: {
    yearlyMonth: 'March', // Default to March for most yearly activities
    yearlyDate: 31 // End of financial year
  },
  yearlySpecial: {
    'Income Tax Return': { yearlyMonth: 'July', yearlyDate: 31 },
    'Statutory Audit': { yearlyMonth: 'September', yearlyDate: 30 },
    'Tax Audit': { yearlyMonth: 'September', yearlyDate: 30 },
    'Legal Litigation': { yearlyMonth: 'March', yearlyDate: 31 }
  }
};

/**
 * Analyze current frequency configurations
 */
const analyzeFrequencyConfigs = async () => {
  console.log('\n🔍 ANALYZING FREQUENCY CONFIGURATIONS');
  console.log('====================================');
  
  const activities = await Activity.find({}).lean();
  const issues = [];
  
  activities.forEach(activity => {
    activity.subactivities.forEach(sub => {
      if (sub.frequency === 'Quarterly') {
        if (!sub.frequencyConfig?.quarterlyMonths || sub.frequencyConfig.quarterlyMonths.length === 0) {
          issues.push({
            type: 'QUARTERLY_MONTHS_MISSING',
            activityId: activity._id,
            activityName: activity.name,
            subactivityId: sub._id,
            subactivityName: sub.name,
            current: sub.frequencyConfig
          });
        }
      } else if (sub.frequency === 'Yearly') {
        if (!sub.frequencyConfig?.yearlyMonth) {
          issues.push({
            type: 'YEARLY_MONTH_MISSING',
            activityId: activity._id,
            activityName: activity.name,
            subactivityId: sub._id,
            subactivityName: sub.name,
            current: sub.frequencyConfig
          });
        }
      }
    });
  });
  
  console.log(`📊 Found ${issues.length} frequency configuration issues:`);
  
  const quarterlyIssues = issues.filter(i => i.type === 'QUARTERLY_MONTHS_MISSING');
  const yearlyIssues = issues.filter(i => i.type === 'YEARLY_MONTH_MISSING');
  
  console.log(`   🔸 Quarterly issues: ${quarterlyIssues.length}`);
  console.log(`   🔸 Yearly issues: ${yearlyIssues.length}`);
  
  if (quarterlyIssues.length > 0) {
    console.log('\n❌ Quarterly Issues:');
    quarterlyIssues.forEach(issue => {
      console.log(`   - ${issue.activityName} → ${issue.subactivityName}`);
      console.log(`     Current: ${JSON.stringify(issue.current)}`);
    });
  }
  
  if (yearlyIssues.length > 0) {
    console.log('\n❌ Yearly Issues:');
    yearlyIssues.forEach(issue => {
      console.log(`   - ${issue.activityName} → ${issue.subactivityName}`);
      console.log(`     Current: ${JSON.stringify(issue.current)}`);
    });
  }
  
  return issues;
};

/**
 * Fix frequency configurations in activities
 */
const fixActivityConfigurations = async (dryRun = true) => {
  console.log(`\n🔧 ${dryRun ? 'DRY RUN - ' : ''}FIXING ACTIVITY CONFIGURATIONS`);
  console.log('===============================================');
  
  const activities = await Activity.find({});
  let fixedCount = 0;
  
  for (const activity of activities) {
    let activityModified = false;
    
    for (const subactivity of activity.subactivities) {
      if (subactivity.frequency === 'Quarterly') {
        if (!subactivity.frequencyConfig?.quarterlyMonths || subactivity.frequencyConfig.quarterlyMonths.length === 0) {
          console.log(`🔧 Fixing quarterly config for: ${activity.name} → ${subactivity.name}`);
          
          if (!dryRun) {
            subactivity.frequencyConfig = {
              ...subactivity.frequencyConfig,
              ...DEFAULT_CONFIGS.quarterly
            };
            activityModified = true;
          }
          
          console.log(`   ✅ Set quarterlyMonths: ${JSON.stringify(DEFAULT_CONFIGS.quarterly.quarterlyMonths)}`);
          fixedCount++;
        }
      } else if (subactivity.frequency === 'Yearly') {
        if (!subactivity.frequencyConfig?.yearlyMonth) {
          console.log(`🔧 Fixing yearly config for: ${activity.name} → ${subactivity.name}`);
          
          // Use special config if available, otherwise default
          const specialConfig = DEFAULT_CONFIGS.yearlySpecial[subactivity.name];
          const configToUse = specialConfig || DEFAULT_CONFIGS.yearly;
          
          if (!dryRun) {
            subactivity.frequencyConfig = {
              ...subactivity.frequencyConfig,
              ...configToUse
            };
            activityModified = true;
          }
          
          console.log(`   ✅ Set yearlyMonth: ${configToUse.yearlyMonth}, yearlyDate: ${configToUse.yearlyDate}`);
          fixedCount++;
        }
      }
    }
    
    if (activityModified && !dryRun) {
      await activity.save();
      console.log(`💾 Saved activity: ${activity.name}`);
    }
  }
  
  console.log(`\n📊 ${dryRun ? 'Would fix' : 'Fixed'} ${fixedCount} frequency configurations`);
  return fixedCount;
};

/**
 * Update existing timelines with correct frequency configurations
 */
const updateTimelineConfigurations = async (dryRun = true) => {
  console.log(`\n🔄 ${dryRun ? 'DRY RUN - ' : ''}UPDATING TIMELINE CONFIGURATIONS`);
  console.log('================================================');
  
  // Get all timelines with frequency but empty/missing config
  const timelinesWithIssues = await Timeline.find({
    $or: [
      { 
        frequency: 'Quarterly',
        $or: [
          { 'frequencyConfig.quarterlyMonths': { $exists: false } },
          { 'frequencyConfig.quarterlyMonths': { $size: 0 } }
        ]
      },
      {
        frequency: 'Yearly',
        'frequencyConfig.yearlyMonth': { $exists: false }
      }
    ]
  }).populate('activity');
  
  console.log(`📊 Found ${timelinesWithIssues.length} timelines with configuration issues`);
  
  let updatedCount = 0;
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < timelinesWithIssues.length; i += BATCH_SIZE) {
    const batch = timelinesWithIssues.slice(i, i + BATCH_SIZE);
    console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(timelinesWithIssues.length/BATCH_SIZE)}`);
    
    const bulkOps = [];
    
    for (const timeline of batch) {
      let newConfig = { ...timeline.frequencyConfig };
      
      if (timeline.frequency === 'Quarterly') {
        newConfig = {
          ...newConfig,
          ...DEFAULT_CONFIGS.quarterly
        };
        console.log(`   🔧 Updating quarterly timeline: ${timeline._id}`);
      } else if (timeline.frequency === 'Yearly') {
        // Try to get config from subactivity name
        const subactivityName = timeline.subactivity?.name;
        const specialConfig = DEFAULT_CONFIGS.yearlySpecial[subactivityName];
        const configToUse = specialConfig || DEFAULT_CONFIGS.yearly;
        
        newConfig = {
          ...newConfig,
          ...configToUse
        };
        console.log(`   🔧 Updating yearly timeline: ${timeline._id} (${subactivityName})`);
      }
      
      if (!dryRun) {
        bulkOps.push({
          updateOne: {
            filter: { _id: timeline._id },
            update: { 
              $set: { 
                frequencyConfig: newConfig,
                'subactivity.frequencyConfig': newConfig
              }
            }
          }
        });
      }
      
      updatedCount++;
    }
    
    if (bulkOps.length > 0 && !dryRun) {
      await Timeline.bulkWrite(bulkOps);
      console.log(`   💾 Updated ${bulkOps.length} timelines in batch`);
    }
  }
  
  console.log(`\n📊 ${dryRun ? 'Would update' : 'Updated'} ${updatedCount} timeline configurations`);
  return updatedCount;
};

/**
 * Verify the fixes
 */
const verifyFixes = async () => {
  console.log('\n✅ VERIFYING FIXES');
  console.log('==================');
  
  // Check activities
  const activities = await Activity.find({}).lean();
  let quarterlyFixed = 0;
  let yearlyFixed = 0;
  let stillBroken = 0;
  
  activities.forEach(activity => {
    activity.subactivities.forEach(sub => {
      if (sub.frequency === 'Quarterly') {
        if (sub.frequencyConfig?.quarterlyMonths && sub.frequencyConfig.quarterlyMonths.length > 0) {
          quarterlyFixed++;
        } else {
          stillBroken++;
        }
      } else if (sub.frequency === 'Yearly') {
        if (sub.frequencyConfig?.yearlyMonth) {
          yearlyFixed++;
        } else {
          stillBroken++;
        }
      }
    });
  });
  
  console.log(`📊 Activity Configuration Status:`);
  console.log(`   ✅ Quarterly configs fixed: ${quarterlyFixed}`);
  console.log(`   ✅ Yearly configs fixed: ${yearlyFixed}`);
  console.log(`   ❌ Still broken: ${stillBroken}`);
  
  // Check timelines
  const brokenTimelines = await Timeline.countDocuments({
    $or: [
      { 
        frequency: 'Quarterly',
        $or: [
          { 'frequencyConfig.quarterlyMonths': { $exists: false } },
          { 'frequencyConfig.quarterlyMonths': { $size: 0 } }
        ]
      },
      {
        frequency: 'Yearly',
        'frequencyConfig.yearlyMonth': { $exists: false }
      }
    ]
  });
  
  console.log(`📊 Timeline Configuration Status:`);
  console.log(`   ❌ Timelines still broken: ${brokenTimelines}`);
  
  if (stillBroken === 0 && brokenTimelines === 0) {
    console.log('🎉 All frequency configurations are now fixed!');
  } else {
    console.log('⚠️ Some issues remain - may need manual intervention');
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    await connectDB();
    
    const action = process.argv[2] || 'analyze';
    
    switch (action) {
      case 'analyze':
        await analyzeFrequencyConfigs();
        break;
        
      case 'fix-dry':
        await analyzeFrequencyConfigs();
        await fixActivityConfigurations(true);
        await updateTimelineConfigurations(true);
        break;
        
      case 'fix':
        console.log('⚠️ WARNING: This will modify activity and timeline data!');
        console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await analyzeFrequencyConfigs();
        await fixActivityConfigurations(false);
        await updateTimelineConfigurations(false);
        await verifyFixes();
        break;
        
      case 'verify':
        await verifyFixes();
        break;
        
      default:
        console.log('Usage: node fix-frequency-config.js <action>');
        console.log('');
        console.log('Actions:');
        console.log('  analyze    - Analyze frequency configuration issues');
        console.log('  fix-dry    - Show what would be fixed (safe)');
        console.log('  fix        - Actually fix the configurations (MODIFIES DATA)');
        console.log('  verify     - Verify current status of configurations');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Fix complete. Database connection closed.');
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

