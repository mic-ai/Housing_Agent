import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFaceVideo, deleteFaceVideo } from "@/lib/storage";

// Duration validation mock — will be replaced by real ffprobe util
vi.mock("@/lib/video-duration", () => ({
  getVideoDurationSec: vi.fn(),
}));

import { getVideoDurationSec } from "@/lib/video-duration";

// Import handler under test (does not exist yet — Red phase)
import { POST } from "@/app/api/face-videos/upload/route";

const SALESPERSON_ID = "sp_001";
const VIDEO_ID = "vid_001";

function makeFormData(overrides: {
  file?: File;
  salespersonId?: string;
  videoId?: string;
  type?: string;
}) {
  const defaults = {
    file: new File(["dummy"], "face.mp4", { type: "video/mp4" }),
    salespersonId: SALESPERSON_ID,
    videoId: VIDEO_ID,
    type: "pre",
  };
  const params = { ...defaults, ...overrides };
  const fd = new FormData();
  fd.append("file", params.file);
  fd.append("salespersonId", params.salespersonId);
  fd.append("videoId", params.videoId);
  fd.append("type", params.type);
  return fd;
}

function makeRequest(fd: FormData) {
  return new NextRequest("http://localhost/api/face-videos/upload", {
    method: "POST",
    body: fd,
  });
}

describe("POST /api/face-videos/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getVideoDurationSec).mockResolvedValue(3); // 3秒 = 合格
    vi.mocked(uploadFaceVideo).mockResolvedValue({
      path: `${SALESPERSON_ID}/${VIDEO_ID}/pre_123.mp4`,
      publicUrl: "https://storage.example.com/face-videos/sp_001/vid_001/pre_123.mp4",
    });
    vi.mocked(prisma.salespersonVideo.upsert).mockResolvedValue({ id: "sv_001" } as never);
  });

  // ── 正常系 ──────────────────────────────────────────────────
  it("有効なmp4ファイルをアップロードできる", async () => {
    const req = makeRequest(makeFormData({}));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      salespersonVideoId: expect.any(String),
      publicUrl: expect.stringContaining("https://"),
      durationSec: 3,
    });
  });

  it("postrollタイプでアップロードできる", async () => {
    const req = makeRequest(makeFormData({ type: "post" }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("post");
  });

  // ── ファイル形式バリデーション ──────────────────────────────
  it("非動画ファイルは400を返す", async () => {
    const file = new File(["data"], "image.png", { type: "image/png" });
    const req = makeRequest(makeFormData({ file }));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/file type/i);
  });

  it("video/webmは受け付ける", async () => {
    const file = new File(["data"], "face.webm", { type: "video/webm" });
    const req = makeRequest(makeFormData({ file }));
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("video/quicktimeは受け付ける", async () => {
    const file = new File(["data"], "face.mov", { type: "video/quicktime" });
    const req = makeRequest(makeFormData({ file }));
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  // ── ファイルサイズバリデーション ─────────────────────────────
  // File.size を使って先に弾くため、実バッファ確保は不要
  function makeRequestWithFakeFile(sizeBytes: number) {
    const req = new NextRequest("http://localhost/api/face-videos/upload", { method: "POST" });
    const fakeFile = { type: "video/mp4", size: sizeBytes, name: "test.mp4", arrayBuffer: async () => new ArrayBuffer(8) };
    vi.spyOn(req, "formData").mockResolvedValueOnce({
      get: (key: string) => {
        const map: Record<string, unknown> = { file: fakeFile, salespersonId: SALESPERSON_ID, videoId: VIDEO_ID, type: "pre" };
        return map[key] ?? null;
      },
    } as unknown as FormData);
    return req;
  }

  it("50MBを超えるファイルは400を返す", async () => {
    const res = await POST(makeRequestWithFakeFile(51 * 1024 * 1024));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/file size/i);
  });

  it("ちょうど50MBのファイルは受け付ける", async () => {
    const res = await POST(makeRequestWithFakeFile(50 * 1024 * 1024));
    expect(res.status).toBe(200);
  });

  // ── 尺バリデーション ────────────────────────────────────────
  it("6秒を超える動画は400を返す", async () => {
    vi.mocked(getVideoDurationSec).mockResolvedValue(7);
    const req = makeRequest(makeFormData({}));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/duration/i);
  });

  it("ちょうど6秒の動画は受け付ける", async () => {
    vi.mocked(getVideoDurationSec).mockResolvedValue(6);
    const req = makeRequest(makeFormData({}));
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  // ── 必須パラメータバリデーション ────────────────────────────
  it("salespersonIdが欠けていると400を返す", async () => {
    const fd = new FormData();
    fd.append("file", new File(["x"], "f.mp4", { type: "video/mp4" }));
    fd.append("videoId", VIDEO_ID);
    fd.append("type", "pre");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it("videoIdが欠けていると400を返す", async () => {
    const fd = new FormData();
    fd.append("file", new File(["x"], "f.mp4", { type: "video/mp4" }));
    fd.append("salespersonId", SALESPERSON_ID);
    fd.append("type", "pre");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it("typeが'pre'/'post'以外なら400を返す", async () => {
    const req = makeRequest(makeFormData({ type: "middle" }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── ストレージ障害 ──────────────────────────────────────────
  it("Storageアップロード失敗時は500を返す", async () => {
    vi.mocked(uploadFaceVideo).mockRejectedValue(new Error("Storage upload failed: bucket not found"));
    const req = makeRequest(makeFormData({}));
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  // ── DB更新確認 ─────────────────────────────────────────────
  it("アップロード成功後にSalespersonVideoをupsertする", async () => {
    const req = makeRequest(makeFormData({ type: "pre" }));
    await POST(req);
    expect(prisma.salespersonVideo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { videoId_salespersonId: { videoId: VIDEO_ID, salespersonId: SALESPERSON_ID } },
        update: expect.objectContaining({ preRollStoragePath: expect.any(String) }),
        create: expect.objectContaining({
          videoId: VIDEO_ID,
          salespersonId: SALESPERSON_ID,
          preRollStoragePath: expect.any(String),
        }),
      })
    );
  });
});
