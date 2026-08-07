import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, PATCH, DELETE } from "@/app/api/admin/agent-knowledge/[id]/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/agent-knowledge/kn1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/agent-knowledge/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないIDは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.findUnique).mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/x"), makeParams("missing"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/agent-knowledge/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DRAFT→PUBLISHEDへの初回遷移時のみpublishedAtをセットする", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.findUnique).mockResolvedValue({ publishedAt: null } as never);
    vi.mocked(prisma.agentKnowledgeEntry.update).mockResolvedValue({ id: "kn1", status: "PUBLISHED" } as never);

    await PATCH(makePatchRequest({ status: "PUBLISHED" }), makeParams("kn1"));

    const call = vi.mocked(prisma.agentKnowledgeEntry.update).mock.calls[0][0] as {
      data: { status?: string; publishedAt?: Date };
    };
    expect(call.data.status).toBe("PUBLISHED");
    expect(call.data.publishedAt).toBeInstanceOf(Date);
  });

  it("既にpublishedAtがある場合は上書きしない", async () => {
    const existingDate = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.findUnique).mockResolvedValue({ publishedAt: existingDate } as never);
    vi.mocked(prisma.agentKnowledgeEntry.update).mockResolvedValue({ id: "kn1", status: "PUBLISHED" } as never);

    await PATCH(makePatchRequest({ status: "PUBLISHED" }), makeParams("kn1"));

    const call = vi.mocked(prisma.agentKnowledgeEntry.update).mock.calls[0][0] as {
      data: { publishedAt?: Date };
    };
    expect(call.data.publishedAt).toBe(existingDate);
  });

  it("存在しないIDは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.findUnique).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ title: "x" }), makeParams("missing"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/agent-knowledge/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("削除するとagentKnowledgeEntry.deleteが正しいIDで呼ばれる", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.findUnique).mockResolvedValue({ id: "kn1" } as never);
    vi.mocked(prisma.agentKnowledgeEntry.delete).mockResolvedValue({ id: "kn1" } as never);

    const res = await DELETE(new NextRequest("http://localhost/x"), makeParams("kn1"));
    expect(res.status).toBe(200);
    expect(prisma.agentKnowledgeEntry.delete).toHaveBeenCalledWith({ where: { id: "kn1" } });
  });

  it("存在しないIDは404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeEntry.findUnique).mockResolvedValue(null);
    const res = await DELETE(new NextRequest("http://localhost/x"), makeParams("missing"));
    expect(res.status).toBe(404);
  });
});
