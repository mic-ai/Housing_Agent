const RESEND_API = "https://api.resend.com/emails";
const FROM = process.env.FROM_EMAIL ?? "noreply@homereelmatch.example.com";

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // Email not configured — skip silently

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM, ...params }),
  });
  if (!res.ok) {
    console.error("Email send failed:", await res.text());
  }
}

export async function sendInquiryNotificationToSalesperson(params: {
  email: string;
  userName: string;
  videoTitle: string;
  contactMethod: string;
  dashboardUrl: string;
}): Promise<void> {
  await sendEmail({
    to: params.email,
    subject: `【HomeReelMatch】新規問い合わせ: ${params.userName}様`,
    html: `
      <p><strong>${params.userName}</strong>様から問い合わせが届きました。</p>
      <p>動画: ${params.videoTitle}</p>
      <p>希望連絡方法: ${params.contactMethod}</p>
      <p><a href="${params.dashboardUrl}">ダッシュボードで確認する</a></p>
    `,
  });
}

export async function sendBookingConfirmationToUser(params: {
  email: string;
  salespersonName: string;
  companyName: string;
  scheduledAt: string;
  modelHouseName: string;
  modelHouseAddress: string;
}): Promise<void> {
  await sendEmail({
    to: params.email,
    subject: "【HomeReelMatch】面談予約が確定しました",
    html: `
      <p>ご予約が確定しました！</p>
      <p>担当: <strong>${params.salespersonName}</strong>（${params.companyName}）</p>
      <p>日時: ${params.scheduledAt}</p>
      <p>場所: ${params.modelHouseName}<br>${params.modelHouseAddress}</p>
    `,
  });
}
