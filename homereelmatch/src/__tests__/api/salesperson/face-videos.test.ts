import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uploadFaceVideo, buildSalespersonFaceVideoPath, deleteFaceVideo } from "@/lib/storage";
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

const FACE_VIDEOS = [
  { id: "fv_1", salespersonId: "sp_001", rollType: "pre", storagePath: "sp_001/pre_1.mp4", publicUrl: "https://storage/pre1.mp4", durationSec: 5, sortOrder: 0, createdAt: new Date() },
  { id: "fv_2", salespersonId: "sp_001", rollType: "post", storagePath: "sp_001/post_1.mp4", publicUrl: "https://storage/post1.mp4", durationSec: 8, sortOrder: 0, createdAt: new Date() },
];

describe("GET /api/salesperson/profile/face-videos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { GET } = await import("@/app/api/salesperson/profile/face-videos/route");
    const res = await GET(new NextRequest("http://localhost/api/salesperson/profile/face-videos"));
    expect(res.status).toBe(401);
  });

  it("顔出し動画一覧を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.salespersonFaceVideo as any).findMany.mockResolvedValue(FACE_VIDEOS);
    const { GET } = await import("@/app/api/salesperson/profile/face-videos/route");
    const res = await GET(new NextRequest("http://localhost/api/salesperson/profile/face-videos"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].rollType).toBe("pre");
  });
});

describe("POST /api/salesperson/profile/face-videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildSalespersonFaceVideoPath).mockReturnValue("sp_001/pre_123.mp4");
    vi.mocked(uploadFaceVideo).mockResolvedValue({ path: "sp_001/pre_123.mp4", publicUrl: "https://storage/pre.mp4" });
    vi.mocked(getVideoDurationSec).mockResolvedValue(5);
  });

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-videos/route");
    const fd = new FormData();
    fd.append("file", new File([MP4_BYTES], "t.mp4", { type: "video/mp4" }));
    fd.append("type", "pre");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: fd }));
    expect(res.status).toBe(401);
  });

  it("typeが不正なら400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const { POST } = await import("@/app/api/salesperson/profile/face-videos/route");
    const fd = new FormData();
    fd.append("file", new File([MP4_BYTES], "t.mp4", { type: "video/mp4" }));
    fd.append("type", "invalid");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: fd }));
    expect(res.status).toBe(400);
  });

  it("10秒超の動画は400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(getVideoDurationSec).mockResolvedValue(15);
    const { POST } = await import("@/app/api/salesperson/profile/face-videos/route");
    const fd = new FormData();
    fd.append("file", new File([MP4_BYTES], "t.mp4", { type: "video/mp4" }));
    fd.append("type", "pre");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: fd }));
    expect(res.status).toBe(400);
  });

  it("プリロール動画をアップロードしてSalespersonFaceVideoを作成できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.salespersonFaceVideo as any).create.mockResolvedValue({
      id: "fv_new", publicUrl: "https://storage/pre.mp4", durationSec: 5, rollType: "pre",
    });
    const { POST } = await import("@/app/api/salesperson/profile/face-videos/route");
    const fd = new FormData();
    fd.append("file", new File([MP4_BYTES], "t.mp4", { type: "video/mp4" }));
    fd.append("type", "pre");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: fd }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.rollType).toBe("pre");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((prisma.salespersonFaceVideo as any).create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ salespersonId: "sp_001", rollType: "pre" }),
      })
    );
  });
});

describe("DELETE /api/salesperson/profile/face-videos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { DELETE } = await import("@/app/api/salesperson/profile/face-videos/[id]/route");
    const req = new NextRequest("http://localhost/face-videos/fv_1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "fv_1" }) });
    expect(res.status).toBe(401);
  });

  it("他人の動画は403を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.salespersonFaceVideo as any).findUnique.mockResolvedValue({ id: "fv_1", salespersonId: "other_sp", storagePath: "other/pre.mp4" });
    const { DELETE } = await import("@/app/api/salesperson/profile/face-videos/[id]/route");
    const req = new NextRequest("http://localhost/face-videos/fv_1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "fv_1" }) });
    expect(res.status).toBe(403);
  });

  it("自分の動画を削除できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.salespersonFaceVideo as any).findUnique.mockResolvedValue({ id: "fv_1", salespersonId: "sp_001", storagePath: "sp_001/pre.mp4" });
    vi.mocked(deleteFaceVideo).mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.salespersonFaceVideo as any).delete.mockResolvedValue({});
    const { DELETE } = await import("@/app/api/salesperson/profile/face-videos/[id]/route");
    const req = new NextRequest("http://localhost/face-videos/fv_1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "fv_1" }) });
    expect(res.status).toBe(200);
    expect(deleteFaceVideo).toHaveBeenCalledWith("sp_001/pre.mp4");
  });
});
