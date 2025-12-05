#!/usr/bin/env node

/**
 * Timeline Creation Analysis Script
 * 
 * This script analyzes timeline creation for clients to identify:
 * - Duplicate timeline creation issues
 * - Missing timelines
 * - Incorrect timeline data
 * - Activity and subactivity mapping problems
 * 
 * Usage: node analyze-timeline-creation.js [clientId] [activityId] [subactivityId]
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
 * Analyze timeline creation for a specific client
 */
const analyzeClientTimelines = async (clientId, activityId = null, subactivityId = null) => {
  try {
    console.log(`\n🔍 ANALYZING CLIENT TIMELINES`);
    console.log(`=====================================`);
    
    // Get client details
    const client = await Client.findById(clientId).populate('activities.activity');
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    console.log(`👤 Client: ${client.name} (ID: ${clientId})`);
    console.log(`📧 Email: ${client.email || 'N/A'}`);
    console.log(`🏢 Branch: ${client.branch}`);
    console.log(`📋 Total Activities: ${client.activities.length}`);
    console.log(`📅 Created: ${client.createdAt}`);
    console.log(`🔄 Updated: ${client.updatedAt}`);
    
    // Get all timelines for this client
    const allTimelines = await Timeline.find({ client: clientId })
      .populate('activity', 'name subactivities')
      .sort({ createdAt: 1 });
    
    console.log(`\n📊 TIMELINE SUMMARY`);
    console.log(`==================`);
    console.log(`📋 Total Timelines: ${allTimelines.length}`);
    
    // Group timelines by status
    const statusGroups = allTimelines.reduce((acc, timeline) => {
      acc[timeline.status] = (acc[timeline.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`📈 Status Distribution:`);
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // Analyze each client activity
    console.log(`\n🔍 DETAILED ACTIVITY ANALYSIS`);
    console.log(`=============================`);
    
    const analysisResults = [];
    
    for (const clientActivity of client.activities) {
      const activity = clientActivity.activity;
      if (!activity) {
        console.log(`⚠️ Activity not found for client activity: ${clientActivity.activity}`);
        continue;
      }
      
      // Skip if specific activity filter is applied
      if (activityId && activity._id.toString() !== activityId) {
        continue;
      }
      
      console.log(`\n📋 Activity: ${activity.name} (ID: ${activity._id})`);
      console.log(`   Status: ${clientActivity.status}`);
      console.log(`   Assigned Date: ${clientActivity.assignedDate}`);
      console.log(`   Notes: ${clientActivity.notes || 'None'}`);
      console.log(`   Subactivities in Activity: ${activity.subactivities?.length || 0}`);
      
      // Check if client has specific subactivity assigned
      if (clientActivity.subactivity) {
        console.log(`   Client Assigned Subactivity: ${JSON.stringify(clientActivity.subactivity)}`);
      } else {
        console.log(`   Client Assigned Subactivity: None (should process all subactivities)`);
      }
      
      // Find timelines for this activity
      const activityTimelines = allTimelines.filter(timeline => 
        timeline.activity._id.toString() === activity._id.toString()
      );
      
      console.log(`   📊 Timelines Created: ${activityTimelines.length}`);
      
      // Analyze subactivity distribution
      const subactivityAnalysis = {};
      
      activityTimelines.forEach(timeline => {
        const key = timeline.subactivity 
          ? `${timeline.subactivity.name} (${timeline.subactivity._id})`
          : 'No Subactivity';
        
        if (!subactivityAnalysis[key]) {
          subactivityAnalysis[key] = {
            count: 0,
            timelines: [],
            periods: new Set(),
            frequencies: new Set(),
            statuses: {}
          };
        }
        
        subactivityAnalysis[key].count++;
        subactivityAnalysis[key].timelines.push({
          id: timeline._id,
          status: timeline.status,
          period: timeline.period,
          frequency: timeline.frequency,
          dueDate: timeline.dueDate,
          createdAt: timeline.createdAt
        });
        subactivityAnalysis[key].periods.add(timeline.period);
        subactivityAnalysis[key].frequencies.add(timeline.frequency);
        subactivityAnalysis[key].statuses[timeline.status] = 
          (subactivityAnalysis[key].statuses[timeline.status] || 0) + 1;
      });
      
      // Display subactivity analysis
      console.log(`   📊 Subactivity Breakdown:`);
      Object.entries(subactivityAnalysis).forEach(([subactivityKey, data]) => {
        console.log(`     🔸 ${subactivityKey}:`);
        console.log(`       Count: ${data.count}`);
        console.log(`       Periods: ${Array.from(data.periods).join(', ') || 'None'}`);
        console.log(`       Frequencies: ${Array.from(data.frequencies).join(', ') || 'None'}`);
        console.log(`       Status Distribution: ${JSON.stringify(data.statuses)}`);
        
        // Check for potential issues
        const issues = [];
        
        // Check for duplicates in same period
        const periodCounts = {};
        data.timelines.forEach(t => {
          if (t.period) {
            periodCounts[t.period] = (periodCounts[t.period] || 0) + 1;
          }
        });
        
        Object.entries(periodCounts).forEach(([period, count]) => {
          if (count > 1) {
            issues.push(`Duplicate timelines in period ${period} (${count} timelines)`);
          }
        });
        
        // Check for missing expected timelines based on frequency
        const frequencies = Array.from(data.frequencies);
        if (frequencies.includes('Monthly') && data.count < 12) {
          issues.push(`Monthly frequency but only ${data.count} timelines (expected ~12 for full year)`);
        }
        if (frequencies.includes('Quarterly') && data.count < 4) {
          issues.push(`Quarterly frequency but only ${data.count} timelines (expected ~4 for full year)`);
        }
        if (frequencies.includes('Yearly') && data.count > 1) {
          issues.push(`Yearly frequency but ${data.count} timelines (expected 1)`);
        }
        
        if (issues.length > 0) {
          console.log(`       ⚠️ Issues Found:`);
          issues.forEach(issue => console.log(`         - ${issue}`));
        } else {
          console.log(`       ✅ No obvious issues detected`);
        }
      });
      
      // Store analysis results
      analysisResults.push({
        activityId: activity._id,
        activityName: activity.name,
        clientSubactivity: clientActivity.subactivity,
        totalTimelines: activityTimelines.length,
        subactivityBreakdown: Object.fromEntries(
          Object.entries(subactivityAnalysis).map(([key, data]) => [
            key, 
            {
              count: data.count,
              periods: Array.from(data.periods),
              frequencies: Array.from(data.frequencies),
              statuses: data.statuses
            }
          ])
        ),
        timelines: activityTimelines.map(t => ({
          id: t._id,
          subactivity: t.subactivity ? {
            id: t.subactivity._id,
            name: t.subactivity.name
          } : null,
          status: t.status,
          period: t.period,
          frequency: t.frequency,
          dueDate: t.dueDate,
          createdAt: t.createdAt
        }))
      });
    }
    
    // Generate summary report
    console.log(`\n📋 SUMMARY REPORT`);
    console.log(`================`);
    
    const totalExpectedTimelines = client.activities.reduce((total, clientActivity) => {
      const activity = clientActivity.activity;
      if (!activity || !activity.subactivities) return total;
      
      // If client has specific subactivity, count only that one
      if (clientActivity.subactivity) {
        return total + 1; // Simplified - actual count depends on frequency
      }
      
      // If no specific subactivity, count all subactivities
      return total + activity.subactivities.length;
    }, 0);
    
    console.log(`📊 Expected vs Actual:`);
    console.log(`   Activities Assigned: ${client.activities.length}`);
    console.log(`   Estimated Expected Timelines: ${totalExpectedTimelines} (rough estimate)`);
    console.log(`   Actual Timelines Created: ${allTimelines.length}`);
    
    if (allTimelines.length > totalExpectedTimelines * 2) {
      console.log(`   ⚠️ WARNING: Significantly more timelines than expected - possible duplication issue`);
    } else if (allTimelines.length < totalExpectedTimelines * 0.5) {
      console.log(`   ⚠️ WARNING: Significantly fewer timelines than expected - possible missing timelines`);
    } else {
      console.log(`   ✅ Timeline count appears reasonable`);
    }
    
    // Check for common issues
    console.log(`\n🔍 COMMON ISSUES CHECK`);
    console.log(`=====================`);
    
    // Check for duplicate timelines (same activity, subactivity, period)
    const timelineKeys = new Map();
    const duplicates = [];
    
    allTimelines.forEach(timeline => {
      const key = `${timeline.activity._id}-${timeline.subactivity?._id || 'none'}-${timeline.period || 'none'}`;
      if (timelineKeys.has(key)) {
        duplicates.push({
          key,
          timelines: [timelineKeys.get(key), timeline]
        });
      } else {
        timelineKeys.set(key, timeline);
      }
    });
    
    if (duplicates.length > 0) {
      console.log(`❌ Duplicate Timelines Found: ${duplicates.length} sets`);
      duplicates.forEach((dup, index) => {
        console.log(`   ${index + 1}. Key: ${dup.key}`);
        dup.timelines.forEach(t => {
          console.log(`      - Timeline ${t._id} (Created: ${t.createdAt})`);
        });
      });
    } else {
      console.log(`✅ No duplicate timelines detected`);
    }
    
    // Check for timelines without proper subactivity data
    const timelinesWithoutSubactivity = allTimelines.filter(t => 
      !t.subactivity && t.activity.subactivities && t.activity.subactivities.length > 0
    );
    
    if (timelinesWithoutSubactivity.length > 0) {
      console.log(`⚠️ Timelines without subactivity data: ${timelinesWithoutSubactivity.length}`);
    } else {
      console.log(`✅ All timelines have proper subactivity data`);
    }
    
    return analysisResults;
    
  } catch (error) {
    console.error('❌ Error analyzing client timelines:', error);
    throw error;
  }
};

/**
 * Analyze all clients (or filtered by activity/subactivity)
 */
const analyzeAllClients = async (activityId = null, subactivityId = null) => {
  try {
    console.log(`\n🔍 ANALYZING ALL CLIENTS`);
    console.log(`=======================`);
    
    let filter = {};
    if (activityId) {
      filter['activities.activity'] = activityId;
    }
    
    const clients = await Client.find(filter).select('_id name email activities');
    console.log(`📊 Total Clients to Analyze: ${clients.length}`);
    
    const summaryResults = [];
    
    for (const client of clients) {
      try {
        console.log(`\n--- Analyzing Client: ${client.name} ---`);
        const results = await analyzeClientTimelines(client._id, activityId, subactivityId);
        summaryResults.push({
          clientId: client._id,
          clientName: client.name,
          results
        });
      } catch (error) {
        console.error(`❌ Error analyzing client ${client.name}:`, error.message);
      }
    }
    
    // Generate overall summary
    console.log(`\n📋 OVERALL SUMMARY`);
    console.log(`=================`);
    
    const totalTimelines = summaryResults.reduce((total, client) => 
      total + client.results.reduce((clientTotal, activity) => 
        clientTotal + activity.totalTimelines, 0), 0);
    
    console.log(`📊 Total Clients Analyzed: ${summaryResults.length}`);
    console.log(`📊 Total Timelines Found: ${totalTimelines}`);
    console.log(`📊 Average Timelines per Client: ${(totalTimelines / summaryResults.length).toFixed(2)}`);
    
    return summaryResults;
    
  } catch (error) {
    console.error('❌ Error analyzing all clients:', error);
    throw error;
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    const clientId = args[0];
    const activityId = args[1];
    const subactivityId = args[2];
    
    if (clientId) {
      // Analyze specific client
      await analyzeClientTimelines(clientId, activityId, subactivityId);
    } else {
      // Analyze all clients
      await analyzeAllClients(activityId, subactivityId);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Analysis complete. Database connection closed.');
  }
};

// Export functions for use in other scripts
export {
  analyzeClientTimelines,
  analyzeAllClients,
  connectDB
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

