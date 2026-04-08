import type { ActivityEvent } from "@/types";

const KNOWN_TYPES = new Set<ActivityEvent["type"]>([
  "lead_created",
  "lead_status_changed",
  "conversation_started",
]);

export function sanitizeActivityEvents(raw: unknown): ActivityEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: ActivityEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = row.type;
    const timestamp = row.timestamp;
    const resourceId = row.resource_id;
    if (typeof type !== "string" || !KNOWN_TYPES.has(type as ActivityEvent["type"])) continue;
    if (typeof timestamp !== "string" || typeof resourceId !== "string") continue;
    const title = typeof row.title === "string" ? row.title : "Workspace event";
    const detail = typeof row.detail === "string" ? row.detail : "";
    out.push({
      type: type as ActivityEvent["type"],
      title,
      detail,
      timestamp,
      resource_id: resourceId,
    });
  }
  return out;
}
