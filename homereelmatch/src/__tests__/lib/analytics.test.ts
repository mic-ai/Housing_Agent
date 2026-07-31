import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPeriodBounds, calcKpi, groupByWeek, computeVisitorAnalytics } from "@/lib/analytics";

describe("getPeriodBounds", () => {
  const now = new Date("2026-07-31T00:00:00.000Z");

  it("7dは7日前を起点にする", () => {
    const bounds = getPeriodBounds("7d", now);
    expect(bounds.from).toEqual(new Date("2026-07-24T00:00:00.000Z"));
    expect(bounds.to).toEqual(now);
    expect(bounds.label).toBe("直近7日間");
  });

  it("30dは30日前を起点にする", () => {
    const bounds = getPeriodBounds("30d", now);
    expect(bounds.from).toEqual(new Date("2026-07-01T00:00:00.000Z"));
    expect(bounds.label).toBe("直近30日間");
  });

  it("allはfromがnullで全期間を意味する", () => {
    const bounds = getPeriodBounds("all", now);
    expect(bounds.from).toBeNull();
    expect(bounds.label).toBe("全期間");
  });
});

describe("calcKpi", () => {
  it("分母が0の場合はrateがnullになる", () => {
    const kpi = calcKpi(5, 0);
    expect(kpi).toEqual({ numerator: 5, denominator: 0, rate: null, isLowSample: true });
  });

  it("分母が30未満の場合はisLowSampleがtrueになる", () => {
    const kpi = calcKpi(5, 10);
    expect(kpi.rate).toBe(0.5);
    expect(kpi.isLowSample).toBe(true);
  });

  it("分母が30以上の場合はisLowSampleがfalseになる", () => {
    const kpi = calcKpi(15, 30);
    expect(kpi.rate).toBe(0.5);
    expect(kpi.isLowSample).toBe(false);
  });
});

describe("groupByWeek", () => {
  it("空配列の場合は空配列を返す", () => {
    expect(groupByWeek([])).toEqual([]);
  });

  it("同じ週内の複数日付は1つのバケットに集約される", () => {
    const result = groupByWeek([
      new Date("2026-07-06T01:00:00.000Z"),
      new Date("2026-07-07T10:00:00.000Z"),
      new Date("2026-07-08T23:00:00.000Z"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
  });

  it("離れた週の日付は別バケットになり、週ラベル昇順でソートされる", () => {
    const result = groupByWeek([
      new Date("2026-07-20T00:00:00.000Z"),
      new Date("2026-07-01T00:00:00.000Z"),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].weekLabel < result[1].weekLabel).toBe(true);
    expect(result.reduce((sum, r) => sum + r.count, 0)).toBe(2);
  });
});

describe("computeVisitorAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.visitor.findMany).mockResolvedValue([
      { id: "v1", visitDate: new Date("2026-07-01T00:00:00.000Z") },
      { id: "v2", visitDate: new Date("2026-07-02T00:00:00.000Z") },
      { id: "v3", visitDate: new Date("2026-07-02T00:00:00.000Z") },
    ] as never);
    vi.mocked(prisma.visitorVideoView.findMany).mockResolvedValue([
      { visitorId: "v1", viewerId: "vp1", source: "booth_hm1", viewedAt: new Date("2026-07-01T01:00:00.000Z") },
      { visitorId: "v2", viewerId: "vp2", source: "booth_hm1", viewedAt: new Date("2026-07-02T01:00:00.000Z") },
      { visitorId: null, viewerId: "vp3", source: "pre_booking", viewedAt: new Date("2026-07-02T02:00:00.000Z") },
    ] as never);
    vi.mocked(prisma.visitorHouseMakerInterest.findMany).mockResolvedValue([
      { houseMakerId: "hm1", visitorId: "v1" },
      { houseMakerId: "hm1", visitorId: "v2" },
      { houseMakerId: "hm2", visitorId: "v3" },
    ] as never);
    vi.mocked(prisma.houseMaker.findMany).mockResolvedValue([
      { id: "hm1", name: "アイフルホーム" },
      { id: "hm2", name: "セキスイハイム" },
    ] as never);
    vi.mocked(prisma.visitorContact.findMany).mockResolvedValue([
      { visitorId: "v1" },
    ] as never);
    vi.mocked(prisma.appointment.count).mockResolvedValue(2 as never);
  });

  it("動画視聴率を来場者数と視聴した来場者数(distinct visitorId)から計算する", async () => {
    const result = await computeVisitorAnalytics("all");
    // 来場者3人中、visitorIdが紐付いた視聴者はv1,v2の2人（v3は視聴なし）
    expect(result.videoViewRate).toEqual({ numerator: 2, denominator: 3, rate: 2 / 3, isLowSample: true });
  });

  it("視聴→コンタクト転換率を視聴来場者数を分母に計算する", async () => {
    const result = await computeVisitorAnalytics("all");
    // 視聴者2人中、コンタクトに至ったのはv1の1人
    expect(result.contactConversionRate).toEqual({ numerator: 1, denominator: 2, rate: 0.5, isLowSample: true });
  });

  it("来場前エンゲージメント率をpre_*系sourceのユニーク viewerId と予約者数から計算する", async () => {
    const result = await computeVisitorAnalytics("all");
    expect(result.preVisitEngagementRate).toEqual({ numerator: 1, denominator: 2, rate: 0.5, isLowSample: true });
  });

  it("チャネル別集計をsource別のイベント数・ユニーク来場者数でviewCount降順に返す", async () => {
    const result = await computeVisitorAnalytics("all");
    expect(result.byChannel).toEqual([
      { source: "booth_hm1", viewCount: 2, visitorCount: 2 },
      { source: "pre_booking", viewCount: 1, visitorCount: 1 },
    ]);
  });

  it("メーカー別集計を関心表明来場者数(distinct)でinterestedVisitorCount降順に返す", async () => {
    const result = await computeVisitorAnalytics("all");
    expect(result.byMaker).toEqual([
      { houseMakerId: "hm1", houseMakerName: "アイフルホーム", interestedVisitorCount: 2 },
      { houseMakerId: "hm2", houseMakerName: "セキスイハイム", interestedVisitorCount: 1 },
    ]);
  });

  it("periodに応じたperiodLabelを返す", async () => {
    const result = await computeVisitorAnalytics("7d");
    expect(result.periodLabel).toBe("直近7日間");
  });

  it("来場者が0人の場合でもクラッシュせずrateがnullになる", async () => {
    vi.mocked(prisma.visitor.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.visitorVideoView.findMany).mockResolvedValue([] as never);
    const result = await computeVisitorAnalytics("all");
    expect(result.videoViewRate.rate).toBeNull();
  });
});
