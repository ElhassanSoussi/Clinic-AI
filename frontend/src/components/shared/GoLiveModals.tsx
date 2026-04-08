"use client";

import { Rocket, CheckCircle2 } from "lucide-react";

type GoLiveModalsProps = Readonly<{
  confirmOpen: boolean;
  successOpen: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onDismissSuccess: () => void;
  /** Optional — defaults match dashboard shell copy */
  confirmTitle?: string;
  confirmBody?: string;
  successTitle?: string;
  successBody?: string;
}>;

export function GoLiveModals({
  confirmOpen,
  successOpen,
  loading,
  onCancel,
  onConfirm,
  onDismissSuccess,
  confirmTitle = "Go live",
  confirmBody = "Your assistant will show as active on the public chat page, and patients can submit real requests that appear in your inbox and leads. You can change settings at any time.",
  successTitle = "You're live",
  successBody = "Your assistant is visible to patients. New conversations and leads will appear in the dashboard.",
}: GoLiveModalsProps) {
  return (
    <>
      {confirmOpen && !successOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="px-6 pt-6 pb-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#CCFBF1]">
                  <Rocket className="h-5 w-5 text-[#0F766E]" />
                </div>
                <h2 className="text-lg font-semibold text-[#0F172A]">{confirmTitle}</h2>
              </div>
              <p className="text-sm leading-relaxed text-[#64748B]">{confirmBody}</p>
            </div>
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-70"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Go live
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {successOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-[#16A34A]" />
            </div>
            <h2 className="text-lg font-semibold text-[#0F172A]">{successTitle}</h2>
            <p className="mt-2 text-sm text-[#64748B]">{successBody}</p>
            <button
              type="button"
              onClick={onDismissSuccess}
              className="mt-5 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59]"
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
