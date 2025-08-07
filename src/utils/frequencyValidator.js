/**
 * Validates frequency configuration based on frequency type
 * @param {string} frequency - The frequency type
 * @param {Object} frequencyConfig - The frequency configuration object
 * @returns {string|null} - Error message if validation fails, null if valid
 */
export const validateFrequencyConfig = (frequency, frequencyConfig) => {
  if (!frequency || !frequencyConfig) {
    return null;
  }

  switch (frequency) {
    case 'Hourly':
      if (!frequencyConfig.hourlyInterval) {
        return 'hourlyInterval is required for Hourly frequency';
      }
      break;
    case 'Daily':
      if (!frequencyConfig.dailyTime) {
        return 'dailyTime is required for Daily frequency';
      }
      break;
    case 'Weekly':
      if (!frequencyConfig.weeklyDays || !frequencyConfig.weeklyTime) {
        return 'weeklyDays and weeklyTime are required for Weekly frequency';
      }
      break;
    case 'Monthly':
      if (!frequencyConfig.monthlyDay || !frequencyConfig.monthlyTime) {
        return 'monthlyDay and monthlyTime are required for Monthly frequency';
      }
      break;
    case 'Quarterly':
      if (!frequencyConfig.quarterlyMonths || !frequencyConfig.quarterlyDay || !frequencyConfig.quarterlyTime) {
        return 'quarterlyMonths, quarterlyDay, and quarterlyTime are required for Quarterly frequency';
      }
      break;
    case 'Yearly':
      if (!frequencyConfig.yearlyMonth || !frequencyConfig.yearlyDate || !frequencyConfig.yearlyTime) {
        return 'yearlyMonth, yearlyDate, and yearlyTime are required for Yearly frequency';
      }
      break;
    default:
      return 'Invalid frequency type';
  }

  return null;
};

/**
 * Joi custom validation function for frequency configuration
 * @param {Object} value - The object containing frequency and frequencyConfig
 * @param {Object} helpers - Joi helpers object
 * @returns {Object} - The validated value or error
 */
export const validateFrequencyWithConfig = (value, helpers) => {
  const { frequency, frequencyConfig } = value;

  // If frequency is specified, frequencyConfig should also be provided
  if (frequency && !frequencyConfig) {
    return helpers.message('frequencyConfig is required when frequency is specified');
  }

  // Validate frequency configuration
  const error = validateFrequencyConfig(frequency, frequencyConfig);
  if (error) {
    return helpers.message(error);
  }

  return value;
};

