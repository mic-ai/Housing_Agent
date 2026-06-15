"use client";

import { useState, useEffect, useCallback } from "react";

type Platform = "YOUTUBE" | "INSTAGRAM";

interface AdminVideo {
  id: string;
  platform: Platform;
  url: string;
  thumbnailUrl: string | null;
  title: string;
  viewCount: number;
  isActive: boolean;
  hashtags: string[];
  salespersonCount: number;
  createdAt: string;
}

export function VideoManagerClient() {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const url = new URL("/api/admin/videos", window.location.origin);
    if (filterActive !== "all") url.searchParams.set("isActive", String(filterActive === "active"));
    const res = await fetch(url.toString());
    if (res.ok) {
      const body = await res.json();
      setVideos(body.data ?? []);
    }
    setLoading(false);
  }, [filterActive]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(videoId: string, current: boolean) {
    await fetch(`/api/admin/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    await load();
  }

  async function bulkSetActive(isActive: boolean) {
    if (selected.size === 0) return;
    await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), isActive }),
    });
    setSelected(new Set());
    await load();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) return <div className="text-center py-8 text-gray-500">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 text-sm rounded ${filterActive === f ? "bg-blue-600 text-white" : "border border-gray-600 text-gray-300 hover:bg-gray-800"}`}
            >
              {f === "all" ? "すべて" : f === "active" ? "公開中" : "非公開"}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <span className="text-sm text-gray-400">{selected.size}件選択中</span>
            <button type="button" onClick={() => bulkSetActive(true)} className="px-3 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">一括公開</button>
            <button type="button" onClick={() => bulkSetActive(false)} className="px-3 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-700">一括非公開</button>
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <p className="text-center text-gray-500 py-12">動画がありません</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                checked={selected.has(v.id)}
                onChange={() => toggleSelect(v.id)}
                className="w-4 h-4 rounded border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{v.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${v.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                    {v.isActive ? "公開" : "非公開"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{v.platform} · 視聴 {v.viewCount} · 営業 {v.salespersonCount}人</p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(v.id, v.isActive)}
                className={`text-xs px-3 py-1 rounded ${v.isActive ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-blue-700 hover:bg-blue-600 text-white"}`}
              >
                {v.isActive ? "非公開にする" : "公開する"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
