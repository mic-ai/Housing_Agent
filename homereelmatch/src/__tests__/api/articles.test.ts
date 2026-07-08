import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as GET_LIST } from "@/app/api/articles/route";
import { GET as GET_DETAIL } from "@/app/api/articles/[articleId]/route";

describe("GET /api/articles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("phaseKeyが無い場合は400を返す", async () => {
    const req = new NextRequest("http://localhost/api/articles");
    const res = await GET_LIST(req);
    expect(res.status).toBe(400);
  });

  it("指定フェーズの PUBLISHED 記事のみを order 順に返す", async () => {
    vi.mocked(prisma.article.findMany).mockResolvedValue([
      { id: "a1", order: 0, title: "記事1", estimatedMinutes: 3, difficulty: "BEGINNER" },
    ] as never);

    const req = new NextRequest("http://localhost/api/articles?phaseKey=info_basic");
    const res = await GET_LIST(req);

    expect(res.status).toBe(200);
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          phase: { key: "info_basic", isActive: true },
        }),
        orderBy: { order: "asc" },
      })
    );
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /api/articles/[articleId]", () => {
  beforeEach(() => vi.clearAllMocks());

  const params = (id: string) => Promise.resolve({ articleId: id });

  it("存在しない記事は404を返す", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/articles/missing");
    const res = await GET_DETAIL(req, { params: params("missing") });
    expect(res.status).toBe(404);
  });

  it("DRAFT記事は404を返す（未公開記事を隠す）", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: "a1",
      status: "DRAFT",
    } as never);
    const req = new NextRequest("http://localhost/api/articles/a1");
    const res = await GET_DETAIL(req, { params: params("a1") });
    expect(res.status).toBe(404);
  });

  it("PUBLISHED記事は200で本文を返す", async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: "a1",
      status: "PUBLISHED",
      bodyMarkdown: "# hello",
      comparisonRows: [],
    } as never);
    const req = new NextRequest("http://localhost/api/articles/a1");
    const res = await GET_DETAIL(req, { params: params("a1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.bodyMarkdown).toBe("# hello");
  });
});
