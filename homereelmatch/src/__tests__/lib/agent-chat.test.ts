import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } };
  }),
}));

import { generateAgentChatTurn } from "@/lib/agent-chat";

const ORIGINAL_ENV = process.env.ANTHROPIC_API_KEY;

function validResponse(overrides?: Partial<Record<string, unknown>>) {
  return {
    stop_reason: "end_turn",
    content: [
      {
        type: "text",
        text:
          "ご相談ありがとうございます。\n```json\n" +
          JSON.stringify({
            replyText: "エリアと予算を教えていただけますか?",
            updatedConditions: { priorityFactors: [], desiredTags: ["ローコスト"] },
            candidateHouseMakerIds: ["hm1"],
            referencedKnowledgeIds: ["kn1"],
            ...overrides,
          }) +
          "\n```",
      },
    ],
  };
}

describe("generateAgentChatTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV;
  });

  const baseInput = {
    history: [{ role: "USER" as const, content: "こんにちは" }],
    userMessage: "予算1000万円くらいでローコストな会社を探しています",
    knowledgeContext: [
      { id: "kn1", title: "ローコスト住宅とは", bodyMarkdown: "一般的な説明...", category: "価格帯" },
    ],
    candidateHouseMakers: [{ id: "hm1", name: "サンプルハウス" }],
    priorConditions: null,
  };

  it("ANTHROPIC_API_KEY未設定時はエラーを投げる", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateAgentChatTurn(baseInput)).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("system promptに候補企業リストとナレッジを注入し、JSON応答を解析する", async () => {
    mockCreate.mockResolvedValue(validResponse());

    const result = await generateAgentChatTurn(baseInput);

    expect(result.replyText).toBe("エリアと予算を教えていただけますか?");
    expect(result.candidateHouseMakerIds).toEqual(["hm1"]);
    expect(result.referencedKnowledgeIds).toEqual(["kn1"]);
    expect(result.updatedConditions.desiredTags).toEqual(["ローコスト"]);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-5",
        system: expect.stringContaining("hm1"),
      })
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("ローコスト住宅とは"),
      })
    );
  });

  it("素のIDをそのまま返す(DB照合はAPIルート側の責務)", async () => {
    mockCreate.mockResolvedValue(
      validResponse({ candidateHouseMakerIds: ["hm-nonexistent"], referencedKnowledgeIds: [] })
    );

    const result = await generateAgentChatTurn(baseInput);

    expect(result.candidateHouseMakerIds).toEqual(["hm-nonexistent"]);
  });

  it("stop_reasonがrefusalの場合エラーを投げる", async () => {
    mockCreate.mockResolvedValue({ stop_reason: "refusal", content: [] });
    await expect(generateAgentChatTurn(baseInput)).rejects.toThrow("拒否されました");
  });

  it("JSONブロックが無い場合エラーを投げる", async () => {
    mockCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "JSONブロックがありません" }],
    });
    await expect(generateAgentChatTurn(baseInput)).rejects.toThrow();
  });
});
