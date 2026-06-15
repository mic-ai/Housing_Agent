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
        <h2 className="text-lg font-semibold">空き時間管理</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          スロット追加
        </button>
      </div>

      {showForm && (
        <form
          aria-label="slot-form"
          onSubmit={handleSubmit}
          className="border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <div>
            <label htmlFor="slot-start" className="block text-sm font-medium text-gray-700">開始日時</label>
            <input
              id="slot-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="slot-end" className="block text-sm font-medium text-gray-700">終了日時</label>
            <input
              id="slot-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
            追加
          </button>
        </form>
      )}

      <div className="divide-y divide-gray-200">
        {slots.map((slot) => (
          <div key={slot.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{formatSlot(slot.startAt)} 〜 {formatSlot(slot.endAt)}</p>
              {slot.isBooked && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">予約済</span>
              )}
            </div>
            {!slot.isBooked && (
              <button
                type="button"
                onClick={() => handleDelete(slot.id)}
                className="text-sm text-red-600 hover:underline"
              >
                削除
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
