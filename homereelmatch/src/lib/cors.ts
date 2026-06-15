export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = (process.env.EMBED_ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
  // EMBED_ALLOWED_ORIGINS 未設定 = 制限なし（開発モード）
  if (allowed.length === 0) return true;
  return allowed.some((o) => o.trim() === origin);
}

export function buildCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}
