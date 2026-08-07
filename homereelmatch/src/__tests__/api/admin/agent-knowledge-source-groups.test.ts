import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, POST } from "@/app/api/admin/agent-knowledge/source-groups/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeGetRequest() {
  return new NextRequest("http://localhost/api/admin/agent-knowledge/source-groups");
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/agent-knowledge/source-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/agent-knowledge/source-groups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("一覧をDTO形状にマッピングして返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findMany).mockResolvedValue([
      {
        id: "g1",
        topic: "見積書の見方",
        category: "検討ポイント",
        lastCrawledAt: new Date("2026-08-01T00:00:00.000Z"),
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        entry: { id: "kn1", status: "DRAFT" },
        _count: { sources: 2 },
      },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([
      {
        id: "g1",
        topic: "見積書の見方",
        category: "検討ポイント",
        sourceCount: 2,
        lastCrawledAt: "2026-08-01T00:00:00.000Z",
        entry: { id: "kn1", status: "DRAFT" },
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);
  });

  it("未クロールでentryが無い場合はnullで返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findMany).mockResolvedValue([
      {
        id: "g2",
        topic: "新規トピック",
        category: "工法",
        lastCrawledAt: null,
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        entry: null,
        _count: { sources: 0 },
      },
    ] as never);

    const res = await GET();
    const body = await res.json();
    expect(body.data[0].entry).toBeNull();
    expect(body.data[0].lastCrawledAt).toBeNull();
  });
});

describe("POST /api/admin/agent-knowledge/source-groups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostRequest({ topic: "t", category: "工法" }));
    expect(res.status).toBe(401);
  });

  it("不正なbodyは400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const res = await POST(makePostRequest({ topic: "", category: "工法" }));
    expect(res.status).toBe(400);
  });

  it("有効なbodyでグループを作成する", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.create).mockResolvedValue({
      id: "g1",
      topic: "見積書の見方",
      category: "検討ポイント",
    } as never);

    const res = await POST(makePostRequest({ topic: "見積書の見方", category: "検討ポイント" }));
    expect(res.status).toBe(201);
    expect(prisma.agentKnowledgeSourceGroup.create).toHaveBeenCalledWith({
      data: { topic: "見積書の見方", category: "検討ポイント" },
    });
  });
});
