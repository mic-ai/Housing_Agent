import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uploadFaceVideo, buildSalespersonFaceVideoPath, deleteFaceVideo } from "@/lib/storage";
import { getVideoDurationSec } from "@/lib/video-duration";

vi.mock("@/lib/video-duration", () => ({
  getVideoDurationSec: vi.fn(),
}));

const SP_SESSION = {
  user: { id: "sp_001", name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeUploadRequest(type: "pre" | "post", durationOverride?: number) {
  const fd = new FormData();
  const file = new File(["dummy"], "test.mp4", { type: "video/mp4" });
  fd.append("file", file);
  fd.append("type", type);
  void durationOverride; // resolved via vi.mocked(getVideoDurationSec)
  return new NextRequest("http://localhost/api/salesperson/profile/face-video", {
    method: "POST",
    body: fd,
  });
}

describe("POST /api/salesperson/profile/face-video", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildSalespersonFaceVideoPath).mockReturnValue("sp_001/pre_123.mp4");
    vi.mocked(uploadFaceVideo).mockResolvedValue({ path: "sp_001/pre_123.mp4", publicUrl: "https://storage.example/pre.mp4" });
    vi.mocked(getVideoDurationSec).mockResolvedValue(5);
  });

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-video/route");
    const res = await POST(makeUploadRequest("pre"));
    expect(res.status).toBe(401);
  });

  it("typeが不正なら400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-video/route");
    const fd = new FormData();
    fd.append("file", new File(["x"], "t.mp4", { type: "video/mp4" }));
    fd.append("type", "invalid");
    const req = new NextRequest("http://localhost/api/salesperson/profile/face-video", { method: "POST", body: fd });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("fileがなければ400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-video/route");
    const fd = new FormData();
    fd.append("type", "pre");
    const req = new NextRequest("http://localhost/api/salesperson/profile/face-video", { method: "POST", body: fd });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("10秒超の動画は400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(getVideoDurationSec).mockResolvedValue(15);
    vi.mocked(prisma.salesperson.update).mockResolvedValue({} as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-video/route");
    const res = await POST(makeUploadRequest("pre"));
    expect(res.status).toBe(400);
  });

  it("プリロール動画をアップロードしてsalespersonを更新できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.update).mockResolvedValue({
      preRollStoragePath: "sp_001/pre_123.mp4",
      preRollPublicUrl: "https://storage.example/pre.mp4",
      preRollDurationSec: 5,
    } as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-video/route");
    const res = await POST(makeUploadRequest("pre"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.publicUrl).toBe("https://storage.example/pre.mp4");
    expect(body.type).toBe("pre");
    expect(prisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sp_001" },
        data: expect.objectContaining({
          preRollPublicUrl: "https://storage.example/pre.mp4",
        }),
      })
    );
  });

  it("ポストロール動画をアップロードしてsalespersonを更新できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(buildSalespersonFaceVideoPath).mockReturnValue("sp_001/post_123.mp4");
    vi.mocked(uploadFaceVideo).mockResolvedValue({ path: "sp_001/post_123.mp4", publicUrl: "https://storage.example/post.mp4" });
    vi.mocked(prisma.salesperson.update).mockResolvedValue({} as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-video/route");
    const res = await POST(makeUploadRequest("post"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("post");
    expect(prisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postRollPublicUrl: "https://storage.example/post.mp4" }),
      })
    );
  });
});

describe("DELETE /api/salesperson/profile/face-video", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { DELETE } = await import("@/app/api/salesperson/profile/face-video/route");
    const req = new NextRequest("http://localhost/api/salesperson/profile/face-video?type=pre");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("typeが不正なら400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const { DELETE } = await import("@/app/api/salesperson/profile/face-video/route");
    const req = new NextRequest("http://localhost/api/salesperson/profile/face-video?type=wrong");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("プリロール動画を削除できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue({
      preRollStoragePath: "sp_001/pre_123.mp4",
      postRollStoragePath: null,
    } as never);
    vi.mocked(deleteFaceVideo).mockResolvedValue(undefined);
    vi.mocked(prisma.salesperson.update).mockResolvedValue({} as never);
    const { DELETE } = await import("@/app/api/salesperson/profile/face-video/route");
    const req = new NextRequest("http://localhost/api/salesperson/profile/face-video?type=pre");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteFaceVideo).toHaveBeenCalledWith("sp_001/pre_123.mp4");
    expect(prisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preRollStoragePath: null,
          preRollPublicUrl: null,
          preRollDurationSec: null,
        }),
      })
    );
  });
});
