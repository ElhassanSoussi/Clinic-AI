"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Mail, MessageSquareMore, Phone, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChannelBadge, CommunicationEventStatusBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { CommunicationEvent, CustomerProfileDetail } from "@/types";
import { ActionErrorBanner } from "@/components/shared/ActionErrorBanner";
import { DetailSection } from "@/components/shared/detail/DetailSection";
import { DetailBackLink } from "@/components/shared/detail/DetailBackLink";

function timelineBadge(item: CustomerProfileDetail["timeline"][number]) {
  if (item.item_type === "communication_event" && item.status) {
    return <CommunicationEventStatusBadge status={item.status as CommunicationEvent["status"]} />;
  }
  if (item.item_type === "conversation" && item.status) {
    return <FrontdeskStatusBadge status={item.status as "open" | "needs_follow_up" | "booked" | "handled"} />;
  }
  if (item.item_type === "request" && item.status) {
    return <LeadStatusBadge status={item.status as "new" | "contacted" | "booked" | "closed"} />;
  }
  return null;
}

export default function CustomerProfilePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const [profile, setProfile] = useState<CustomerProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.frontdesk.getCustomer(id);
      setProfile(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load customer profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const sendSms = async () => {
    if (!profile?.phone || !smsBody.trim()) return;
    setSendingSms(true);
    setActionError("");
    try {
      await api.frontdesk.sendSms({
        customer_name: profile.name,
        customer_phone: profile.phone,
        customer_email: profile.email,
        body: smsBody,
      });
      setSmsBody("");
      await loadProfile();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send SMS.");
    } finally {
      setSendingSms(false);
    }
  };

  if (loading) return <LoadingState message="Loading customer profile..." />;
  if (loadError) return <ErrorState variant="calm" message={loadError} onRetry={() => void loadProfile()} />;
  if (!profile) return <ErrorState title="Not found" message="This customer profile could not be found." />;

  return (
    <div className="workspace-grid">
      <DetailBackLink href="/dashboard/customers">Back to customers</DetailBackLink>

      <PageHeader
        eyebrow="Customer detail"
        title={profile.name || "Customer profile"}
        description="A professional casework surface with recent conversations, requests, and timeline context."
      />

      <ActionErrorBanner message={actionError} onDismiss={() => setActionError("")} />

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="workspace-grid">
          <DetailSection label="Profile" description="High-level relationship context for the clinic team.">
            <dl className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-app-primary" />
                <div>
                  <dt className="font-semibold text-app-text-muted">Name</dt>
                  <dd className="mt-1 text-app-text">{profile.name}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-app-primary" />
                <div>
                  <dt className="font-semibold text-app-text-muted">Phone</dt>
                  <dd className="mt-1 text-app-text">{profile.phone || "Unavailable"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-app-primary" />
                <div>
                  <dt className="font-semibold text-app-text-muted">Email</dt>
                  <dd className="mt-1 text-app-text">{profile.email || "Unavailable"}</dd>
                </div>
              </div>
            </dl>
          </DetailSection>

          <DetailSection label="Recent conversations">
            <div className="grid gap-3">
              {profile.recent_conversations.length > 0 ? (
                profile.recent_conversations.map((conversation) => (
                  <article key={conversation.id} className="rounded-[1.4rem] border border-app-border/70 bg-white/75 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ChannelBadge channel={conversation.channel} withIcon />
                      <FrontdeskStatusBadge status={conversation.derived_status} />
                    </div>
                    <p className="mt-3 text-sm text-app-text-secondary">{conversation.last_message_preview}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-app-text-muted">
                      {conversation.updated_at ? timeAgo(conversation.updated_at) : "Just now"}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-app-text-muted">No recent conversations are available.</p>
              )}
            </div>
          </DetailSection>
        </div>

        <div className="workspace-grid">
          <DetailSection label="SMS outreach" description="Send a manual follow-up when a patient needs a direct touch.">
            <div className="grid gap-4">
              <textarea
                className="app-textarea"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Write a follow-up message"
              />
              <button type="button" className="app-btn app-btn-primary" onClick={() => void sendSms()} disabled={sendingSms || !profile.phone || !smsBody.trim()}>
                <MessageSquareMore className="h-4 w-4" />
                {sendingSms ? "Sending..." : "Send SMS"}
              </button>
            </div>
          </DetailSection>

          <DetailSection label="Timeline" description="Cross-workspace context for requests, conversations, and communications.">
            <div className="grid gap-3">
              {profile.timeline.length > 0 ? (
                profile.timeline.map((item) => (
                  <article key={item.id} className="rounded-[1.4rem] border border-app-border/70 bg-white/75 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-app-text">{item.title}</p>
                      {timelineBadge(item)}
                    </div>
                    <p className="mt-2 text-sm text-app-text-secondary">{item.detail}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-app-text-muted">
                      {item.occurred_at ? formatDateTime(item.occurred_at) : "No timestamp"}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-app-text-muted">No timeline items are available yet.</p>
              )}
            </div>
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
