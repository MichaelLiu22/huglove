import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const LA_TIMEZONE = 'America/Los_Angeles';

/**
 * Convert a date to LA timezone
 */
export const toLATime = (date: Date): Date => {
  return toZonedTime(date, LA_TIMEZONE);
};

/**
 * Convert a LA timezone date to UTC for database storage
 */
export const fromLATime = (date: Date): Date => {
  return fromZonedTime(date, LA_TIMEZONE);
};

/**
 * Parse date string (YYYY-MM-DD) in LA timezone
 */
export const parseDateInLA = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date in LA timezone
  const date = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid DST issues
  return fromLATime(date);
};

/**
 * Format date to YYYY-MM-DD in LA timezone
 */
export const formatDateInLA = (date: Date): string => {
  const laDate = toLATime(date);
  const year = laDate.getFullYear();
  const month = String(laDate.getMonth() + 1).padStart(2, '0');
  const day = String(laDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date in LA timezone
 */
export const getTodayInLA = (): Date => {
  return toLATime(new Date());
};
