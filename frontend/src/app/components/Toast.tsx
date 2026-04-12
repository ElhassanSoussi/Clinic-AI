import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

type ToastProps = {
  type?: "success" | "error" | "info";
  title: string;
  message?: string;
  onClose?: () => void;
};

export function Toast({ type = "success", title, message, onClose }: ToastProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    error: "bg-red-50 border-red-200 text-red-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
  };

  const iconStyles = {
    success: "text-emerald-600",
    error: "text-red-600",
    info: "text-blue-600",
  };

  const Icon = icons[type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${styles[type]}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-sm mt-1 opacity-90">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
