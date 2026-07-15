import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uploadFaceVideo, deleteFaceVideo } from "@/lib/storage";
import { getVideoDurationSec } from "@/lib/video-duration";

vi.mock("@/lib/video-duration", () => ({
  getVideoDurationSec: vi.fn(),
}));

// mp4 ISO container: [size(4)]["ftyp"][brand] — real magic bytes required by looksLikeAllowedVideo()
const MP4_BYTES = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);

const SP_SESSION = {
  user: { id: "sp_001", name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makePostReq(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return new NextRequest("http://localhost/api/salesperson/profile/intro-video", { method: "POST", body: fd });
}

describe("POST /api/salesperson/profile/intro-video", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadFaceVideo).mockResolvedValue({ path: "intro-videos/sp_001/intro_1.mp4", publicUrl: "https://storage/intro.mp4" });
    vi.mocked(getVideoDurationSec).mockResolvedValue(20);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue({ introVideoStoragePath: null } as never);
  });

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await (await import("@/app/api/salesperson/profile/intro-video/route")).POST(
      makePostReq(new File([MP4_BYTES], "t.mp4", { type: "video/mp4" }))
    );
    expect(res.status).toBe(401);
  });

  it("ファイル形式が不正なら400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const { POST } = await import("@/app/api/salesperson/profile/intro-video/route");
    const res = await POST(makePostReq(new File(["x"], "t.txt", { type: "text/plain" })));
    expect(res.status).toBe(400);
  });

  it("30秒超の動画は400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(getVideoDurationSec).mockResolvedValue(45);
    const { POST } = await import("@/app/api/salesperson/profile/intro-video/route");
    const res = await POST(makePostReq(new File([MP4_BYTES], "t.mp4", { type: "video/mp4" })));
    expect(res.status).toBe(400);
  });

  it("既存動画がある場合は削除してから新規アップロードする", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue({ introVideoStoragePath: "intro-videos/sp_001/old.mp4" } as never);
    vi.mocked(prisma.salesperson.update).mockResolvedValue({
      introVideoUrl: "https://storage/intro.mp4",
      introVideoStoragePath: "intro-videos/sp_001/intro_1.mp4",
      introVideoDurationSec: 20,
    } as never);
    const { POST } = await import("@/app/api/salesperson/profile/intro-video/route");
    const res = await POST(makePostReq(new File([MP4_BYTES], "t.mp4", { type: "video/mp4" })));
    expect(res.status).toBe(201);
    expect(deleteFaceVideo).toHaveBeenCalledWith("intro-videos/sp_001/old.mp4");
  });

  it("自己紹介動画をアップロードできる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.update).mockResolvedValue({
      introVideoUrl: "https://storage/intro.mp4",
      introVideoStoragePath: "intro-videos/sp_001/intro_1.mp4",
      introVideoDurationSec: 20,
    } as never);
    const { POST } = await import("@/app/api/salesperson/profile/intro-video/route");
    const res = await POST(makePostReq(new File([MP4_BYTES], "t.mp4", { type: "video/mp4" })));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.introVideoUrl).toBe("https://storage/intro.mp4");
    expect(prisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sp_001" },
        data: expect.objectContaining({ introVideoUrl: "https://storage/intro.mp4", introVideoDurationSec: 20 }),
      })
    );
  });
});

describe("DELETE /api/salesperson/profile/intro-video", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { DELETE } = await import("@/app/api/salesperson/profile/intro-video/route");
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("自己紹介動画を削除できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue({ introVideoStoragePath: "intro-videos/sp_001/intro_1.mp4" } as never);
    vi.mocked(prisma.salesperson.update).mockResolvedValue({} as never);
    const { DELETE } = await import("@/app/api/salesperson/profile/intro-video/route");
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(deleteFaceVideo).toHaveBeenCalledWith("intro-videos/sp_001/intro_1.mp4");
    expect(prisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { introVideoUrl: null, introVideoStoragePath: null, introVideoDurationSec: null },
      })
    );
  });
});
