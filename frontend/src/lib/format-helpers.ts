import type { AppointmentStatus, DepositStatus } from "@/types";

/** Shorten directory card footers: hide raw JSON blobs, keep human system messages readable. */
export function formatCustomerNotePreview(note: string, maxLen = 120): string {
  const t = note.trim();
  if (!t) return "";
  if (t.startsWith("{") && t.includes('"datetime"')) {
    return "Booking details on file — open profile for full context.";
  }
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trimEnd()}…`;
}

export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function toTimeInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function combineDateTime(dateValue: string, timeValue: string): string | null {
  if (!dateValue || !timeValue) return null;
  const combined = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined.toISOString();
}

export function formatBookingText(dateValue: string, timeValue: string): string {
  const combined = combineDateTime(dateValue, timeValue);
  if (!combined) return "";
  return new Date(combined).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function humanizeSnakeCase(value?: string | null): string {
  if (!value) return "";
  return value.replaceAll("_", " ");
}

export function appointmentStatusLabel(status: AppointmentStatus | string): string {
  if (status === "cancel_requested") return "Cancel requested";
  if (status === "reschedule_requested") return "Reschedule requested";
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Completed";
  if (status === "no_show") return "No-show";
  if (status === "confirmed") return "Confirmed";
  return "Open request";
}

export function appointmentStatusClass(status: AppointmentStatus | string): string {
  if (status === "confirmed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "cancel_requested" || status === "reschedule_requested") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "cancelled" || status === "no_show") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (status === "completed") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function depositStatusLabel(status: DepositStatus | string): string {
  if (status === "requested") return "Deposit requested";
  if (status === "required") return "Deposit required";
  if (status === "paid") return "Deposit paid";
  if (status === "failed") return "Deposit failed";
  if (status === "expired") return "Deposit expired";
  if (status === "waived") return "Deposit waived";
  return "No deposit";
}

export function depositStatusClass(status: DepositStatus | string): string {
  if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "requested" || status === "required") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "failed" || status === "expired") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (status === "waived") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function formatMoney(cents?: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "$0";
  if (cents <= 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
