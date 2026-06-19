import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, PATCH } from "@/app/api/salesperson/profile/route";

const SP_SESSION = {
  user: { id: "sp_001", name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

const SALESPERSON = {
  id: "sp_001",
  name: "営業太郎",
  email: "sp@example.com",
  bio: "よろしくお願いします",
  profileImage: null,
  houseMakerId: "hm_001",
  houseMaker: { id: "hm_001", name: "積水ハウス", logoUrl: null, isActive: true },
  companyId: "co1",
  role: "SALESPERSON" as const,
  lineId: null,
  createdAt: new Date(),
};

function makePatchReq(body: object) {
  return new NextRequest("http://localhost/api/salesperson/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/salesperson/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/api/salesperson/profile"));
    expect(res.status).toBe(401);
  });

  it("自分のプロフィールを取得できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue(SALESPERSON as never);
    const res = await GET(new NextRequest("http://localhost/api/salesperson/profile"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("営業太郎");
    expect(body.data.houseMaker?.name).toBe("積水ハウス");
  });

  it("プロフィールが見つからない場合404を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/salesperson/profile"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/salesperson/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makePatchReq({ name: "新名前" }));
    expect(res.status).toBe(401);
  });

  it("名前・bio・houseMakerIdを更新できる", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.salesperson.update).mockResolvedValue({
      ...SALESPERSON,
      name: "新名前",
      bio: "新プロフィール",
      houseMakerId: "hm_002",
    } as never);
    const res = await PATCH(makePatchReq({ name: "新名前", bio: "新プロフィール", houseMakerId: "hm_002" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("新名前");
    expect(prisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sp_001" },
        data: expect.objectContaining({ name: "新名前", bio: "新プロフィール", houseMakerId: "hm_002" }),
      })
    );
  });

  it("不正なリクエストは400を返す", async () => {
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    const res = await PATCH(makePatchReq({ name: "" }));
    expect(res.status).toBe(400);
  });
});
