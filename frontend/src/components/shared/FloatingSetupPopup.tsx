"use client";

import { useState, useEffect } from "react";
import { Settings, CheckCircle2, X, Rocket } from "lucide-react";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";
import type { Clinic } from "@/types";

interface FloatingSetupPopupProps {
  clinic: Clinic | null;
  onGoLive?: () => void;
}

export function FloatingSetupPopup({ clinic, onGoLive }: FloatingSetupPopupProps) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(true);

  const systemStatus = clinic ? computeSystemStatus(clinic) : null;
  const isLive = systemStatus?.status === "LIVE";
  const isReady = systemStatus?.status === "READY";

  // Auto-hide after 4s when LIVE
  useEffect(() => {
    if (!isLive) return;
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [isLive]);

  // Nothing to show
  if (!clinic || !systemStatus) return null;
  // User dismissed while incomplete
  if (dismissed && !isLive && !isReady) return null;
  // Faded out after LIVE
  if (isLive && !visible) return null;
  // Hide completely when LIVE (after auto-hide)
  if (isLive && !visible) return null;

  const incomplete = systemStatus.items.filter((i) => !i.completed);
  const cfg = STATUS_CONFIG[systemStatus.status];

  const openDrawer = (section?: string | null) => {
    window.dispatchEvent(
      new CustomEvent("open-settings-drawer", { detail: section ?? null })
    );
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-80 rounded-xl shadow-lg border bg-white transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${!isLive && !isReady ? "animate-pulse" : ""}`} />
          <span className="text-sm font-semibold text-slate-900">
            {isLive ? "You\u2019re live" : isReady ? "Ready to go live" : "Setup incomplete"}
          </span>
        </div>
        <button
          onClick={() => {
            if (isLive) {
              setVisible(false);
            } else {
              setDismissed(true);
            }
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {isLive ? (
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-slate-600">
              System ready &mdash; your AI assistant is receiving patients.
            </p>
          </div>
        ) : isReady ? (
          <>
            <p className="text-sm text-slate-600 mb-3">
              All sections are complete. Activate your AI assistant to start receiving patients.
            </p>
            <button
              onClick={() => onGoLive?.()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Rocket className="w-4 h-4" />
              Go Live
            </button>
          </>
        ) : (
          <>
            <ul className="space-y-2 mb-3">
              {incomplete.slice(0, 3).map((item) => (
                <li key={item.key} className="flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                  <button
                    onClick={() => openDrawer(item.drawerSection)}
                    className="text-sm text-slate-700 hover:text-slate-900 text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                const first = incomplete[0];
                openDrawer(first?.drawerSection ?? null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Fix now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
