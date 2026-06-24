import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

import { GET, POST } from "@/app/api/contact/route";
import { PATCH } from "@/app/api/contact/[contactRequestId]/route";

vi.mock("@/lib/line", () => ({
  notifySalespersonNewInquiry: vi.fn().mockResolvedValue(undefined),
  notifyUserBookingConfirmed: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email", () => ({
  sendInquiryNotificationToSalesperson: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationToUser: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/encrypt", () => ({
  encryptJson: vi.fn((v: unknown) => JSON.stringify(v)),
  decryptJson: vi.fn((v: unknown) => (typeof v === "string" ? JSON.parse(v) : v)),
}));

import { notifySalespersonNewInquiry } from "@/lib/line";
import { sendInquiryNotificationToSalesperson } from "@/lib/email";

const SP_ID = "sp_001";

const SP_SESSION = {
  user: { id: SP_ID, name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
  });

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

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeGetReq(SP_ID));
    expect(res.status).toBe(401);
  });

  it("他の営業マンの問い合わせ一覧は403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...SP_SESSION,
      user: { ...SP_SESSION.user, id: "other_sp" },
    } as never);
    const res = await GET(makeGetReq(SP_ID));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/contact/[contactRequestId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
    vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue(INQUIRY as never);
  });

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

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makePatchReq({ status: "RESPONDED" }), { params: patchParams });
    expect(res.status).toBe(401);
  });

  it("存在しないContactRequestは404を返す", async () => {
    vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue(null);
    const res = await PATCH(makePatchReq({ status: "RESPONDED" }), { params: patchParams });
    expect(res.status).toBe(404);
  });

  it("他の営業マンの問い合わせ更新は403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...SP_SESSION,
      user: { ...SP_SESSION.user, id: "other_sp" },
    } as never);
    const res = await PATCH(makePatchReq({ status: "RESPONDED" }), { params: patchParams });
    expect(res.status).toBe(403);
  });
});

// ──────────────────────────────────────────────────────────────
// POST /api/contact — 通知ディスパッチのテスト
// ──────────────────────────────────────────────────────────────

const BASE_SALESPERSON = {
  id: "sp_001",
  name: "山田花子",
  email: "sales@example.com",
  lineId: null as string | null,
  company: { id: "co_001", name: "テスト住宅" },
};

const CREATED_USER = { id: "user_new", name: "田中太郎" };
const CREATED_CR = { id: "cr_new" };

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_EMAIL_BODY = {
  name: "田中太郎",
  email: "tanaka@example.com",
  contactMethod: "EMAIL",
  salespersonId: "sp_001",
  videoId: "vid_001",
};

const VALID_LINE_BODY = {
  name: "田中太郎",
  lineId: "U_user_abc",
  contactMethod: "LINE",
  salespersonId: "sp_001",
  videoId: "vid_001",
};

describe("POST /api/contact — 通知ディスパッチ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue(BASE_SALESPERSON as never);
    vi.mocked(prisma.video.findUnique).mockResolvedValue({ title: "注文住宅の動画" } as never);
    // $transaction callback form
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue(CREATED_USER) },
        contactRequest: { create: vi.fn().mockResolvedValue(CREATED_CR) },
      };
      return (cb as (tx: unknown) => unknown)(tx);
    });
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("営業マンに lineId がある場合 LINE 通知を送信する", async () => {
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue(
      { ...BASE_SALESPERSON, lineId: "U_sp_abc" } as never
    );
    const res = await POST(makePostReq(VALID_EMAIL_BODY));
    expect(res.status).toBe(201);
    // 非同期発火なので少し待つ
    await vi.waitFor(() =>
      expect(vi.mocked(notifySalespersonNewInquiry)).toHaveBeenCalledOnce()
    );
    expect(vi.mocked(notifySalespersonNewInquiry)).toHaveBeenCalledWith(
      expect.objectContaining({ lineId: "U_sp_abc", userName: "田中太郎" })
    );
    expect(vi.mocked(sendInquiryNotificationToSalesperson)).not.toHaveBeenCalled();
  });

  it("営業マンに lineId がなく email がある場合メール通知を送信する", async () => {
    const res = await POST(makePostReq(VALID_EMAIL_BODY));
    expect(res.status).toBe(201);
    await vi.waitFor(() =>
      expect(vi.mocked(sendInquiryNotificationToSalesperson)).toHaveBeenCalledOnce()
    );
    expect(vi.mocked(sendInquiryNotificationToSalesperson)).toHaveBeenCalledWith(
      expect.objectContaining({ email: "sales@example.com", userName: "田中太郎" })
    );
    expect(vi.mocked(notifySalespersonNewInquiry)).not.toHaveBeenCalled();
  });

  it("通知失敗は 201 レスポンスに影響しない", async () => {
    vi.mocked(sendInquiryNotificationToSalesperson).mockRejectedValueOnce(
      new Error("mail server down")
    );
    const res = await POST(makePostReq(VALID_EMAIL_BODY));
    expect(res.status).toBe(201);
  });

  it("contactMethod=LINE で lineId がないと 400 を返す", async () => {
    const res = await POST(makePostReq({ ...VALID_LINE_BODY, lineId: undefined }));
    expect(res.status).toBe(400);
  });

  it("contactMethod=EMAIL で email がないと 400 を返す", async () => {
    const res = await POST(makePostReq({ ...VALID_EMAIL_BODY, email: undefined }));
    expect(res.status).toBe(400);
  });

  it("存在しない salespersonId は 404 を返す", async () => {
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue(null);
    const res = await POST(makePostReq(VALID_EMAIL_BODY));
    expect(res.status).toBe(404);
  });
});
