"use client";

import { Inbox } from "lucide-react";

interface EmptyStateProps {
  readonly icon?: React.ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]">
        {icon || <Inbox className="w-4 h-4" />}
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[#64748B]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
