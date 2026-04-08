"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { clampPercentInt } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import type {
  ChatResponse,
  Clinic,
  KnowledgeDocument,
  TrainingKnowledgeSource,
  TrainingOverview,
} from "@/types";

function settingsHref(section?: string): string {
  if (!section) return "/dashboard/settings";
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
}

function knowledgeStatusClass(status: string): string {
  if (status === "strong") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function knowledgeStatusLabel(status: string): string {
  if (status === "strong") return "Strong";
  if (status === "partial") return "Partial";
  return "Needs work";
}

function generatePreviewSessionId(): string {
  return `training_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docStatusIcon(status: KnowledgeDocument["status"]) {
  switch (status) {
    case "ready":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "processing":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
    default:
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-[#64748B]" />;
  }
}

function docStatusLabel(status: KnowledgeDocument["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing...";
    case "failed":
      return "Failed";
    case "uploaded":
      return "Uploaded";
    default:
      return status;
  }
}

export default function TrainingPage() {
  const [training, setTraining] = useState<TrainingOverview | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [previewInput, setPreviewInput] = useState("");
  const [previewMessages, setPreviewMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);
  const [previewSending, setPreviewSending] = useState(false);
  const [previewSessionId] = useState(() => generatePreviewSessionId());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTraining = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [trainingData, clinicData] = await Promise.all([
        api.frontdesk.getTraining(),
        api.clinics.getMyClinic(),
      ]);
      setTraining(trainingData);
      setClinic(clinicData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load training data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTraining();
  }, [loadTraining]);

  const hasProcessingDocs = training?.documents?.some(
    (d) => d.status === "processing" || d.status === "uploaded"
  ) ?? false;

  useEffect(() => {
    if (!hasProcessingDocs) return;
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      api.frontdesk.getTraining().then((data) => {
        if (!cancelled) setTraining(data);
      }).catch(() => { });
    }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [hasProcessingDocs]);

  const createSource = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const created = await api.frontdesk.createKnowledgeSource({
        title: newTitle,
        content: newContent,
      });
      setTraining((current) =>
        current
          ? { ...current, custom_sources: [created, ...current.custom_sources] }
          : current
      );
      setNewTitle("");
      setNewContent("");
      await loadTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save knowledge note");
    } finally {
      setSaving(false);
    }
  };

  const deleteSource = async (source: TrainingKnowledgeSource) => {
    try {
      await api.frontdesk.deleteKnowledgeSource(source.id);
      if (editingSourceId === source.id) {
        setEditingSourceId(null);
        setEditingTitle("");
        setEditingContent("");
      }
      await loadTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete knowledge note");
    }
  };

  const startEditingSource = (source: TrainingKnowledgeSource) => {
    setEditingSourceId(source.id);
    setEditingTitle(source.title);
    setEditingContent(source.content);
  };

  const cancelEditingSource = () => {
    setEditingSourceId(null);
    setEditingTitle("");
    setEditingContent("");
  };

  const saveEditedSource = async () => {
    if (!editingSourceId || !editingTitle.trim() || !editingContent.trim()) return;
    setSaving(true);
    try {
      await api.frontdesk.updateKnowledgeSource(editingSourceId, {
        title: editingTitle,
        content: editingContent,
      });
      cancelEditingSource();
      await loadTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update knowledge note");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await api.frontdesk.uploadDocument(file);
      await loadTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (doc: KnowledgeDocument) => {
    try {
      await api.frontdesk.deleteDocument(doc.id);
      await loadTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const handleReprocessDocument = async (doc: KnowledgeDocument) => {
    try {
      await api.frontdesk.reprocessDocument(doc.id);
      await loadTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reprocess document");
    }
  };

  const previewDisabled = !clinic?.slug || !clinic?.is_live;

  const sendPreview = async () => {
    if (!previewInput.trim() || previewSending || !clinic?.slug) return;
    const userMessage = {
      id: `user_${Date.now()}`,
      role: "user" as const,
      content: previewInput.trim(),
    };
    setPreviewMessages((current) => [...current, userMessage]);
    setPreviewInput("");
    setPreviewSending(true);

    try {
      const response: ChatResponse = await api.chat.send({
        clinic_slug: clinic.slug,
        session_id: previewSessionId,
        message: userMessage.content,
      });
      setPreviewMessages((current) => [
        ...current,
        {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: response.reply,
        },
      ]);
    } catch (err) {
      setPreviewMessages((current) => [
        ...current,
        {
          id: `assistant_error_${Date.now()}`,
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "The assistant preview could not send that message.",
        },
      ]);
    } finally {
      setPreviewSending(false);
    }
  };

  const structuredKnowledge = useMemo(() => {
    if (!clinic) return [];
    return [
      {
        label: "Services",
        detail:
          Array.isArray(clinic.services) && clinic.services.length > 0
            ? clinic.services.join(", ")
            : "No services configured yet",
      },
      {
        label: "FAQ",
        detail:
          Array.isArray(clinic.faq) && clinic.faq.length > 0
            ? `${clinic.faq.length} FAQ entries configured`
            : "No FAQ entries configured yet",
      },
      {
        label: "Business hours",
        detail:
          clinic.business_hours && Object.keys(clinic.business_hours).length > 0
            ? "Weekly hours are configured"
            : "Business hours are not configured yet",
      },
      {
        label: "Assistant messages",
        detail:
          clinic.greeting_message || clinic.fallback_message
            ? "Greeting and fallback messaging are available"
            : "Greeting and fallback messaging are missing",
      },
    ];
  }, [clinic]);

  if (loading) return <LoadingState message="Loading training workspace..." detail="Knowledge score and uploads" />;
  if (error && !training) return <ErrorState variant="calm" message={error} onRetry={loadTraining} />;
  if (!training || !clinic) {
    return (
      <ErrorState
        variant="calm"
        title="Training data not available"
        message="We could not load the knowledge workspace. Refresh or try again in a moment."
        onRetry={loadTraining}
      />
    );
  }

  const documents = training.documents || [];
  const docStats = training.document_stats || { total: 0, ready: 0, processing: 0, failed: 0, total_chunks: 0 };
  const hasRealKnowledge = (training.custom_sources?.length ?? 0) > 0 || docStats.ready > 0;

  return (
    <div className="workspace-page">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            AI training
          </>
        }
        title="Knowledge & training"
        description="The control room for assistant quality: structured clinic knowledge, uploads, readiness scoring, and a safe preview—before patients ever see a reply."
      />

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-900">
          <span className="font-semibold">Update issue: </span>
          {error}
        </div>
      )}

      <div className="workspace-split items-start">
        <div className="order-1 min-w-0 space-y-6 xl:order-none">
          {/* Knowledge readiness */}
          <div className="wave-command-slab border-[#99f6e4] bg-[#F0FDFA]/40">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span className="workspace-section-label text-[#115E59]">Readiness</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-[#0F172A]">{clampPercentInt(training.knowledge_score)}%</p>
                <p className="mt-1 text-sm text-[#475569]">
                  {training.assistant_name} draws on clinic settings, custom notes, and uploaded documents—this score summarizes coverage before you ship answers.
                </p>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${knowledgeStatusClass(training.knowledge_status)}`}>
                {knowledgeStatusLabel(training.knowledge_status)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {training.readiness_items.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-lg border p-2.5 ${item.configured ? "border-emerald-100 bg-emerald-50/50" : "border-[#E2E8F0] bg-[#F8FAFC]"
                    }`}
                >
                  <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                  <p className="mt-0.5 text-xs text-[#64748B]">{item.detail}</p>
                </div>
              ))}
            </div>

            {training.knowledge_gaps.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
                <p className="text-sm font-semibold text-amber-800">Gaps</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {training.knowledge_gaps.map((gap) => (
                    <span key={gap} className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-amber-700">{gap}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Two-column: sources + preview */}
          <div className="wave-zone-panel !shadow-[var(--ds-shadow-lg)]">
            <div className="mb-4 border-b border-[var(--color-app-border)] pb-3">
              <p className="workspace-section-label">Knowledge work surface</p>
              <p className="mt-1 text-sm text-[#475569]">Structured sources and uploads on the left, live preview on the right—one composed training desk.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.12fr_0.88fr]">
              {/* Knowledge sources */}
              <div className="space-y-4">
                {/* Structured knowledge */}
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                  <div className="mb-2.5 flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-[#0F766E]" />
                    <p className="text-sm font-semibold text-[#0F172A]">Current sources</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {structuredKnowledge.map((item) => (
                      <div key={item.label} className="rounded-lg border border-[#E2E8F0] p-2.5">
                        <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Services", section: "services" },
                      { label: "FAQ", section: "faq" },
                      { label: "Tone", section: "assistant-messages" },
                    ].map((link) => (
                      <Link
                        key={link.section}
                        href={settingsHref(link.section)}
                        className="rounded-lg border border-[#99f6e4] bg-[#CCFBF1] px-2.5 py-1.5 text-xs font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1]"
                      >
                        Edit {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Document uploads */}
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5 text-[#0F766E]" />
                      <p className="text-sm font-semibold text-[#0F172A]">Document uploads</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileUpload}
                      aria-label="Upload training document"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>Upload PDF or TXT</span>
                    </button>
                  </div>

                  <p className="mb-2.5 text-xs leading-relaxed text-[#475569]">
                    Upload clinic documents (policies, procedures, service guides) to teach the assistant. Files are processed into searchable knowledge chunks.
                  </p>

                  {documents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#E2E8F0] px-4 py-5 text-center text-xs leading-relaxed text-[#64748B]">
                      <p>Documents are optional. Your settings (services, FAQ, hours) already power answers.</p>
                      <p className="mt-2">Upload PDF or TXT when you want policies or long-form detail in retrieval — processing may take a minute.</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Link
                          href={settingsHref("services")}
                          className="inline-flex items-center rounded-lg border border-[#99f6e4] bg-[#CCFBF1] px-2.5 py-1.5 text-xs font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1]"
                        >
                          Services &amp; FAQ in Settings
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
                        >
                          Full setup checklist
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] px-2.5 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {docStatusIcon(doc.status)}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#0F172A]">{doc.filename}</p>
                              <p className="text-xs text-[#475569]">
                                {formatFileSize(doc.file_size_bytes)} · {doc.file_type.toUpperCase()} · {docStatusLabel(doc.status)}
                                {doc.status === "ready" && doc.chunk_count > 0 && ` · ${doc.chunk_count} chunks`}
                              </p>
                              {doc.status === "failed" && doc.error_message && (
                                <p className="mt-0.5 text-xs text-rose-500">{doc.error_message}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {doc.status === "failed" && (
                              <button
                                onClick={() => handleReprocessDocument(doc)}
                                className="text-amber-600 hover:text-amber-700"
                                title="Reprocess"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="text-[#64748B] hover:text-rose-600"
                              aria-label={`Delete ${doc.filename}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom notes */}
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                  <div className="mb-2.5 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#475569]" />
                    <p className="text-sm font-semibold text-[#0F172A]">Custom notes</p>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      placeholder="Title, e.g. Insurance exceptions"
                      className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
                    />
                    <textarea
                      value={newContent}
                      onChange={(event) => setNewContent(event.target.value)}
                      rows={3}
                      placeholder="Details your assistant should know..."
                      className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-2 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
                    />
                    <button
                      onClick={createSource}
                      disabled={saving || !newTitle.trim() || !newContent.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Save note</span>
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {training.custom_sources.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#E2E8F0] px-4 py-4 text-center text-xs text-[#64748B]">
                        <p>No custom notes yet. Use the form above for exceptions and nuance the assistant should know.</p>
                        <p className="mt-2">
                          Baseline facts (hours, services) still come from{" "}
                          <Link href={settingsHref("clinic-info")} className="font-semibold text-[#115E59] hover:underline">
                            Settings
                          </Link>
                          .
                        </p>
                      </div>
                    ) : (
                      training.custom_sources.map((source) => (
                        <div key={source.id} className="rounded-lg border border-[#E2E8F0] p-2.5">
                          {editingSourceId === source.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(event) => setEditingTitle(event.target.value)}
                                placeholder="Note title"
                                className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
                              />
                              <textarea
                                value={editingContent}
                                onChange={(event) => setEditingContent(event.target.value)}
                                rows={3}
                                placeholder="Note content"
                                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-2 text-sm focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={saveEditedSource}
                                  disabled={saving || !editingTitle.trim() || !editingContent.trim()}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
                                >
                                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={cancelEditingSource}
                                  className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0F172A]">{source.title}</p>
                                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-[#475569]">{source.content}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  onClick={() => startEditingSource(source)}
                                  className="text-xs font-semibold text-[#115E59] hover:text-[#115E59]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteSource(source)}
                                  className="text-[#64748B] hover:text-rose-600"
                                  aria-label={`Delete ${source.title}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Preview chat */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm xl:sticky xl:top-20">
                <div className="mb-2.5 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-[#0F766E]" />
                  <p className="text-sm font-semibold text-[#0F172A]">Live preview</p>
                </div>

                {!clinic.is_live && (
                  <div className="mb-2.5 rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-1.5 text-xs text-amber-700">
                    Go live before using preview. This test uses the real chat flow.
                  </div>
                )}

                <div className="h-80 space-y-2 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
                  {previewMessages.length === 0 ? (
                    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-md border border-dashed border-[#CBD5E1] bg-white/60 px-4 py-6 text-center">
                      <Bot className="mb-2 h-8 w-8 text-[#94A3B8]" aria-hidden />
                      <p className="text-sm font-medium text-[#475569]">Test against your live configuration</p>
                      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-[#64748B]">
                        Questions here use the same path as patient chat — services, hours, FAQ, notes, and processed documents.
                      </p>
                    </div>
                  ) : (
                    previewMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${message.role === "user"
                            ? "rounded-br-sm bg-[#0F766E] text-white"
                            : "rounded-bl-sm border border-[#E2E8F0] bg-white text-[#0F172A]"
                            }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-2.5 space-y-2">
                  <textarea
                    value={previewInput}
                    onChange={(event) => setPreviewInput(event.target.value)}
                    rows={2}
                    placeholder="Try: Do you offer same-day appointments?"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-2 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
                  />
                  <button
                    onClick={sendPreview}
                    disabled={previewSending || previewDisabled || !previewInput.trim()}
                    type="button"
                    className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
                  >
                    {previewSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send test</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="workspace-side-rail order-2 xl:order-none">
          <div className="workspace-rail-card p-4 xl:sticky xl:top-6">
            <p className="workspace-rail-title">Training state</p>
            <div className="mt-2 space-y-1.5">
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Readiness</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{clampPercentInt(training.knowledge_score)}%</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Gaps</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{training.knowledge_gaps.length}</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Custom notes</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{training.custom_sources.length}</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Documents</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{docStats.ready}</p>
                {docStats.processing > 0 && (
                  <p className="text-xs text-amber-600">{docStats.processing} processing</p>
                )}
                {docStats.failed > 0 && (
                  <p className="text-xs text-rose-500">{docStats.failed} failed</p>
                )}
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Searchable chunks</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{docStats.total_chunks}</p>
              </div>
            </div>
          </div>

          {hasRealKnowledge && (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">Retrieval active</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-emerald-600">
                The assistant now uses your custom notes and uploaded documents when answering patient questions.
              </p>
            </div>
          )}

          {!hasRealKnowledge && (
            <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-[#64748B]" />
                <p className="text-xs font-semibold text-[#475569]">Basic mode</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#475569]">
                The assistant is answering from clinic config only (services, FAQ, hours). Upload documents or add notes to improve depth.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
