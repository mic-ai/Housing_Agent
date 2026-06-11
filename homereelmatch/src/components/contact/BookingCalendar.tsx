"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AvailableSlotDTO } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface BookingCalendarProps {
  contactRequestId: string;
  slots: AvailableSlotDTO[];
}

export function BookingCalendar({ contactRequestId, slots }: BookingCalendarProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactRequestId, slotId: selected }),
      });
      if (!res.ok) {
        alert("予約に失敗しました。他の日時をお試しください。");
        return;
      }
      router.push(`/booking/${contactRequestId}/complete`);
    } finally {
      setSubmitting(false);
    }
  }

  if (slots.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        現在予約可能な日時がありません
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {slots.map((slot) => (
          <button
            key={slot.id}
            onClick={() => setSelected(slot.id)}
            className={`w-full p-3 rounded-lg border text-left transition-colors ${
              selected === slot.id
                ? "border-blue-500 bg-blue-500/10 text-white"
                : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500"
            }`}
          >
            {formatDateTime(slot.startAt)}
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected || submitting}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
      >
        {submitting ? "予約中..." : "この日時で予約する"}
      </button>
    </div>
  );
}
