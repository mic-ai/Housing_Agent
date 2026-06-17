import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFaceVideo } from "@/lib/storage";
import { auth } from "@/lib/auth";

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

const SP_SESSION = {
  user: { id: "sp_001", name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeReq(method: string) {
  return new NextRequest("http://localhost/api/face-videos/sv_001", { method });
}

const params = Promise.resolve({ salespersonVideoId: "sv_001" });

describe("GET /api/face-videos/[salespersonVideoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
  });

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

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeReq("GET"), { params });
    expect(res.status).toBe(401);
  });

  it("他の営業マンのレコードへのアクセスは403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...SP_SESSION,
      user: { ...SP_SESSION.user, id: "other_sp" },
    } as never);
    vi.mocked(prisma.salespersonVideo.findUnique).mockResolvedValue(RECORD as never);
    const res = await GET(makeReq("GET"), { params });
    expect(res.status).toBe(403);
  });

  it("ADMINは他の営業マンのレコードにアクセスできる", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin1", role: "ADMIN", companyId: "co1" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    vi.mocked(prisma.salespersonVideo.findUnique).mockResolvedValue(RECORD as never);
    const res = await GET(makeReq("GET"), { params });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/face-videos/[salespersonVideoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
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

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(makeReq("DELETE"), { params });
    expect(res.status).toBe(401);
  });

  it("他の営業マンのレコード削除は403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...SP_SESSION,
      user: { ...SP_SESSION.user, id: "other_sp" },
    } as never);
    const res = await DELETE(makeReq("DELETE"), { params });
    expect(res.status).toBe(403);
  });
});
