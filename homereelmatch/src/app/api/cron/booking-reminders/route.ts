import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUserBookingReminder } from "@/lib/line";
import { sendBookingReminderToUser } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getJstDayBoundsUtc(now: Date): { startOfDay: Date; endOfDay: Date } {
  const nowJst = new Date(now.getTime() + JST_OFFSET_MS);
  const y = nowJst.getUTCFullYear();
  const m = nowJst.getUTCMonth();
  const d = nowJst.getUTCDate();
  const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0) - JST_OFFSET_MS);
  const endOfDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - JST_OFFSET_MS);
  return { startOfDay, endOfDay };
}

// Vercel Cron: 当日対応予定の予約者へ営業マン自己紹介動画リンク付きリマインドを送信する（source=pre_reminder）
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { startOfDay, endOfDay } = getJstDayBoundsUtc(new Date());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homereelmatch.vercel.app";

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      scheduledAt: { gte: startOfDay, lt: endOfDay },
    },
    include: {
      contactRequest: {
        include: {
          user: true,
          salesperson: { include: { company: true } },
        },
      },
    },
  });

  let sentCount = 0;

  for (const appointment of appointments) {
    try {
      const { user, salesperson } = appointment.contactRequest;
      const introVideoLinkUrl = salesperson.introVideoUrl
        ? `${appUrl}/salesperson/${salesperson.id}?source=pre_reminder`
        : undefined;
      const notifyParams = {
        salespersonName: salesperson.name,
        companyName: salesperson.company?.name ?? "",
        scheduledAt: formatDateTime(appointment.scheduledAt),
        modelHouseName: salesperson.company?.modelHouseName ?? "",
        modelHouseAddress: salesperson.company?.modelHouseAddress ?? "",
        introVideoLinkUrl,
      };

      if (user.lineId) {
        await notifyUserBookingReminder({ lineId: user.lineId, ...notifyParams });
      } else if (user.email) {
        await sendBookingReminderToUser({ email: user.email, ...notifyParams });
      }

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      });
      sentCount++;
    } catch (error) {
      console.error("予約リマインド送信に失敗しました", appointment.id, error);
    }
  }

  return NextResponse.json({ data: { processed: appointments.length, sent: sentCount } });
}
