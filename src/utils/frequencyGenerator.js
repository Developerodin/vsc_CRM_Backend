/**
 * Frequency Period Generator Utility
 * 
 * This utility generates frequency status periods based on timeline frequency types
 * and configurations. It supports all 6 frequency types: Hourly, Daily, Weekly,
 * Monthly, Quarterly, and Yearly.
 */

/**
 * Generate frequency periods based on frequency type and configuration
 * @param {string} frequency - The frequency type
 * @param {Object} frequencyConfig - The frequency configuration object
 * @param {Date} startDate - Start date for the timeline
 * @param {Date} endDate - End date for the timeline
 * @returns {Array} Array of frequency status objects
 */
export const generateFrequencyPeriods = (frequency, frequencyConfig, startDate, endDate) => {
  if (!startDate || !endDate) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  switch (frequency) {
    case 'Hourly':
      return generateHourlyPeriods(frequencyConfig, start, end);
    case 'Daily':
      return generateDailyPeriods(frequencyConfig, start, end);
    case 'Weekly':
      return generateWeeklyPeriods(frequencyConfig, start, end);
    case 'Monthly':
      return generateMonthlyPeriods(frequencyConfig, start, end);
    case 'Quarterly':
      return generateQuarterlyPeriods(frequencyConfig, start, end);
    case 'Yearly':
      return generateYearlyPeriods(frequencyConfig, start, end);
    default:
      return [];
  }
};

/**
 * Generate hourly frequency periods
 * @param {Object} config - Frequency configuration
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Array} Array of hourly periods
 */
const generateHourlyPeriods = (config, start, end) => {
  const periods = [];
  const interval = config.hourlyInterval || 1;
  const current = new Date(start);
  
  while (current <= end) {
    const period = current.toISOString().slice(0, 13).replace('T', '-'); // YYYY-MM-DD-HH
    periods.push({
      period,
      status: 'pending',
      completedAt: null,
      notes: ''
    });
    
    // Add interval hours
    current.setHours(current.getHours() + interval);
  }
  
  return periods;
};

/**
 * Generate daily frequency periods
 * @param {Object} config - Frequency configuration
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Array} Array of daily periods
 */
const generateDailyPeriods = (config, start, end) => {
  const periods = [];
  const current = new Date(start);
  
  while (current <= end) {
    const period = current.toISOString().slice(0, 10); // YYYY-MM-DD
    periods.push({
      period,
      status: 'pending',
      completedAt: null,
      notes: ''
    });
    
    // Add 1 day
    current.setDate(current.getDate() + 1);
  }
  
  return periods;
};

/**
 * Generate weekly frequency periods
 * @param {Object} config - Frequency configuration
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Array} Array of weekly periods
 */
const generateWeeklyPeriods = (config, start, end) => {
  const periods = [];
  const weekDays = config.weeklyDays || [];
  if (weekDays.length === 0) return periods;
  
  const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  
  const current = new Date(start);
  
  while (current <= end) {
    const weekStart = new Date(current);
    weekStart.setDate(current.getDate() - current.getDay()); // Start of week (Sunday)
    
    const weekNumber = getWeekNumber(weekStart);
    const year = weekStart.getFullYear();
    const period = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    
    // Check if this week has any of the selected days
    const hasSelectedDays = weekDays.some(day => {
      const dayIndex = dayMap[day];
      const weekDay = new Date(weekStart);
      weekDay.setDate(weekStart.getDate() + dayIndex);
      return weekDay >= start && weekDay <= end;
    });
    
    if (hasSelectedDays) {
      periods.push({
        period,
        status: 'pending',
        completedAt: null,
        notes: ''
      });
    }
    
    // Move to next week
    current.setDate(current.getDate() + 7);
  }
  
  return periods;
};

/**
 * Generate monthly frequency periods
 * @param {Object} config - Frequency configuration
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Array} Array of monthly periods
 */
const generateMonthlyPeriods = (config, start, end) => {
  const periods = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1); // Start of month
  
  while (current <= end) {
    const period = current.toISOString().slice(0, 7); // YYYY-MM
    periods.push({
      period,
      status: 'pending',
      completedAt: null,
      notes: ''
    });
    
    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  
  return periods;
};

/**
 * Generate quarterly frequency periods
 * @param {Object} config - Frequency configuration
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Array} Array of quarterly periods
 */
const generateQuarterlyPeriods = (config, start, end) => {
  const periods = [];
  const selectedMonths = config.quarterlyMonths || [];
  if (selectedMonths.length === 0) return periods;
  
  const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  
  const current = new Date(start.getFullYear(), 0, 1); // Start of year
  
  while (current <= end) {
    const year = current.getFullYear();
    
    // Check each selected month
    selectedMonths.forEach(month => {
      const monthIndex = monthMap[month];
      const monthDate = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0); // Last day of the month
      
      // Check if this month overlaps with the timeline period
      if (monthDate <= end && monthEnd >= start) {
        const quarter = Math.floor(monthIndex / 3) + 1;
        const period = `${year}-Q${quarter}`;
        
        // Only add if not already added
        if (!periods.find(p => p.period === period)) {
          periods.push({
            period,
            status: 'pending',
            completedAt: null,
            notes: ''
          });
        }
      }
    });
    
    // Move to next year
    current.setFullYear(current.getFullYear() + 1);
  }
  
  return periods;
};

/**
 * Generate yearly frequency periods
 * @param {Object} config - Frequency configuration
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Array} Array of yearly periods
 */
const generateYearlyPeriods = (config, start, end) => {
  const periods = [];
  const selectedMonths = config.yearlyMonth || [];
  if (selectedMonths.length === 0) return periods;
  
  const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  
  const current = new Date(start.getFullYear(), 0, 1); // Start of year
  
  while (current <= end) {
    const year = current.getFullYear();
    
    // Generate periods for each selected month in this year
    selectedMonths.forEach(month => {
      const monthIndex = monthMap[month];
      const monthDate = new Date(year, monthIndex, 1);
      
      // Check if this month overlaps with the timeline period
      // A month overlaps if:
      // 1. The month starts before or on the end date AND
      // 2. The month ends after or on the start date
      const monthEnd = new Date(year, monthIndex + 1, 0); // Last day of the month
      
      if (monthDate <= end && monthEnd >= start) {
        const period = `${year}-${month}`;
        
        periods.push({
          period,
          status: 'pending',
          completedAt: null,
          notes: ''
        });
      }
    });
    
    // Move to next year
    current.setFullYear(current.getFullYear() + 1);
  }
  
  return periods;
};

/**
 * Get week number for a given date
 * @param {Date} date - The date to get week number for
 * @returns {number} Week number
 */
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}; 