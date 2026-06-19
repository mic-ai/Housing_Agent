import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PostSchema = z.object({
  url: z.string().url(),
  platform: z.enum(["YOUTUBE", "INSTAGRAM"]),
  title: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const videos = await prisma.salespersonProfileVideo.findMany({
    where: { salespersonId: session.user.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ data: videos });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = PostSchema.parse(await request.json());
    const video = await prisma.salespersonProfileVideo.create({
      data: { salespersonId: session.user.id, ...body },
    });
    return NextResponse.json({ data: video }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
