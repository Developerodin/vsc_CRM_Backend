/**
 * Period lists for a given financial year (April–March).
 * Used by backfill script to create timelines for previous FY.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Get list of period strings for Monthly frequency for a financial year.
 * FY 2024-2025 => April-2024, May-2024, ..., March-2025
 * @param {number} fyStartYear - FY start year (e.g. 2024 for 2024-2025)
 * @returns {string[]}
 */
const getMonthlyPeriodsForFY = (fyStartYear) => {
  const fyEndYear = fyStartYear + 1;
  const periods = [];
  // Apr(3) to Mar(2) next year
  for (let monthIndex = 3; monthIndex <= 14; monthIndex++) {
    const m = monthIndex % 12;
    const year = m >= 3 ? fyStartYear : fyEndYear;
    periods.push(`${MONTH_NAMES[m]}-${year}`);
  }
  return periods;
};

/**
 * Get list of period strings for Quarterly frequency for a financial year.
 * Register: Q1=Jul, Q2=Oct, Q3=Jan, Q4=Apr => FY quarters: Q4, Q1, Q2, Q3
 * @param {number} fyStartYear
 * @returns {string[]}
 */
const getQuarterlyPeriodsForFY = (fyStartYear) => {
  const fyEndYear = fyStartYear + 1;
  return [`Q4-${fyStartYear}`, `Q1-${fyStartYear}`, `Q2-${fyStartYear}`, `Q3-${fyEndYear}`];
};

/**
 * Get period string for Yearly frequency (single period per FY).
 * @param {number} fyStartYear
 * @returns {string}
 */
const getYearlyPeriodForFY = (fyStartYear) => {
  return `${fyStartYear}-${fyStartYear + 1}`;
};

/**
 * Get previous financial year start year from current date.
 * Current FY 2025-2026 => previous FY start year = 2024
 */
const getPreviousFYStartYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  if (month >= 3) return year - 1; // Apr–Dec: current FY started this year, previous = last year
  return year - 2; // Jan–Mar: current FY started last year, previous = year-2
};

/**
 * All period strings for a FY (monthly + quarterly + yearly). Use for delete-by-period.
 * @param {number} fyStartYear
 * @returns {string[]}
 */
const getAllPeriodsForFY = (fyStartYear) => {
  const monthly = getMonthlyPeriodsForFY(fyStartYear);
  const quarterly = getQuarterlyPeriodsForFY(fyStartYear);
  const yearly = getYearlyPeriodForFY(fyStartYear);
  return [...monthly, ...quarterly, yearly];
};

export {
  getMonthlyPeriodsForFY,
  getQuarterlyPeriodsForFY,
  getYearlyPeriodForFY,
  getPreviousFYStartYear,
  getAllPeriodsForFY,
};
