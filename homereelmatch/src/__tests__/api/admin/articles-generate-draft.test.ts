import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateArticleDraft } from "@/lib/web-screening";
import { POST } from "@/app/api/admin/articles/generate-draft/route";

vi.mock("@/lib/web-screening", () => ({
  generateArticleDraft: vi.fn(),
}));

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const SALESPERSON_SESSION = {
  user: { id: "sp1", name: "営業マン", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/articles/generate-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/articles/generate-draft", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeRequest({ phaseId: "phase1", topic: "住宅ローン控除" }));
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const res = await POST(makeRequest({ phaseId: "phase1", topic: "住宅ローン控除" }));
    expect(res.status).toBe(403);
  });

  it("存在しないphaseIdは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.learningPhase.findUnique).mockResolvedValue(null as never);
    const res = await POST(makeRequest({ phaseId: "missing", topic: "住宅ローン控除" }));
    expect(res.status).toBe(404);
  });

  it("正常系: 記事とsourcesをDRAFTで作成する", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.learningPhase.findUnique).mockResolvedValue({
      id: "phase1",
      title: "情報収集の基礎",
    } as never);
    vi.mocked(prisma.article.count).mockResolvedValue(2 as never);
    vi.mocked(generateArticleDraft).mockResolvedValue({
      title: "住宅ローン控除の基礎",
      bodyMarkdown: "## 概要",
      estimatedMinutes: 3,
      difficulty: "BEGINNER",
      sources: [{ url: "https://www.mlit.go.jp/example", title: "国土交通省 例" }],
    });
    vi.mocked(prisma.article.create).mockResolvedValue({
      id: "art_new",
      phaseId: "phase1",
      order: 2,
      title: "住宅ローン控除の基礎",
      status: "DRAFT",
    } as never);

    const res = await POST(makeRequest({ phaseId: "phase1", topic: "住宅ローン控除" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("art_new");
    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phaseId: "phase1",
          order: 2,
          sources: { create: [{ url: "https://www.mlit.go.jp/example", title: "国土交通省 例" }] },
        }),
      })
    );
  });

  it("トピック未指定は400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const res = await POST(makeRequest({ phaseId: "phase1", topic: "" }));
    expect(res.status).toBe(400);
  });

  it("生成処理が失敗した場合500を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.learningPhase.findUnique).mockResolvedValue({
      id: "phase1",
      title: "情報収集の基礎",
    } as never);
    vi.mocked(generateArticleDraft).mockRejectedValue(new Error("ANTHROPIC_API_KEY が設定されていません"));

    const res = await POST(makeRequest({ phaseId: "phase1", topic: "住宅ローン控除" }));
    expect(res.status).toBe(500);
  });
});
