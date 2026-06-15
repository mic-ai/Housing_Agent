import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// origin は Fetch 仕様の forbidden header のため NextRequest コンストラクタでは設定不可。
// headers.get をスパイして CORS チェックをテストする。
import { GET } from "@/app/api/embed/videos/route";

const VIDEOS = [
  {
    id: "vid_001",
    platform: "YOUTUBE" as const,
    url: "https://www.youtube.com/watch?v=abc123",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    title: "モデルハウス紹介",
    description: null,
    area: "東京",
    houseType: null,
    priceRange: null,
    viewCount: 100,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    videoHashtags: [
      { hashtag: { id: "h1", tagName: "新築", usageCount: 5 } },
    ],
  },
];

function makeReq(params?: Record<string, string>, originHeader: string | null = "https://portal.example.com") {
  const url = new URL("http://localhost/api/embed/videos");
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const req = new NextRequest(url.toString());
  // origin は forbidden header のためスパイで注入
  vi.spyOn(req.headers, "get").mockImplementation((name: string) =>
    name === "origin" ? originHeader : null
  );
  return req;
}

describe("GET /api/embed/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.video.findMany).mockResolvedValue(VIDEOS as never);
    // 未設定 = 全オリジン許可（開発モード）
    delete process.env.EMBED_ALLOWED_ORIGINS;
  });

  it("動画一覧をEmbedDTO形式で返す", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "vid_001",
      platform: "YOUTUBE",
      url: expect.stringContaining("youtube"),
      thumbnailUrl: expect.stringContaining("img.youtube"),
      title: "モデルハウス紹介",
      hashtags: ["新築"],
    });
  });

  it("countパラメータで件数を制限できる", async () => {
    await GET(makeReq({ count: "3" }));
    expect(prisma.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });

  it("tagパラメータでタグ絞り込みができる", async () => {
    await GET(makeReq({ tag: "新築" }));
    expect(prisma.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          videoHashtags: expect.objectContaining({
            some: expect.objectContaining({ hashtag: expect.objectContaining({ tagName: "新築" }) }),
          }),
        }),
      })
    );
  });

  it("許可されたOriginにCORSヘッダーを返す", async () => {
    const res = await GET(makeReq());
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://portal.example.com");
  });

  it("Originヘッダーがない場合は403を返す", async () => {
    const res = await GET(makeReq({}, null));
    expect(res.status).toBe(403);
  });
});
