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
    "bg-[#0F766E] text-white shadow-sm hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2",
  secondary:
    "bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]",
  ghost: "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
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
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none ${VARIANT_MAP[variant]} ${SIZE_MAP[size]} ${className}`.trim()}
    >
      {icon}
      {children}
    </button>
  );
}
