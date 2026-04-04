"use client";

interface SegmentedControlProps<T extends string> {
  readonly options: readonly { readonly value: T; readonly label: string; readonly count?: number }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
              value === opt.value ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-400"
            }`}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
