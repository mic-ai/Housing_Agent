import nodemailer from "nodemailer";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) return;

  const result = await transporter.sendMail({
    from: `"HomeReelMatch" <${process.env.GMAIL_USER}>`,
    ...params,
  });
  if (result.rejected.length > 0) {
    console.error("Email rejected:", result.rejected);
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
      <p><strong>${escapeHtml(params.userName)}</strong>様から問い合わせが届きました。</p>
      <p>動画: ${escapeHtml(params.videoTitle)}</p>
      <p>希望連絡方法: ${escapeHtml(params.contactMethod)}</p>
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
      <p>担当: <strong>${escapeHtml(params.salespersonName)}</strong>（${escapeHtml(params.companyName)}）</p>
      <p>日時: ${escapeHtml(params.scheduledAt)}</p>
      <p>場所: ${escapeHtml(params.modelHouseName)}<br>${escapeHtml(params.modelHouseAddress)}</p>
    `,
  });
}
