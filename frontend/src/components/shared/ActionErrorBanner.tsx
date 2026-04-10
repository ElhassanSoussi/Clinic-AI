"use client";

export function ActionErrorBanner({
  message,
  onDismiss,
}: Readonly<{
  message: string;
  onDismiss: () => void;
}>) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <p>{message}</p>
      <button type="button" onClick={onDismiss} className="font-semibold text-rose-700">
        Dismiss
      </button>
    </div>
  );
}
