import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/videos/route";

function makeGetReq(query: string) {
  return new NextRequest(`http://localhost/api/videos${query}`);
}

describe("GET /api/videos houseMakerIdフィルタ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.video.findMany).mockResolvedValue([]);
  });

  it("単一IDの場合は従来通り完全一致で絞り込む", async () => {
    await GET(makeGetReq("?houseMakerId=hm1"));

    expect(prisma.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ houseMakerId: "hm1" }),
      })
    );
  });

  it("カンマ区切りの複数IDの場合はinで絞り込む", async () => {
    await GET(makeGetReq("?houseMakerId=hm1,hm2,hm3"));

    expect(prisma.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ houseMakerId: { in: ["hm1", "hm2", "hm3"] } }),
      })
    );
  });

  it("houseMakerId未指定の場合はフィルタしない", async () => {
    await GET(makeGetReq(""));

    const call = vi.mocked(prisma.video.findMany).mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where).not.toHaveProperty("houseMakerId");
  });
});
