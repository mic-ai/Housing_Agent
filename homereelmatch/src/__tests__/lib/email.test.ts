import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// nodemailer のトランスポーターをモック
const sendMailMock = vi.fn().mockResolvedValue({ rejected: [] });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}));

const { sendInquiryNotificationToSalesperson, sendBookingConfirmationToUser } =
  await import("@/lib/email");

import nodemailer from "nodemailer";

const GMAIL_USER = "test@gmail.com";
const GMAIL_PASS = "app_password";

describe("sendInquiryNotificationToSalesperson", () => {
  beforeEach(() => {
    vi.stubEnv("GMAIL_USER", GMAIL_USER);
    vi.stubEnv("GMAIL_APP_PASSWORD", GMAIL_PASS);
    sendMailMock.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("営業マンへ問い合わせ通知メールを送信する", async () => {
    await sendInquiryNotificationToSalesperson({
      email: "sales@example.com",
      userName: "田中太郎",
      videoTitle: "注文住宅の動画",
      contactMethod: "LINE",
      dashboardUrl: "https://app.example.com/dashboard/inquiries/cr_001",
    });

    expect(sendMailMock).toHaveBeenCalledOnce();
    const mailArgs = sendMailMock.mock.calls[0][0];
    expect(mailArgs.to).toBe("sales@example.com");
    expect(mailArgs.subject).toContain("田中太郎");
    expect(mailArgs.html).toContain("田中太郎");
    expect(mailArgs.html).toContain("注文住宅の動画");
    expect(mailArgs.html).toContain("https://app.example.com/dashboard/inquiries/cr_001");
  });

  it("GMAIL_USER 未設定時はメールを送信しない", async () => {
    vi.unstubAllEnvs();
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    await sendInquiryNotificationToSalesperson({
      email: "sales@example.com",
      userName: "田中",
      videoTitle: "動画",
      contactMethod: "EMAIL",
      dashboardUrl: "https://example.com",
    });
    expect(sendMailMock).not.toHaveBeenCalled();
    // createTransport は呼ばれても sendMail は呼ばれない
  });

  it("createTransport に gmail サービス設定が渡される", async () => {
    await sendInquiryNotificationToSalesperson({
      email: "sales@example.com",
      userName: "田中",
      videoTitle: "動画",
      contactMethod: "LINE",
      dashboardUrl: "https://example.com",
    });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ service: "gmail" })
    );
  });
});

describe("sendBookingConfirmationToUser", () => {
  beforeEach(() => {
    vi.stubEnv("GMAIL_USER", GMAIL_USER);
    vi.stubEnv("GMAIL_APP_PASSWORD", GMAIL_PASS);
    sendMailMock.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("ユーザーへ予約確定メールを送信する", async () => {
    await sendBookingConfirmationToUser({
      email: "user@example.com",
      salespersonName: "山田花子",
      companyName: "テスト住宅",
      scheduledAt: "2026年7月1日 14:00",
      modelHouseName: "モデルハウスA",
      modelHouseAddress: "東京都渋谷区1-1",
    });

    expect(sendMailMock).toHaveBeenCalledOnce();
    const mailArgs = sendMailMock.mock.calls[0][0];
    expect(mailArgs.to).toBe("user@example.com");
    expect(mailArgs.subject).toContain("確定");
    expect(mailArgs.html).toContain("山田花子");
    expect(mailArgs.html).toContain("テスト住宅");
    expect(mailArgs.html).toContain("2026年7月1日 14:00");
    expect(mailArgs.html).toContain("東京都渋谷区1-1");
  });
});
