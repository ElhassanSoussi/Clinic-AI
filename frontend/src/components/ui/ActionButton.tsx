"use client";

import type { ReactNode } from "react";

interface ActionButtonProps {
  readonly children: ReactNode;
  readonly variant?: "primary" | "secondary" | "ghost" | "danger";
  readonly size?: "sm" | "md" | "lg";
  readonly icon?: ReactNode;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly type?: "button" | "submit";
}

const VARIANT_MAP = {
  primary: "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-sm shadow-teal-600/20 hover:from-teal-700 hover:to-teal-800",
  secondary: "bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300",
  ghost: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  danger: "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100",
};

const SIZE_MAP = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-sm gap-2",
};

export function ActionButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  onClick,
  disabled = false,
  className = "",
  type = "button",
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none ${VARIANT_MAP[variant]} ${SIZE_MAP[size]} ${className}`.trim()}
    >
      {icon}
      {children}
    </button>
  );
}
