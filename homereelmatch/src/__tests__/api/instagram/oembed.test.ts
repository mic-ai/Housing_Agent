import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/instagram", () => ({
  getInstagramOEmbed: vi.fn(),
}));

const { GET } = await import("@/app/api/instagram/oembed/route");
const { getInstagramOEmbed } = await import("@/lib/instagram");

const SAMPLE_URL = "https://www.instagram.com/p/ABC123/";

function makeReq(url?: string) {
  const searchParams = url ? `?url=${encodeURIComponent(url)}` : "";
  return new NextRequest(`http://localhost/api/instagram/oembed${searchParams}`);
}

describe("GET /api/instagram/oembed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("url パラメータが無い場合 400 を返す", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("url が不正な形式の場合 400 を返す", async () => {
    const res = await GET(makeReq("not-a-url"));
    expect(res.status).toBe(400);
  });

  it("oEmbed 取得成功時に 200 とデータを返す", async () => {
    const mockData = {
      html: '<blockquote class="instagram-media">...</blockquote>',
      thumbnail_url: "https://example.com/thumb.jpg",
      author_name: "test_user",
    };
    vi.mocked(getInstagramOEmbed).mockResolvedValue(mockData as never);

    const res = await GET(makeReq(SAMPLE_URL));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockData);
  });

  it("oEmbed 取得成功時に Cache-Control ヘッダーを付与する", async () => {
    vi.mocked(getInstagramOEmbed).mockResolvedValue({ html: "<p>test</p>" } as never);
    const res = await GET(makeReq(SAMPLE_URL));
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  it("oEmbed が null の場合 503 を返す", async () => {
    vi.mocked(getInstagramOEmbed).mockResolvedValue(null);
    const res = await GET(makeReq(SAMPLE_URL));
    expect(res.status).toBe(503);
  });

  it("getInstagramOEmbed が例外を投げた場合 500 を返す", async () => {
    vi.mocked(getInstagramOEmbed).mockRejectedValue(new Error("unexpected"));
    const res = await GET(makeReq(SAMPLE_URL));
    expect(res.status).toBe(500);
  });
});
