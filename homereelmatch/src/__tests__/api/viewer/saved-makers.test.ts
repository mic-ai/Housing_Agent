import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/viewer/saved-makers/route";
import { DELETE } from "@/app/api/viewer/saved-makers/[id]/route";

function mockCookie(value: string | undefined) {
  vi.mocked(cookies).mockReturnValue({
    get: vi.fn(() => (value ? { value } : undefined)),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/viewer/saved-makers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const itemParams = Promise.resolve({ id: "sm1" });

describe("GET /api/viewer/saved-makers", () => {
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
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

describe("POST /api/viewer/saved-makers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("不正なリクエストは400を返す", async () => {
    mockCookie("token-abc");
    const res = await POST(makePostReq({}));
    expect(res.status).toBe(400);
  });

  it("気になるメーカーを追加できる（冪等）", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "vp1" } as never);
    vi.mocked(prisma.viewerSavedMaker.upsert).mockResolvedValue({
      id: "sm1",
      viewerId: "vp1",
      houseMakerId: "hm1",
    } as never);
    const res = await POST(makePostReq({ houseMakerId: "hm1" }));
    expect(res.status).toBe(201);
    expect(prisma.viewerSavedMaker.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { viewerId_houseMakerId: { viewerId: "vp1", houseMakerId: "hm1" } },
      })
    );
  });
});

describe("DELETE /api/viewer/saved-makers/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("viewerToken Cookieが無い場合は400を返す", async () => {
    mockCookie(undefined);
    const res = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), { params: itemParams });
    expect(res.status).toBe(400);
  });

  it("存在しないレコードは404を返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerSavedMaker.findUnique).mockResolvedValue(null);
    const res = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), { params: itemParams });
    expect(res.status).toBe(404);
  });

  it("他の閲覧者のレコードは404を返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerSavedMaker.findUnique).mockResolvedValue({ id: "sm1", viewerId: "other_vp" } as never);
    vi.mocked(prisma.viewerProfile.findUnique).mockResolvedValue({ id: "vp1" } as never);
    const res = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), { params: itemParams });
    expect(res.status).toBe(404);
  });

  it("自分のレコードを削除できる", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerSavedMaker.findUnique).mockResolvedValue({ id: "sm1", viewerId: "vp1" } as never);
    vi.mocked(prisma.viewerProfile.findUnique).mockResolvedValue({ id: "vp1" } as never);
    vi.mocked(prisma.viewerSavedMaker.delete).mockResolvedValue({} as never);
    const res = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), { params: itemParams });
    expect(res.status).toBe(200);
  });
});
