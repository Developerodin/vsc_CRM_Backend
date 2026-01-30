import { MONTH_NAMES } from './period.js';

/**
 * Calculate due date based on frequency and period.
 * Supports the config fields used in the UI (dailyTime, monthlyDay/monthlyTime, quarterlyDay/quarterlyTime, yearlyMonth/yearlyDate).
 *
 * @param {'Daily'|'Monthly'|'Quarterly'|'Yearly'} frequency
 * @param {Object} frequencyConfig
 * @param {string} period
 * @returns {Date}
 */
const calculateDueDate = (frequency, frequencyConfig, period) => {
  const now = new Date();

  switch (frequency) {
    case 'Daily': {
      const [y, m, d] = period.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      if (frequencyConfig?.dailyTime) {
        const timeParts = frequencyConfig.dailyTime.match(/(\d+):(\d+)(?:\s*(AM|PM))?/);
        if (timeParts) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const ampm = timeParts[3];
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          dueDate.setHours(hours, minutes, 0, 0);
        }
      }
      return dueDate;
    }

    case 'Monthly': {
      if (frequencyConfig?.monthlyDay) {
        const [monthName, year] = period.split('-');
        const monthIndex = MONTH_NAMES.indexOf(monthName);
        const dueDate = new Date(parseInt(year, 10), monthIndex, frequencyConfig.monthlyDay);

        if (frequencyConfig.monthlyTime) {
          const timeParts = frequencyConfig.monthlyTime.match(/(\d+):(\d+)(?:\s*(AM|PM))?/);
          if (timeParts) {
            let hours = parseInt(timeParts[1], 10);
            const minutes = parseInt(timeParts[2], 10);
            const ampm = timeParts[3];

            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            dueDate.setHours(hours, minutes, 0, 0);
          }
        }

        return dueDate;
      }
      break;
    }

    case 'Quarterly': {
      if (frequencyConfig?.quarterlyDay) {
        const [quarterPart, yearStr] = period.split('-');
        const year = parseInt(yearStr, 10);
        const quarterMonthMap = { Q1: 6, Q2: 9, Q3: 0, Q4: 4 };
        const quarterStartMonth = quarterMonthMap[quarterPart] ?? 6;
        const dueDate = new Date(year, quarterStartMonth, frequencyConfig.quarterlyDay);

        if (frequencyConfig.quarterlyTime) {
          const timeParts = frequencyConfig.quarterlyTime.match(/(\d+):(\d+)(?:\s*(AM|PM))?/);
          if (timeParts) {
            let hours = parseInt(timeParts[1], 10);
            const minutes = parseInt(timeParts[2], 10);
            const ampm = timeParts[3];

            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            dueDate.setHours(hours, minutes, 0, 0);
          }
        }

        return dueDate;
      }
      break;
    }

    case 'Yearly': {
      if (frequencyConfig?.yearlyMonth && frequencyConfig?.yearlyDate) {
        const [startYear] = period.split('-');
        const monthValue = Array.isArray(frequencyConfig.yearlyMonth) ? frequencyConfig.yearlyMonth[0] : frequencyConfig.yearlyMonth;
        const monthIndex = MONTH_NAMES.indexOf(monthValue);

        // For financial year, determine correct year for the month
        const year = monthIndex >= 3 ? parseInt(startYear, 10) : parseInt(startYear, 10) + 1;
        return new Date(year, monthIndex, frequencyConfig.yearlyDate);
      }
      break;
    }
  }

  // Default: first day of current month
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export { calculateDueDate };

