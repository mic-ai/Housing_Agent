"use client";

import { useState } from "react";

interface Salesperson {
  id: string;
  name: string;
  company: { name: string };
}

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string | null;
}

interface Assignment {
  id: string;
  salesperson: Salesperson;
  video: Video;
  preRollPublicUrl: string | null;
  postRollPublicUrl: string | null;
}

interface Props {
  initialAssignments: Assignment[];
  salespersons: Salesperson[];
  videos: Video[];
}

export function AssignmentManagerClient({ initialAssignments, salespersons, videos }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [salespersonId, setSalespersonId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!salespersonId || !videoId) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId, videoId }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "エラーが発生しました");
        return;
      }
      const { assignment } = await res.json();
      setAssignments((prev) => [assignment, ...prev]);
      setSalespersonId("");
      setVideoId("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/assignments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    }
  }

  return (
    <div className="space-y-5">
      {/* 新規接続フォーム */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={salespersonId}
          onChange={(e) => setSalespersonId(e.target.value)}
          className="bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">営業マンを選択</option>
          {salespersons.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}（{sp.company.name}）
            </option>
          ))}
        </select>

        <select
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          className="bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">本編動画を選択</option>
          {videos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>

        <button
          onClick={handleAdd}
          disabled={adding || !salespersonId || !videoId}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {adding ? "追加中..." : "接続を追加"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* 接続一覧 */}
      {assignments.length === 0 ? (
        <p className="text-stone-500 text-sm py-4 text-center">接続設定がありません</p>
      ) : (
        <div className="divide-y divide-stone-700">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center gap-4 py-3">
              {a.video.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.video.thumbnailUrl} alt={a.video.title} className="w-16 h-10 object-cover rounded" />
              ) : (
                <div className="w-16 h-10 bg-stone-700 rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{a.video.title}</p>
                <p className="text-stone-400 text-xs">
                  {a.salesperson.name}（{a.salesperson.company.name}）
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500 flex-shrink-0">
                <span>{a.preRollPublicUrl ? "プリ✓" : "プリ未"}</span>
                <span>{a.postRollPublicUrl ? "ポスト✓" : "ポスト未"}</span>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
