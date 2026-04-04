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
  if (status === "strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            AI training workspace
          </>
        }
        title="Keep the assistant accurate, grounded, and clinic-specific."
        description="Review readiness, add knowledge notes, and test the live assistant against the clinic information you actually trust."
      />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-slate-900">
                    Knowledge readiness
                  </span>
                </div>
                <h2 className="text-4xl font-bold text-slate-900">
                  {training.knowledge_score}%
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  {training.assistant_name} is trained on your current clinic data and custom notes.
                </p>
              </div>
              <span className={`inline-flex px-3 py-1.5 rounded-full border text-sm font-medium ${knowledgeStatusClass(training.knowledge_status)}`}>
                {training.knowledge_status === "strong"
                  ? "Strong setup"
                  : training.knowledge_status === "partial"
                    ? "Partially configured"
                    : "Needs more knowledge"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {training.readiness_items.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-xl border p-4 ${
                    item.configured
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{item.detail}</p>
                </div>
              ))}
            </div>

            {training.knowledge_gaps.length > 0 && (
              <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-sm font-semibold text-amber-800">Knowledge gaps</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {training.knowledge_gaps.map((gap) => (
                    <span
                      key={gap}
                      className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-amber-200 text-amber-700"
                    >
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Current knowledge sources
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {structuredKnowledge.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                href={settingsHref("services")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
              >
                Edit services
              </Link>
              <Link
                href={settingsHref("faq")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
              >
                Edit FAQ
              </Link>
              <Link
                href={settingsHref("assistant-messages")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
              >
                Edit assistant tone
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Custom knowledge notes
                </h3>
              </div>

              <div className="space-y-3 mb-5">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Title, for example Insurance exceptions"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
                />
                <textarea
                  value={newContent}
                  onChange={(event) => setNewContent(event.target.value)}
                  rows={4}
                  placeholder="Add details your assistant should know, such as pricing clarifications, intake instructions, or scheduling rules."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400 resize-none"
                />
                <button
                  onClick={createSource}
                  disabled={saving || !newTitle.trim() || !newContent.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Save note
                </button>
              </div>

              <div className="space-y-3">
                {training.custom_sources.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 text-center">
                    No custom notes yet. Add details here when the built-in clinic settings are not enough.
                  </div>
                ) : (
                  training.custom_sources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-xl border border-slate-200 px-4 py-4"
                    >
                      {editingSourceId === source.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          />
                          <textarea
                            value={editingContent}
                            onChange={(event) => setEditingContent(event.target.value)}
                            rows={4}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={saveEditedSource}
                              disabled={saving || !editingTitle.trim() || !editingContent.trim()}
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                            >
                              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                              Save changes
                            </button>
                            <button
                              onClick={cancelEditingSource}
                              className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {source.title}
                            </p>
                            <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                              {source.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditingSource(source)}
                              className="text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSource(source)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                              aria-label={`Delete ${source.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
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

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Document uploads
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              PDF and text document ingestion is not live yet in this build. The training area is ready for it, but embeddings and retrieval still need a later implementation pass.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Live assistant preview
            </h2>
          </div>

          {!clinic.is_live && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700">
              Go live before using the live assistant preview. This test uses the real clinic chat flow.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-120 overflow-y-auto space-y-3">
            {previewMessages.length === 0 ? (
              <div className="text-sm text-slate-500 leading-relaxed">
                Ask a real clinic question here to test the current assistant behavior against your configured services, FAQs, hours, and custom notes.
              </div>
            ) : (
              previewMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-teal-600 text-white rounded-br-sm"
                        : "bg-white text-slate-700 rounded-bl-sm border border-slate-200"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3">
            <textarea
              value={previewInput}
              onChange={(event) => setPreviewInput(event.target.value)}
              rows={3}
              placeholder="Try: Do you offer same-day appointments?"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400 resize-none"
            />
            <button
              onClick={sendPreview}
              disabled={previewSending || previewDisabled || !previewInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {previewSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send test prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
