/**
 * Parse YYYY-MM-DD event dates as a local calendar date.
 * `new Date("2025-06-13")` is UTC midnight, which shifts to the previous day
 * for users west of UTC (e.g. Canada).
 */
export function parseEventDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatEventDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  const date = parseEventDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', options);
}
