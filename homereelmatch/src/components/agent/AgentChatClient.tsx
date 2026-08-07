"use client";

import { useEffect, useRef, useState } from "react";
import { AgentMessageInput } from "./AgentMessageInput";
import { AgentCandidateCard } from "./AgentCandidateCard";
import type { AgentMessageDTO, AgentSendMessageResponseDTO, AgentConversationHistoryDTO } from "@/types";

const STORAGE_KEY = "hrm_agent_conversation_id";

export function AgentChatClient() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessageDTO[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    setConversationId(stored);
    fetch(`/api/agent/messages?conversationId=${encodeURIComponent(stored)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: { data: AgentConversationHistoryDTO }) => {
        setMessages(body.data.messages);
      })
      .catch(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setConversationId(null);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (message: string) => {
    setSending(true);
    setError(null);
    const optimisticUser: AgentMessageDTO = {
      id: `pending-${Date.now()}`,
      role: "USER",
      content: message,
      candidates: [],
      referencedKnowledge: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch("/api/agent/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId ?? undefined, message }),
      });
      if (!res.ok) {
        throw new Error("送信に失敗しました");
      }
      const body: { data: AgentSendMessageResponseDTO } = await res.json();
      if (!conversationId) {
        sessionStorage.setItem(STORAGE_KEY, body.data.conversationId);
        setConversationId(body.data.conversationId);
      }
      setMessages((prev) => [...prev, body.data.message]);
    } catch {
      setError("メッセージの送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 min-h-[200px]">
        {messages.length === 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 p-5 text-center text-sm text-stone-500">
            ご希望のエリアや予算、工法へのこだわりなど、気軽にご相談ください。
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={message.role === "USER" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                message.role === "USER"
                  ? "max-w-[85%] bg-amber-600 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap"
                  : "max-w-[85%] bg-white border border-amber-100 rounded-2xl rounded-bl-sm px-4 py-2 text-sm text-stone-800 whitespace-pre-wrap"
              }
            >
              {message.content}
              {message.candidates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.candidates.map((c) => (
                    <AgentCandidateCard key={c.id} candidate={c} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-amber-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5" aria-live="polite" aria-label="AIが考え中です">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <AgentMessageInput onSend={handleSend} sending={sending} />
    </div>
  );
}
