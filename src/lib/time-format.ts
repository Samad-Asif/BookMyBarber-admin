/**
 * 12-hour time formatting utilities (admin dashboard).
 * Same logic as mobile app — keep in sync.
 */

/** Convert "HH:MM" or "HH:MM:SS" to "h:MM AM/PM" */
export function formatTime12h(time24: string): string {
  const parts = time24.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
