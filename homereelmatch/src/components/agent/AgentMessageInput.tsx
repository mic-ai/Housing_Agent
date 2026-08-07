"use client";

import { useState } from "react";

export function AgentMessageInput({
  onSend,
  sending,
}: {
  onSend: (message: string) => void;
  sending: boolean;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        disabled={sending}
        placeholder="ご希望の条件やご質問を入力してください"
        rows={2}
        maxLength={2000}
        className="flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-stone-50 disabled:text-stone-400"
      />
      <button
        type="submit"
        disabled={sending || !value.trim()}
        className="flex-shrink-0 h-10 px-4 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
      >
        {sending ? "送信中…" : "送信"}
      </button>
    </form>
  );
}
