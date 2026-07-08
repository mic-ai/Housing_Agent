import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { VIEWER_TOKEN_COOKIE } from "@/lib/viewer-cookie";

export async function getViewerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VIEWER_TOKEN_COOKIE)?.value ?? null;
}

export async function ensureViewerProfile(viewerToken: string) {
  return prisma.viewerProfile.upsert({
    where: { viewerToken },
    update: {},
    create: { viewerToken },
  });
}
