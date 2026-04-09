"use client";

type StatusBadgeTone = "teal" | "violet" | "blue" | "amber" | "emerald" | "rose" | "slate";

const TONE_MAP: Record<StatusBadgeTone, { bg: string; text: string; dot: string; border: string }> = {
  teal: { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500", border: "border-teal-100" },
  violet: { bg: "bg-[#f1edff]", text: "text-[#6d5bd0]", dot: "bg-[#7c3aed]", border: "border-[#ddd6fe]" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-100" },
  slate: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400", border: "border-slate-200" },
};

interface StatusBadgeProps {
  readonly label: string;
  readonly tone?: StatusBadgeTone;
  readonly pulse?: boolean;
}

export function StatusBadge({ label, tone = "slate", pulse = false }: StatusBadgeProps) {
  const t = TONE_MAP[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.06em] ${t.bg} ${t.text} ${t.border}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot} ${pulse ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
