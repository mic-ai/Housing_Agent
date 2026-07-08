import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/viewer/salesperson-views/route";

function mockCookie(value: string | undefined) {
  vi.mocked(cookies).mockReturnValue({
    get: vi.fn(() => (value ? { value } : undefined)),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/viewer/salesperson-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/viewer/salesperson-views", () => {
  beforeEach(() => vi.clearAllMocks());

  it("viewerToken Cookieが無い場合は400を返す", async () => {
    mockCookie(undefined);
    const res = await GET();
    expect(res.status).toBe(400);
  });

  it("ViewerProfileが無い場合は空配列を返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.findUnique).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("視聴履歴をlastViewedAt降順で返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.findUnique).mockResolvedValue({ id: "vp1" } as never);
    vi.mocked(prisma.viewerSalespersonView.findMany).mockResolvedValue([
      { id: "v1", salespersonId: "sp1", videoId: "vid1", viewCount: 2 },
    ] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(prisma.viewerSalespersonView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { viewerId: "vp1" }, orderBy: { lastViewedAt: "desc" } })
    );
  });
});

describe("POST /api/viewer/salesperson-views", () => {
  beforeEach(() => vi.clearAllMocks());

  it("viewerToken Cookieが無い場合は400を返す", async () => {
    mockCookie(undefined);
    const res = await POST(makePostReq({ salespersonId: "sp1" }));
    expect(res.status).toBe(400);
  });

  it("不正なリクエストは400を返す", async () => {
    mockCookie("token-abc");
    const res = await POST(makePostReq({}));
    expect(res.status).toBe(400);
  });

  it("初回は新規作成し、既存の場合はviewCountを増分する", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "vp1" } as never);
    vi.mocked(prisma.viewerSalespersonView.upsert).mockResolvedValue({
      id: "v1",
      viewerId: "vp1",
      salespersonId: "sp1",
      videoId: "vid1",
      viewCount: 2,
    } as never);
    const res = await POST(makePostReq({ salespersonId: "sp1", videoId: "vid1" }));
    expect(res.status).toBe(200);
    expect(prisma.viewerSalespersonView.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { viewerId_salespersonId: { viewerId: "vp1", salespersonId: "sp1" } },
        update: expect.objectContaining({ viewCount: { increment: 1 }, videoId: "vid1" }),
        create: { viewerId: "vp1", salespersonId: "sp1", videoId: "vid1" },
      })
    );
  });
});
