import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="panel-surface rounded-[2rem] p-8">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-app-text-muted">
          <ShieldCheck className="h-4 w-4 text-app-primary" />
          Admin
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-app-text">
          Administrative route preserved.
        </h1>
        <p className="mt-4 text-sm leading-7 text-app-text-secondary">
          The route remains intact during the frontend reset. Use the dashboard for most operational work while admin-specific behavior continues to live behind the existing product contracts.
        </p>
        <Link href="/dashboard" className="app-btn app-btn-primary mt-6">
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
