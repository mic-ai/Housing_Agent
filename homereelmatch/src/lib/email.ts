import nodemailer from "nodemailer";

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
