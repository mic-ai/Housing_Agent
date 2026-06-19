import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, POST } from "@/app/api/salesperson/profile/videos/route";
import { DELETE } from "@/app/api/salesperson/profile/videos/[id]/route";

const SP_SESSION = {
  user: { id: "sp_001", name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const PROFILE_VIDEO = {
  id: "pv_001",
  salespersonId: "sp_001",
  url: "https://www.youtube.com/watch?v=test",
  platform: "YOUTUBE" as const,
  title: "自己紹介動画",
  sortOrder: 0,
  createdAt: new Date(),
};

const deleteParams = Promise.resolve({ id: "pv_001" });

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/salesperson/profile/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/salesperson/profile/videos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/api/salesperson/profile/videos"));
    expect(res.status).toBe(401);
  });

  it("自分のプロフィール動画一覧を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salespersonProfileVideo.findMany).mockResolvedValue([PROFILE_VIDEO] as never);
    const res = await GET(new NextRequest("http://localhost/api/salesperson/profile/videos"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("自己紹介動画");
  });
});

describe("POST /api/salesperson/profile/videos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostReq({ url: "https://www.youtube.com/watch?v=test", platform: "YOUTUBE" }));
    expect(res.status).toBe(401);
  });

  it("プロフィール動画を追加できる（201）", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salespersonProfileVideo.create).mockResolvedValue(PROFILE_VIDEO as never);
    const res = await POST(makePostReq({
      url: "https://www.youtube.com/watch?v=test",
      platform: "YOUTUBE",
      title: "自己紹介動画",
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.platform).toBe("YOUTUBE");
    expect(prisma.salespersonProfileVideo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ salespersonId: "sp_001", platform: "YOUTUBE" }),
      })
    );
  });

  it("不正なURLは400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const res = await POST(makePostReq({ url: "not-a-url", platform: "YOUTUBE" }));
    expect(res.status).toBe(400);
  });

  it("不正なplatformは400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const res = await POST(makePostReq({ url: "https://example.com", platform: "TIKTOK" }));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/salesperson/profile/videos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/salesperson/profile/videos/pv_001", { method: "DELETE" });
    const res = await DELETE(req, { params: deleteParams });
    expect(res.status).toBe(401);
  });

  it("他の営業マンの動画は削除できない（403）", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salespersonProfileVideo.findUnique).mockResolvedValue({
      ...PROFILE_VIDEO,
      salespersonId: "sp_OTHER",
    } as never);
    const req = new NextRequest("http://localhost/api/salesperson/profile/videos/pv_001", { method: "DELETE" });
    const res = await DELETE(req, { params: deleteParams });
    expect(res.status).toBe(403);
  });

  it("自分の動画を削除できる（200）", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salespersonProfileVideo.findUnique).mockResolvedValue(PROFILE_VIDEO as never);
    vi.mocked(prisma.salespersonProfileVideo.delete).mockResolvedValue(PROFILE_VIDEO as never);
    const req = new NextRequest("http://localhost/api/salesperson/profile/videos/pv_001", { method: "DELETE" });
    const res = await DELETE(req, { params: deleteParams });
    expect(res.status).toBe(200);
  });

  it("存在しない動画は404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salespersonProfileVideo.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/salesperson/profile/videos/pv_999", { method: "DELETE" });
    const res = await DELETE(req, { params: deleteParams });
    expect(res.status).toBe(404);
  });
});
