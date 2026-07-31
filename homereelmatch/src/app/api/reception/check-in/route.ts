import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  consentGiven: z.literal(true),
  houseMakerIds: z.array(z.string()),
  hashtagIds: z.array(z.string()).optional(),
  venueId: z.string().optional(),
});

// 受付タブレット: 同意取得済みでのみVisitorレコードを作成する（意図的に認証なし・受付カウンター内限定運用）
export async function POST(request: NextRequest) {
  try {
    const body = BodySchema.parse(await request.json());

    const visitor = await prisma.$transaction(async (tx) => {
      const created = await tx.visitor.create({
        data: {
          consentGiven: true,
          consentedAt: new Date(),
          venueId: body.venueId,
        },
      });

      if (body.houseMakerIds.length > 0) {
        await tx.visitorHouseMakerInterest.createMany({
          data: body.houseMakerIds.map((houseMakerId) => ({
            visitorId: created.id,
            houseMakerId,
          })),
        });
      }

      if (body.hashtagIds && body.hashtagIds.length > 0) {
        await tx.visitorHashtagInterest.createMany({
          data: body.hashtagIds.map((hashtagId) => ({
            visitorId: created.id,
            hashtagId,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ data: { visitorId: visitor.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
