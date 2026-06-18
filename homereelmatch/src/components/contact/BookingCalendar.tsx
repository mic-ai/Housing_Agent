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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConfirm() {
    if (!selected) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactRequestId, slotId: selected }),
      });
      if (!res.ok) {
        setSubmitError("予約に失敗しました。他の日時をお試しください。");
        return;
      }
      router.push(`/booking/${contactRequestId}/complete`);
    } finally {
      setSubmitting(false);
    }
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-10">
        <svg className="w-10 h-10 text-stone-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
        <p className="text-stone-400 text-sm">現在予約可能な日時がありません</p>
        <p className="text-stone-500 text-xs mt-1">しばらく後に再度ご確認ください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submitError && (
        <div role="alert" className="flex items-start gap-2 bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {submitError}
        </div>
      )}

      <p className="text-stone-400 text-sm">ご希望の日時を選択してください</p>

      <div className="space-y-2">
        {slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => setSelected(slot.id)}
            className={`w-full p-3.5 rounded-lg border text-left transition-colors ${
              selected === slot.id
                ? "border-amber-500 bg-amber-500/10 text-white"
                : "border-stone-700 bg-stone-800 text-stone-300 hover:border-stone-500 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              {selected === slot.id && (
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {formatDateTime(slot.startAt)}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selected || submitting}
        className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-stone-700 disabled:text-stone-400 text-white font-medium rounded-lg transition-colors"
      >
        {submitting ? "予約中..." : "この日時で予約する"}
      </button>
    </div>
  );
}
