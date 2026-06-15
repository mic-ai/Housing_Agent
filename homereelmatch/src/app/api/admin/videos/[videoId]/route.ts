import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  area: z.string().optional(),
  houseType: z.string().optional(),
  priceRange: z.string().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

type Params = { params: Promise<{ videoId: string }> };

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { videoId } = await params;
    const body = await request.json();
    const data = PatchSchema.parse(body);

    const video = await prisma.video.update({
      where: { id: videoId },
      data,
    });

    return NextResponse.json({ data: video });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
