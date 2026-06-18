import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/videos/[videoId]/view/route";

const params = (videoId: string) =>
  Promise.resolve({ videoId });

describe("POST /api/videos/[videoId]/view", () => {
  beforeEach(() => vi.clearAllMocks());

  it("動画が存在する場合は 204 を返し viewCount を increment する", async () => {
    vi.mocked(prisma.video.update).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost/api/videos/vid_001/view", { method: "POST" });
    const res = await POST(req, { params: params("vid_001") });

    expect(res.status).toBe(204);
    expect(prisma.video.update).toHaveBeenCalledWith({
      where: { id: "vid_001" },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });
  });

  it("動画が存在しない場合（Prisma エラー）は 404 を返す", async () => {
    vi.mocked(prisma.video.update).mockRejectedValue(new Error("Record not found"));

    const req = new NextRequest("http://localhost/api/videos/missing/view", { method: "POST" });
    const res = await POST(req, { params: params("missing") });

    expect(res.status).toBe(404);
  });
});
