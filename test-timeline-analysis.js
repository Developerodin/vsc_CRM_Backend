#!/usr/bin/env node

/**
 * Quick Test Script for Timeline Analysis
 * 
 * This script helps you quickly find clients and test the timeline analysis
 */

import mongoose from 'mongoose';
import { Client, Timeline, Activity } from './src/models/index.js';
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
 * Find clients with activities and timelines
 */
const findTestClients = async () => {
  try {
    console.log(`\n🔍 FINDING TEST CLIENTS`);
    console.log(`=======================`);
    
    // Find clients with activities
    const clientsWithActivities = await Client.find({
      'activities.0': { $exists: true }
    }).select('_id name email activities').limit(10);
    
    console.log(`📊 Found ${clientsWithActivities.length} clients with activities`);
    
    for (const client of clientsWithActivities) {
      // Count timelines for this client
      const timelineCount = await Timeline.countDocuments({ client: client._id });
      
      console.log(`\n👤 ${client.name} (${client._id})`);
      console.log(`   📧 Email: ${client.email || 'N/A'}`);
      console.log(`   📋 Activities: ${client.activities.length}`);
      console.log(`   📊 Timelines: ${timelineCount}`);
      
      if (timelineCount > 0) {
        // Show timeline distribution
        const timelines = await Timeline.find({ client: client._id })
          .select('activity subactivity status period frequency')
          .populate('activity', 'name');
        
        const statusCounts = timelines.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`   📈 Status: ${JSON.stringify(statusCounts)}`);
        
        // Check for potential duplicates
        const timelineKeys = new Set();
        let duplicates = 0;
        
        timelines.forEach(t => {
          const key = `${t.activity._id}-${t.subactivity?._id || 'none'}-${t.period || 'none'}`;
          if (timelineKeys.has(key)) {
            duplicates++;
          } else {
            timelineKeys.add(key);
          }
        });
        
        if (duplicates > 0) {
          console.log(`   ⚠️ Potential Duplicates: ${duplicates}`);
        }
        
        console.log(`   💡 Test Command: node analyze-timeline-creation.js ${client._id}`);
        console.log(`   💡 Debug Command: node debug-timeline-creation.js ${client._id}`);
      }
    }
    
    // Find clients with many timelines (potential duplication issues)
    console.log(`\n🔍 CLIENTS WITH MANY TIMELINES`);
    console.log(`==============================`);
    
    const timelineCounts = await Timeline.aggregate([
      {
        $group: {
          _id: '$client',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: 10 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    for (const item of timelineCounts) {
      const client = await Client.findById(item._id).select('name email');
      if (client) {
        console.log(`👤 ${client.name}: ${item.count} timelines`);
        console.log(`   💡 Analyze: node analyze-timeline-creation.js ${client._id}`);
      }
    }
    
    // Show activities with subactivities
    console.log(`\n🔍 ACTIVITIES WITH SUBACTIVITIES`);
    console.log(`===============================`);
    
    const activitiesWithSubs = await Activity.find({
      'subactivities.0': { $exists: true }
    }).select('name subactivities').limit(5);
    
    activitiesWithSubs.forEach(activity => {
      console.log(`📋 ${activity.name} (${activity._id})`);
      console.log(`   🔸 Subactivities: ${activity.subactivities.length}`);
      activity.subactivities.forEach(sub => {
        console.log(`     - ${sub.name} (${sub.frequency || 'No frequency'})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error finding test clients:', error);
    throw error;
  }
};

/**
 * Quick timeline summary
 */
const quickSummary = async () => {
  try {
    console.log(`\n📊 QUICK SUMMARY`);
    console.log(`===============`);
    
    const totalClients = await Client.countDocuments();
    const clientsWithActivities = await Client.countDocuments({
      'activities.0': { $exists: true }
    });
    const totalTimelines = await Timeline.countDocuments();
    const totalActivities = await Activity.countDocuments();
    const activitiesWithSubs = await Activity.countDocuments({
      'subactivities.0': { $exists: true }
    });
    
    console.log(`👥 Total Clients: ${totalClients}`);
    console.log(`📋 Clients with Activities: ${clientsWithActivities}`);
    console.log(`📊 Total Timelines: ${totalTimelines}`);
    console.log(`🎯 Total Activities: ${totalActivities}`);
    console.log(`🔸 Activities with Subactivities: ${activitiesWithSubs}`);
    
    if (clientsWithActivities > 0) {
      const avgTimelines = (totalTimelines / clientsWithActivities).toFixed(2);
      console.log(`📈 Average Timelines per Client: ${avgTimelines}`);
    }
    
    // Timeline status distribution
    const statusCounts = await Timeline.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log(`📈 Timeline Status Distribution:`);
    statusCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating summary:', error);
    throw error;
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    await connectDB();
    
    await quickSummary();
    await findTestClients();
    
    console.log(`\n💡 USAGE EXAMPLES:`);
    console.log(`=================`);
    console.log(`# Analyze specific client:`);
    console.log(`node analyze-timeline-creation.js <clientId>`);
    console.log(`\n# Debug specific client:`);
    console.log(`node debug-timeline-creation.js <clientId>`);
    console.log(`\n# Analyze all clients:`);
    console.log(`node analyze-timeline-creation.js`);
    console.log(`\n# Analyze clients with specific activity:`);
    console.log(`node analyze-timeline-creation.js "" <activityId>`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Test complete. Database connection closed.');
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

