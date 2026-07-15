import { describe, it, expect } from "vitest";
import { looksLikeAllowedVideo, looksLikeAllowedImage } from "@/lib/file-sniff";

describe("looksLikeAllowedVideo", () => {
  it("mp4/mov (ISO container ftyp box) を受け入れる", () => {
    const bytes = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    expect(looksLikeAllowedVideo(bytes)).toBe(true);
  });

  it("webm (EBML header) を受け入れる", () => {
    const bytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(looksLikeAllowedVideo(bytes)).toBe(true);
  });

  it("マジックバイトのないデータは拒否する", () => {
    const bytes = Buffer.from("not a real video file, just text padding here");
    expect(looksLikeAllowedVideo(bytes)).toBe(false);
  });

  it("短すぎるデータは拒否する", () => {
    expect(looksLikeAllowedVideo(Buffer.from([0x1a, 0x45]))).toBe(false);
  });
});

describe("looksLikeAllowedImage", () => {
  it("JPEGマジックバイトを受け入れる", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    expect(looksLikeAllowedImage(bytes, "image/jpeg")).toBe(true);
  });

  it("PNGマジックバイトを受け入れる", () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(looksLikeAllowedImage(bytes, "image/png")).toBe(true);
  });

  it("WebPマジックバイトを受け入れる", () => {
    const bytes = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);
    expect(looksLikeAllowedImage(bytes, "image/webp")).toBe(true);
  });

  it("宣言されたMIMEと実データが一致しない場合は拒否する（例: PNGバイトをJPEGと偽装）", () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(looksLikeAllowedImage(pngBytes, "image/jpeg")).toBe(false);
  });
});
