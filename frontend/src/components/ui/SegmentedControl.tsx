"use client";

interface SegmentedControlProps<T extends string> {
  readonly options: readonly { readonly value: T; readonly label: string; readonly count?: number }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-lg border border-border/90 bg-card p-2 shadow-[var(--shadow-soft)]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[0.8rem] px-3.5 py-2 text-sm font-medium transition-colors ${active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {option.label}
            {typeof option.count === "number" ? ` (${option.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}
