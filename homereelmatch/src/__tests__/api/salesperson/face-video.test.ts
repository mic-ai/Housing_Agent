import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "@/app/api/salesperson/profile/face-video/route";

describe("deprecated /api/salesperson/profile/face-video", () => {
  it("POST は 410 を返す", async () => {
    const res = await POST();
    expect(res.status).toBe(410);
  });

  it("DELETE は 410 を返す", async () => {
    const res = await DELETE();
    expect(res.status).toBe(410);
  });
});
