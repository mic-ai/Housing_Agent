import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

// Handler under test (does not exist yet — Red phase)
import { POST } from "@/app/api/line/webhook/route";

const CHANNEL_SECRET = "test_secret_12345";

function sign(body: string): string {
  return crypto.createHmac("sha256", CHANNEL_SECRET).update(body).digest("base64");
}

function makeWebhookReq(body: object, overrideSignature?: string) {
  const bodyStr = JSON.stringify(body);
  const sig = overrideSignature ?? sign(bodyStr);
  return new NextRequest("http://localhost/api/line/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-line-signature": sig,
    },
    body: bodyStr,
  });
}

const FOLLOW_EVENT = {
  destination: "Udeadbeef",
  events: [
    {
      type: "follow",
      timestamp: 1718438400000,
      source: { type: "user", userId: "Uabcdef12345" },
      replyToken: "replytoken123",
    },
  ],
};

const MESSAGE_EVENT = {
  destination: "Udeadbeef",
  events: [
    {
      type: "message",
      timestamp: 1718438400000,
      source: { type: "user", userId: "Uabcdef12345" },
      replyToken: "replytoken456",
      message: { id: "msg001", type: "text", text: "こんにちは" },
    },
  ],
};

describe("POST /api/line/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("LINE_CHANNEL_SECRET", CHANNEL_SECRET);
  });

  it("有効な署名で200を返す", async () => {
    const res = await POST(makeWebhookReq(FOLLOW_EVENT));
    expect(res.status).toBe(200);
  });

  it("無効な署名で401を返す", async () => {
    const res = await POST(makeWebhookReq(FOLLOW_EVENT, "invalid_signature"));
    expect(res.status).toBe(401);
  });

  it("署名ヘッダーがないと401を返す", async () => {
    const bodyStr = JSON.stringify(FOLLOW_EVENT);
    const req = new NextRequest("http://localhost/api/line/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyStr,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("eventsが空配列でも200を返す（LINE疎通確認）", async () => {
    const emptyPayload = { destination: "Udeadbeef", events: [] };
    const res = await POST(makeWebhookReq(emptyPayload));
    expect(res.status).toBe(200);
  });

  it("messageイベントを受け取っても200を返す", async () => {
    const res = await POST(makeWebhookReq(MESSAGE_EVENT));
    expect(res.status).toBe(200);
  });
});
