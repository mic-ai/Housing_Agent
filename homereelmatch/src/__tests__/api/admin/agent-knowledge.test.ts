import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, POST } from "@/app/api/admin/agent-knowledge/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeGetRequest(qs = "") {
  return new NextRequest(`http://localhost/api/admin/agent-knowledge${qs}`);
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/agent-knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/agent-knowledge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("category/statusで一覧を絞り込む", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.findMany).mockResolvedValue([] as never);

    await GET(makeGetRequest("?category=工法&status=PUBLISHED"));

    expect(prisma.agentKnowledgeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: "工法", status: "PUBLISHED" },
      })
    );
  });
});

describe("POST /api/admin/agent-knowledge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostRequest({ topic: "t", category: "c", title: "ti", bodyMarkdown: "b" }));
    expect(res.status).toBe(401);
  });

  it("不正なリクエストは400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const res = await POST(makePostRequest({ topic: "" }));
    expect(res.status).toBe(400);
  });

  it("正常系: DRAFTとして手動作成する", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.create).mockResolvedValue({
      id: "kn1",
      topic: "t",
      category: "c",
      title: "ti",
      status: "DRAFT",
    } as never);

    const res = await POST(makePostRequest({ topic: "t", category: "c", title: "ti", bodyMarkdown: "b" }));
    expect(res.status).toBe(201);
    expect(prisma.agentKnowledgeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { topic: "t", category: "c", title: "ti", bodyMarkdown: "b" } })
    );
  });
});
