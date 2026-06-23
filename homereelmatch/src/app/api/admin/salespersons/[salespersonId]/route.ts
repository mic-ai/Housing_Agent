import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import bcrypt from "bcryptjs";

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  houseMakerId: z.string().nullable().optional(),
  role: z.enum(["SALESPERSON", "ADMIN"]).optional(),
  lineId: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ salespersonId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { salespersonId } = await params;
  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.password = await bcrypt.hash(password, 10);

  try {
    const salesperson = await prisma.salesperson.update({
      where: { id: salespersonId },
      data,
      include: { houseMaker: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ salesperson });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "このメールアドレスはすでに使用されています" }, { status: 409 });
    }
    console.error("[admin/salespersons PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ salespersonId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { salespersonId } = await params;

  const counts = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    include: { _count: { select: { contactRequests: true, slots: true } } },
  });
  if (!counts) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (counts._count.contactRequests > 0) {
    return NextResponse.json({ error: "問い合わせが存在するため削除できません" }, { status: 409 });
  }

  await prisma.salesperson.delete({ where: { id: salespersonId } });
  return new NextResponse(null, { status: 204 });
}
