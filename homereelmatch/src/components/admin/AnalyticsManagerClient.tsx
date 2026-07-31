"use client";

import { useState, useEffect, useCallback } from "react";
import type { VisitorAnalyticsDTO, AnalyticsPeriod } from "@/types";

const PERIOD_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "7d", label: "直近7日間" },
  { id: "30d", label: "直近30日間" },
  { id: "all", label: "全期間" },
];

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(1)}%`;
}

function KpiTile({
  label,
  rate,
  isLowSample,
  numerator,
  denominator,
}: {
  label: string;
  rate: number | null;
  isLowSample: boolean;
  numerator: number;
  denominator: number;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-3xl font-bold text-amber-400">{formatRate(rate)}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
      <p className="text-gray-500 text-xs mt-1">
        {numerator} / {denominator}
        {isLowSample && <span className="ml-2 text-amber-500">参考値（サンプル数が少ないため）</span>}
      </p>
    </div>
  );
}

export function AnalyticsManagerClient() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [analytics, setAnalytics] = useState<VisitorAnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: AnalyticsPeriod) => {
    setLoading(true);
    const res = await fetch(`/api/admin/analytics?period=${p}`);
    if (res.ok) {
      const body = await res.json();
      setAnalytics(body.data ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(period);
  }, [load, period]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-amber-500 bg-amber-950/40 border border-amber-900 rounded-lg px-3 py-2">
        運用開始直後の数値を基準値として使用しないでください。集計期間は必ず確認の上ご利用ください。
      </p>

      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPeriod(opt.id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              period === opt.id
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-gray-900 text-gray-400 border-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && !analytics ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : analytics ? (
        <>
          <p className="text-gray-400 text-sm">集計期間: {analytics.periodLabel}</p>

          <div className="grid grid-cols-3 gap-4">
            <KpiTile label="動画視聴率" {...analytics.videoViewRate} />
            <KpiTile label="視聴→コンタクト転換率" {...analytics.contactConversionRate} />
            <KpiTile label="来場前エンゲージメント率" {...analytics.preVisitEngagementRate} />
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-600">未計測</p>
            <p className="text-gray-400 text-sm mt-1">フォロー後再エンゲージメント率（来場後フォロー機能未実装）</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">チャネル別（流入元）</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left">
                    <th className="pb-2">source</th>
                    <th className="pb-2 text-right">視聴数</th>
                    <th className="pb-2 text-right">来場者数</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byChannel.map((row) => (
                    <tr key={row.source} className="text-gray-200">
                      <td className="py-1">{row.source}</td>
                      <td className="py-1 text-right">{row.viewCount}</td>
                      <td className="py-1 text-right">{row.visitorCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">メーカー別</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left">
                    <th className="pb-2">ハウスメーカー</th>
                    <th className="pb-2 text-right">関心来場者数</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byMaker.map((row) => (
                    <tr key={row.houseMakerId} className="text-gray-200">
                      <td className="py-1">{row.houseMakerName}</td>
                      <td className="py-1 text-right">{row.interestedVisitorCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">週次推移</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="pb-2">週（月曜起点）</th>
                  <th className="pb-2 text-right">来場者数</th>
                  <th className="pb-2 text-right">視聴数</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byWeek.map((row) => (
                  <tr key={row.weekLabel} className="text-gray-200">
                    <td className="py-1">{row.weekLabel}</td>
                    <td className="py-1 text-right">{row.visitorCount}</td>
                    <td className="py-1 text-right">{row.viewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
