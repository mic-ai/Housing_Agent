import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Fast path: JWT already has ADMIN role
  if (session.user.role === "ADMIN") return null;
  // Fallback: verify from DB to handle stale JWT (role changed after login, or role missing from old token)
  const sp = await prisma.salesperson.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (sp?.role === "ADMIN") return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireSalesperson(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
