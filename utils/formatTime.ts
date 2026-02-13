/**
 * Converts seconds to HH:MM:SS format
 * @param seconds - Total seconds elapsed
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num: number): string => String(num).padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}
