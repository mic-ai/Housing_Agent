import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } };
  }),
}));

import { generateArticleDraft } from "@/lib/web-screening";

const ORIGINAL_ENV = process.env.ANTHROPIC_API_KEY;

describe("generateArticleDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV;
  });

  it("ANTHROPIC_API_KEY未設定時はエラーを投げる", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(
      generateArticleDraft({ phaseTitle: "情報収集の基礎", topic: "住宅ローン控除" })
    ).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("応答からJSONブロックと情報源を抽出する", async () => {
    mockCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "調査しています。" },
        {
          type: "web_search_tool_result",
          content: [
            { type: "web_search_result", url: "https://www.mlit.go.jp/example", title: "国土交通省 例" },
            { type: "web_search_result", url: "https://www.mlit.go.jp/example", title: "国土交通省 例（重複）" },
          ],
        },
        {
          type: "text",
          text:
            "以上を踏まえた記事です。\n```json\n" +
            JSON.stringify({
              title: "住宅ローン控除の基礎",
              bodyMarkdown: "## 概要\n住宅ローン控除とは...",
              estimatedMinutes: 3,
              difficulty: "BEGINNER",
            }) +
            "\n```",
        },
      ],
    });

    const result = await generateArticleDraft({ phaseTitle: "情報収集の基礎", topic: "住宅ローン控除" });

    expect(result.title).toBe("住宅ローン控除の基礎");
    expect(result.difficulty).toBe("BEGINNER");
    expect(result.sources).toEqual([{ url: "https://www.mlit.go.jp/example", title: "国土交通省 例" }]);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-5",
        tools: [expect.objectContaining({ type: "web_search_20260209", name: "web_search" })],
      })
    );
  });

  it("stop_reasonがrefusalの場合エラーを投げる", async () => {
    mockCreate.mockResolvedValue({ stop_reason: "refusal", content: [] });
    await expect(
      generateArticleDraft({ phaseTitle: "情報収集の基礎", topic: "住宅ローン控除" })
    ).rejects.toThrow("拒否されました");
  });

  it("JSONブロックが無い場合エラーを投げる", async () => {
    mockCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "本文のみでJSONブロックがありません" }],
    });
    await expect(
      generateArticleDraft({ phaseTitle: "情報収集の基礎", topic: "住宅ローン控除" })
    ).rejects.toThrow();
  });
});
