import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/agent-knowledge-crawl", () => ({
  crawlAndRegenerateKnowledgeGroup: vi.fn(),
  KnowledgeCrawlValidationError: class KnowledgeCrawlValidationError extends Error {},
}));

import { crawlAndRegenerateKnowledgeGroup, KnowledgeCrawlValidationError } from "@/lib/agent-knowledge-crawl";
import { POST } from "@/app/api/admin/agent-knowledge/source-groups/[groupId]/crawl-now/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeParams(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

describe("POST /api/admin/agent-knowledge/source-groups/[groupId]/crawl-now", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(new NextRequest("http://localhost/x", { method: "POST" }), makeParams("g1"));
    expect(res.status).toBe(401);
  });

  it("存在しないグループは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue(null);
    const res = await POST(new NextRequest("http://localhost/x", { method: "POST" }), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("KnowledgeCrawlValidationErrorは400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({ id: "g1" } as never);
    vi.mocked(crawlAndRegenerateKnowledgeGroup).mockRejectedValue(
      new KnowledgeCrawlValidationError("ソースが1件も登録されていません")
    );
    const res = await POST(new NextRequest("http://localhost/x", { method: "POST" }), makeParams("g1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ソースが1件も登録されていません");
  });

  it("その他のエラーは500を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({ id: "g1" } as never);
    vi.mocked(crawlAndRegenerateKnowledgeGroup).mockRejectedValue(new Error("Claude API error"));
    const res = await POST(new NextRequest("http://localhost/x", { method: "POST" }), makeParams("g1"));
    expect(res.status).toBe(500);
  });

  it("成功時はentryIdとstatusを返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({ id: "g1" } as never);
    vi.mocked(crawlAndRegenerateKnowledgeGroup).mockResolvedValue({ entryId: "kn1", status: "DRAFT" });

    const res = await POST(new NextRequest("http://localhost/x", { method: "POST" }), makeParams("g1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ entryId: "kn1", status: "DRAFT" });
  });
});
