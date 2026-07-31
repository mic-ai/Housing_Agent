import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewerToken, ensureViewerProfile } from "@/lib/viewer";
import {
  VIEWER_TOKEN_COOKIE,
  VIEWER_TOKEN_MAX_AGE,
  VISITOR_ID_COOKIE,
  VISITOR_ID_MAX_AGE,
} from "@/lib/viewer-cookie";

// 受付でチェックインしたVisitorと、来場者自身のスマホのhrm_viewer_tokenを紐付ける「scan-to-link」ハンドオフ。
// src/proxy.tsのミドルウェアが同一リクエスト内で発行したcookieはこのハンドラからは読めないため、自前で解決/発行する。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  const { visitorId } = await params;

  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
    select: { id: true },
  });
  if (!visitor) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const existingToken = await getViewerToken();
  const viewerToken = existingToken ?? crypto.randomUUID();
  const viewerProfile = await ensureViewerProfile(viewerToken);

  await prisma.visitor.update({
    where: { id: visitorId },
    data: { viewerId: viewerProfile.id },
  });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(VIEWER_TOKEN_COOKIE, viewerToken, {
    httpOnly: false,
    maxAge: VIEWER_TOKEN_MAX_AGE,
    path: "/",
  });
  response.cookies.set(VISITOR_ID_COOKIE, visitorId, {
    httpOnly: false,
    maxAge: VISITOR_ID_MAX_AGE,
    path: "/",
  });
  return response;
}
