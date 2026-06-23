"use client";

import { useState, useEffect, useCallback } from "react";

interface Slot {
  id: string;
  salespersonId: string;
  startAt: string;
  endAt: string;
  isBooked: boolean;
}

interface Props {
  salespersonId: string;
}

export function ScheduleClient({ salespersonId }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const loadSlots = useCallback(async () => {
    const res = await fetch(`/api/booking/slots?salespersonId=${salespersonId}`);
    if (res.ok) {
      const body = await res.json();
      setSlots(body.data ?? []);
    }
  }, [salespersonId]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/booking/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salespersonId, startAt, endAt }),
    });
    if (res.ok) {
      setShowForm(false);
      setStartAt("");
      setEndAt("");
      await loadSlots();
    }
  }

  async function handleDelete(slotId: string) {
    const res = await fetch(`/api/booking/slots/${slotId}`, { method: "DELETE" });
    if (res.ok) await loadSlots();
  }

  function formatSlot(iso: string) {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">空き時間スロット</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          スロット追加
        </button>
      </div>

      {showForm && (
        <form
          aria-label="slot-form"
          onSubmit={handleSubmit}
          className="bg-stone-800/50 border border-stone-700 rounded-xl p-4 space-y-4"
        >
          <div>
            <label htmlFor="slot-start" className="block text-sm font-medium text-stone-300 mb-1.5">開始日時</label>
            <input
              id="slot-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="slot-end" className="block text-sm font-medium text-stone-300 mb-1.5">終了日時</label>
            <input
              id="slot-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-xl transition-colors">
              追加する
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm rounded-xl transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {slots.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-stone-400 text-sm">空きスロットがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between p-3.5 bg-stone-800/50 border border-stone-700 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-stone-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{formatSlot(slot.startAt)}</p>
                  <p className="text-stone-500 text-xs">〜 {formatSlot(slot.endAt)}</p>
                  {slot.isBooked && (
                    <span className="inline-block text-xs px-2 py-0.5 bg-amber-900/40 text-amber-300 border border-amber-800 rounded-full mt-1">予約済</span>
                  )}
                </div>
              </div>
              {!slot.isBooked && (
                <button
                  type="button"
                  onClick={() => handleDelete(slot.id)}
                  className="text-xs px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors min-h-[32px]"
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
