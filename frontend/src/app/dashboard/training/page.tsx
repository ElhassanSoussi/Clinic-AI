"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  FileText,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { ChatResponse, Clinic, TrainingKnowledgeSource, TrainingOverview } from "@/types";

function settingsHref(section?: string): string {
  if (!section) return "/dashboard/settings";
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
}

function knowledgeStatusClass(status: string): string {
  if (status === "strong") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function generatePreviewSessionId(): string {
  return `training_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

  if (loading) return <LoadingState message="Loading AI training..." />;
  if (error && !training) return <ErrorState message={error} onRetry={loadTraining} />;
  if (!training || !clinic) {
    return <ErrorState title="Missing training data" message="Training data could not be loaded." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            AI training
          </>
        }
        title="Knowledge & training"
        description="Review readiness, add knowledge notes, and test the live assistant."
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          {/* Knowledge readiness */}
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-[12px] font-semibold text-slate-900">Knowledge readiness</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{training.knowledge_score}%</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {training.assistant_name} is trained on your current clinic data and custom notes.
                </p>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${knowledgeStatusClass(training.knowledge_status)}`}>
                {training.knowledge_status === "strong"
                  ? "Strong"
                  : training.knowledge_status === "partial"
                    ? "Partial"
                    : "Needs work"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {training.readiness_items.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-lg border p-2.5 ${
                    item.configured ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100/60 bg-slate-50/40"
                  }`}
                >
                  <p className="text-[12px] font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>

            {training.knowledge_gaps.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
                <p className="text-[12px] font-semibold text-amber-800">Gaps</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {training.knowledge_gaps.map((gap) => (
                    <span key={gap} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">{gap}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Two-column: sources + preview */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            {/* Knowledge sources */}
            <div className="space-y-5">
              {/* Structured knowledge */}
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="mb-2.5 flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-teal-600" />
                  <p className="text-[12px] font-semibold text-slate-900">Current sources</p>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {structuredKnowledge.map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-100/60 p-2.5">
                      <p className="text-[12px] font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{item.detail}</p>
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
                      className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[10px] font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                    >
                      Edit {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Custom notes */}
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="mb-2.5 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-[12px] font-semibold text-slate-900">Custom notes</p>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder="Title, e.g. Insurance exceptions"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <textarea
                    value={newContent}
                    onChange={(event) => setNewContent(event.target.value)}
                    rows={3}
                    placeholder="Details your assistant should know..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    onClick={createSource}
                    disabled={saving || !newTitle.trim() || !newContent.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Save note</span>
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {training.custom_sources.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-4 text-center text-[10px] text-slate-400">
                      No custom notes yet. Add details when settings are not enough.
                    </div>
                  ) : (
                    training.custom_sources.map((source) => (
                      <div key={source.id} className="rounded-lg border border-slate-100/60 p-2.5">
                        {editingSourceId === source.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              placeholder="Note title"
                              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                            />
                            <textarea
                              value={editingContent}
                              onChange={(event) => setEditingContent(event.target.value)}
                              rows={3}
                              placeholder="Note content"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditedSource}
                                disabled={saving || !editingTitle.trim() || !editingContent.trim()}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                              >
                                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                                <span>Save</span>
                              </button>
                              <button
                                onClick={cancelEditingSource}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-slate-900">{source.title}</p>
                              <p className="mt-0.5 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-500">{source.content}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                onClick={() => startEditingSource(source)}
                                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteSource(source)}
                                className="text-slate-400 hover:text-rose-600"
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

              {/* Document uploads */}
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[12px] font-semibold text-slate-900">Document uploads</p>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  PDF and text ingestion is not live yet. The training area is ready for it — embeddings and retrieval need a later pass.
                </p>
              </div>
            </div>

            {/* Preview chat */}
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm xl:sticky xl:top-20">
              <div className="mb-2.5 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-teal-600" />
                <p className="text-[12px] font-semibold text-slate-900">Live preview</p>
              </div>

              {!clinic.is_live && (
                <div className="mb-2.5 rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-1.5 text-[10px] text-amber-700">
                  Go live before using preview. This test uses the real chat flow.
                </div>
              )}

              <div className="h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-100/60 bg-slate-50/40 p-2.5">
                {previewMessages.length === 0 ? (
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Ask a clinic question to test assistant behavior against your configured data.
                  </p>
                ) : (
                  previewMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          message.role === "user"
                            ? "rounded-br-sm bg-teal-600 text-white"
                            : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
                <button
                  onClick={sendPreview}
                  disabled={previewSending || previewDisabled || !previewInput.trim()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                >
                  {previewSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send test</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="hidden space-y-3 xl:block">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Training state</p>
            <div className="mt-2.5 space-y-2">
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">Readiness</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{training.knowledge_score}%</p>
              </div>
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">Gaps</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{training.knowledge_gaps.length}</p>
              </div>
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">Custom notes</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{training.custom_sources.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Why this matters</p>
            <div className="mt-2.5 space-y-1.5">
              <p className="text-[10px] leading-relaxed text-slate-400">
                Training quality shapes whether patients trust the assistant.
              </p>
              <p className="text-[10px] leading-relaxed text-slate-400">
                Use preview chat to test real answers before relying on the live workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
