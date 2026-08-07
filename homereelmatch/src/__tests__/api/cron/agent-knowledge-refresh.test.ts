import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/agent-knowledge-crawl", () => ({
  crawlAndRegenerateKnowledgeGroup: vi.fn(),
}));

import { crawlAndRegenerateKnowledgeGroup } from "@/lib/agent-knowledge-crawl";
import { GET } from "@/app/api/cron/agent-knowledge-refresh/route";

const CRON_SECRET = "test_cron_secret";

function makeReq(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/agent-knowledge-refresh", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/agent-knowledge-refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T00:00:00.000Z"));
    vi.mocked(prisma.agentKnowledgeSourceGroup.findMany).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("Authorizationヘッダーが無い場合は401を返す", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("CRON_SECRETと一致しない場合は401を返す", async () => {
    const res = await GET(makeReq("Bearer wrong_secret"));
    expect(res.status).toBe(401);
  });

  it("CRON_SECRET未設定の場合は401を返す", async () => {
    vi.unstubAllEnvs();
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(401);
  });

  it("lastCrawledAtがnullまたは7日以上前のソース保有グループのみを対象にする", async () => {
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(prisma.agentKnowledgeSourceGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sources: { some: {} },
          OR: [{ lastCrawledAt: null }, { lastCrawledAt: { lt: new Date("2026-08-03T00:00:00.000Z") } }],
        },
      })
    );
  });

  it("1件の失敗が後続処理を止めない", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findMany).mockResolvedValue([
      { id: "g1" },
      { id: "g2" },
    ] as never);
    vi.mocked(crawlAndRegenerateKnowledgeGroup)
      .mockRejectedValueOnce(new Error("Claude API error"))
      .mockResolvedValueOnce({ entryId: "kn2", status: "DRAFT" });

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(crawlAndRegenerateKnowledgeGroup).toHaveBeenCalledTimes(2);
    expect(crawlAndRegenerateKnowledgeGroup).toHaveBeenNthCalledWith(1, "g1");
    expect(crawlAndRegenerateKnowledgeGroup).toHaveBeenNthCalledWith(2, "g2");

    const body = await res.json();
    expect(body.data).toEqual({ processed: 2, succeeded: 1, failed: 1 });
  });

  it("全件成功時はprocessed/succeeded/failed形状を返す", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findMany).mockResolvedValue([{ id: "g1" }] as never);
    vi.mocked(crawlAndRegenerateKnowledgeGroup).mockResolvedValue({ entryId: "kn1", status: "DRAFT" });

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));
    const body = await res.json();
    expect(body.data).toEqual({ processed: 1, succeeded: 1, failed: 0 });
  });
});
