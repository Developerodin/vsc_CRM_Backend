import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { Client, Activity, Timeline } from '../models/index.js';

/**
 * Create timelines for a client based on activity subactivities
 * @param {ObjectId} clientId - Client ID
 * @param {ObjectId} activityId - Activity ID
 * @param {ObjectId} subactivityId - Subactivity ID (optional)
 * @returns {Promise<Array>} - Array of created timelines
 */
const createTimelinesForClient = async (clientId, activityId, subactivityId = null) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }

  const timelines = [];

  if (subactivityId) {
    // Create timeline for specific subactivity
    const subactivity = activity.subactivities.id(subactivityId);
    if (!subactivity) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subactivity not found');
    }
    
    const timeline = await createTimelineForSubactivity(client, activity, subactivity);
    if (timeline) {
      timelines.push(timeline);
    }
  } else {
    // Create timelines for all subactivities in the activity
    for (const subactivity of activity.subactivities) {
      const timeline = await createTimelineForSubactivity(client, activity, subactivity);
      if (timeline) {
        timelines.push(timeline);
      }
    }
  }

  return timelines;
};

/**
 * Create timeline entries for a subactivity based on its frequency
 * @param {Object} client - Client object
 * @param {Object} activity - Activity object
 * @param {Object} subactivity - Subactivity object
 * @returns {Promise<Array>} - Array of created timelines
 */
const createTimelineForSubactivity = async (client, activity, subactivity) => {
  if (!subactivity.frequency || subactivity.frequency === 'None') {
    return null; // No timeline needed for activities without frequency
  }

  const timelines = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Get financial year (April to March)
  const financialYearStart = currentDate.getMonth() >= 3 ? currentYear : currentYear - 1;
  const financialYearEnd = financialYearStart + 1;
  const financialYear = `${financialYearStart}-${financialYearEnd}`;

  // Copy fields from subactivity to timeline with empty values
  const timelineFields = subactivity.fields.map(field => ({
    fileName: field.name,
    fieldType: field.type,
    fieldValue: null // Empty value initially
  }));

  switch (subactivity.frequency) {
    case 'Monthly':
      // Create timeline for each month in financial year
      for (let month = 3; month <= 14; month++) { // April (3) to March (14)
        const monthIndex = month % 12;
        const monthName = getMonthName(monthIndex);
        const period = `${monthName}-${monthIndex >= 3 ? financialYearStart : financialYearEnd}`;
        
        // Calculate due date based on subactivity configuration
        let dueDate = new Date(monthIndex >= 3 ? financialYearStart : financialYearEnd, monthIndex, 1);
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.monthlyDay) {
          dueDate.setDate(subactivity.frequencyConfig.monthlyDay);
        }
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.monthlyTime) {
          const timeParts = parseTime(subactivity.frequencyConfig.monthlyTime);
          dueDate.setHours(timeParts.hours, timeParts.minutes);
        }

        const timeline = await Timeline.create({
          activity: activity._id,
          client: client._id,
          subactivity: {
            _id: subactivity._id,
            name: subactivity.name,
            frequency: subactivity.frequency,
            frequencyConfig: subactivity.frequencyConfig,
            fields: subactivity.fields
          },
          period,
          dueDate,
          fields: timelineFields,
          branch: client.branch,
          status: 'pending'
        });
        
        timelines.push(timeline);
      }
      break;

    case 'Quarterly':
      // Create timeline for each quarter in financial year
      const quarters = [
        { name: 'Q1', months: [3, 4, 5] },    // April, May, June
        { name: 'Q2', months: [6, 7, 8] },    // July, August, September
        { name: 'Q3', months: [9, 10, 11] },  // October, November, December
        { name: 'Q4', months: [0, 1, 2] }     // January, February, March
      ];

      for (const quarter of quarters) {
        const period = `${quarter.name}-${financialYear}`;
        
        // Calculate due date based on subactivity configuration
        let dueDate = new Date(financialYearStart, quarter.months[0], 1);
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.quarterlyDay) {
          dueDate.setDate(subactivity.frequencyConfig.quarterlyDay);
        }
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.quarterlyTime) {
          const timeParts = parseTime(subactivity.frequencyConfig.quarterlyTime);
          dueDate.setHours(timeParts.hours, timeParts.minutes);
        }

        const timeline = await Timeline.create({
          activity: activity._id,
          client: client._id,
          subactivity: {
            _id: subactivity._id,
            name: subactivity.name,
            frequency: subactivity.frequency,
            frequencyConfig: subactivity.frequencyConfig,
            fields: subactivity.fields
          },
          period,
          dueDate,
          fields: timelineFields,
          branch: client.branch,
          status: 'pending'
        });
        
        timelines.push(timeline);
      }
      break;

    case 'Yearly':
      // Create timeline for the financial year
      const period = financialYear;
      
      // Calculate due date based on subactivity configuration
      let dueDate = new Date(financialYearStart, 3, 1); // April 1st
      if (subactivity.frequencyConfig && subactivity.frequencyConfig.yearlyMonth) {
        // Handle both array and string for backward compatibility
        const monthValue = Array.isArray(subactivity.frequencyConfig.yearlyMonth) 
          ? subactivity.frequencyConfig.yearlyMonth[0] 
          : subactivity.frequencyConfig.yearlyMonth;
        if (monthValue) {
          const monthIndex = getMonthIndex(monthValue);
          dueDate.setMonth(monthIndex);
        }
      }
      if (subactivity.frequencyConfig && subactivity.frequencyConfig.yearlyDate) {
        dueDate.setDate(subactivity.frequencyConfig.yearlyDate);
      }
      if (subactivity.frequencyConfig && subactivity.frequencyConfig.yearlyTime) {
        const timeParts = parseTime(subactivity.frequencyConfig.yearlyTime);
        dueDate.setHours(timeParts.hours, timeParts.minutes);
      }

      const timeline = await Timeline.create({
        activity: activity._id,
        client: client._id,
        subactivity: {
          _id: subactivity._id,
          name: subactivity.name,
          frequency: subactivity.frequency,
          frequencyConfig: subactivity.frequencyConfig,
          fields: subactivity.fields
        },
        period,
        dueDate,
        fields: timelineFields,
        branch: client.branch,
        status: 'pending'
      });
      
      timelines.push(timeline);
      break;

    case 'Daily':
      // Create timeline for current financial year (daily is complex, create monthly for now)
      for (let month = 3; month <= 14; month++) {
        const monthIndex = month % 12;
        const monthName = getMonthName(monthIndex);
        const period = `${monthName}-${monthIndex >= 3 ? financialYearStart : financialYearEnd}`;
        
        let dueDate = new Date(monthIndex >= 3 ? financialYearStart : financialYearEnd, monthIndex, 1);
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.dailyTime) {
          const timeParts = parseTime(subactivity.frequencyConfig.dailyTime);
          dueDate.setHours(timeParts.hours, timeParts.minutes);
        }

        const timeline = await Timeline.create({
          activity: activity._id,
          client: client._id,
          subactivity: {
            _id: subactivity._id,
            name: subactivity.name,
            frequency: subactivity.frequency,
            frequencyConfig: subactivity.frequencyConfig,
            fields: subactivity.fields
          },
          period,
          dueDate,
          fields: timelineFields,
          branch: client.branch,
          status: 'pending'
        });
        
        timelines.push(timeline);
      }
      break;

    case 'Weekly':
      // Create timeline for current financial year (weekly is complex, create monthly for now)
      for (let month = 3; month <= 14; month++) {
        const monthIndex = month % 12;
        const monthName = getMonthName(monthIndex);
        const period = `${monthName}-${monthIndex >= 3 ? financialYearStart : financialYearEnd}`;
        
        let dueDate = new Date(monthIndex >= 3 ? financialYearStart : financialYearEnd, monthIndex, 1);
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.weeklyTime) {
          const timeParts = parseTime(subactivity.frequencyConfig.weeklyTime);
          dueDate.setHours(timeParts.hours, timeParts.minutes);
        }

        const timeline = await Timeline.create({
          activity: activity._id,
          client: client._id,
          subactivity: {
            _id: subactivity._id,
            name: subactivity.name,
            frequency: subactivity.frequency,
            frequencyConfig: subactivity.frequencyConfig,
            fields: subactivity.fields
          },
          period,
          dueDate,
          fields: timelineFields,
          branch: client.branch,
          status: 'pending'
        });
        
        timelines.push(timeline);
      }
      break;

    case 'Hourly':
      // Create timeline for current financial year (hourly is complex, create monthly for now)
      for (let month = 3; month <= 14; month++) {
        const monthIndex = month % 12;
        const monthName = getMonthName(monthIndex);
        const period = `${monthName}-${monthIndex >= 3 ? financialYearStart : financialYearEnd}`;
        
        let dueDate = new Date(monthIndex >= 3 ? financialYearStart : financialYearEnd, monthIndex, 1);
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.hourlyInterval) {
          dueDate.setHours(9); // Default to 9 AM
        }

        const timeline = await Timeline.create({
          activity: activity._id,
          client: client._id,
          subactivity: {
            _id: subactivity._id,
            name: subactivity.name,
            frequency: subactivity.frequency,
            frequencyConfig: subactivity.frequencyConfig,
            fields: subactivity.fields
          },
          period,
          dueDate,
          fields: timelineFields,
          branch: client.branch,
          status: 'pending'
        });
        
        timelines.push(timeline);
      }
      break;
  }

  return timelines;
};

/**
 * Helper function to get month name from month index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} - Month name
 */
const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

/**
 * Helper function to get month index from month name
 * @param {string} monthName - Month name
 * @returns {number} - Month index (0-11)
 */
const getMonthIndex = (monthName) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.indexOf(monthName);
};

/**
 * Helper function to parse time string (HH:MM AM/PM)
 * @param {string} timeString - Time string in format "HH:MM AM/PM"
 * @returns {Object} - Object with hours and minutes
 */
const parseTime = (timeString) => {
  const match = timeString.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!match) {
    return { hours: 9, minutes: 0 }; // Default to 9:00 AM
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
};

export { createTimelinesForClient };
