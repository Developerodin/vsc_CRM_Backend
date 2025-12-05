# Timeline Analysis Scripts

This document explains how to use the timeline analysis scripts to debug and identify issues with timeline creation for clients.

## Scripts Overview

### 1. `test-timeline-analysis.js` - Quick Overview
**Purpose**: Get a quick overview of your data and find good test clients.

```bash
node test-timeline-analysis.js
```

**What it shows**:
- Total clients, activities, and timelines in your system
- Clients with activities and their timeline counts
- Clients with many timelines (potential duplication issues)
- Activities with subactivities
- Suggested commands for detailed analysis

### 2. `analyze-timeline-creation.js` - Detailed Analysis
**Purpose**: Comprehensive analysis of timeline creation for specific clients or all clients.

```bash
# Analyze specific client
node analyze-timeline-creation.js <clientId>

# Analyze all clients
node analyze-timeline-creation.js

# Analyze clients with specific activity
node analyze-timeline-creation.js "" <activityId>

# Analyze specific client + activity + subactivity
node analyze-timeline-creation.js <clientId> <activityId> <subactivityId>
```

**What it analyzes**:
- Client details and activity assignments
- Timeline count and status distribution
- Subactivity breakdown and timeline mapping
- Duplicate timeline detection
- Missing timeline identification
- Expected vs actual timeline counts
- Common issues and warnings

### 3. `debug-timeline-creation.js` - Logic Debugging
**Purpose**: Debug the timeline creation logic step-by-step without creating actual timelines.

```bash
node debug-timeline-creation.js <clientId>
```

**What it does**:
- Simulates timeline creation logic
- Compares client model vs timeline service logic
- Shows which subactivities would be processed
- Estimates timeline counts based on frequency
- Identifies logic discrepancies
- Safe dry-run mode (doesn't create actual timelines)

## Common Issues to Look For

### 1. Duplicate Timelines
**Symptoms**:
- Multiple timelines for same activity + subactivity + period
- Timeline count much higher than expected

**Check with**:
```bash
node analyze-timeline-creation.js <clientId>
```

Look for "Duplicate Timelines Found" section.

### 2. Missing Timelines
**Symptoms**:
- Activities assigned but no timelines created
- Timeline count much lower than expected

**Check with**:
```bash
node debug-timeline-creation.js <clientId>
```

Look for activities that "Should Process" but have no existing timelines.

### 3. Subactivity Assignment Issues
**Symptoms**:
- Wrong subactivities being processed
- All subactivities processed when only one should be

**Check with**:
```bash
node debug-timeline-creation.js <clientId>
```

Compare "CLIENT MODEL LOGIC" vs "TIMELINE SERVICE LOGIC" sections.

### 4. Frequency Configuration Problems
**Symptoms**:
- Wrong number of timelines for Monthly/Quarterly/Yearly frequencies
- One-time timelines created instead of recurring

**Check with**:
```bash
node analyze-timeline-creation.js <clientId>
```

Look at "Subactivity Breakdown" for frequency and count mismatches.

## Example Workflow

### Step 1: Get Overview
```bash
node test-timeline-analysis.js
```

This will show you:
- System summary
- Clients with potential issues
- Suggested commands to run

### Step 2: Analyze Specific Client
```bash
node analyze-timeline-creation.js 64f7b8c9e1234567890abcde
```

This will give you detailed analysis of timeline creation for that client.

### Step 3: Debug Logic (if issues found)
```bash
node debug-timeline-creation.js 64f7b8c9e1234567890abcde
```

This will help you understand why timelines are being created incorrectly.

## Understanding the Output

### Timeline Analysis Output
```
📊 TIMELINE SUMMARY
==================
📋 Total Timelines: 24
📈 Status Distribution:
   pending: 20
   completed: 4

🔍 DETAILED ACTIVITY ANALYSIS
=============================

📋 Activity: GST Return Filing (ID: 64f7b8c9e1234567890abcde)
   Status: active
   Assigned Date: 2024-01-15T10:30:00.000Z
   Notes: Monthly GST filing required
   Subactivities in Activity: 3
   Client Assigned Subactivity: "64f7b8c9e1234567890abcdf"
   📊 Timelines Created: 12

   📊 Subactivity Breakdown:
     🔸 GSTR-1 Filing (64f7b8c9e1234567890abcdf):
       Count: 12
       Periods: April-2024, May-2024, June-2024, ...
       Frequencies: Monthly
       Status Distribution: {"pending":10,"completed":2}
       ✅ No obvious issues detected
```

### Debug Output
```
🔍 SIMULATING TIMELINE CREATION:
   📊 Processing 3 subactivities...

     🔸 Subactivity: GSTR-1 Filing (64f7b8c9e1234567890abcdf)
       Frequency: Monthly
       Frequency Config: {"dueDay":20,"months":[1,2,3,4,5,6,7,8,9,10,11,12]}
       Should Process: true (Matches assigned subactivity)
       Existing Timelines for this Subactivity: 12
       ✨ Would create RECURRING timelines
       📅 Frequency: Monthly
       📊 Estimated Timeline Count: 12
```

## Troubleshooting

### Script Won't Run
1. Make sure you're in the project root directory
2. Check that MongoDB is running and accessible
3. Verify your database configuration in `src/config/config.js`

### No Data Found
1. Check if you have clients with activities assigned
2. Verify the client ID is correct (use `test-timeline-analysis.js` to find valid IDs)
3. Make sure your database connection is working

### Permission Errors
1. Make sure the scripts are executable: `chmod +x *.js`
2. Run with `node` prefix if needed: `node analyze-timeline-creation.js`

## Safety Notes

- The analysis scripts are read-only and safe to run
- The debug script has timeline creation commented out by default
- Always backup your database before making changes
- Test on a development environment first

## Next Steps

After identifying issues with these scripts:

1. **Fix the timeline creation logic** in `src/models/client.model.js` and `src/services/timeline.service.js`
2. **Clean up duplicate timelines** if found
3. **Re-run the analysis** to verify fixes
4. **Test with new client creation** to ensure the issue is resolved

