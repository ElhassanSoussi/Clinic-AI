/**
 * Human-facing copy helpers — avoid raw JSON/object dumps in staff UI.
 */

export function humanizeSnake(value: string): string {
  if (!value.trim()) {
    return "—";
  }
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatScalar(v: unknown): string {
  if (v == null) {
    return "—";
  }
  if (typeof v === "number") {
    return Number.isFinite(v) ? String(v) : "—";
  }
  if (typeof v === "boolean") {
    return v ? "Yes" : "No";
  }
  if (typeof v === "string") {
    return v.trim() || "—";
  }
  if (Array.isArray(v)) {
    return v.length ? `${v.length} item(s)` : "None";
  }
  return "—";
}

/** Flatten nested deposit/readiness-style objects into label / value rows for tables. */
export function flattenRecordRows(
  obj: Record<string, unknown>,
  prefix = "",
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const base = humanizeSnake(k);
    const label = prefix ? `${prefix} · ${base}` : base;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenRecordRows(v as Record<string, unknown>, label));
    } else {
      out.push({ label, value: formatScalar(v) });
    }
  }
  return out;
}

/** Hide JSON-like notes; truncate long strings for list rows. */
export function sanitizeStaffNote(text: string | null | undefined, maxLen = 180): string | null {
  if (!text?.trim()) {
    return null;
  }
  const t = text.trim();
  if (/^\s*(?:\[|\{)[\s\S]*(?:\]|\})\s*$/.test(t)) {
    return null;
  }
  if (t.length > maxLen) {
    return `${t.slice(0, maxLen).trim()}…`;
  }
  return t;
}

export function formatOutcomeLabel(text: string | null | undefined): string {
  if (!text?.trim()) {
    return "—";
  }
  const t = text.trim();
  if (/^\s*(?:\[|\{)/.test(t)) {
    return "Recorded";
  }
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

export function activityTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t === "lead_created") {
    return "New lead";
  }
  if (t === "lead_status_changed") {
    return "Lead updated";
  }
  if (t === "conversation_started") {
    return "Conversation";
  }
  if (t.includes("appointment")) {
    return "Appointment";
  }
  return humanizeSnake(type.replace(/\./g, "_"));
}

/** Short stable reference for staff (not a full UUID dump in lists). */
export function formatSessionRef(sessionId: string | null | undefined): string {
  if (!sessionId?.trim()) {
    return "—";
  }
  const s = sessionId.trim();
  if (s.length <= 12) {
    return s;
  }
  return `…${s.slice(-8)}`;
}

export function appointmentStatusLabel(status: string): string {
  return humanizeSnake(status || "unknown");
}
