"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText, Plus, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Clinic, TrainingKnowledgeSource, TrainingOverview } from "@/types";

export default function TrainingPage() {
  const [training, setTraining] = useState<TrainingOverview | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

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
      setError(err instanceof Error ? err.message : "Failed to load training.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTraining();
  }, [loadTraining]);

  const addSource = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError("");
    try {
      const source = await api.frontdesk.createKnowledgeSource({
        title: title.trim(),
        content: content.trim(),
      });
      setTraining((prev) =>
        prev
          ? { ...prev, custom_sources: [source, ...prev.custom_sources] }
          : prev
      );
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add knowledge source.");
    } finally {
      setSaving(false);
    }
  };

  const removeSource = async (source: TrainingKnowledgeSource) => {
    try {
      await api.frontdesk.deleteKnowledgeSource(source.id);
      setTraining((prev) =>
        prev
          ? {
              ...prev,
              custom_sources: prev.custom_sources.filter((item) => item.id !== source.id),
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete knowledge source.");
    }
  };

  if (loading) return <LoadingState message="Loading AI training..." detail="Gathering readiness and knowledge sources" />;
  if (error && !training) return <ErrorState variant="calm" message={error} onRetry={() => void loadTraining()} />;
  if (!training) return <LoadingState message="Loading AI training..." />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="AI Training"
        title="Knowledge control center"
        description="Shape the assistant with clinic-specific knowledge sources while keeping the workspace calm and readable."
        actions={
          clinic?.slug ? (
            <Link href={`/chat/${clinic.slug}`} className="app-btn app-btn-secondary">
              Preview assistant
            </Link>
          ) : undefined
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Knowledge score", `${training.knowledge_score || 0}%`],
          ["Knowledge gaps", training.knowledge_gaps.length],
          ["Custom sources", training.custom_sources.length],
          ["Documents", training.documents.length],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-[1.6rem] p-5">
            <p className="panel-section-head">{label}</p>
            <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.055em] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-4xl p-5">
          <div className="mb-5 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Add custom knowledge</span>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="app-label">Title</label>
              <input className="app-field" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="app-label">Content</label>
              <textarea className="app-textarea" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <button type="button" className="app-btn app-btn-primary w-full" onClick={() => void addSource()} disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? "Saving source..." : "Add source"}
            </button>
          </div>
        </section>

        <section className="bg-card rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Custom sources</span>
          </div>
          <div className="grid gap-2">
            {training.custom_sources.length > 0 ? (
              training.custom_sources.map((source) => (
                <article key={source.id} className="row-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{source.title}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">{source.content}</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-full bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100"
                      onClick={() => void removeSource(source)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                icon={<Sparkles className="h-6 w-6" />}
                title="No custom sources yet"
                description="Add clinic-specific facts, policy guidance, or service nuance for the assistant to reference."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
