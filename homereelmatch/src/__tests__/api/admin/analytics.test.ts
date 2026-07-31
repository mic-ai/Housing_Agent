import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return {
    ...actual,
    computeVisitorAnalytics: vi.fn(),
  };
});

const { GET } = await import("@/app/api/admin/analytics/route");
const { computeVisitorAnalytics } = await import("@/lib/analytics");

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: null },
  expires: "2099-01-01T00:00:00.000Z",
};

const SALESPERSON_SESSION = {
  user: { id: "sp1", name: "営業マン", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeReq(query = "") {
  return new NextRequest(`http://localhost/api/admin/analytics${query}`);
}

describe("GET /api/admin/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(computeVisitorAnalytics).mockResolvedValue({
      periodLabel: "直近30日間",
      videoViewRate: { numerator: 0, denominator: 0, rate: null, isLowSample: true },
      contactConversionRate: { numerator: 0, denominator: 0, rate: null, isLowSample: true },
      preVisitEngagementRate: { numerator: 0, denominator: 0, rate: null, isLowSample: true },
      byChannel: [],
      byMaker: [],
      byWeek: [],
    });
  });

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("SALESPERSONロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it("ADMINロールはperiodを指定してcomputeVisitorAnalyticsを呼び出す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const res = await GET(makeReq("?period=7d"));
    expect(res.status).toBe(200);
    expect(computeVisitorAnalytics).toHaveBeenCalledWith("7d");
    const body = await res.json();
    expect(body.data.periodLabel).toBe("直近30日間");
  });

  it("period未指定時は30dをデフォルトにする", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    await GET(makeReq());
    expect(computeVisitorAnalytics).toHaveBeenCalledWith("30d");
  });

  it("不正なperiod値は400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const res = await GET(makeReq("?period=invalid"));
    expect(res.status).toBe(400);
  });
});
