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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
      <p className="text-sm text-rose-700">{message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
