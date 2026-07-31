import { createHmac, timingSafeEqual } from "crypto";

const LINE_API = "https://api.line.me/v2/bot/message/push";

async function pushMessage(to: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return; // LINE not configured — skip silently

  const res = await fetch(LINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    console.error("LINE push failed:", await res.text());
  }
}

export async function notifySalespersonNewInquiry(params: {
  lineId: string;
  userName: string;
  videoTitle: string;
  contactMethod: string;
  dashboardUrl: string;
}): Promise<void> {
  const text =
    `【新規問い合わせ】${params.userName}様から連絡希望が届きました。\n` +
    `動画: ${params.videoTitle} / 希望連絡: ${params.contactMethod}\n` +
    `ダッシュボードを確認してください: ${params.dashboardUrl}`;
  await pushMessage(params.lineId, text);
}

function introVideoLinkText(introVideoLinkUrl?: string): string {
  return introVideoLinkUrl ? `\n担当の自己紹介動画: ${introVideoLinkUrl}` : "";
}

export async function notifyUserBookingConfirmed(params: {
  lineId: string;
  salespersonName: string;
  companyName: string;
  scheduledAt: string;
  modelHouseName: string;
  modelHouseAddress: string;
  introVideoLinkUrl?: string;
}): Promise<void> {
  const text =
    `ご予約が確定しました！\n` +
    `担当: ${params.salespersonName}（${params.companyName}）\n` +
    `日時: ${params.scheduledAt}\n` +
    `場所: ${params.modelHouseName} ${params.modelHouseAddress}` +
    introVideoLinkText(params.introVideoLinkUrl);
  await pushMessage(params.lineId, text);
}

export async function notifyUserBookingReminder(params: {
  lineId: string;
  salespersonName: string;
  companyName: string;
  scheduledAt: string;
  modelHouseName: string;
  modelHouseAddress: string;
  introVideoLinkUrl?: string;
}): Promise<void> {
  const text =
    `本日はご予約ありがとうございます。\n` +
    `担当: ${params.salespersonName}（${params.companyName}）\n` +
    `日時: ${params.scheduledAt}\n` +
    `場所: ${params.modelHouseName} ${params.modelHouseAddress}` +
    introVideoLinkText(params.introVideoLinkUrl);
  await pushMessage(params.lineId, text);
}

export function validateLineSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false; // LINE not configured

  const expected = createHmac("SHA256", secret).update(body).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}
