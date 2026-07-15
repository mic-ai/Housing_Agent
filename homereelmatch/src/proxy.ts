import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { VIEWER_TOKEN_COOKIE, VIEWER_TOKEN_MAX_AGE } from "@/lib/viewer-cookie";

function isPreviewGated(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/login")) return false;
  if (pathname.startsWith("/dashboard")) return false;
  if (pathname.startsWith("/admin")) return false;
  return true;
}

function basicAuthResponse() {
  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="HomeReelMatch Preview"' },
  });
}

// Edge runtime has no Node `crypto.timingSafeEqual` — compare byte-by-byte without
// early return to avoid leaking password length/prefix via response timing.
function timingSafeEqualString(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length === bBytes.length ? 0 : 1;
  for (let i = 0; i < maxLength; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── Preview password gate ────────────────────────────────────────────────
  const previewPassword = process.env.PREVIEW_PASSWORD;
  if (previewPassword && isPreviewGated(path)) {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Basic ")) return basicAuthResponse();
    const decoded = atob(authHeader.slice(6));
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (!timingSafeEqualString(password, previewPassword)) return basicAuthResponse();
  }

  // ── Dashboard/Admin auth guard ───────────────────────────────────────────
  if (path.startsWith("/dashboard") || path.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie: request.nextUrl.protocol === "https:",
    });
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ── 閲覧者の軽量識別トークン発行 ─────────────────────────────────────────
  const response = NextResponse.next();
  if (!request.cookies.get(VIEWER_TOKEN_COOKIE)) {
    response.cookies.set(VIEWER_TOKEN_COOKIE, crypto.randomUUID(), {
      httpOnly: false,
      maxAge: VIEWER_TOKEN_MAX_AGE,
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|embed\\.js|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
