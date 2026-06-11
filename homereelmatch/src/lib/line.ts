const LINE_API = "https://api.line.me/v2/bot/message/push";
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

async function pushMessage(to: string, text: string): Promise<void> {
  const res = await fetch(LINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
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

export async function notifyUserBookingConfirmed(params: {
  lineId: string;
  salespersonName: string;
  companyName: string;
  scheduledAt: string;
  modelHouseName: string;
  modelHouseAddress: string;
}): Promise<void> {
  const text =
    `ご予約が確定しました！\n` +
    `担当: ${params.salespersonName}（${params.companyName}）\n` +
    `日時: ${params.scheduledAt}\n` +
    `場所: ${params.modelHouseName} ${params.modelHouseAddress}`;
  await pushMessage(params.lineId, text);
}

export function validateLineSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const channelSecret = process.env.LINE_CHANNEL_SECRET!;
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}
