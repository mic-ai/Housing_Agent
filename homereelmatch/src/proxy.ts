import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public pages that are gated by PREVIEW_PASSWORD when set.
// API routes, /login, /dashboard, /admin are always excluded from the gate.
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

export default auth((req) => {
  const path = req.nextUrl.pathname;

  // ── Preview password gate ────────────────────────────────────────────────
  const previewPassword = process.env.PREVIEW_PASSWORD;
  if (previewPassword && isPreviewGated(path)) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Basic ")) return basicAuthResponse();

    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    // Accept any username; only the password matters
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (password !== previewPassword) return basicAuthResponse();
  }

  // ── Dashboard auth guard ─────────────────────────────────────────────────
  const isProtected = path.startsWith("/dashboard");
  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon\\.ico|embed\\.js|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
