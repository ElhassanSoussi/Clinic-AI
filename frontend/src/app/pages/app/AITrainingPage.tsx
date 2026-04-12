import { useCallback, useEffect, useState } from "react";
import { Brain, Plus, BookOpen, Search, Edit2, Trash2, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import { Modal } from "@/app/components/Modal";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  createTrainingSource,
  deleteTrainingDocument,
  deleteTrainingSource,
  fetchTrainingOverview,
  updateTrainingSource,
  uploadTrainingDocument,
} from "@/lib/api/services";
import type { TrainingDocument, TrainingKnowledgeSource, TrainingOverview } from "@/lib/api/types";
import { dismissToast, notifyError, notifyLoading, notifySuccess } from "@/lib/feedback";
import { cn } from "@/app/components/ui/utils";
import { humanizeSnake } from "@/lib/display-text";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

export function AITrainingPage() {
  const { session } = useAuth();
  const [overview, setOverview] = useState<TrainingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editItem, setEditItem] = useState<TrainingKnowledgeSource | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const o = await fetchTrainingOverview(session.accessToken);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load training");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const sources = overview?.custom_sources ?? [];
  const filtered = sources.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onCreate = async () => {
    if (!session?.accessToken || !newTitle.trim()) {
      return;
    }
    setBusy("create");
    try {
      await createTrainingSource(session.accessToken, newTitle.trim(), newContent.trim());
      setShowAdd(false);
      setNewTitle("");
      setNewContent("");
      await load();
      notifySuccess("Knowledge source added");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Create failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const onSaveEdit = async () => {
    if (!session?.accessToken || !editItem) {
      return;
    }
    setBusy(`edit:${editItem.id}`);
    try {
      await updateTrainingSource(session.accessToken, editItem.id, {
        title: editItem.title,
        content: editItem.content,
      });
      setEditItem(null);
      await load();
      notifySuccess("Knowledge source updated");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Update failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const onDeleteSource = async (id: string) => {
    if (!session?.accessToken) {
      return;
    }
    if (!confirm("Delete this knowledge source?")) {
      return;
    }
    setBusy(`del:${id}`);
    try {
      await deleteTrainingSource(session.accessToken, id);
      await load();
      notifySuccess("Knowledge source removed");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const onDeleteDoc = async (id: string) => {
    if (!session?.accessToken) {
      return;
    }
    if (!confirm("Delete this document?")) {
      return;
    }
    setBusy(`doc:${id}`);
    try {
      await deleteTrainingDocument(session.accessToken, id);
      await load();
      notifySuccess("Document removed");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const onUpload = async (file: File | null) => {
    if (!session?.accessToken || !file) {
      return;
    }
    setBusy("upload");
    const tid = notifyLoading("Uploading document…");
    try {
      await uploadTrainingDocument(session.accessToken, file);
      await load();
      dismissToast(tid);
      notifySuccess("Document uploaded", "Processing may take a minute; refresh if status stays pending.");
    } catch (e) {
      dismissToast(tid);
      const msg = e instanceof ApiError ? e.message : "Upload failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const docStats = overview?.document_stats;

  return (
    <div className={cn(appPagePaddingClass, "max-w-6xl mx-auto")}>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h1 className={cn(appPageTitleClass, "flex items-center gap-3")}>
            <Brain className="w-8 h-8 text-primary shrink-0" />
            AI Training
          </h1>
          <p className={appPageSubtitleClass}>
            Teach the assistant what to say: short notes, uploaded files, and a readiness checklist so answers match how your practice runs.
          </p>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add knowledge source
          </button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading training data…</p>}

      {!loading && !overview && !error && (
        <div className="rounded-xl border border-dashed border-border bg-slate-50/60 px-6 py-10 text-center max-w-lg">
          <p className="text-sm font-medium text-foreground">Couldn&apos;t load training overview</p>
          <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {overview && !loading && (
        <>
          <div className="rounded-xl border border-primary/20 bg-accent/50 px-5 py-4 mb-8">
            <p className={appSectionTitleClass}>Assistant coverage</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              Scores and status come from the training service. Combine short snippets with documents for the best coverage.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Knowledge score</p>
              <p className="text-3xl font-bold text-foreground tabular-nums">{overview.knowledge_score}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">{humanizeSnake(overview.knowledge_status)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Manual sources</p>
              <p className="text-3xl font-bold text-foreground tabular-nums">{sources.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Curated snippets you edit here</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Documents</p>
              <p className="text-3xl font-bold text-foreground tabular-nums">{docStats?.total ?? overview.documents.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ready {docStats?.ready ?? 0} · Processing {docStats?.processing ?? 0} · Failed {docStats?.failed ?? 0}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Assistant</p>
              <p className="font-semibold text-foreground">{overview.assistant_name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{overview.clinic_name}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className={cn(appSectionTitleClass, "mb-1 flex items-center gap-2")}>
                <BookOpen className="w-5 h-5 text-primary" />
                Readiness checklist
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Setup checks from the training service (operational, not medical advice).</p>
              <ul className="space-y-2">
                {overview.readiness_items.map((item) => (
                  <li key={item.key} className="flex items-start gap-2 text-sm">
                    {item.configured ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span>
                      <span className="font-medium">{item.label}</span> — {item.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm border-l-4 border-l-orange-300">
              <h2 className={cn(appSectionTitleClass, "mb-1")}>Coverage gaps</h2>
              <p className="text-sm text-muted-foreground mb-3">Prioritize these before expanding to new services or locations.</p>
              {overview.knowledge_gaps.length === 0 ? (
                <p className="text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  No gaps reported — keep documents fresh as policies change.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-foreground">
                  {overview.knowledge_gaps.map((g) => (
                    <li key={g} className="flex gap-2 items-start">
                      <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className={appSectionTitleClass}>Uploaded documents</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Files are chunked server-side — large PDFs may take a minute to become searchable.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg cursor-pointer hover:bg-muted text-sm font-semibold bg-white shadow-sm">
                <Upload className="w-4 h-4" />
                {busy === "upload" ? "Uploading…" : "Upload file"}
                <input
                  type="file"
                  className="hidden"
                  aria-label="Upload training document file"
                  onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="space-y-2">
              {overview.documents.length === 0 && (
                <div className="text-center py-10 px-4 border border-dashed border-border rounded-xl bg-slate-50/50">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">No documents yet</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Good starting points: hours, fees, prep instructions, or FAQs your front desk repeats often.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer text-sm font-semibold">
                    <Upload className="w-4 h-4" />
                    Choose file
                    <input
                      type="file"
                      className="hidden"
                      aria-label="Upload training document from empty state"
                      onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}
              {overview.documents.map((d: TrainingDocument) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {humanizeSnake(d.status)}
                      {d.chunk_count != null ? ` · ${d.chunk_count} chunks` : ""}
                      {d.error_message ? ` · ${d.error_message}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete document ${d.filename}`}
                    onClick={() => void onDeleteDoc(d.id)}
                    disabled={busy !== null}
                    className="p-2 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <h2 className={appSectionTitleClass}>Manual knowledge sources</h2>
              <p className="text-sm text-muted-foreground mt-1">Short, authoritative snippets — ideal for hours, parking, and visit prep.</p>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search titles or body…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4 shadow-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {humanizeSnake(s.source_type)} · {humanizeSnake(s.status)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap leading-relaxed">{s.content}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    aria-label={`Edit source ${s.title}`}
                    onClick={() => setEditItem({ ...s })}
                    className="p-2 border border-border rounded-lg hover:bg-muted"
                  >
                    <Edit2 className="w-4 h-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete source ${s.title}`}
                    onClick={() => void onDeleteSource(s.id)}
                    disabled={busy !== null}
                    className="p-2 border border-border rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-border rounded-xl bg-white">
                <p className="text-sm font-semibold text-foreground">
                  {sources.length === 0 ? "Start with your first knowledge source" : "No sources match this search"}
                </p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {sources.length === 0
                    ? "Capture the answers staff repeat on the phone — the assistant will reuse them verbatim when appropriate."
                    : "Try a different keyword or clear search."}
                </p>
                {sources.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Add source
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New knowledge source">
        <div className="space-y-3">
          <label htmlFor="training-new-title" className="sr-only">
            Title
          </label>
          <input
            id="training-new-title"
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg"
          />
          <label htmlFor="training-new-content" className="sr-only">
            Content
          </label>
          <textarea
            id="training-new-content"
            rows={6}
            placeholder="Content"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void onCreate()}
            className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
          >
            {busy === "create" ? "Saving…" : "Create"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit source">
        {editItem && (
          <div className="space-y-3">
            <label htmlFor="training-edit-title" className="sr-only">
              Title
            </label>
            <input
              id="training-edit-title"
              type="text"
              value={editItem.title}
              onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
            <label htmlFor="training-edit-content" className="sr-only">
              Content
            </label>
            <textarea
              id="training-edit-content"
              rows={8}
              value={editItem.content}
              onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void onSaveEdit()}
              className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {busy?.startsWith("edit") ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
