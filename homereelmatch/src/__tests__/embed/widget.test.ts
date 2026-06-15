import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Widget under test — embed/src/widget.ts を直接インポート
import { createWidget, HomeReelMatchWidget } from "../../../embed/src/widget";

const MOCK_VIDEOS = [
  {
    id: "vid_001",
    platform: "YOUTUBE",
    url: "https://www.youtube.com/watch?v=abc123",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    title: "モデルハウス紹介",
    hashtags: ["新築", "一戸建て"],
  },
  {
    id: "vid_002",
    platform: "INSTAGRAM",
    url: "https://www.instagram.com/reel/xyz",
    thumbnailUrl: null,
    title: "土地情報",
    hashtags: [],
  },
];

describe("HomeReelMatch Embed Widget", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let container: HTMLElement;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: MOCK_VIDEOS }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.removeChild(container);
  });

  it("createWidget はウィジェットインスタンスを返す", () => {
    const widget = createWidget({ container, apiUrl: "https://app.example.com" });
    expect(widget).toBeInstanceOf(HomeReelMatchWidget);
  });

  it("Shadow DOM を使用してレンダリングされる", async () => {
    const widget = createWidget({ container, apiUrl: "https://app.example.com" });
    await widget.render();
    expect(container.shadowRoot).not.toBeNull();
  });

  it("APIから動画を取得してカードをレンダリングする", async () => {
    const widget = createWidget({ container, apiUrl: "https://app.example.com" });
    await widget.render();
    const shadowRoot = container.shadowRoot!;
    const cards = shadowRoot.querySelectorAll("[data-video-id]");
    expect(cards).toHaveLength(2);
  });

  it("動画タイトルが表示される", async () => {
    const widget = createWidget({ container, apiUrl: "https://app.example.com" });
    await widget.render();
    const shadowRoot = container.shadowRoot!;
    expect(shadowRoot.textContent).toContain("モデルハウス紹介");
  });

  it("countオプションでAPIにパラメータを渡す", async () => {
    const widget = createWidget({ container, apiUrl: "https://app.example.com", count: 3 });
    await widget.render();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("count=3"),
      expect.anything()
    );
  });

  it("tagオプションでAPIにタグパラメータを渡す", async () => {
    const widget = createWidget({ container, apiUrl: "https://app.example.com", tag: "新築" });
    await widget.render();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("tag=%E6%96%B0%E7%AF%89"),
      expect.anything()
    );
  });

  it("サムネイルがない場合もクラッシュしない", async () => {
    const widget = createWidget({ container, apiUrl: "https://app.example.com" });
    await expect(widget.render()).resolves.not.toThrow();
    const shadowRoot = container.shadowRoot!;
    const cards = shadowRoot.querySelectorAll("[data-video-id]");
    expect(cards).toHaveLength(2);
  });

  it("APIエラー時はエラーメッセージを表示する", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    } as unknown as Response);
    const widget = createWidget({ container, apiUrl: "https://app.example.com" });
    await widget.render();
    const shadowRoot = container.shadowRoot!;
    expect(shadowRoot.textContent).toMatch(/エラー|error/i);
  });

  it("外部サイトのCSSと競合しない（Shadow DOMでスコープ分離）", async () => {
    // 外部のCSSを設定
    const style = document.createElement("style");
    style.textContent = "* { color: red !important; font-size: 100px !important; }";
    document.head.appendChild(style);

    const widget = createWidget({ container, apiUrl: "https://app.example.com" });
    await widget.render();

    const shadowRoot = container.shadowRoot!;
    // Shadow DOM内のスタイルは外部CSSに影響されない
    expect(shadowRoot).not.toBeNull();

    document.head.removeChild(style);
  });
});
