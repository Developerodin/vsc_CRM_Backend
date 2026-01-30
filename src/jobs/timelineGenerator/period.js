/**
 * Period helpers for timeline generation.
 * Register quarters: July=Q1, October=Q2, January=Q3, May=Q4.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * @param {Date} date
 * @param {'Daily'|'Monthly'|'Quarterly'|'Yearly'} frequency
 * @returns {string}
 */
const getPeriodFromDate = (date, frequency) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  const day = date.getDate();

  switch (frequency) {
    case 'Daily':
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'Monthly':
      return `${MONTH_NAMES[month]}-${year}`;
    case 'Quarterly': {
      const quarter = month <= 2 ? 'Q3' : month <= 5 ? 'Q4' : month <= 8 ? 'Q1' : 'Q2';
      return `${quarter}-${year}`;
    }
    case 'Yearly': {
      const financialYearStart = month >= 3 ? year : year - 1;
      const financialYearEnd = financialYearStart + 1;
      return `${financialYearStart}-${financialYearEnd}`;
    }
    default:
      return `${MONTH_NAMES[month]}-${year}`;
  }
};

export { MONTH_NAMES, getPeriodFromDate };

