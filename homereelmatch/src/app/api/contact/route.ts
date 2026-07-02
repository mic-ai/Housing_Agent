import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { notifySalespersonNewInquiry } from "@/lib/line";
import { sendInquiryNotificationToSalesperson } from "@/lib/email";
import { requireSalesperson } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { encryptJson, decryptJson } from "@/lib/encrypt";

const ListQuerySchema = z.object({
  salespersonId: z.string().min(1),
  status: z.enum(["PENDING", "RESPONDED", "APPOINTED", "CLOSED"]).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await requireSalesperson();
  if (denied) return denied;

  try {
    const { searchParams } = request.nextUrl;
    const query = ListQuerySchema.parse(Object.fromEntries(searchParams));

    // Ownership: SALESPERSON can only list their own inquiries
    const session = (await auth())!;
    if (session.user.role !== "ADMIN" && session.user.id !== query.salespersonId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const inquiries = await prisma.contactRequest.findMany({
      where: {
        salespersonId: query.salespersonId,
        ...(query.status ? { status: query.status } : {}),
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    const data = inquiries.map((inq) => ({
      ...inq,
      questionnaireJson: decryptJson(inq.questionnaireJson),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  contactMethod: z.enum(["LINE", "EMAIL"]),
  salespersonId: z.string(),
  videoId: z.string().optional(),
  questionnaire: z
    .object({
      purchaseTiming: z.string().optional(),
      area: z.string().optional(),
      budget: z.string().optional(),
      familyComposition: z.string().optional(),
      houseType: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = ContactSchema.parse(body);

    if (data.contactMethod === "LINE" && !data.lineId) {
      return NextResponse.json(
        { error: "LINE IDが必要です" },
        { status: 400 }
      );
    }
    if (data.contactMethod === "EMAIL" && !data.email) {
      return NextResponse.json(
        { error: "メールアドレスが必要です" },
        { status: 400 }
      );
    }

    const salesperson = await prisma.salesperson.findUnique({
      where: { id: data.salespersonId },
      select: { id: true, lineId: true, email: true },
    });
    if (!salesperson) {
      return NextResponse.json({ error: "営業マンが見つかりません" }, { status: 404 });
    }

    const video = data.videoId
      ? await prisma.video.findUnique({ where: { id: data.videoId } })
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          lineId: data.lineId,
        },
      });

      const contactRequest = await tx.contactRequest.create({
        data: {
          userId: user.id,
          salespersonId: data.salespersonId,
          videoId: data.videoId,
          contactMethod: data.contactMethod,
          questionnaireJson: data.questionnaire
            ? (encryptJson(data.questionnaire) as Prisma.InputJsonValue)
            : undefined,
        },
      });

      return contactRequest;
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const dashboardUrl = `${appUrl}/dashboard/inquiries/${result.id}`;

    if (salesperson.lineId) {
      notifySalespersonNewInquiry({
        lineId: salesperson.lineId,
        userName: data.name,
        videoTitle: video?.title ?? "不明",
        contactMethod: data.contactMethod === "LINE" ? "LINE" : "メール",
        dashboardUrl,
      }).catch(console.error);
    } else if (salesperson.email) {
      sendInquiryNotificationToSalesperson({
        email: salesperson.email,
        userName: data.name,
        videoTitle: video?.title ?? "不明",
        contactMethod: data.contactMethod === "LINE" ? "LINE" : "メール",
        dashboardUrl,
      }).catch(console.error);
    }

    return NextResponse.json({ data: { id: result.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
