"use client";

import { useState, useEffect, useCallback } from "react";

type ContactMethod = "LINE" | "EMAIL";
type ContactStatus = "PENDING" | "RESPONDED" | "APPOINTED" | "CLOSED";

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lineId: string | null;
  createdAt: string;
}

interface Inquiry {
  id: string;
  salespersonId: string;
  videoId: string | null;
  contactMethod: ContactMethod;
  status: ContactStatus;
  questionnaireJson: Record<string, unknown> | null;
  createdAt: string;
  user: User;
}

const STATUS_LABELS: Record<ContactStatus, string> = {
  PENDING: "未対応",
  RESPONDED: "対応済",
  APPOINTED: "予約済",
  CLOSED: "クローズ",
};

const STATUS_COLORS: Record<ContactStatus, string> = {
  PENDING: "bg-red-900/40 text-red-300 border border-red-800",
  RESPONDED: "bg-green-900/40 text-green-300 border border-green-800",
  APPOINTED: "bg-amber-900/40 text-amber-300 border border-amber-800",
  CLOSED: "bg-stone-800 text-stone-400 border border-stone-700",
};

interface Props {
  salespersonId: string;
}

export function InquiriesClient({ salespersonId }: Props) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filterStatus, setFilterStatus] = useState<ContactStatus | "">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (status?: ContactStatus | "") => {
    setLoading(true);
    const params = new URLSearchParams({ salespersonId });
    if (status) params.set("status", status);
    const res = await fetch(`/api/contact?${params.toString()}`);
    if (res.ok) {
      const body = await res.json();
      setInquiries(body.data ?? []);
    }
    setLoading(false);
  }, [salespersonId]);

  useEffect(() => { load(filterStatus); }, [load, filterStatus]);

  async function handleStatusUpdate(inquiryId: string, status: ContactStatus) {
    const res = await fetch(`/api/contact/${inquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load(filterStatus);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-stone-500">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">読み込み中...</span>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-stone-400 text-sm">問い合わせがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label htmlFor="status-filter" className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          ステータス
        </label>
        <select
          id="status-filter"
          aria-label="ステータス"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ContactStatus | "")}
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">すべて</option>
          {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {inquiries.map((inquiry) => (
          <div key={inquiry.id} className="p-4 bg-stone-800/50 border border-stone-700 rounded-xl space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">{inquiry.user.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inquiry.status]}`}>
                  {STATUS_LABELS[inquiry.status]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inquiry.contactMethod === "LINE" ? "bg-green-900/40 text-green-300 border border-green-800" : "bg-amber-900/40 text-amber-300 border border-amber-800"}`}>
                  {inquiry.contactMethod === "LINE" ? "LINE" : "メール"}
                </span>
              </div>
              <span className="text-xs text-stone-500 flex-shrink-0">
                {new Date(inquiry.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {inquiry.user.email && (
                <a href={`mailto:${inquiry.user.email}`} className="text-xs text-amber-400 hover:text-amber-300 hover:underline">
                  {inquiry.user.email}
                </a>
              )}
              {inquiry.status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(inquiry.id, "RESPONDED")}
                  className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors min-h-[32px]"
                >
                  対応済みにする
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
