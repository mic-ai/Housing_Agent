import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { findCandidateHouseMakers } from "@/lib/agent-candidates";

describe("findCandidateHouseMakers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("desiredTagsが空の場合はisActiveなHouseMakerを名前順で返す", async () => {
    vi.mocked(prisma.houseMaker.findMany).mockResolvedValue([
      { id: "hm1", name: "Aハウス", logoUrl: null },
    ] as never);

    const result = await findCandidateHouseMakers({ priorityFactors: [], desiredTags: [] }, 5);

    expect(prisma.houseMaker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 5,
      })
    );
    expect(result).toEqual([{ id: "hm1", name: "Aハウス", logoUrl: null }]);
  });

  it("desiredTagsが指定されている場合はisActive条件をvideos側にも適用する", async () => {
    vi.mocked(prisma.houseMaker.findMany).mockResolvedValue([]);

    await findCandidateHouseMakers({ priorityFactors: [], desiredTags: ["ローコスト"] }, 5);

    const call = vi.mocked(prisma.houseMaker.findMany).mock.calls[0][0] as {
      where: { isActive: boolean; videos: { some: { isActive: boolean } } };
    };
    expect(call.where.isActive).toBe(true);
    expect(call.where.videos.some.isActive).toBe(true);
  });

  it("一致したタグ数が多いメーカーほど上位にスコアリングされる", async () => {
    vi.mocked(prisma.houseMaker.findMany).mockResolvedValue([
      {
        id: "hm-low",
        name: "低マッチ",
        logoUrl: null,
        videos: [{ videoHashtags: [{ hashtag: { tagName: "ローコスト" } }] }],
      },
      {
        id: "hm-high",
        name: "高マッチ",
        logoUrl: null,
        videos: [
          {
            videoHashtags: [
              { hashtag: { tagName: "ローコスト" } },
              { hashtag: { tagName: "耐震" } },
            ],
          },
        ],
      },
    ] as never);

    const result = await findCandidateHouseMakers(
      { priorityFactors: [], desiredTags: ["ローコスト", "耐震"] },
      5
    );

    expect(result.map((r) => r.id)).toEqual(["hm-high", "hm-low"]);
  });

  it("タグ一致する動画が無い場合はisActiveな企業一覧にフォールバックする(登録済み企業が0件と誤って伝わるのを防ぐ)", async () => {
    vi.mocked(prisma.houseMaker.findMany)
      .mockResolvedValueOnce([]) // タグ絞り込みクエリ: 一致なし
      .mockResolvedValueOnce([
        { id: "hm1", name: "登録済みハウス", logoUrl: null },
      ] as never); // フォールバック: isActive一覧

    const result = await findCandidateHouseMakers(
      { priorityFactors: [], desiredTags: ["木造"] },
      5
    );

    expect(prisma.houseMaker.findMany).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ id: "hm1", name: "登録済みハウス", logoUrl: null }]);
  });
});
