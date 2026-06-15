import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Handlers under test (GET list + PATCH do not exist yet — Red phase)
import { GET } from "@/app/api/contact/route";
import { PATCH } from "@/app/api/contact/[contactRequestId]/route";

const SP_ID = "sp_001";

const INQUIRY = {
  id: "cr_001",
  userId: "user_001",
  salespersonId: SP_ID,
  videoId: "vid_001",
  contactMethod: "LINE" as const,
  questionnaireJson: null,
  status: "PENDING" as const,
  createdAt: new Date("2026-06-15T10:00:00Z"),
  user: { id: "user_001", name: "田中太郎", email: "tanaka@example.com", phone: null, lineId: "line_abc", createdAt: new Date() },
};

const patchParams = Promise.resolve({ contactRequestId: "cr_001" });

function makeGetReq(salespersonId?: string, status?: string) {
  const url = new URL("http://localhost/api/contact");
  if (salespersonId) url.searchParams.set("salespersonId", salespersonId);
  if (status) url.searchParams.set("status", status);
  return new NextRequest(url.toString());
}

function makePatchReq(body: object) {
  return new NextRequest("http://localhost/api/contact/cr_001", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/contact (問い合わせ一覧)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("salespersonIdで問い合わせ一覧を返す", async () => {
    vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([INQUIRY] as never);
    const res = await GET(makeGetReq(SP_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("cr_001");
  });

  it("salespersonIdが欠けていると400を返す", async () => {
    const res = await GET(makeGetReq());
    expect(res.status).toBe(400);
  });

  it("statusでフィルタリングできる", async () => {
    vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([INQUIRY] as never);
    const res = await GET(makeGetReq(SP_ID, "PENDING"));
    expect(res.status).toBe(200);
    expect(prisma.contactRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("ユーザー情報を含む", async () => {
    vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([INQUIRY] as never);
    const res = await GET(makeGetReq(SP_ID));
    const body = await res.json();
    expect(body.data[0].user.name).toBe("田中太郎");
  });
});

describe("PATCH /api/contact/[contactRequestId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ステータスをRESPONDEDに更新できる", async () => {
    vi.mocked(prisma.contactRequest.update).mockResolvedValue({ ...INQUIRY, status: "RESPONDED" } as never);
    const res = await PATCH(makePatchReq({ status: "RESPONDED" }), { params: patchParams });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("RESPONDED");
  });

  it("無効なステータスは400を返す", async () => {
    const res = await PATCH(makePatchReq({ status: "INVALID_STATUS" }), { params: patchParams });
    expect(res.status).toBe(400);
  });

  it("空のbodyは400を返す", async () => {
    const res = await PATCH(makePatchReq({}), { params: patchParams });
    expect(res.status).toBe(400);
  });
});
