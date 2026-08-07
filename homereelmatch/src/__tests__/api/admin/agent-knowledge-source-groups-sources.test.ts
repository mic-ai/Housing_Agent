import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteKnowledgeSourceFile } from "@/lib/storage";
import { POST } from "@/app/api/admin/agent-knowledge/source-groups/[groupId]/sources/route";
import { DELETE } from "@/app/api/admin/agent-knowledge/source-groups/[groupId]/sources/[sourceId]/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeGroupParams(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function makeSourceParams(groupId: string, sourceId: string) {
  return { params: Promise.resolve({ groupId, sourceId }) };
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/agent-knowledge/source-groups/g1/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/agent-knowledge/source-groups/[groupId]/sources", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostRequest({ url: "https://www.mlit.go.jp/x" }), makeGroupParams("g1"));
    expect(res.status).toBe(401);
  });

  it("存在しないグループは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue(null);
    const res = await POST(makePostRequest({ url: "https://www.mlit.go.jp/x" }), makeGroupParams("missing"));
    expect(res.status).toBe(404);
  });

  it("不正なURLは400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({ id: "g1" } as never);
    const res = await POST(makePostRequest({ url: "not-a-url" }), makeGroupParams("g1"));
    expect(res.status).toBe(400);
  });

  it("有効なURLでソースを追加する", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({ id: "g1" } as never);
    vi.mocked(prisma.agentKnowledgeRegisteredSource.create).mockResolvedValue({ id: "s1" } as never);

    const res = await POST(
      makePostRequest({ url: "https://www.mlit.go.jp/x", title: "国交省" }),
      makeGroupParams("g1")
    );
    expect(res.status).toBe(201);
    expect(prisma.agentKnowledgeRegisteredSource.create).toHaveBeenCalledWith({
      data: { groupId: "g1", sourceType: "URL", url: "https://www.mlit.go.jp/x", title: "国交省" },
    });
  });
});

describe("DELETE /api/admin/agent-knowledge/source-groups/[groupId]/sources/[sourceId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(new NextRequest("http://localhost/x"), makeSourceParams("g1", "s1"));
    expect(res.status).toBe(401);
  });

  it("ソースがgroupIdと一致しない場合は404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeRegisteredSource.findUnique).mockResolvedValue({
      groupId: "other-group",
      sourceType: "URL",
      storagePath: null,
    } as never);
    const res = await DELETE(new NextRequest("http://localhost/x"), makeSourceParams("g1", "s1"));
    expect(res.status).toBe(404);
  });

  it("ソースが存在しない場合は404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeRegisteredSource.findUnique).mockResolvedValue(null);
    const res = await DELETE(new NextRequest("http://localhost/x"), makeSourceParams("g1", "missing"));
    expect(res.status).toBe(404);
  });

  it("PDFソース削除時はStorageのファイルも削除する", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeRegisteredSource.findUnique).mockResolvedValue({
      groupId: "g1",
      sourceType: "PDF",
      storagePath: "knowledge-sources/g1/1.pdf",
    } as never);
    vi.mocked(prisma.agentKnowledgeRegisteredSource.delete).mockResolvedValue({ id: "s1" } as never);

    const res = await DELETE(new NextRequest("http://localhost/x"), makeSourceParams("g1", "s1"));
    expect(res.status).toBe(200);
    expect(deleteKnowledgeSourceFile).toHaveBeenCalledWith("knowledge-sources/g1/1.pdf");
    expect(prisma.agentKnowledgeRegisteredSource.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("URLソース削除時はStorage削除を呼ばない", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeRegisteredSource.findUnique).mockResolvedValue({
      groupId: "g1",
      sourceType: "URL",
      storagePath: null,
    } as never);
    vi.mocked(prisma.agentKnowledgeRegisteredSource.delete).mockResolvedValue({ id: "s1" } as never);

    const res = await DELETE(new NextRequest("http://localhost/x"), makeSourceParams("g1", "s1"));
    expect(res.status).toBe(200);
    expect(deleteKnowledgeSourceFile).not.toHaveBeenCalled();
  });
});
