import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsManagerClient } from "@/components/admin/AnalyticsManagerClient";

const ANALYTICS_RESPONSE = {
  periodLabel: "直近30日間",
  videoViewRate: { numerator: 2, denominator: 3, rate: 2 / 3, isLowSample: true },
  contactConversionRate: { numerator: 1, denominator: 2, rate: 0.5, isLowSample: true },
  preVisitEngagementRate: { numerator: 1, denominator: 2, rate: 0.5, isLowSample: true },
  byChannel: [{ source: "booth_hm1", viewCount: 2, visitorCount: 2 }],
  byMaker: [{ houseMakerId: "hm1", houseMakerName: "アイフルホーム", interestedVisitorCount: 2 }],
  byWeek: [{ weekLabel: "2026-07-06", visitorCount: 3, viewCount: 3 }],
};

describe("AnalyticsManagerClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: ANALYTICS_RESPONSE }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("マウント時に直近30日間で集計データを取得し表示する", async () => {
    render(<AnalyticsManagerClient />);

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/analytics?period=30d");
    await waitFor(() => expect(screen.getByText("直近30日間")).toBeInTheDocument());
    expect(screen.getByText("アイフルホーム")).toBeInTheDocument();
    expect(screen.getByText("booth_hm1")).toBeInTheDocument();
  });

  it("運用開始直後の注意書きを常に表示する", async () => {
    render(<AnalyticsManagerClient />);
    await waitFor(() => expect(screen.getByText(/基準値として使用しないでください/)).toBeInTheDocument());
  });

  it("フォロー後再エンゲージメント率は未計測と表示する", async () => {
    render(<AnalyticsManagerClient />);
    await waitFor(() => expect(screen.getByText(/未計測/)).toBeInTheDocument());
  });

  it("低標本の場合は参考値バッジを表示する", async () => {
    render(<AnalyticsManagerClient />);
    await waitFor(() => expect(screen.getAllByText(/参考値/).length).toBeGreaterThan(0));
  });

  it("期間切り替えボタンで再取得する", async () => {
    const user = userEvent.setup();
    render(<AnalyticsManagerClient />);
    await waitFor(() => expect(screen.getByText("直近30日間")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "直近7日間" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/analytics?period=7d")
    );
  });
});
