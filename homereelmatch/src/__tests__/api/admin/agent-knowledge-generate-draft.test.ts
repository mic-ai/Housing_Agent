import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateKnowledgeDraft } from "@/lib/agent-knowledge";
import { POST } from "@/app/api/admin/agent-knowledge/generate-draft/route";

vi.mock("@/lib/agent-knowledge", () => ({
  generateKnowledgeDraft: vi.fn(),
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
  return new NextRequest("http://localhost/api/admin/agent-knowledge/generate-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/agent-knowledge/generate-draft", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeRequest({ topic: "木造軸組工法", category: "工法" }));
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const res = await POST(makeRequest({ topic: "木造軸組工法", category: "工法" }));
    expect(res.status).toBe(403);
  });

  it("トピック未指定は400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const res = await POST(makeRequest({ topic: "", category: "工法" }));
    expect(res.status).toBe(400);
  });

  it("正常系: ナレッジをDRAFTで作成する", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(generateKnowledgeDraft).mockResolvedValue({
      title: "木造軸組工法の基礎",
      bodyMarkdown: "## 概要",
      sources: [{ url: "https://www.mlit.go.jp/example", title: "国土交通省 例" }],
    });
    vi.mocked(prisma.agentKnowledgeEntry.create).mockResolvedValue({
      id: "kn_new",
      topic: "木造軸組工法",
      category: "工法",
      title: "木造軸組工法の基礎",
      status: "DRAFT",
    } as never);

    const res = await POST(makeRequest({ topic: "木造軸組工法", category: "工法" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("kn_new");
    expect(prisma.agentKnowledgeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "木造軸組工法",
          category: "工法",
          sources: { create: [{ url: "https://www.mlit.go.jp/example", title: "国土交通省 例" }] },
        }),
      })
    );
  });

  it("生成処理が失敗した場合500を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(generateKnowledgeDraft).mockRejectedValue(new Error("ANTHROPIC_API_KEY が設定されていません"));

    const res = await POST(makeRequest({ topic: "木造軸組工法", category: "工法" }));
    expect(res.status).toBe(500);
  });
});
