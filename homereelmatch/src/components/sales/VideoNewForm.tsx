"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Platform = "YOUTUBE" | "INSTAGRAM";

export function VideoNewForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("YOUTUBE");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      platform: fd.get("platform") as Platform,
      url: fd.get("url") as string,
      title: fd.get("title") as string,
      description: fd.get("description") as string || undefined,
      area: fd.get("area") as string || undefined,
      houseType: fd.get("houseType") as string || undefined,
      priceRange: fd.get("priceRange") as string || undefined,
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
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      router.push("/dashboard/videos");
    } catch {
      setError("登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">プラットフォーム</label>
        <select
          name="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        >
          <option value="YOUTUBE">YouTube</option>
          <option value="INSTAGRAM">Instagram</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          動画URL <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          name="url"
          required
          placeholder={platform === "YOUTUBE" ? "https://www.youtube.com/watch?v=..." : "https://www.instagram.com/reel/..."}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          タイトル <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="title"
          required
          maxLength={100}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">説明</label>
        <textarea
          name="description"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">エリア</label>
          <input
            type="text"
            name="area"
            placeholder="例: 東京都世田谷区"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">建物タイプ</label>
          <select
            name="houseType"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          >
            <option value="">選択...</option>
            <option value="一戸建て">一戸建て</option>
            <option value="マンション">マンション</option>
            <option value="土地">土地</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">価格帯</label>
        <select
          name="priceRange"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        >
          <option value="">選択...</option>
          <option value="〜3000万">〜3000万</option>
          <option value="3000〜5000万">3000〜5000万</option>
          <option value="5000万〜">5000万〜</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          ハッシュタグ <span className="text-gray-500 text-xs">（カンマ区切り）</span>
        </label>
        <input
          type="text"
          name="hashtags"
          placeholder="新築, 一戸建て, 注文住宅"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "登録中..." : "登録する"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-700 text-gray-300 text-sm rounded hover:bg-gray-800"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
