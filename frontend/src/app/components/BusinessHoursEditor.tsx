import type { DaySchedule, Weekday } from "@/lib/business-hours";
import { WEEKDAYS, labelWeekday } from "@/lib/business-hours";

type Props = {
  value: Record<Weekday, DaySchedule>;
  onChange: (next: Record<Weekday, DaySchedule>) => void;
  disabled?: boolean;
};

export function BusinessHoursEditor({ value, onChange, disabled }: Props) {
  const patchDay = (day: Weekday, patch: Partial<DaySchedule>) => {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  };

  return (
    <div className="space-y-2">
      {WEEKDAYS.map((day) => {
        const row = value[day];
        return (
          <div
            key={day}
            className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-border"
          >
            <label className="flex items-center gap-2 min-w-[140px] cursor-pointer">
              <input
                type="checkbox"
                checked={!row.closed}
                disabled={disabled}
                onChange={(e) => patchDay(day, { closed: !e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <span className="font-medium text-sm">{labelWeekday(day)}</span>
            </label>
            {row.closed ? (
              <span className="text-sm text-muted-foreground">Closed</span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="time"
                  value={row.open}
                  disabled={disabled}
                  onChange={(e) => patchDay(day, { open: e.target.value })}
                  className="px-2 py-1.5 border border-border rounded-md text-sm bg-white"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <input
                  type="time"
                  value={row.close}
                  disabled={disabled}
                  onChange={(e) => patchDay(day, { close: e.target.value })}
                  className="px-2 py-1.5 border border-border rounded-md text-sm bg-white"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
