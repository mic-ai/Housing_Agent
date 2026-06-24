import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import crypto from "crypto";

const LINE_API = "https://api.line.me/v2/bot/message/push";
const CHANNEL_SECRET = "test_secret_abc";
const ACCESS_TOKEN = "test_access_token";

const { notifySalespersonNewInquiry, notifyUserBookingConfirmed, validateLineSignature } =
  await import("@/lib/line");

describe("validateLineSignature", () => {
  beforeEach(() => vi.stubEnv("LINE_CHANNEL_SECRET", CHANNEL_SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it("正しい署名は true を返す", () => {
    const body = '{"events":[]}';
    const sig = crypto.createHmac("sha256", CHANNEL_SECRET).update(body).digest("base64");
    expect(validateLineSignature(body, sig)).toBe(true);
  });

  it("不正な署名は false を返す", () => {
    expect(validateLineSignature('{"events":[]}', "bad_signature")).toBe(false);
  });

  it("LINE_CHANNEL_SECRET 未設定は false を返す", () => {
    vi.unstubAllEnvs();
    delete process.env.LINE_CHANNEL_SECRET;
    expect(validateLineSignature("body", "sig")).toBe(false);
  });
});

describe("notifySalespersonNewInquiry", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", ACCESS_TOKEN);
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("LINE Push API に正しいペイロードで POST する", async () => {
    await notifySalespersonNewInquiry({
      lineId: "U12345",
      userName: "田中太郎",
      videoTitle: "注文住宅の動画",
      contactMethod: "LINE",
      dashboardUrl: "https://app.example.com/dashboard",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(LINE_API);
    expect(options.method).toBe("POST");
    expect(options.headers["Authorization"]).toBe(`Bearer ${ACCESS_TOKEN}`);

    const body = JSON.parse(options.body as string);
    expect(body.to).toBe("U12345");
    expect(body.messages[0].type).toBe("text");
    expect(body.messages[0].text).toContain("田中太郎");
    expect(body.messages[0].text).toContain("注文住宅の動画");
  });

  it("LINE_CHANNEL_ACCESS_TOKEN 未設定時は fetch しない", async () => {
    vi.unstubAllEnvs();
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    await notifySalespersonNewInquiry({
      lineId: "U12345",
      userName: "田中",
      videoTitle: "動画",
      contactMethod: "LINE",
      dashboardUrl: "https://example.com",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("API が非200を返しても例外を投げない", async () => {
    fetchMock.mockResolvedValue({ ok: false, text: async () => "error" });
    await expect(
      notifySalespersonNewInquiry({
        lineId: "U12345",
        userName: "田中",
        videoTitle: "動画",
        contactMethod: "EMAIL",
        dashboardUrl: "https://example.com",
      })
    ).resolves.toBeUndefined();
  });
});

describe("notifyUserBookingConfirmed", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", ACCESS_TOKEN);
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("予約確定メッセージを正しいユーザーに送信する", async () => {
    await notifyUserBookingConfirmed({
      lineId: "U99999",
      salespersonName: "山田花子",
      companyName: "テスト住宅",
      scheduledAt: "2026年7月1日 14:00",
      modelHouseName: "モデルハウスA",
      modelHouseAddress: "東京都渋谷区",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.to).toBe("U99999");
    expect(body.messages[0].text).toContain("山田花子");
    expect(body.messages[0].text).toContain("テスト住宅");
    expect(body.messages[0].text).toContain("2026年7月1日 14:00");
  });
});
