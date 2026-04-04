"use client";

import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-slate-200 bg-white shadow-sm mb-5">
        {icon || <Inbox className="w-7 h-7 text-slate-400" />}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="max-w-md text-sm leading-6 text-slate-500 mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
