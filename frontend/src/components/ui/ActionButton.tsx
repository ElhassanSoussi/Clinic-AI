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
  primary: "app-btn app-btn-primary",
  secondary: "app-btn app-btn-secondary",
  ghost: "app-btn app-btn-ghost",
  danger: "app-btn app-btn-danger",
} as const;

const SIZE_MAP = {
  sm: "min-h-10 px-4 text-sm",
  md: "",
  lg: "min-h-12 px-6 text-base",
} as const;

export function ActionButton({
  children,
  variant = "secondary",
  size = "md",
  icon,
  onClick,
  disabled,
  className = "",
  type = "button",
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${VARIANT_MAP[variant]} ${SIZE_MAP[size]} ${className}`.trim()}
    >
      {icon}
      {children}
    </button>
  );
}
