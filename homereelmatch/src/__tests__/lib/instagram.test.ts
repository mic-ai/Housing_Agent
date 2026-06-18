import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// unstable_cache must be mocked before importing the module under test
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

// Re-import after mocking
const { getInstagramOEmbed } = await import("@/lib/instagram");

const SAMPLE_URL = "https://www.instagram.com/p/ABC123/";

describe("getInstagramOEmbed", () => {
  const originalToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalToken === undefined) {
      delete process.env.INSTAGRAM_ACCESS_TOKEN;
    } else {
      process.env.INSTAGRAM_ACCESS_TOKEN = originalToken;
    }
  });

  it("INSTAGRAM_ACCESS_TOKEN 未設定時は null を返す", async () => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    const result = await getInstagramOEmbed(SAMPLE_URL);
    expect(result).toBeNull();
  });

  it("正常レスポンスで oEmbed データを返す", async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = "test-token";
    const mockData = {
      html: '<blockquote class="instagram-media">...</blockquote>',
      thumbnail_url: "https://example.com/thumb.jpg",
      author_name: "test_user",
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    }));

    const result = await getInstagramOEmbed(SAMPLE_URL);
    expect(result).toEqual(mockData);

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(fetchCall).toContain("instagram_oembed");
    expect(fetchCall).toContain(encodeURIComponent(SAMPLE_URL));
    expect(fetchCall).toContain("test-token");
    expect(fetchCall).toContain("omitscript=true");
  });

  it("API が非200を返した場合は null を返す", async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = "test-token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    }));

    const result = await getInstagramOEmbed(SAMPLE_URL);
    expect(result).toBeNull();
  });

  it("ネットワークエラーの場合は null を返す", async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = "test-token";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const result = await getInstagramOEmbed(SAMPLE_URL);
    expect(result).toBeNull();
  });
});
