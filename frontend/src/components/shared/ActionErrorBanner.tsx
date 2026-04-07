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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm text-[#DC2626]">{message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-xs font-semibold text-[#DC2626] hover:text-red-800 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
