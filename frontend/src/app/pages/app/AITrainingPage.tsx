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
import { appPagePaddingClass, appPageTitleClass } from "@/lib/page-layout";

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
        <div>
          <h1 className={cn(appPageTitleClass, "flex items-center gap-2")}>
            <Brain className="w-8 h-8 text-primary" />
            AI Training
          </h1>
          <p className="text-muted-foreground">Knowledge sources and documents from your clinic workspace</p>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add source
        </button>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {overview && !loading && (
        <>
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Knowledge score</p>
              <p className="text-3xl font-bold">{overview.knowledge_score}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{overview.knowledge_status.replace(/_/g, " ")}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Manual sources</p>
              <p className="text-3xl font-bold">{sources.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Documents</p>
              <p className="text-3xl font-bold">{docStats?.total ?? overview.documents.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ready {docStats?.ready ?? 0} · Processing {docStats?.processing ?? 0} · Failed {docStats?.failed ?? 0}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Assistant</p>
              <p className="font-semibold">{overview.assistant_name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">{overview.clinic_name}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Readiness
              </h2>
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
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold mb-4">Gaps</h2>
              {overview.knowledge_gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No gaps reported.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {overview.knowledge_gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-semibold">Documents</h2>
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted text-sm font-medium">
                <Upload className="w-4 h-4" />
                {busy === "upload" ? "Uploading…" : "Upload file"}
                <input type="file" className="hidden" onChange={(e) => void onUpload(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="space-y-2">
              {overview.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
              {overview.documents.map((d: TrainingDocument) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{d.filename}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {d.status.replace(/_/g, " ")}
                      {d.chunk_count != null ? ` · ${d.chunk_count} chunks` : ""}
                      {d.error_message ? ` · ${d.error_message}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDeleteDoc(d.id)}
                    disabled={busy !== null}
                    className="p-2 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div className="space-y-3">
            {filtered.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {s.source_type.replace(/_/g, " ")} · {s.status.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{s.content}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditItem({ ...s })}
                    className="p-2 border border-border rounded-lg hover:bg-muted"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteSource(s.id)}
                    disabled={busy !== null}
                    className="p-2 border border-border rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4 border border-dashed border-border rounded-xl">
                {sources.length === 0
                  ? "No custom sources yet. Use “Add source” or upload a document."
                  : "No sources match your search."}
              </p>
            ) : null}
          </div>
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New knowledge source">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg"
          />
          <textarea
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
            <input
              type="text"
              value={editItem.title}
              onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
            <textarea
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
