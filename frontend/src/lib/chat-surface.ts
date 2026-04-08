/** Patient chat: format public business hours from clinic branding (weekday → hours text). */

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function capitalizeDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Short line for chat trust strip — first few days with non-empty hours, capped in length.
 */
export function summarizeBusinessHoursForChat(hours: unknown, maxLen = 140): string | null {
  if (!hours || typeof hours !== "object" || Array.isArray(hours)) return null;
  const record = hours as Record<string, unknown>;
  const parts: string[] = [];
  for (const day of DAY_ORDER) {
    const v = record[day];
    if (v === undefined || v === null) continue;
    const text = String(v).trim();
    if (!text || /^closed$/i.test(text)) continue;
    const shortDay = capitalizeDay(day).slice(0, 3);
    parts.push(`${shortDay} ${text}`);
    if (parts.length >= 4) break;
  }
  if (parts.length === 0) return null;
  let line = parts.join(" · ");
  if (line.length > maxLen) line = `${line.slice(0, maxLen - 1)}…`;
  return line;
}
