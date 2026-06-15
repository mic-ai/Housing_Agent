import { describe, it, expect, afterEach } from "vitest";
import { isOriginAllowed } from "@/lib/cors";

describe("isOriginAllowed", () => {
  afterEach(() => {
    delete process.env.EMBED_ALLOWED_ORIGINS;
  });

  it("EMBED_ALLOWED_ORIGINS 未設定 = 全オリジン許可（開発モード）", () => {
    delete process.env.EMBED_ALLOWED_ORIGINS;
    expect(isOriginAllowed("https://any.example.com")).toBe(true);
  });

  it("originがnullはfalse（常に）", () => {
    expect(isOriginAllowed(null)).toBe(false);
  });

  it("許可リストにあるOriginはtrue", () => {
    process.env.EMBED_ALLOWED_ORIGINS = "https://portal.example.com";
    expect(isOriginAllowed("https://portal.example.com")).toBe(true);
  });

  it("複数許可リストの2番目にマッチしてtrue", () => {
    process.env.EMBED_ALLOWED_ORIGINS = "https://portal.example.com,https://another.example.com";
    expect(isOriginAllowed("https://another.example.com")).toBe(true);
  });

  it("許可リストにないOriginはfalse", () => {
    process.env.EMBED_ALLOWED_ORIGINS = "https://portal.example.com";
    expect(isOriginAllowed("https://evil.example.com")).toBe(false);
  });
});
