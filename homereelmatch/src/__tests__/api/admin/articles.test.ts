import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, POST } from "@/app/api/admin/articles/route";
import { PATCH, DELETE } from "@/app/api/admin/articles/[articleId]/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const SALESPERSON_SESSION = {
  user: { id: "sp1", name: "営業マン", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const articleParams = Promise.resolve({ articleId: "art_001" });

describe("GET /api/admin/articles — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/api/admin/articles"));
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const res = await GET(new NextRequest("http://localhost/api/admin/articles"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/articles — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const req = new NextRequest("http://localhost/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/articles/[articleId] — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/admin/articles/art_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    const res = await PATCH(req, { params: articleParams });
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const req = new NextRequest("http://localhost/api/admin/articles/art_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    const res = await PATCH(req, { params: articleParams });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/articles/[articleId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
  });

  it("存在しない記事は404を返す", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/articles/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ articleId: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("DRAFT→PUBLISHEDでpublishedAtを設定する", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({ publishedAt: null } as never);
    vi.mocked(prisma.article.update).mockResolvedValue({ id: "art_001", status: "PUBLISHED" } as never);

    const req = new NextRequest("http://localhost/api/admin/articles/art_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    const res = await PATCH(req, { params: articleParams });

    expect(res.status).toBe(200);
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED", publishedAt: expect.any(Date) }),
      })
    );
  });

  it("comparisonRowsを渡すと既存行を全削除してから作成する", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({ publishedAt: null } as never);
    vi.mocked(prisma.article.update).mockResolvedValue({ id: "art_001" } as never);

    const req = new NextRequest("http://localhost/api/admin/articles/art_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comparisonRows: [{ priceRangeTag: "2000万円台", order: 0 }] }),
    });
    await PATCH(req, { params: articleParams });

    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          comparisonRows: {
            deleteMany: {},
            create: [{ priceRangeTag: "2000万円台", order: 0 }],
          },
        }),
      })
    );
  });
});

describe("DELETE /api/admin/articles/[articleId] — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/admin/articles/art_001", { method: "DELETE" });
    const res = await DELETE(req, { params: articleParams });
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const req = new NextRequest("http://localhost/api/admin/articles/art_001", { method: "DELETE" });
    const res = await DELETE(req, { params: articleParams });
    expect(res.status).toBe(403);
  });
});
