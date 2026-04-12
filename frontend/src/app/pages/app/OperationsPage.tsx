import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Globe,
  MessageSquare,
  Clock,
  Bell,
  CheckCircle2,
  Smartphone,
  Zap,
  Activity as ActivityIcon,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchOperations } from "@/lib/api/services";
import type { ChannelReadiness, OperationsOverview } from "@/lib/api/types";
import { flattenRecordRows } from "@/lib/display-text";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

function ChannelCard({ ch }: { ch: ChannelReadiness }) {
  const Icon = ch.channel?.toLowerCase().includes("sms") ? Smartphone : Globe;
  return (
    <div className="p-5 bg-white border border-border rounded-lg hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-0.5">{ch.display_name}</h3>
            <p className="text-xs text-muted-foreground">{ch.contact_value || ch.channel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${ch.live ? "bg-primary" : "bg-slate-300"}`} />
          <span className="text-xs font-semibold text-primary">{ch.live ? "Live" : ch.connection_status}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{ch.summary}</p>
      <p className="text-xs text-muted-foreground mt-2">{ch.detail}</p>
    </div>
  );
}

function queuePreview(label: string, description: string, items: unknown[]) {
  return (
    <div className="p-5 bg-white border border-border rounded-xl shadow-sm">
      <p className={cn(appSectionTitleClass, "text-base")}>{label}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      <p className="text-3xl font-bold text-foreground mt-3 tabular-nums">{items.length}</p>
      <p className="text-xs font-medium text-muted-foreground mt-1">{items.length === 0 ? "Nothing in this queue right now" : "In this queue"}</p>
    </div>
  );
}

export function OperationsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const o = await fetchOperations(session.accessToken);
        if (!cancelled) {
          setData(o);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load operations");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const sys = data?.system_readiness;
  const overall = sys?.overall_status || "unknown";

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className={appPagePaddingClass}>
          <div className="mb-6">
            <h1 className={appPageTitleClass}>Operations</h1>
            <p className={appPageSubtitleClass}>
              Channels, reminders, deposits, and system checks in one place — most day-to-day changes still live in Settings.
            </p>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  {overall.toLowerCase().includes("ok") || overall.toLowerCase().includes("ready") ? (
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1 capitalize">System {overall.replace(/_/g, " ")}</h2>
                  <p className="text-sm text-muted-foreground">Latest system readiness check for your clinic</p>
                </div>
              </div>
              <Link to="/app/settings" className="h-9 px-4 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-semibold inline-flex items-center">
                Clinic settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(appPagePaddingClass, "space-y-6")}>
        {loading && <p className="text-sm text-muted-foreground">Loading operations…</p>}
        {data && (
          <>
            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-slate-600" />
                  <h2 className={appSectionTitleClass}>Channels</h2>
                </div>
                <span className="text-xs font-medium text-slate-600">{data.channel_readiness.filter((c) => c.live).length} live</span>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {data.channel_readiness.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-slate-50/60 px-4 py-6 text-center text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">No channel details yet</p>
                      <p className="mt-1">Configure web chat and other channels under Settings when your clinic is provisioned.</p>
                    </div>
                  )}
                  {data.channel_readiness.map((ch) => (
                    <ChannelCard key={ch.id} ch={ch} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-border shadow-sm">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <h2 className={appSectionTitleClass}>Automation</h2>
                </div>
                <div className="p-6 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reminders enabled</span>
                    <span className="font-semibold">{data.reminder_enabled ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reminder lead time (h)</span>
                    <span className="font-semibold">{data.reminder_lead_hours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Follow-up automation</span>
                    <span className="font-semibold">{data.follow_up_automation_enabled ? "On" : "Off"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Follow-up delay (min)</span>
                    <span className="font-semibold">{data.follow_up_delay_minutes}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Edit reminder and automation toggles under Settings → Notifications & automation.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border shadow-sm">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-600" />
                  <h2 className={appSectionTitleClass}>Deposits</h2>
                </div>
                <div className="p-6">
                  {flattenRecordRows(data.deposit_summary ?? {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deposit summary fields returned for this clinic.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-border">
                          <tr>
                            <th className="text-left font-semibold text-foreground px-4 py-2">Signal</th>
                            <th className="text-left font-semibold text-foreground px-4 py-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flattenRecordRows(data.deposit_summary ?? {}).map((row) => (
                            <tr key={row.label} className="border-b border-border last:border-0">
                              <td className="px-4 py-2.5 text-muted-foreground align-top">{row.label}</td>
                              <td className="px-4 py-2.5 font-medium text-foreground align-top">{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {queuePreview(
                "Communication queue",
                "Patient-facing messages awaiting routing or staff handling.",
                (data.communication_queue as unknown[]) || [],
              )}
              {queuePreview(
                "Review queue",
                "Items flagged for a second look before they leave the front desk.",
                (data.review_queue as unknown[]) || [],
              )}
              {queuePreview(
                "Reminder candidates",
                "Appointments eligible for reminder automation based on current rules.",
                (data.reminder_candidates as unknown[]) || [],
              )}
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <ActivityIcon className="w-5 h-5 text-slate-600" />
                <h2 className={appSectionTitleClass}>Readiness checklist</h2>
              </div>
              <div className="p-6">
                {(sys?.items || []).length === 0 && <p className="text-sm text-muted-foreground">No checklist items.</p>}
                <div className="grid md:grid-cols-2 gap-3">
                  {(sys?.items || []).map((item) => {
                    const ok =
                      item.status.toLowerCase().includes("ok") || item.status.toLowerCase().includes("ready");
                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "p-4 rounded-xl border flex gap-3",
                          ok ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/50",
                        )}
                      >
                        <div className="mt-1">
                          <span
                            className={cn(
                              "w-2.5 h-2.5 rounded-full inline-block",
                              ok ? "bg-emerald-500" : "bg-amber-500",
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground">{item.label}</p>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5 capitalize">
                            {item.status.replace(/_/g, " ")}
                          </p>
                          {item.summary ? <p className="text-xs text-foreground/90 mt-2 leading-relaxed">{item.summary}</p> : null}
                          {item.detail ? <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.detail}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className={appSectionTitleClass}>Shortcuts</h2>
              </div>
              <div className="p-6 grid md:grid-cols-3 gap-4">
                <Link
                  to="/app/inbox"
                  className="p-5 border border-border rounded-lg hover:bg-slate-50 transition-colors text-left group block"
                >
                  <MessageSquare className="w-5 h-5 text-primary mb-3" />
                  <p className="font-bold text-sm text-foreground mb-1">Inbox</p>
                  <p className="text-xs text-muted-foreground">Review live patient threads</p>
                </Link>
                <Link
                  to="/chat"
                  className="p-5 border border-border rounded-lg hover:bg-slate-50 transition-colors text-left group block"
                >
                  <Zap className="w-5 h-5 text-primary mb-3" />
                  <p className="font-bold text-sm text-foreground mb-1">Patient chat</p>
                  <p className="text-xs text-muted-foreground">Open the public chat experience</p>
                </Link>
                <Link
                  to="/app/ai-training"
                  className="p-5 border border-border rounded-lg hover:bg-slate-50 transition-colors text-left group block"
                >
                  <ActivityIcon className="w-5 h-5 text-primary mb-3" />
                  <p className="font-bold text-sm text-foreground mb-1">Training</p>
                  <p className="text-xs text-muted-foreground">Knowledge sources and documents</p>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
