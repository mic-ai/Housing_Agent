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
  PENDING: "bg-red-100 text-red-700",
  RESPONDED: "bg-green-100 text-green-700",
  APPOINTED: "bg-blue-100 text-blue-700",
  CLOSED: "bg-gray-100 text-gray-600",
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
    return <div className="text-center py-8 text-gray-500">読み込み中...</div>;
  }

  if (inquiries.length === 0) {
    return <p className="text-center text-gray-500 py-12">問い合わせがありません</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
          ステータス
        </label>
        <select
          id="status-filter"
          aria-label="ステータス"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ContactStatus | "")}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">すべて</option>
          {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-gray-200">
        {inquiries.map((inquiry) => (
          <div key={inquiry.id} className="py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{inquiry.user.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[inquiry.status]}`}>
                  {STATUS_LABELS[inquiry.status]}
                </span>
                <span className="text-xs text-gray-500">
                  {inquiry.contactMethod === "LINE" ? "LINE" : "メール"}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(inquiry.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {inquiry.user.email && (
                <a href={`mailto:${inquiry.user.email}`} className="text-xs text-blue-600 hover:underline">
                  {inquiry.user.email}
                </a>
              )}
              {inquiry.status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(inquiry.id, "RESPONDED")}
                  className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
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
