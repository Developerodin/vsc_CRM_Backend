/**
 * Utility functions for financial year calculations and timeline generation
 */

/**
 * Register quarter mapping: July=Q1, October=Q2, January=Q3, May=Q4 (month indices 0–11).
 * Used for timelines and register display so quarterly periods match.
 */
export const REGISTER_QUARTER_MONTH = { Q1: 6, Q2: 9, Q3: 0, Q4: 4 };
export const REGISTER_MONTH_QUARTER = { 6: 'Q1', 9: 'Q2', 0: 'Q3', 4: 'Q4' };

/** Get quarter (Q1–Q4) from month index using register mapping. */
export const getQuarterFromMonthRegister = (monthIndex) => REGISTER_MONTH_QUARTER[monthIndex] ?? null;

/** Get month index (0–11) for start of quarter using register mapping. */
export const getMonthFromQuarterRegister = (quarter) => REGISTER_QUARTER_MONTH[quarter] ?? 6;

/**
 * Get current financial year (April to March)
 * @returns {Object} Object containing start and end dates of current financial year
 */
export const getCurrentFinancialYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 0-indexed to 1-indexed
  
  let financialYearStart, financialYearEnd;
  
  if (currentMonth >= 4) {
    // April to December - current year to next year
    financialYearStart = new Date(currentYear, 3, 1); // April 1st
    financialYearEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
  } else {
    // January to March - previous year to current year
    financialYearStart = new Date(currentYear - 1, 3, 1); // April 1st previous year
    financialYearEnd = new Date(currentYear, 2, 31); // March 31st current year
  }
  
  return {
    start: financialYearStart,
    end: financialYearEnd,
    yearString: `${financialYearStart.getFullYear()}-${financialYearEnd.getFullYear()}`
  };
};

/**
 * Calculate next occurrence date based on frequency configuration
 * @param {Object} frequencyConfig - Frequency configuration object
 * @param {String} frequency - Frequency type
 * @param {Date} startDate - Start date for calculations
 * @returns {Date} Next occurrence date
 */
export const calculateNextOccurrence = (frequencyConfig, frequency, startDate = new Date()) => {
  if (!frequencyConfig || frequency === 'OneTime' || frequency === 'None') {
    return startDate;
  }

  const nextDate = new Date(startDate);
  
  switch (frequency) {
    case 'Hourly':
      if (frequencyConfig.hourlyInterval) {
        nextDate.setHours(nextDate.getHours() + frequencyConfig.hourlyInterval);
      }
      break;
      
    case 'Daily':
      if (frequencyConfig.dailyTime) {
        const [hours, minutes] = frequencyConfig.dailyTime.includes('AM') || frequencyConfig.dailyTime.includes('PM') 
          ? parse12HourTime(frequencyConfig.dailyTime)
          : parse24HourTime(frequencyConfig.dailyTime);
        nextDate.setHours(hours, minutes, 0, 0);
        if (nextDate <= startDate) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
      break;
      
    case 'Weekly':
      if (frequencyConfig.weeklyDays && frequencyConfig.weeklyDays.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = nextDate.getDay();
        const targetDays = frequencyConfig.weeklyDays.map(day => dayNames.indexOf(day));
        
        // Find next target day
        let daysToAdd = 1;
        while (daysToAdd <= 7) {
          const checkDate = new Date(nextDate);
          checkDate.setDate(checkDate.getDate() + daysToAdd);
          if (targetDays.includes(checkDate.getDay())) {
            nextDate.setDate(nextDate.getDate() + daysToAdd);
            break;
          }
          daysToAdd++;
        }
        
        if (frequencyConfig.weeklyTime) {
          const [hours, minutes] = parse12HourTime(frequencyConfig.weeklyTime);
          nextDate.setHours(hours, minutes, 0, 0);
        }
      }
      break;
      
    case 'Monthly':
      if (frequencyConfig.monthlyDay) {
        // Always move to next month for monthly frequency
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(frequencyConfig.monthlyDay);
        
        if (frequencyConfig.monthlyTime) {
          const [hours, minutes] = frequencyConfig.monthlyTime.includes('AM') || frequencyConfig.monthlyTime.includes('PM') 
            ? parse12HourTime(frequencyConfig.monthlyTime)
            : parse24HourTime(frequencyConfig.monthlyTime);
          nextDate.setHours(hours, minutes, 0, 0);
        }
      }
      break;
      
    case 'Quarterly':
      if (frequencyConfig.quarterlyMonths && frequencyConfig.quarterlyMonths.length > 0) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const targetMonthIndices = frequencyConfig.quarterlyMonths.map((m) => monthNames.indexOf(m)).filter((i) => i >= 0);
        const day = Math.min(frequencyConfig.quarterlyDay || 1, 31);
        const year = nextDate.getFullYear();

        // Build due-date candidates for this year and next (covers Dec -> Jan wrap)
        const candidates = [];
        for (const monthIndex of targetMonthIndices) {
          const lastDay = new Date(year, monthIndex + 1, 0).getDate();
          const d = new Date(year, monthIndex, Math.min(day, lastDay));
          if (frequencyConfig.quarterlyTime) {
            const [h, m] = frequencyConfig.quarterlyTime.includes('AM') || frequencyConfig.quarterlyTime.includes('PM')
              ? parse12HourTime(frequencyConfig.quarterlyTime)
              : parse24HourTime(frequencyConfig.quarterlyTime);
            d.setHours(h, m, 0, 0);
          }
          candidates.push(d);
        }
        for (const monthIndex of targetMonthIndices) {
          const lastDay = new Date(year + 1, monthIndex + 1, 0).getDate();
          const d = new Date(year + 1, monthIndex, Math.min(day, lastDay));
          if (frequencyConfig.quarterlyTime) {
            const [h, m] = frequencyConfig.quarterlyTime.includes('AM') || frequencyConfig.quarterlyTime.includes('PM')
              ? parse12HourTime(frequencyConfig.quarterlyTime)
              : parse24HourTime(frequencyConfig.quarterlyTime);
            d.setHours(h, m, 0, 0);
          }
          candidates.push(d);
        }
        candidates.sort((a, b) => a - b);
        const next = candidates.find((d) => d >= startDate);
        if (next) {
          nextDate.setTime(next.getTime());
        }
      } else {
        // Default quarterly: every 3 months
        nextDate.setMonth(nextDate.getMonth() + 3);
      }
      break;
      
    case 'Yearly':
      if (frequencyConfig.yearlyMonth && frequencyConfig.yearlyDate) {
        // Handle both array and string for backward compatibility
        const monthValue = Array.isArray(frequencyConfig.yearlyMonth) 
          ? frequencyConfig.yearlyMonth[0] 
          : frequencyConfig.yearlyMonth;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const targetMonth = monthNames.indexOf(monthValue);
        nextDate.setMonth(targetMonth);
        nextDate.setDate(frequencyConfig.yearlyDate);
        
        if (nextDate <= startDate) {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        
        if (frequencyConfig.yearlyTime) {
          const [hours, minutes] = parse12HourTime(frequencyConfig.yearlyTime);
          nextDate.setHours(hours, minutes, 0, 0);
        }
      }
      break;
  }
  
  return nextDate;
};

/**
 * Parse 12-hour time format (e.g., "09:30 AM")
 * @param {String} timeString - Time string in 12-hour format
 * @returns {Array} [hours, minutes]
 */
const parse12HourTime = (timeString) => {
  const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return [0, 0];
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return [hours, minutes];
};

/**
 * Parse 24-hour time format (e.g., "17:30")
 * @param {String} timeString - Time string in 24-hour format
 * @returns {Array} [hours, minutes]
 */
const parse24HourTime = (timeString) => {
  const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return [0, 0];
  
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  
  return [hours, minutes];
};

/**
 * Generate timeline dates for the current financial year
 * @param {Object} frequencyConfig - Frequency configuration
 * @param {String} frequency - Frequency type
 * @returns {Array} Array of timeline dates for the financial year
 */
export const generateTimelineDates = (frequencyConfig, frequency) => {
  if (!frequencyConfig || frequency === 'OneTime' || frequency === 'None') {
    return [];
  }

  const { start: fyStart, end: fyEnd } = getCurrentFinancialYear();
  const dates = [];
  let currentDate = new Date(fyStart);
  
  while (currentDate <= fyEnd) {
    dates.push(new Date(currentDate));
    currentDate = calculateNextOccurrence(frequencyConfig, frequency, currentDate);
    
    // Prevent infinite loop - for monthly should be ~12, quarterly ~4, yearly ~1
    if (dates.length > 50) break;
  }
  
  return dates;
};
