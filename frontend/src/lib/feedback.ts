import { toast } from "sonner";

export function notifySuccess(message: string, description?: string): void {
  toast.success(message, description ? { description } : undefined);
}

export function notifyError(message: string, description?: string): void {
  toast.error(message, description ? { description } : undefined);
}

export function notifyLoading(message: string): string | number {
  return toast.loading(message);
}

export function dismissToast(id: string | number): void {
  toast.dismiss(id);
}
