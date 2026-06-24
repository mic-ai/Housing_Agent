import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

import { GET, PATCH } from "@/app/api/admin/videos/route";
import { DELETE, PATCH as PATCH_VIDEO } from "@/app/api/admin/videos/[videoId]/route";

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

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const SALESPERSON_SESSION = {
  user: { id: "sp1", name: "営業マン", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const videoParams = Promise.resolve({ videoId: "vid_001" });

function makeReq(method: string, body?: object) {
  return new NextRequest("http://localhost/api/admin/videos", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/admin/videos — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/api/admin/videos"));
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const res = await GET(new NextRequest("http://localhost/api/admin/videos"));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
  });

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

describe("PATCH /api/admin/videos (一括操作) — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makeReq("PATCH", { ids: ["vid_001"], isActive: false }));
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const res = await PATCH(makeReq("PATCH", { ids: ["vid_001"], isActive: false }));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/videos (一括操作)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
  });

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

describe("DELETE /api/admin/videos/[videoId] — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", { method: "DELETE" });
    const res = await DELETE(req, { params: videoParams });
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", { method: "DELETE" });
    const res = await DELETE(req, { params: videoParams });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/videos/[videoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
  });

  it("関連レコードを含めてトランザクションで削除し 200 を返す", async () => {
    vi.mocked(prisma.videoHashtag.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.salespersonVideo.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.video.delete).mockResolvedValue(VIDEO as never);

    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", { method: "DELETE" });
    const res = await DELETE(req, { params: videoParams });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // $transaction が呼ばれたことを確認
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // 配列形式で渡された3オペレーション（deleteMany×2 + delete）を確認
    const txArg = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown;
    expect(Array.isArray(txArg)).toBe(true);
    expect((txArg as unknown[]).length).toBe(3);
  });
});

describe("PATCH /api/admin/videos/[videoId] — 認証チェック", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH_VIDEO(req, { params: videoParams });
    expect(res.status).toBe(401);
  });

  it("SALESPERSON ロールは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SALESPERSON_SESSION as never);
    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH_VIDEO(req, { params: videoParams });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/videos/[videoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
  });

  it("動画の isActive を切り替えられる", async () => {
    vi.mocked(prisma.video.update).mockResolvedValue({ ...VIDEO, isActive: false } as never);
    const req = new NextRequest("http://localhost/api/admin/videos/vid_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    const res = await PATCH_VIDEO(req, { params: videoParams });
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
    await PATCH_VIDEO(req, { params: videoParams });
    expect(prisma.video.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "更新タイトル" }) })
    );
  });
});
