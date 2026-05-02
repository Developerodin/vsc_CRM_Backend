import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { Client, Activity, Timeline } from '../models/index.js';
import { getCurrentFinancialYear } from '../utils/financialYear.js';
import { upsertRecurringTimeline } from './timelineUpsert.service.js';

/**
 * Detect GST-related subactivities (aligned with timelineGenerator/processors.js).
 * @param {Object} subactivity - Activity subdocument
 * @returns {boolean}
 */
const isGstRelatedSubactivity = (subactivity) => {
  if (!subactivity) return false;
  const name = (subactivity.name || '').toLowerCase();
  if (name.includes('gst')) return true;
  if (Array.isArray(subactivity.fields)) {
    return subactivity.fields.some((field) => (field.name || '').toLowerCase().includes('gst'));
  }
  return false;
};

/**
 * Upsert recurring timeline(s): GST subactivities with client gstNumbers create one row per registration (state + metadata).
 * @param {Object} client - Client mongoose doc
 * @param {Object} subactivity - Subactivity snapshot passed to upsert
 * @param {Object} basePayload - Arguments for upsertRecurringTimeline excluding state/metadata
 * @returns {Promise<Array>} Created/found timeline documents
 */
const upsertRecurringWithGstBranch = async (client, subactivity, basePayload) => {
  const clientGstNumbers = Array.isArray(client.gstNumbers) ? client.gstNumbers : [];
  if (isGstRelatedSubactivity(subactivity) && clientGstNumbers.length > 0) {
    const rows = [];
    for (const gstNumber of clientGstNumbers) {
      const { timeline } = await upsertRecurringTimeline({
        ...basePayload,
        state: gstNumber.state,
        metadata: {
          gstNumber: gstNumber.gstNumber,
          gstState: gstNumber.state,
          gstUserId: gstNumber.gstUserId,
          gstId: gstNumber._id?.toString() || gstNumber._id,
        },
      });
      rows.push(timeline);
    }
    return rows;
  }
  const { timeline } = await upsertRecurringTimeline(basePayload);
  return [timeline];
};

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
    
    const batch = await createTimelineForSubactivity(client, activity, subactivity);
    if (batch?.length) {
      timelines.push(...batch);
    }
  } else {
    // Create timelines for all subactivities in the activity
    for (const subactivity of activity.subactivities) {
      const batch = await createTimelineForSubactivity(client, activity, subactivity);
      if (batch?.length) {
        timelines.push(...batch);
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
 * @returns {Promise<Array>} - Flat array of created/upserted timelines (possibly empty before switch return)
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
  const { yearString: currentFYString } = getCurrentFinancialYear();

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

        const batch = await upsertRecurringWithGstBranch(client, subactivity, {
          clientId: client._id,
          activityId: activity._id,
          branchId: client.branch,
          period,
          dueDate,
          subactivity,
          financialYear: currentFYString || financialYear,
        });
        timelines.push(...batch);
      }
      break;

    case 'Quarterly':
      // Register: July=Q1, October=Q2, January=Q3, May=Q4 (quarter due months in FY Apr–Mar)
      const quarters = [
        { name: 'Q1', monthIndex: 6, yearOffset: 0 },   // July startYear
        { name: 'Q2', monthIndex: 9, yearOffset: 0 },   // October startYear
        { name: 'Q3', monthIndex: 0, yearOffset: 1 },   // January endYear
        { name: 'Q4', monthIndex: 4, yearOffset: 0 },   // May startYear
      ];

      for (const quarter of quarters) {
        const dueYear = quarter.yearOffset === 1 ? financialYearEnd : financialYearStart;
        const period = `${quarter.name}-${dueYear}`;

        let dueDate = new Date(dueYear, quarter.monthIndex, 1);
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.quarterlyDay) {
          dueDate.setDate(subactivity.frequencyConfig.quarterlyDay);
        }
        if (subactivity.frequencyConfig && subactivity.frequencyConfig.quarterlyTime) {
          const timeParts = parseTime(subactivity.frequencyConfig.quarterlyTime);
          dueDate.setHours(timeParts.hours, timeParts.minutes);
        }

        const batch = await upsertRecurringWithGstBranch(client, subactivity, {
          clientId: client._id,
          activityId: activity._id,
          branchId: client.branch,
          period,
          dueDate,
          subactivity,
          financialYear: currentFYString || financialYear,
        });
        timelines.push(...batch);
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

      {
        const batch = await upsertRecurringWithGstBranch(client, subactivity, {
          clientId: client._id,
          activityId: activity._id,
          branchId: client.branch,
          period,
          dueDate,
          subactivity,
          financialYear: currentFYString || financialYear,
        });
        timelines.push(...batch);
      }
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

        const batch = await upsertRecurringWithGstBranch(client, subactivity, {
          clientId: client._id,
          activityId: activity._id,
          branchId: client.branch,
          period,
          dueDate,
          subactivity,
          financialYear: currentFYString || financialYear,
        });
        timelines.push(...batch);
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

        const batch = await upsertRecurringWithGstBranch(client, subactivity, {
          clientId: client._id,
          activityId: activity._id,
          branchId: client.branch,
          period,
          dueDate,
          subactivity,
          financialYear: currentFYString || financialYear,
        });
        timelines.push(...batch);
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

        const batch = await upsertRecurringWithGstBranch(client, subactivity, {
          clientId: client._id,
          activityId: activity._id,
          branchId: client.branch,
          period,
          dueDate,
          subactivity,
          financialYear: currentFYString || financialYear,
        });
        timelines.push(...batch);
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
