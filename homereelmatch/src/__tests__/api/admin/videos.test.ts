import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Routes under test (do not exist yet — Red phase)
import { GET, PATCH } from "@/app/api/admin/videos/route";
import { PATCH as PATCH_VIDEO } from "@/app/api/admin/videos/[videoId]/route";

const VIDEO = {
  id: "vid_001",
  platform: "YOUTUBE" as const,
  url: "https://www.youtube.com/watch?v=abc",
  thumbnailUrl: null,
  title: "テスト動画",
  description: null,
  area: null,
  houseType: null,
  priceRange: null,
  viewCount: 42,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  videoHashtags: [],
  salespersonVideos: [],
};

const patchParams = Promise.resolve({ videoId: "vid_001" });

function makeReq(method: string, body?: object) {
  return new NextRequest("http://localhost/api/admin/videos", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/admin/videos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("全動画一覧を返す（非公開も含む）", async () => {
    vi.mocked(prisma.video.findMany).mockResolvedValue([VIDEO, { ...VIDEO, id: "vid_002", isActive: false }] as never);
    const req = new NextRequest("http://localhost/api/admin/videos");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });

  it("isActiveフィルターが機能する", async () => {
    vi.mocked(prisma.video.findMany).mockResolvedValue([VIDEO] as never);
    const req = new NextRequest("http://localhost/api/admin/videos?isActive=true");
    await GET(req);
    expect(prisma.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it("各動画の salesperson 紐付け数を含む", async () => {
    vi.mocked(prisma.video.findMany).mockResolvedValue([VIDEO] as never);
    const req = new NextRequest("http://localhost/api/admin/videos");
    const res = await GET(req);
    const body = await res.json();
    expect(body.data[0]).toHaveProperty("salespersonCount");
  });
});

describe("PATCH /api/admin/videos (一括操作)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("複数動画を一括で非公開にできる", async () => {
    vi.mocked(prisma.video.updateMany).mockResolvedValue({ count: 2 } as never);
    const res = await PATCH(makeReq("PATCH", { ids: ["vid_001", "vid_002"], isActive: false }));
    expect(res.status).toBe(200);
    expect(prisma.video.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["vid_001", "vid_002"] } },
      data: { isActive: false },
    });
    const body = await res.json();
    expect(body.count).toBe(2);
  });

  it("idsが空配列なら400を返す", async () => {
    const res = await PATCH(makeReq("PATCH", { ids: [], isActive: false }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/videos/[videoId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("動画の isActive を切り替えられる", async () => {
    vi.mocked(prisma.video.update).mockResolvedValue({ ...VIDEO, isActive: false } as never);
    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH_VIDEO(req, { params: patchParams });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isActive).toBe(false);
  });

  it("タイトル・説明も更新できる", async () => {
    vi.mocked(prisma.video.update).mockResolvedValue({ ...VIDEO, title: "更新タイトル" } as never);
    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "更新タイトル" }),
    });
    await PATCH_VIDEO(req, { params: patchParams });
    expect(prisma.video.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "更新タイトル" }) })
    );
  });
});
