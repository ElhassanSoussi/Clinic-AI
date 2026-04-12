/** Serializable shape stored in `clinics.business_hours` (JSON object). */

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type DaySchedule = {
  closed: boolean;
  open: string;
  close: string;
};

function padTime(t: string): string {
  const s = t.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    return s.length >= 4 ? s : "09:00";
  }
  const h = m[1].padStart(2, "0");
  return `${h}:${m[2]}`;
}

export function defaultBusinessHours(): Record<Weekday, DaySchedule> {
  const row = (closed: boolean, open: string, close: string): DaySchedule => ({ closed, open, close });
  return {
    monday: row(false, "09:00", "17:00"),
    tuesday: row(false, "09:00", "17:00"),
    wednesday: row(false, "09:00", "17:00"),
    thursday: row(false, "09:00", "17:00"),
    friday: row(false, "09:00", "17:00"),
    saturday: row(true, "09:00", "13:00"),
    sunday: row(true, "09:00", "13:00"),
  };
}

/** Normalize API/stored JSON into editable rows. */
export function parseBusinessHours(raw: unknown): Record<Weekday, DaySchedule> {
  const base = defaultBusinessHours();
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }
  const o = raw as Record<string, unknown>;
  for (const day of WEEKDAYS) {
    const v = o[day];
    if (typeof v === "string") {
      const parts = v.split(/[–—-]/).map((s) => s.trim());
      if (parts.length >= 2) {
        base[day] = { closed: false, open: padTime(parts[0]), close: padTime(parts[1]) };
      }
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const vo = v as Record<string, unknown>;
      const closed = Boolean(vo.closed);
      base[day] = {
        closed,
        open: padTime(String(vo.open ?? "09:00")),
        close: padTime(String(vo.close ?? "17:00")),
      };
    }
  }
  return base;
}

export function serializeBusinessHours(sched: Record<Weekday, DaySchedule>): Record<string, DaySchedule> {
  const out: Record<string, DaySchedule> = {};
  for (const day of WEEKDAYS) {
    const d = sched[day];
    out[day] = {
      closed: d.closed,
      open: d.closed ? "" : padTime(d.open),
      close: d.closed ? "" : padTime(d.close),
    };
  }
  return out;
}

export function labelWeekday(day: Weekday): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => Number.parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return NaN;
  }
  return h * 60 + m;
}

/** Returns a user-facing error message or null if valid. */
export function validateBusinessHours(sched: Record<Weekday, DaySchedule>): string | null {
  for (const day of WEEKDAYS) {
    const d = sched[day];
    if (d.closed) {
      continue;
    }
    const o = timeToMinutes(padTime(d.open));
    const c = timeToMinutes(padTime(d.close));
    if (Number.isNaN(o) || Number.isNaN(c)) {
      return `${labelWeekday(day)}: use valid times (HH:MM).`;
    }
    if (o >= c) {
      return `${labelWeekday(day)}: open time must be before close time.`;
    }
  }
  return null;
}
