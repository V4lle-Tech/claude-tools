/**
 * Utility functions for formatting time durations.
 */

/**
 * Format milliseconds to human-readable duration.
 *
 * Examples:
 * - 5000 -> "5s"
 * - 65000 -> "1m 5s"
 * - 3665000 -> "1h 1m"
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Format milliseconds to short format (MM:SS).
 *
 * Examples:
 * - 5000 -> "00:05"
 * - 65000 -> "01:05"
 * - 3665000 -> "61:05"
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted time string
 */
export function formatTimeShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format ISO timestamp to relative time.
 *
 * Examples:
 * - "in 5 minutes"
 * - "in 2 hours"
 * - "in 3 days"
 *
 * @param isoTimestamp - ISO 8601 timestamp
 * @returns Relative time string
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const targetTime = new Date(isoTimestamp).getTime();
  const diffMs = targetTime - now;

  if (diffMs < 0) {
    return 'expired';
  }

  return `in ${formatDuration(diffMs)}`;
}
