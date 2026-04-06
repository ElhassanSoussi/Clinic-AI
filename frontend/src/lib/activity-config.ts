import {
  ArrowRightLeft,
  MessageSquare,
  MessageSquareMore,
  UserPlus,
} from "lucide-react";
import type { ActivityEvent } from "@/types";

export const EVENT_CONFIG: Record<
  ActivityEvent["type"],
  { icon: typeof UserPlus; color: string; bg: string; label: string }
> = {
  lead_created: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50", label: "New Lead" },
  lead_status_changed: { icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-50", label: "Updated" },
  conversation_started: { icon: MessageSquareMore, color: "text-teal-600", bg: "bg-teal-50", label: "Chat" },
};

export const EVENT_CONFIG_COMPACT: Record<
  ActivityEvent["type"],
  { icon: typeof UserPlus; color: string; bg: string }
> = {
  lead_created: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  lead_status_changed: { icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-50" },
  conversation_started: { icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50" },
};
