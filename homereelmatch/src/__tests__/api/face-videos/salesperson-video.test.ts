import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFaceVideo } from "@/lib/storage";

// Import handlers under test (do not exist yet — Red phase)
import { GET, DELETE } from "@/app/api/face-videos/[salespersonVideoId]/route";

const RECORD = {
  id: "sv_001",
  videoId: "vid_001",
  salespersonId: "sp_001",
  preRollStoragePath: "sp_001/vid_001/pre_123.mp4",
  preRollPublicUrl: "https://storage.example.com/pre.mp4",
  preRollDurationSec: 4,
  postRollStoragePath: null,
  postRollPublicUrl: null,
  postRollDurationSec: null,
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReq(method: string) {
  return new NextRequest("http://localhost/api/face-videos/sv_001", { method });
}

const params = Promise.resolve({ salespersonVideoId: "sv_001" });

describe("GET /api/face-videos/[salespersonVideoId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在するIDで200とデータを返す", async () => {
    vi.mocked(prisma.salespersonVideo.findUnique).mockResolvedValue(RECORD as never);
    const res = await GET(makeReq("GET"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("sv_001");
  });

  it("存在しないIDで404を返す", async () => {
    vi.mocked(prisma.salespersonVideo.findUnique).mockResolvedValue(null);
    const res = await GET(makeReq("GET"), { params });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/face-videos/[salespersonVideoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.salespersonVideo.findUnique).mockResolvedValue(RECORD as never);
    vi.mocked(prisma.salespersonVideo.delete).mockResolvedValue(RECORD as never);
    vi.mocked(deleteFaceVideo).mockResolvedValue(undefined);
  });

  it("レコードとStorageファイルを削除して200を返す", async () => {
    const res = await DELETE(makeReq("DELETE"), { params });
    expect(res.status).toBe(200);
    expect(deleteFaceVideo).toHaveBeenCalledWith(RECORD.preRollStoragePath);
    expect(prisma.salespersonVideo.delete).toHaveBeenCalledWith({ where: { id: "sv_001" } });
  });

  it("存在しないIDで404を返す", async () => {
    vi.mocked(prisma.salespersonVideo.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("postRollStoragePathも削除する", async () => {
    const recordWithPost = {
      ...RECORD,
      postRollStoragePath: "sp_001/vid_001/post_456.mp4",
    };
    vi.mocked(prisma.salespersonVideo.findUnique).mockResolvedValue(recordWithPost as never);
    vi.mocked(prisma.salespersonVideo.delete).mockResolvedValue(recordWithPost as never);

    await DELETE(makeReq("DELETE"), { params });

    expect(deleteFaceVideo).toHaveBeenCalledWith(RECORD.preRollStoragePath);
    expect(deleteFaceVideo).toHaveBeenCalledWith("sp_001/vid_001/post_456.mp4");
    expect(deleteFaceVideo).toHaveBeenCalledTimes(2);
  });
});
