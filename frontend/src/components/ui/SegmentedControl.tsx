"use client";

interface SegmentedControlProps<T extends string> {
  readonly options: readonly { readonly value: T; readonly label: string; readonly count?: number }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-[1.25rem] border border-app-border/70 bg-white/78 p-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${active ? "bg-app-accent-wash text-app-primary-deep" : "text-app-text-secondary hover:text-app-text"}`}
          >
            {option.label}
            {typeof option.count === "number" ? ` (${option.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}
