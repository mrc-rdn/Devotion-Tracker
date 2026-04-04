import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';

/**
 * Format a date to readable string
 */
export function formatDate(date) {
  return format(new Date(date), 'MMM dd, yyyy');
}

/**
 * Format date to short format
 */
export function formatDateShort(date) {
  return format(new Date(date), 'MM/dd/yyyy');
}

/**
 * Format date to ISO string (for API)
 */
export function formatDateISO(date) {
  return format(new Date(date), 'yyyy-MM-dd');
}

/**
 * Format time
 */
export function formatTime(date) {
  return format(new Date(date), 'h:mm a');
}

/**
 * Format date and time
 */
export function formatDateTime(date) {
  return format(new Date(date), 'MMM dd, yyyy h:mm a');
}

/**
 * Get all days in a month with day-of-week info
 * Returns array of dates for calendar grid (including padding days)
 */
export function getCalendarDays(year, month) {
  const firstDay = startOfMonth(new Date(year, month));
  const lastDay = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  
  // Get day of week for first day (0 = Sunday)
  const startDayOfWeek = firstDay.getDay();
  
  // Add padding days at start (previous month)
  const paddingDaysBefore = Array.from({ length: startDayOfWeek }, (_, i) => {
    const date = new Date(year, month, -startDayOfWeek + i + 1);
    return { date, isCurrentMonth: false, isToday: isToday(date) };
  });
  
  // Current month days
  const currentDays = days.map((date) => ({
    date,
    isCurrentMonth: true,
    isToday: isToday(date),
  }));
  
  // Add padding days at end to complete the grid
  const totalCells = Math.ceil((paddingDaysBefore.length + currentDays.length) / 7) * 7;
  const remainingDays = totalCells - paddingDaysBefore.length - currentDays.length;
  
  const paddingDaysAfter = Array.from({ length: remainingDays }, (_, i) => {
    const date = new Date(year, month + 1, i + 1);
    return { date, isCurrentMonth: false, isToday: isToday(date) };
  });
  
  return [...paddingDaysBefore, ...currentDays, ...paddingDaysAfter];
}

/**
 * Get day number for display
 */
export function getDayNumber(date) {
  return format(new Date(date), 'd');
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date) {
  return new Date(date) > new Date();
}

/**
 * Get relative time label
 */
export function getRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(date);
}

/**
 * Get month name
 */
export function getMonthName(date) {
  return format(new Date(date), 'MMMM yyyy');
}

/**
 * Check if two dates are the same day
 */
export function isSameDayCheck(date1, date2) {
  if (!date1 || !date2) return false;
  return isSameDay(new Date(date1), new Date(date2));
}

/**
 * Check if date is in current month
 */
export function isDateInCurrentMonth(date, year, month) {
  return isSameMonth(new Date(date), new Date(year, month));
}

/**
 * Week day headers for calendar
 */
export const WEEK_DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
