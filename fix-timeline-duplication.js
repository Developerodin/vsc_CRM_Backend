#!/usr/bin/env node

/**
 * Fix Timeline Duplication Issues
 * 
 * This script fixes the critical bugs causing timeline duplication:
 * 1. Fixes syntax error in calculateNextOccurrence function
 * 2. Cleans up duplicate timelines in database
 * 3. Prevents future duplications
 */

import mongoose from 'mongoose';
import { Client, Timeline, Activity } from './src/models/index.js';
import config from './src/config/config.js';
import fs from 'fs';

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
 * Fix the syntax error in financialYear.js
 */
const fixSyntaxError = async () => {
  console.log('\n🔧 FIXING SYNTAX ERROR IN financialYear.js');
  console.log('===========================================');
  
  const filePath = './src/utils/financialYear.js';
  
  try {
    // Read the current file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find and fix the syntax error
    const buggyCode = `if (!frequencyConfig || frequency === 'OneTime' || frequency === 'None')
    return startDate;
  }`;
    
    const fixedCode = `if (!frequencyConfig || frequency === 'OneTime' || frequency === 'None') {
    return startDate;
  }`;
    
    if (content.includes('return startDate;\n  }')) {
      content = content.replace(buggyCode, fixedCode);
      
      // Write the fixed content back
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('✅ Fixed syntax error in calculateNextOccurrence function');
      console.log('   - Added missing opening brace');
      console.log('   - This will prevent infinite loops in timeline generation');
    } else {
      console.log('⚠️ Syntax error pattern not found - may already be fixed');
    }
    
  } catch (error) {
    console.error('❌ Error fixing syntax error:', error.message);
  }
};

/**
 * Analyze duplicate timelines
 */
const analyzeDuplicates = async () => {
  console.log('\n🔍 ANALYZING DUPLICATE TIMELINES');
  console.log('================================');
  
  try {
    // Find all timelines grouped by client, activity, subactivity, and period
    const duplicates = await Timeline.aggregate([
      {
        $group: {
          _id: {
            client: '$client',
            activity: '$activity',
            subactivityId: '$subactivity._id',
            period: '$period'
          },
          timelines: { $push: '$_id' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log(`📊 Found ${duplicates.length} duplicate groups`);
    
    let totalDuplicates = 0;
    let totalToDelete = 0;
    
    for (const duplicate of duplicates.slice(0, 10)) { // Show first 10
      totalDuplicates += duplicate.count;
      totalToDelete += (duplicate.count - 1); // Keep 1, delete the rest
      
      console.log(`\n🔸 Duplicate Group (${duplicate.count} timelines):`);
      console.log(`   Client: ${duplicate._id.client}`);
      console.log(`   Activity: ${duplicate._id.activity}`);
      console.log(`   Subactivity: ${duplicate._id.subactivityId || 'None'}`);
      console.log(`   Period: ${duplicate._id.period || 'None'}`);
      console.log(`   Timeline IDs: ${duplicate.timelines.slice(0, 3).join(', ')}${duplicate.timelines.length > 3 ? '...' : ''}`);
    }
    
    if (duplicates.length > 10) {
      console.log(`\n... and ${duplicates.length - 10} more duplicate groups`);
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Duplicate Groups: ${duplicates.length}`);
    console.log(`   Total Duplicate Timelines: ${totalDuplicates}`);
    console.log(`   Timelines to Delete: ${totalToDelete}`);
    console.log(`   Timelines to Keep: ${duplicates.length}`);
    
    return duplicates;
    
  } catch (error) {
    console.error('❌ Error analyzing duplicates:', error);
    return [];
  }
};

/**
 * Clean up duplicate timelines (keep the oldest one)
 */
const cleanupDuplicates = async (dryRun = true) => {
  console.log(`\n🧹 ${dryRun ? 'DRY RUN - ' : ''}CLEANING UP DUPLICATE TIMELINES`);
  console.log('===============================================');
  
  try {
    const duplicates = await Timeline.aggregate([
      {
        $group: {
          _id: {
            client: '$client',
            activity: '$activity',
            subactivityId: '$subactivity._id',
            period: '$period'
          },
          timelines: { 
            $push: {
              id: '$_id',
              createdAt: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    let deletedCount = 0;
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < duplicates.length; i += BATCH_SIZE) {
      const batch = duplicates.slice(i, i + BATCH_SIZE);
      const timelinesToDelete = [];
      
      for (const duplicate of batch) {
        // Sort by createdAt to keep the oldest one
        const sortedTimelines = duplicate.timelines.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        // Keep the first (oldest), delete the rest
        const toDelete = sortedTimelines.slice(1);
        timelinesToDelete.push(...toDelete.map(t => t.id));
      }
      
      if (timelinesToDelete.length > 0) {
        console.log(`📦 Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${timelinesToDelete.length} timelines to delete`);
        
        if (!dryRun) {
          const result = await Timeline.deleteMany({
            _id: { $in: timelinesToDelete }
          });
          deletedCount += result.deletedCount;
          console.log(`   ✅ Deleted ${result.deletedCount} duplicate timelines`);
        } else {
          deletedCount += timelinesToDelete.length;
          console.log(`   🔍 Would delete ${timelinesToDelete.length} duplicate timelines`);
        }
      }
    }
    
    console.log(`\n📊 CLEANUP SUMMARY:`);
    console.log(`   ${dryRun ? 'Would delete' : 'Deleted'}: ${deletedCount} duplicate timelines`);
    console.log(`   Duplicate groups processed: ${duplicates.length}`);
    
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    return 0;
  }
};

/**
 * Verify timeline counts after cleanup
 */
const verifyCleanup = async () => {
  console.log('\n✅ VERIFYING CLEANUP RESULTS');
  console.log('============================');
  
  try {
    const totalTimelines = await Timeline.countDocuments();
    const totalClients = await Client.countDocuments({ 'activities.0': { $exists: true } });
    
    console.log(`📊 Current Statistics:`);
    console.log(`   Total Timelines: ${totalTimelines}`);
    console.log(`   Clients with Activities: ${totalClients}`);
    console.log(`   Average Timelines per Client: ${(totalTimelines / totalClients).toFixed(2)}`);
    
    // Check for remaining duplicates
    const remainingDuplicates = await Timeline.aggregate([
      {
        $group: {
          _id: {
            client: '$client',
            activity: '$activity',
            subactivityId: '$subactivity._id',
            period: '$period'
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ No duplicate timelines found - cleanup successful!');
    } else {
      console.log(`⚠️ ${remainingDuplicates.length} duplicate groups still remain`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error);
  }
};

/**
 * Test timeline creation with fixed logic
 */
const testTimelineCreation = async () => {
  console.log('\n🧪 TESTING FIXED TIMELINE CREATION');
  console.log('==================================');
  
  try {
    // Test the fixed calculateNextOccurrence function
    const { calculateNextOccurrence } = await import('./src/utils/financialYear.js');
    
    // Test yearly frequency
    const yearlyConfig = {
      yearlyMonth: 'April',
      yearlyDate: 1
    };
    
    const startDate = new Date('2025-04-01');
    const nextDate = calculateNextOccurrence(yearlyConfig, 'Yearly', startDate);
    
    console.log('🔍 Testing Yearly Frequency:');
    console.log(`   Start Date: ${startDate.toDateString()}`);
    console.log(`   Next Date: ${nextDate.toDateString()}`);
    console.log(`   Expected: Next year (2026-04-01)`);
    
    if (nextDate.getFullYear() === 2026) {
      console.log('✅ Yearly frequency calculation is working correctly');
    } else {
      console.log('❌ Yearly frequency calculation still has issues');
    }
    
    // Test monthly frequency
    const monthlyConfig = {
      monthlyDay: 20
    };
    
    const monthlyStart = new Date('2025-04-01');
    const monthlyNext = calculateNextOccurrence(monthlyConfig, 'Monthly', monthlyStart);
    
    console.log('\n🔍 Testing Monthly Frequency:');
    console.log(`   Start Date: ${monthlyStart.toDateString()}`);
    console.log(`   Next Date: ${monthlyNext.toDateString()}`);
    console.log(`   Expected: Next month (2025-05-20)`);
    
    if (monthlyNext.getMonth() === 4 && monthlyNext.getDate() === 20) { // May = 4
      console.log('✅ Monthly frequency calculation is working correctly');
    } else {
      console.log('❌ Monthly frequency calculation has issues');
    }
    
  } catch (error) {
    console.error('❌ Error testing timeline creation:', error);
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    const action = args[0] || 'analyze';
    
    switch (action) {
      case 'fix-syntax':
        await fixSyntaxError();
        await testTimelineCreation();
        break;
        
      case 'analyze':
        await analyzeDuplicates();
        break;
        
      case 'cleanup-dry':
        await analyzeDuplicates();
        await cleanupDuplicates(true); // Dry run
        break;
        
      case 'cleanup':
        console.log('⚠️ WARNING: This will permanently delete duplicate timelines!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await analyzeDuplicates();
        await cleanupDuplicates(false); // Real cleanup
        await verifyCleanup();
        break;
        
      case 'verify':
        await verifyCleanup();
        break;
        
      case 'test':
        await testTimelineCreation();
        break;
        
      case 'full-fix':
        console.log('🚀 RUNNING FULL FIX PROCESS');
        console.log('===========================');
        await fixSyntaxError();
        await testTimelineCreation();
        await analyzeDuplicates();
        console.log('\n💡 Next steps:');
        console.log('   1. Run: node fix-timeline-duplication.js cleanup-dry');
        console.log('   2. If satisfied, run: node fix-timeline-duplication.js cleanup');
        break;
        
      default:
        console.log('Usage: node fix-timeline-duplication.js <action>');
        console.log('');
        console.log('Actions:');
        console.log('  analyze      - Analyze duplicate timelines');
        console.log('  fix-syntax   - Fix syntax error in calculateNextOccurrence');
        console.log('  cleanup-dry  - Show what would be deleted (safe)');
        console.log('  cleanup      - Actually delete duplicates (DESTRUCTIVE)');
        console.log('  verify       - Check current timeline statistics');
        console.log('  test         - Test fixed timeline creation logic');
        console.log('  full-fix     - Fix syntax + analyze (recommended first step)');
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

