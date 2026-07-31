import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/line", () => ({
  notifyUserBookingReminder: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email", () => ({
  sendBookingReminderToUser: vi.fn().mockResolvedValue(undefined),
}));

const { GET } = await import("@/app/api/cron/booking-reminders/route");
const { notifyUserBookingReminder } = await import("@/lib/line");
const { sendBookingReminderToUser } = await import("@/lib/email");

const CRON_SECRET = "test_cron_secret";

function makeReq(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/booking-reminders", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const APPOINTMENT_LINE = {
  id: "appt_line",
  scheduledAt: new Date("2026-07-15T05:00:00.000Z"), // 2026-07-15 14:00 JST
  contactRequest: {
    user: { id: "user_1", email: "line-user@example.com", lineId: "U_line_1" },
    salesperson: {
      id: "sp_1",
      name: "山田花子",
      introVideoUrl: "https://example.com/intro.mp4",
      company: { name: "テスト住宅", modelHouseName: "モデルハウスA", modelHouseAddress: "東京都渋谷区" },
    },
  },
};

const APPOINTMENT_EMAIL = {
  id: "appt_email",
  scheduledAt: new Date("2026-07-15T06:00:00.000Z"),
  contactRequest: {
    user: { id: "user_2", email: "email-user@example.com", lineId: null },
    salesperson: {
      id: "sp_2",
      name: "鈴木太郎",
      introVideoUrl: null,
      company: { name: "別の住宅", modelHouseName: null, modelHouseAddress: null },
    },
  },
};

describe("GET /api/cron/booking-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://homereelmatch.vercel.app");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T01:00:00.000Z")); // 2026-07-15 10:00 JST
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("Authorizationヘッダーが無い場合は401を返す", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("CRON_SECRETと一致しない場合は401を返す", async () => {
    const res = await GET(makeReq("Bearer wrong_secret"));
    expect(res.status).toBe(401);
  });

  it("CRON_SECRET未設定の場合は401を返す", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://homereelmatch.vercel.app");
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(401);
  });

  it("正しいAuthorizationヘッダーで当日分の予約を取得する", async () => {
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "CONFIRMED",
          reminderSentAt: null,
          scheduledAt: {
            gte: new Date("2026-07-14T15:00:00.000Z"), // 2026-07-15 00:00 JST
            lt: new Date("2026-07-15T15:00:00.000Z"), // 2026-07-16 00:00 JST
          },
        }),
      })
    );
  });

  it("lineIdがあるユーザーにはLINEでリマインドを送信し、introVideoLinkUrlを含める", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([APPOINTMENT_LINE] as never);

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));

    expect(res.status).toBe(200);
    expect(notifyUserBookingReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        lineId: "U_line_1",
        salespersonName: "山田花子",
        introVideoLinkUrl: "https://homereelmatch.vercel.app/salesperson/sp_1?source=pre_reminder",
      })
    );
    expect(sendBookingReminderToUser).not.toHaveBeenCalled();
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appt_line" },
        data: expect.objectContaining({ reminderSentAt: expect.any(Date) }),
      })
    );
  });

  it("lineIdが無くemailがあるユーザーにはメールでリマインドを送信する（introVideoUrl未設定ならリンクなし）", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([APPOINTMENT_EMAIL] as never);

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));

    expect(res.status).toBe(200);
    expect(sendBookingReminderToUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "email-user@example.com", introVideoLinkUrl: undefined })
    );
    expect(notifyUserBookingReminder).not.toHaveBeenCalled();
  });

  it("1件の送信が失敗しても他の予約の処理は続行する", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      APPOINTMENT_LINE,
      APPOINTMENT_EMAIL,
    ] as never);
    vi.mocked(notifyUserBookingReminder).mockRejectedValueOnce(new Error("LINE down"));

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));

    expect(res.status).toBe(200);
    expect(sendBookingReminderToUser).toHaveBeenCalledOnce();
    // 失敗した予約はreminderSentAtを更新しない
    expect(prisma.appointment.update).toHaveBeenCalledTimes(1);
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "appt_email" } })
    );
  });
});
