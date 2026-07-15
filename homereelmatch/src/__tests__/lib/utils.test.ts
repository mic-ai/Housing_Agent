import { describe, it, expect } from "vitest";
import { extractYouTubeId, formatDate, formatDateTime, safeJsonLd } from "@/lib/utils";

describe("extractYouTubeId", () => {
  it("標準URLからIDを抽出する", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("短縮URLからIDを抽出する", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("IDそのものを返す", () => {
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("YouTube Shorts URLからIDを抽出する", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("無効なURLはnullを返す", () => {
    expect(extractYouTubeId("https://example.com/invalid")).toBeNull();
  });
});

describe("formatDate", () => {
  it("Dateオブジェクトを日本語形式でフォーマットする", () => {
    const date = new Date("2026-06-15T10:30:00Z");
    const result = formatDate(date);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/6|06/);
    expect(result).toMatch(/15/);
  });

  it("ISO文字列も受け付ける", () => {
    const result = formatDate("2026-06-15T10:30:00Z");
    expect(result).toMatch(/2026/);
  });
});

describe("formatDateTime", () => {
  it("日時を含むフォーマットを返す", () => {
    const date = new Date("2026-06-15T10:30:00Z");
    const result = formatDateTime(date);
    expect(result).toMatch(/2026/);
    expect(result.length).toBeGreaterThan(formatDate(date).length);
  });
});

describe("safeJsonLd", () => {
  it("</script>を含むユーザー入力があってもscriptタグを閉じない", () => {
    const malicious = { title: "</script><script>alert(1)</script>" };
    const result = safeJsonLd(malicious);
    expect(result).not.toContain("</script>");
    expect(result).not.toContain("<script>");
  });

  it("エスケープ後もJSONとして正しくパースできる（意味を破壊しない）", () => {
    const malicious = { title: "</script><script>alert(1)</script>" };
    const result = safeJsonLd(malicious);
    expect(JSON.parse(result)).toEqual(malicious);
  });

  it("通常の値は通常通りシリアライズする", () => {
    expect(safeJsonLd({ a: 1, b: "テスト" })).toBe(JSON.stringify({ a: 1, b: "テスト" }));
  });
});
