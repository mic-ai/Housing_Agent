import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import bcrypt from "bcryptjs";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  houseMakerId: z.string().optional(),
  role: z.enum(["SALESPERSON", "ADMIN"]).default("SALESPERSON"),
  lineId: z.string().optional(),
  bio: z.string().optional(),
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const salespersons = await prisma.salesperson.findMany({
    include: {
      houseMaker: { select: { id: true, name: true } },
      _count: { select: { videoSegments: true, contactRequests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    salespersons: salespersons.map((sp) => ({
      id: sp.id,
      name: sp.name,
      email: sp.email,
      role: sp.role,
      lineId: sp.lineId,
      bio: sp.bio,
      houseMaker: sp.houseMaker,
      videoCount: sp._count.videoSegments,
      inquiryCount: sp._count.contactRequests,
      createdAt: sp.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

    const { password, ...rest } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const salesperson = await prisma.salesperson.create({
      data: { ...rest, password: hashedPassword },
      include: { houseMaker: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      salesperson: {
        id: salesperson.id,
        name: salesperson.name,
        email: salesperson.email,
        role: salesperson.role,
        houseMaker: salesperson.houseMaker,
        videoCount: 0,
        inquiryCount: 0,
        createdAt: salesperson.createdAt,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "このメールアドレスはすでに使用されています" }, { status: 409 });
    }
    console.error("[admin/salespersons POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
