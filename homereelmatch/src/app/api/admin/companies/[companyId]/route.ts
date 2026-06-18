import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().optional(),
  modelHouseName: z.string().optional(),
  modelHouseAddress: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { companyId } = await params;
  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const company = await prisma.company.update({ where: { id: companyId }, data: parsed.data });
  return NextResponse.json({ company });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { companyId } = await params;
  const count = await prisma.salesperson.count({ where: { companyId } });
  if (count > 0) {
    return NextResponse.json({ error: "営業マンが所属しているため削除できません" }, { status: 409 });
  }

  await prisma.company.delete({ where: { id: companyId } });
  return new NextResponse(null, { status: 204 });
}
