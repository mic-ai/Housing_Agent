import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserBookingConfirmed } from "@/lib/line";
import { sendBookingConfirmationToUser } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

const ConfirmSchema = z.object({
  contactRequestId: z.string(),
  slotId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = ConfirmSchema.parse(body);

    const contactRequest = await prisma.contactRequest.findUnique({
      where: { id: data.contactRequestId },
      include: { user: true },
    });
    if (!contactRequest) {
      return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
    }

    const slot = await prisma.availableSlot.findUnique({
      where: { id: data.slotId },
      include: {
        salesperson: { include: { company: true } },
      },
    });
    if (!slot || slot.isBooked) {
      return NextResponse.json({ error: "スロットが利用できません" }, { status: 409 });
    }

    const appointment = await prisma.$transaction(async (tx) => {
      await tx.availableSlot.update({
        where: { id: data.slotId },
        data: { isBooked: true },
      });

      await tx.contactRequest.update({
        where: { id: data.contactRequestId },
        data: { status: "APPOINTED" },
      });

      return tx.appointment.create({
        data: {
          contactRequestId: data.contactRequestId,
          salespersonId: slot.salespersonId,
          userId: contactRequest.userId,
          scheduledAt: slot.startAt,
        },
      });
    });

    const notifyParams = {
      salespersonName: slot.salesperson.name,
      companyName: slot.salesperson.company?.name ?? "",
      scheduledAt: formatDateTime(slot.startAt),
      modelHouseName: slot.salesperson.company?.modelHouseName ?? "",
      modelHouseAddress: slot.salesperson.company?.modelHouseAddress ?? "",
    };

    if (contactRequest.user.lineId) {
      notifyUserBookingConfirmed({
        lineId: contactRequest.user.lineId,
        ...notifyParams,
      }).catch(console.error);
    } else if (contactRequest.user.email) {
      sendBookingConfirmationToUser({
        email: contactRequest.user.email,
        ...notifyParams,
      }).catch(console.error);
    }

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
