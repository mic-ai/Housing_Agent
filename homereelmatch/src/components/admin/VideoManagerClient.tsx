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
  sortOrder: number;
  hashtags: string[];
  salespersonCount: number;
  createdAt: string;
}

interface HouseMaker { id: string; name: string; }
interface Venue { id: string; name: string; }

export function VideoManagerClient() {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("YOUTUBE");
  const [houseMakers, setHouseMakers] = useState<HouseMaker[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

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

  const loadFormData = useCallback(async () => {
    const [hmRes, vRes] = await Promise.all([
      fetch("/api/house-makers"),
      fetch("/api/venues"),
    ]);
    if (hmRes.ok) setHouseMakers((await hmRes.json()).data ?? []);
    if (vRes.ok) setVenues((await vRes.json()).data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(videoId: string, current: boolean) {
    await fetch(`/api/admin/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    await load();
  }

  async function updateSortOrder(videoId: string, sortOrder: number) {
    await fetch(`/api/admin/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder }),
    });
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

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      platform: fd.get("platform") as Platform,
      url: fd.get("url") as string,
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || undefined,
      houseMakerId: (fd.get("houseMakerId") as string) || undefined,
      venueId: (fd.get("venueId") as string) || undefined,
      hashtags: (fd.get("hashtags") as string)
        .split(/[,、\s]+/)
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "登録に失敗しました");
        return;
      }
      setShowForm(false);
      setPlatform("YOUTUBE");
      await load();
    } catch {
      setFormError("登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* フィルター＋登録ボタン */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 text-sm rounded ${filterActive === f ? "bg-amber-600 text-white" : "border border-gray-600 text-gray-300 hover:bg-gray-800"}`}
            >
              {f === "all" ? "すべて" : f === "active" ? "公開中" : "非公開"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-gray-400">{selected.size}件選択中</span>
              <button type="button" onClick={() => bulkSetActive(true)} className="px-3 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">一括公開</button>
              <button type="button" onClick={() => bulkSetActive(false)} className="px-3 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-700">一括非公開</button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              if (!showForm) loadFormData();
              setShowForm((v) => !v);
              setFormError(null);
            }}
            className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
          >
            {showForm ? "閉じる" : "動画を登録"}
          </button>
        </div>
      </div>

      {/* 動画登録フォーム */}
      {showForm && (
        <form onSubmit={handleRegister} className="bg-gray-800 rounded-xl p-5 space-y-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200">本編動画を登録</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">プラットフォーム</label>
              <select
                name="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="YOUTUBE">YouTube</option>
                <option value="INSTAGRAM">Instagram</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">動画URL *</label>
              <input
                type="url"
                name="url"
                required
                placeholder={platform === "YOUTUBE" ? "https://youtube.com/watch?v=..." : "https://instagram.com/reel/..."}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">タイトル *</label>
            <input
              type="text"
              name="title"
              required
              maxLength={100}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">ハウスメーカー</label>
              <select name="houseMakerId" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                <option value="">選択...</option>
                {houseMakers.map((hm) => (
                  <option key={hm.id} value={hm.id}>{hm.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">会場名</label>
              <select name="venueId" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                <option value="">選択...</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">ハッシュタグ（カンマ区切り）</label>
            <input
              type="text"
              name="hashtags"
              placeholder="新築, 注文住宅"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
            >
              {submitting ? "登録中..." : "登録する"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 border border-gray-600 text-gray-300 text-sm rounded hover:bg-gray-800"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* 動画一覧 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : videos.length === 0 ? (
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
              <div className="flex items-center gap-1 shrink-0">
                <label className="text-xs text-gray-500">順序</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={v.sortOrder}
                  onBlur={(e) => updateSortOrder(v.id, Number(e.target.value))}
                  className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                />
              </div>
              <button
                type="button"
                onClick={() => toggleActive(v.id, v.isActive)}
                className={`flex-shrink-0 text-xs px-3 py-1 rounded ${v.isActive ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-blue-700 hover:bg-blue-600 text-white"}`}
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
