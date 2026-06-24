import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/line", () => ({
  notifySalespersonNewInquiry: vi.fn().mockResolvedValue(undefined),
  notifyUserBookingConfirmed: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email", () => ({
  sendInquiryNotificationToSalesperson: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationToUser: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("@/app/api/booking/confirm/route");
const { notifyUserBookingConfirmed } = await import("@/lib/line");
const { sendBookingConfirmationToUser } = await import("@/lib/email");

const CONTACT_REQUEST = {
  id: "cr_001",
  userId: "user_001",
  salespersonId: "sp_001",
  status: "PENDING" as const,
  user: {
    id: "user_001",
    name: "田中太郎",
    email: "tanaka@example.com",
    lineId: null as string | null,
  },
};

const SLOT = {
  id: "slot_001",
  salespersonId: "sp_001",
  isBooked: false,
  startAt: new Date("2026-07-01T14:00:00+09:00"),
  salesperson: {
    id: "sp_001",
    name: "山田花子",
    company: {
      id: "co_001",
      name: "テスト住宅",
      modelHouseName: "モデルハウスA",
      modelHouseAddress: "東京都渋谷区1-1",
    },
  },
};

const CREATED_APPOINTMENT = {
  id: "appt_001",
  contactRequestId: "cr_001",
  salespersonId: "sp_001",
  userId: "user_001",
  scheduledAt: SLOT.startAt,
};

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/booking/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { contactRequestId: "cr_001", slotId: "slot_001" };

describe("POST /api/booking/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue(CONTACT_REQUEST as never);
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue(SLOT as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const tx = {
        availableSlot: { update: vi.fn().mockResolvedValue(undefined) },
        contactRequest: { update: vi.fn().mockResolvedValue(undefined) },
        appointment: { create: vi.fn().mockResolvedValue(CREATED_APPOINTMENT) },
      };
      return (cb as (tx: unknown) => unknown)(tx);
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("正常な予約確定で 201 を返す", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("appt_001");
  });

  it("存在しない contactRequestId は 404 を返す", async () => {
    vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue(null);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("存在しない slotId は 409 を返す", async () => {
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue(null);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("既に予約済みのスロットは 409 を返す", async () => {
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue(
      { ...SLOT, isBooked: true } as never
    );
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("必須フィールド欠落は 400 を返す", async () => {
    const res = await POST(makeReq({ contactRequestId: "cr_001" }));
    expect(res.status).toBe(400);
  });

  it("ユーザーに lineId がある場合 LINE 通知を送信する", async () => {
    vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue(
      { ...CONTACT_REQUEST, user: { ...CONTACT_REQUEST.user, lineId: "U_user_abc" } } as never
    );
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
    await vi.waitFor(() =>
      expect(vi.mocked(notifyUserBookingConfirmed)).toHaveBeenCalledOnce()
    );
    expect(vi.mocked(notifyUserBookingConfirmed)).toHaveBeenCalledWith(
      expect.objectContaining({ lineId: "U_user_abc", salespersonName: "山田花子" })
    );
    expect(vi.mocked(sendBookingConfirmationToUser)).not.toHaveBeenCalled();
  });

  it("ユーザーに lineId がなく email がある場合メール通知を送信する", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
    await vi.waitFor(() =>
      expect(vi.mocked(sendBookingConfirmationToUser)).toHaveBeenCalledOnce()
    );
    expect(vi.mocked(sendBookingConfirmationToUser)).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "tanaka@example.com",
        salespersonName: "山田花子",
        modelHouseName: "モデルハウスA",
      })
    );
    expect(vi.mocked(notifyUserBookingConfirmed)).not.toHaveBeenCalled();
  });

  it("通知失敗は 201 レスポンスに影響しない", async () => {
    vi.mocked(sendBookingConfirmationToUser).mockRejectedValueOnce(
      new Error("mail server down")
    );
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
  });
});
