"use client";

import { useState } from "react";
import { VideoCard } from "@/components/video/VideoCard";
import { VisitorLinkQr } from "@/components/reception/VisitorLinkQr";
import { RECEPTION_CONSENT_COPY } from "@/lib/consent-copy";
import type { VideoDTO } from "@/types";

interface HouseMakerOption {
  id: string;
  name: string;
}

interface HashtagOption {
  id: string;
  tagName: string;
}

interface ReceptionCheckInClientProps {
  houseMakers: HouseMakerOption[];
  hashtags: HashtagOption[];
}

type Step = "consent" | "interests" | "results";

// 受付タブレット: 画面遷移なしの3ステップ（同意→興味選択→結果）。
// スタッフが「次の来場者へ」ですぐリセットして使い回せるよう、単一コンポーネント内で状態管理する。
export function ReceptionCheckInClient({ houseMakers, hashtags }: ReceptionCheckInClientProps) {
  const [step, setStep] = useState<Step>("consent");
  const [selectedMakerIds, setSelectedMakerIds] = useState<string[]>([]);
  const [selectedHashtagIds, setSelectedHashtagIds] = useState<string[]>([]);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoDTO[]>([]);
  const [lineOptedIn, setLineOptedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reception/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentGiven: true,
          houseMakerIds: selectedMakerIds,
          hashtagIds: selectedHashtagIds,
        }),
      });
      if (!res.ok) throw new Error("check-in failed");
      const json = await res.json();
      const newVisitorId = json.data.visitorId as string;
      setVisitorId(newVisitorId);

      const videosRes = await fetch(`/api/videos?houseMakerId=${selectedMakerIds.join(",")}&limit=12`);
      const videosJson = await videosRes.json();
      setVideos(videosJson.data ?? []);
      setStep("results");
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLineOptIn() {
    if (!visitorId) return;
    await fetch(`/api/visitor/${visitorId}/line-opt-in`, { method: "POST" }).catch(() => {});
    setLineOptedIn(true);
  }

  function handleReset() {
    setStep("consent");
    setSelectedMakerIds([]);
    setSelectedHashtagIds([]);
    setVisitorId(null);
    setVideos([]);
    setLineOptedIn(false);
    setError(null);
  }

  if (step === "consent") {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-8 px-4">
        <h1 className="text-xl font-bold text-stone-800">{RECEPTION_CONSENT_COPY.title}</h1>
        <p className="text-sm text-stone-600 leading-relaxed">{RECEPTION_CONSENT_COPY.body}</p>
        <button
          type="button"
          onClick={() => setStep("interests")}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 rounded-lg"
        >
          {RECEPTION_CONSENT_COPY.agreeLabel}
        </button>
      </div>
    );
  }

  if (step === "interests") {
    return (
      <div className="max-w-md mx-auto space-y-6 py-8 px-4">
        <h2 className="text-lg font-bold text-stone-800">
          気になるハウスメーカー・工法をお選びください
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="ハウスメーカー">
          {houseMakers.map((hm) => (
            <button
              key={hm.id}
              type="button"
              aria-pressed={selectedMakerIds.includes(hm.id)}
              onClick={() => setSelectedMakerIds((prev) => toggleId(prev, hm.id))}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedMakerIds.includes(hm.id)
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-stone-600 border-stone-200"
              }`}
            >
              {hm.name}
            </button>
          ))}
        </div>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="工法・特徴">
            {hashtags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selectedHashtagIds.includes(tag.id)}
                onClick={() => setSelectedHashtagIds((prev) => toggleId(prev, tag.id))}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedHashtagIds.includes(tag.id)
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-stone-600 border-stone-200"
                }`}
              >
                {tag.tagName}
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={submitting || selectedMakerIds.length === 0}
          onClick={handleSubmit}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg"
        >
          {submitting ? "送信中..." : "この内容で見る"}
        </button>
      </div>
    );
  }

  const linkUrl =
    visitorId && typeof window !== "undefined"
      ? `${window.location.origin}/api/visitor/link/${visitorId}`
      : "";

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      <div className="text-center space-y-3 border-t border-stone-200 pt-6">
        <p className="text-sm text-stone-600">
          お手持ちのスマートフォンでこのQRコードを読み取ると、続けて他の場所でもコンテンツをご覧いただけます
        </p>
        {visitorId && <VisitorLinkQr url={linkUrl} />}
      </div>

      <div className="text-center">
        {lineOptedIn ? (
          <p className="text-sm text-green-700">LINEのご案内を承りました</p>
        ) : (
          <button type="button" onClick={handleLineOptIn} className="text-sm text-stone-500 underline">
            LINEでお知らせを受け取る（任意）
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="w-full bg-stone-700 hover:bg-stone-600 text-white font-medium py-3 rounded-lg"
      >
        次の来場者へ
      </button>
    </div>
  );
}
