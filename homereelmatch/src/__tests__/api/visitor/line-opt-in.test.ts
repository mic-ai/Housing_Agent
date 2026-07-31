import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/visitor/[visitorId]/line-opt-in/route";

function makeReq() {
  return new NextRequest("http://localhost/api/visitor/visitor_1/line-opt-in", { method: "POST" });
}

function makeParams(visitorId: string) {
  return { params: Promise.resolve({ visitorId }) };
}

describe("POST /api/visitor/[visitorId]/line-opt-in", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないvisitorIdの場合は404を返す", async () => {
    vi.mocked(prisma.visitor.update).mockRejectedValue(new Error("Record not found"));
    const res = await POST(makeReq(), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("lineOptIn/lineOptInAtを更新し200を返す", async () => {
    vi.mocked(prisma.visitor.update).mockResolvedValue({
      id: "visitor_1",
      lineOptIn: true,
      lineOptInAt: new Date(),
    } as never);

    const res = await POST(makeReq(), makeParams("visitor_1"));

    expect(res.status).toBe(200);
    expect(prisma.visitor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "visitor_1" },
        data: expect.objectContaining({ lineOptIn: true }),
      })
    );
  });
});
