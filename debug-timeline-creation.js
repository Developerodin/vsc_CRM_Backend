#!/usr/bin/env node

/**
 * Debug Timeline Creation Script
 * 
 * This script helps debug timeline creation issues by:
 * 1. Testing timeline creation logic without actually saving to DB
 * 2. Comparing expected vs actual timeline generation
 * 3. Identifying duplicate creation patterns
 * 
 * Usage: node debug-timeline-creation.js <clientId>
 */

import mongoose from 'mongoose';
import { Client, Timeline, Activity } from './src/models/index.js';
import { createClientTimelines } from './src/services/timeline.service.js';
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
 * Debug timeline creation for a specific client
 */
const debugTimelineCreation = async (clientId) => {
  try {
    console.log(`\n🔍 DEBUGGING TIMELINE CREATION`);
    console.log(`==============================`);
    
    // Get client with populated activities
    const client = await Client.findById(clientId).populate('activities.activity');
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    console.log(`👤 Client: ${client.name} (ID: ${clientId})`);
    console.log(`📋 Activities: ${client.activities.length}`);
    
    // Get existing timelines before creation
    const existingTimelines = await Timeline.find({ client: clientId });
    console.log(`📊 Existing Timelines: ${existingTimelines.length}`);
    
    // Analyze each activity
    for (let i = 0; i < client.activities.length; i++) {
      const clientActivity = client.activities[i];
      const activity = clientActivity.activity;
      
      if (!activity) {
        console.log(`⚠️ Activity ${clientActivity.activity} not found`);
        continue;
      }
      
      console.log(`\n📋 Activity ${i + 1}: ${activity.name}`);
      console.log(`   ID: ${activity._id}`);
      console.log(`   Subactivities: ${activity.subactivities?.length || 0}`);
      console.log(`   Client Subactivity: ${JSON.stringify(clientActivity.subactivity)}`);
      
      // Check existing timelines for this activity
      const activityTimelines = existingTimelines.filter(t => 
        t.activity.toString() === activity._id.toString()
      );
      console.log(`   Existing Timelines: ${activityTimelines.length}`);
      
      // Simulate timeline creation logic
      console.log(`\n   🔍 SIMULATING TIMELINE CREATION:`);
      
      if (activity.subactivities && activity.subactivities.length > 0) {
        console.log(`   📊 Processing ${activity.subactivities.length} subactivities...`);
        
        for (const subactivity of activity.subactivities) {
          console.log(`\n     🔸 Subactivity: ${subactivity.name} (${subactivity._id})`);
          console.log(`       Frequency: ${subactivity.frequency || 'None'}`);
          console.log(`       Frequency Config: ${JSON.stringify(subactivity.frequencyConfig)}`);
          
          // Check if this subactivity should be processed
          let shouldProcess = false;
          let reason = '';
          
          if (!clientActivity.subactivity) {
            shouldProcess = true;
            reason = 'No specific subactivity assigned - processing all';
          } else {
            const clientSubactivityId = clientActivity.subactivity._id || clientActivity.subactivity;
            if (clientSubactivityId.toString() === subactivity._id.toString()) {
              shouldProcess = true;
              reason = 'Matches assigned subactivity';
            } else {
              shouldProcess = false;
              reason = 'Does not match assigned subactivity';
            }
          }
          
          console.log(`       Should Process: ${shouldProcess} (${reason})`);
          
          if (shouldProcess) {
            // Check for existing timelines for this subactivity
            const subactivityTimelines = activityTimelines.filter(t => 
              t.subactivity && t.subactivity._id && 
              t.subactivity._id.toString() === subactivity._id.toString()
            );
            
            console.log(`       Existing Timelines for this Subactivity: ${subactivityTimelines.length}`);
            
            if (subactivityTimelines.length > 0) {
              console.log(`       📅 Existing Timeline Details:`);
              subactivityTimelines.forEach((t, idx) => {
                console.log(`         ${idx + 1}. ID: ${t._id}, Period: ${t.period}, Status: ${t.status}, Created: ${t.createdAt}`);
              });
            }
            
            // Simulate what would be created
            if (subactivity.frequency && subactivity.frequency !== 'None' && subactivity.frequencyConfig) {
              console.log(`       ✨ Would create RECURRING timelines`);
              console.log(`       📅 Frequency: ${subactivity.frequency}`);
              
              // Estimate number of timelines based on frequency
              let estimatedCount = 1;
              switch (subactivity.frequency) {
                case 'Monthly':
                  estimatedCount = 12;
                  break;
                case 'Quarterly':
                  estimatedCount = 4;
                  break;
                case 'Yearly':
                  estimatedCount = 1;
                  break;
              }
              console.log(`       📊 Estimated Timeline Count: ${estimatedCount}`);
            } else {
              console.log(`       ✨ Would create ONE-TIME timeline`);
              console.log(`       📊 Estimated Timeline Count: 1`);
            }
          }
        }
      } else {
        console.log(`   📊 No subactivities - would create legacy one-time timeline`);
        
        // Check existing timelines without subactivity
        const legacyTimelines = activityTimelines.filter(t => !t.subactivity);
        console.log(`   Existing Legacy Timelines: ${legacyTimelines.length}`);
      }
    }
    
    // Test actual timeline creation (dry run)
    console.log(`\n🧪 TESTING ACTUAL TIMELINE CREATION (DRY RUN)`);
    console.log(`============================================`);
    
    try {
      // Create a test client object with just the activities we want to test
      const testActivities = client.activities.map(ca => ({
        activity: ca.activity._id,
        subactivity: ca.subactivity,
        assignedDate: ca.assignedDate,
        status: ca.status,
        notes: ca.notes
      }));
      
      console.log(`🔬 Testing timeline creation with ${testActivities.length} activities...`);
      
      // This would actually create timelines - be careful!
      // const createdTimelines = await createClientTimelines(client, testActivities);
      // console.log(`✅ Created ${createdTimelines.length} timelines`);
      
      console.log(`⚠️ Actual timeline creation skipped for safety`);
      console.log(`   To enable actual creation, uncomment the lines in the script`);
      
    } catch (error) {
      console.error(`❌ Timeline creation test failed:`, error.message);
    }
    
    // Final summary
    console.log(`\n📋 SUMMARY`);
    console.log(`=========`);
    console.log(`👤 Client: ${client.name}`);
    console.log(`📋 Activities: ${client.activities.length}`);
    console.log(`📊 Current Timelines: ${existingTimelines.length}`);
    
    // Check for potential issues
    const issues = [];
    
    // Check for activities without timelines
    for (const clientActivity of client.activities) {
      const activityTimelines = existingTimelines.filter(t => 
        t.activity.toString() === clientActivity.activity._id.toString()
      );
      
      if (activityTimelines.length === 0) {
        issues.push(`Activity ${clientActivity.activity.name} has no timelines`);
      }
    }
    
    // Check for duplicate timelines
    const timelineGroups = {};
    existingTimelines.forEach(timeline => {
      const key = `${timeline.activity}-${timeline.subactivity?._id || 'none'}-${timeline.period || 'none'}`;
      timelineGroups[key] = (timelineGroups[key] || 0) + 1;
    });
    
    Object.entries(timelineGroups).forEach(([key, count]) => {
      if (count > 1) {
        issues.push(`Duplicate timelines detected: ${key} (${count} instances)`);
      }
    });
    
    if (issues.length > 0) {
      console.log(`⚠️ Issues Found:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log(`✅ No obvious issues detected`);
    }
    
  } catch (error) {
    console.error('❌ Error debugging timeline creation:', error);
    throw error;
  }
};

/**
 * Compare timeline creation logic between client model and service
 */
const compareTimelineLogic = async (clientId) => {
  try {
    console.log(`\n🔍 COMPARING TIMELINE CREATION LOGIC`);
    console.log(`===================================`);
    
    const client = await Client.findById(clientId).populate('activities.activity');
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    console.log(`👤 Client: ${client.name}`);
    
    // Check what the client model post-save middleware would do
    console.log(`\n📋 CLIENT MODEL LOGIC:`);
    console.log(`=====================`);
    
    for (const clientActivity of client.activities) {
      const activity = clientActivity.activity;
      if (!activity) continue;
      
      console.log(`\n📋 Activity: ${activity.name}`);
      console.log(`   Client Subactivity: ${JSON.stringify(clientActivity.subactivity)}`);
      
      if (activity.subactivities && activity.subactivities.length > 0) {
        for (const subactivity of activity.subactivities) {
          const isAssignedSubactivity = clientActivity.subactivity && 
            clientActivity.subactivity.toString() === subactivity._id.toString();
          
          const shouldProcess = !clientActivity.subactivity || isAssignedSubactivity;
          
          console.log(`   🔸 ${subactivity.name}: ${shouldProcess ? 'WOULD PROCESS' : 'WOULD SKIP'}`);
          
          if (shouldProcess) {
            if (subactivity.frequency && subactivity.frequency !== 'None' && subactivity.frequencyConfig) {
              console.log(`     → Recurring timeline (${subactivity.frequency})`);
            } else {
              console.log(`     → One-time timeline`);
            }
          }
        }
      } else {
        console.log(`   → Legacy one-time timeline (no subactivities)`);
      }
    }
    
    // Check what the timeline service would do
    console.log(`\n📋 TIMELINE SERVICE LOGIC:`);
    console.log(`=========================`);
    
    const testActivities = client.activities.map(ca => ({
      activity: ca.activity._id,
      subactivity: ca.subactivity,
      assignedDate: ca.assignedDate,
      status: ca.status,
      notes: ca.notes
    }));
    
    // Simulate the service logic (without actually creating timelines)
    for (const activityItem of testActivities) {
      const activity = await Activity.findById(activityItem.activity);
      if (!activity) continue;
      
      console.log(`\n📋 Activity: ${activity.name}`);
      console.log(`   Activity Item Subactivity: ${JSON.stringify(activityItem.subactivity)}`);
      
      if (activity.subactivities && activity.subactivities.length > 0) {
        for (const subactivity of activity.subactivities) {
          let isAssignedSubactivity = false;
          
          if (activityItem.subactivity) {
            const clientSubactivityId = activityItem.subactivity._id || activityItem.subactivity;
            isAssignedSubactivity = clientSubactivityId.toString() === subactivity._id.toString();
          }
          
          const shouldProcess = !activityItem.subactivity || isAssignedSubactivity;
          
          console.log(`   🔸 ${subactivity.name}: ${shouldProcess ? 'WOULD PROCESS' : 'WOULD SKIP'}`);
          
          if (shouldProcess) {
            if (subactivity.frequency && subactivity.frequency !== 'None' && subactivity.frequencyConfig) {
              console.log(`     → Recurring timeline (${subactivity.frequency})`);
            } else {
              console.log(`     → One-time timeline`);
            }
          }
        }
      } else {
        console.log(`   → Legacy one-time timeline (no subactivities)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error comparing timeline logic:', error);
    throw error;
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    await connectDB();
    
    const clientId = process.argv[2];
    if (!clientId) {
      console.error('❌ Please provide a client ID as argument');
      console.log('Usage: node debug-timeline-creation.js <clientId>');
      process.exit(1);
    }
    
    await debugTimelineCreation(clientId);
    await compareTimelineLogic(clientId);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Debug complete. Database connection closed.');
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

