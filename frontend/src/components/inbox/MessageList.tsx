"use client";

import { formatDateTime } from "@/lib/utils";
import type { ConversationDetail } from "@/types";

export function MessageList({ messages }: Readonly<{ messages: ConversationDetail["messages"] }>) {
  return (
    <>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${message.role === "user"
              ? "bg-teal-600 text-white rounded-br-sm"
              : "bg-slate-100 text-slate-700 rounded-bl-sm"
              }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            <p
              className={`mt-2 text-xs ${message.role === "user" ? "text-white/75" : "text-slate-500"
                }`}
            >
              {message.created_at ? formatDateTime(message.created_at) : ""}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
