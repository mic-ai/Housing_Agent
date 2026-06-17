import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { POST } from "@/app/api/videos/route";
import { PATCH, DELETE } from "@/app/api/videos/[videoId]/route";

const SP_SESSION = {
  user: { id: "sp_001", name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const VIDEO = {
  id: "vid_001",
  platform: "YOUTUBE" as const,
  url: "https://www.youtube.com/watch?v=abc",
  title: "テスト動画",
  description: null,
  area: null,
  houseType: null,
  priceRange: null,
  thumbnailUrl: null,
  viewCount: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatchReq(body: object) {
  return new NextRequest("http://localhost/api/videos/vid_001", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq() {
  return new NextRequest("http://localhost/api/videos/vid_001", { method: "DELETE" });
}

const videoParams = Promise.resolve({ videoId: "vid_001" });

describe("POST /api/videos — 認証", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostReq({
      platform: "YOUTUBE",
      url: "https://www.youtube.com/watch?v=abc",
      title: "テスト",
    }));
    expect(res.status).toBe(401);
  });

  it("認証済みは動画を作成できる（201）", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    // $transaction is mocked in setup.ts to call callback with tx object
    // tx.video.create is called inside the transaction
    const mockTx = {
      video: { create: vi.fn().mockResolvedValue(VIDEO) },
      hashtag: { upsert: vi.fn() },
      videoHashtag: { create: vi.fn() },
      user: { create: vi.fn() },
      contactRequest: { create: vi.fn() },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation((cb: any) => cb(mockTx) as never);

    const res = await POST(makePostReq({
      platform: "YOUTUBE",
      url: "https://www.youtube.com/watch?v=abc",
      title: "テスト動画",
    }));
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/videos/[videoId] — 認証", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makePatchReq({ title: "新タイトル" }), { params: videoParams });
    expect(res.status).toBe(401);
  });

  it("認証済みは動画を更新できる（200）", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const mockTx = {
      video: { update: vi.fn().mockResolvedValue({ ...VIDEO, title: "新タイトル" }) },
      hashtag: { upsert: vi.fn() },
      videoHashtag: { create: vi.fn(), deleteMany: vi.fn() },
      user: { create: vi.fn() },
      contactRequest: { create: vi.fn() },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation((cb: any) => cb(mockTx) as never);

    const res = await PATCH(makePatchReq({ title: "新タイトル" }), { params: videoParams });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/videos/[videoId] — 認証", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(makeDeleteReq(), { params: videoParams });
    expect(res.status).toBe(401);
  });

  it("認証済みは動画を論理削除できる（200）", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.video.update).mockResolvedValue({ ...VIDEO, isActive: false } as never);
    const res = await DELETE(makeDeleteReq(), { params: videoParams });
    expect(res.status).toBe(200);
  });
});
