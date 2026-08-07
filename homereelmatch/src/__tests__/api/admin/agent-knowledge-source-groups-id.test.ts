import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteKnowledgeSourceFile } from "@/lib/storage";
import { GET, DELETE } from "@/app/api/admin/agent-knowledge/source-groups/[groupId]/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeParams(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

describe("GET /api/admin/agent-knowledge/source-groups/[groupId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/x"), makeParams("g1"));
    expect(res.status).toBe(401);
  });

  it("存在しないグループは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/x"), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("sources込みでDTO形状を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({
      id: "g1",
      topic: "見積書の見方",
      category: "検討ポイント",
      lastCrawledAt: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      entry: null,
      sources: [
        {
          id: "s1",
          sourceType: "URL",
          url: "https://www.mlit.go.jp/example",
          publicUrl: null,
          fileName: null,
          title: "国交省",
          createdAt: new Date("2026-07-02T00:00:00.000Z"),
        },
      ],
    } as never);

    const res = await GET(new NextRequest("http://localhost/x"), makeParams("g1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.sources).toEqual([
      {
        id: "s1",
        sourceType: "URL",
        url: "https://www.mlit.go.jp/example",
        publicUrl: null,
        fileName: null,
        title: "国交省",
        createdAt: "2026-07-02T00:00:00.000Z",
      },
    ]);
  });
});

describe("DELETE /api/admin/agent-knowledge/source-groups/[groupId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(new NextRequest("http://localhost/x"), makeParams("g1"));
    expect(res.status).toBe(401);
  });

  it("存在しないグループは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue(null);
    const res = await DELETE(new NextRequest("http://localhost/x"), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("PDFソースごとにdeleteKnowledgeSourceFileを呼んでからグループを削除する", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({
      id: "g1",
      sources: [
        { sourceType: "PDF", storagePath: "knowledge-sources/g1/1.pdf" },
        { sourceType: "URL", storagePath: null },
        { sourceType: "PDF", storagePath: "knowledge-sources/g1/2.pdf" },
      ],
    } as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.delete).mockResolvedValue({ id: "g1" } as never);

    const res = await DELETE(new NextRequest("http://localhost/x"), makeParams("g1"));
    expect(res.status).toBe(200);
    expect(deleteKnowledgeSourceFile).toHaveBeenCalledTimes(2);
    expect(deleteKnowledgeSourceFile).toHaveBeenCalledWith("knowledge-sources/g1/1.pdf");
    expect(deleteKnowledgeSourceFile).toHaveBeenCalledWith("knowledge-sources/g1/2.pdf");
    expect(prisma.agentKnowledgeSourceGroup.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });
});
