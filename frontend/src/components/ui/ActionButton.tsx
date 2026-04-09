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
  primary:
    "border border-transparent bg-[linear-gradient(180deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_18px_32px_-18px_rgba(13,148,136,0.9)] hover:bg-[linear-gradient(180deg,#2dd4bf_0%,#115e59_100%)] focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2",
  secondary:
    "bg-white/90 border border-[#d9e1ea] text-[#334155] shadow-[0_6px_18px_-12px_rgba(15,23,42,0.45)] hover:bg-[#F8FAFC] hover:border-[#b8c4d0]",
  ghost: "text-[#475569] hover:bg-white hover:text-[#0F172A]",
  danger: "bg-red-50 border border-red-200 text-[#DC2626] hover:bg-red-100",
};

const SIZE_MAP = {
  sm: "px-3 py-2 text-[0.8125rem] gap-1.5",
  md: "px-4 py-2.5 text-[0.9375rem] gap-2",
  lg: "px-5 py-3 text-[0.9375rem] gap-2",
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
      className={`inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANT_MAP[variant]} ${SIZE_MAP[size]} ${className}`.trim()}
    >
      {icon}
      {children}
    </button>
  );
}
