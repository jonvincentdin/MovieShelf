// Display labels the pages expect, built from the API's numbers and ISO dates.

const DAY_MS = 86_400_000;

/** Whole calendar days from a YYYY-MM-DD (or ISO) date to today, in local time. */
export function daysAgo(date, now = new Date()) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - new Date(y, m - 1, d)) / DAY_MS);
}

const dateOnly = (date) => new Date(`${date.slice(0, 10)}T00:00:00`);
const monthYear = (date) => dateOnly(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const fullDate = (date) =>
  dateOnly(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Movie release: "Today", "Yesterday", "3 Days Ago", "Last Week", then "Aug 2025". */
export function releaseLabel(date, now) {
  if (!date) return "";
  const n = daysAgo(date, now);
  if (n < 0) return fullDate(date);
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n < 7) return `${n} Days Ago`;
  if (n < 14) return "Last Week";
  return monthYear(date);
}

/** Chapter release: "Today", "Yesterday", "5 days ago", then "Oct 30, 2026". */
export function dayLabel(date, now) {
  if (!date) return "";
  const n = daysAgo(date, now);
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n > 1 && n < 21) return `${n} days ago`;
  return fullDate(date);
}

/** Progress timestamps: "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago". */
export function timeAgo(iso, now = new Date()) {
  const min = Math.floor((now - new Date(iso)) / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** 75 → "1h 15m", 122 → "2h 02m", 45 → "45m". */
export function runtimeLabel(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** Bytes → "640 MB" / "1.2 GB"; titles without a file get their availability instead. */
export function sizeLabel(availability) {
  const bytes = availability?.sizeBytes;
  if (bytes) return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
  return availability?.canStream ? "Stream Only" : "Theatrical Window";
}
