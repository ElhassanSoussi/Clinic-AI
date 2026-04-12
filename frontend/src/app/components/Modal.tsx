import { X } from "lucide-react";
import { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  /** When true, the header close control is disabled (e.g. during an in-flight request). */
  closeDisabled?: boolean;
};

export function Modal({ isOpen, onClose, title, description, children, size = "md", closeDisabled = false }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-xl border border-border w-full ${sizeClasses[size]} max-h-[90vh] overflow-auto`}>
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Close dialog"
              className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  /** Disables both actions to prevent double-submit while an async confirm is running. */
  pending?: boolean;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  pending = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmButtonClass = variant === "danger"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-primary hover:bg-primary/90 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-border w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="p-6 pt-0 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 h-10 px-4 border border-border rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              onConfirm();
            }}
            className={`flex-1 h-10 px-4 rounded-lg transition-colors font-semibold text-sm shadow-sm disabled:opacity-50 disabled:pointer-events-none ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
