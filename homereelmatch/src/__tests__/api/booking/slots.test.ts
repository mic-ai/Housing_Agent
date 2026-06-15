import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { GET } from "@/app/api/booking/slots/route";

const SLOT = {
  id: "slot_001",
  salespersonId: "sp_001",
  startAt: new Date("2026-06-20T10:00:00Z"),
  endAt: new Date("2026-06-20T11:00:00Z"),
  isBooked: false,
  createdAt: new Date(),
};

function makeReq(salespersonId: string, from?: string, to?: string) {
  const url = new URL("http://localhost/api/booking/slots");
  url.searchParams.set("salespersonId", salespersonId);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  return new NextRequest(url.toString());
}

describe("GET /api/booking/slots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未予約スロット一覧を返す", async () => {
    vi.mocked(prisma.availableSlot.findMany).mockResolvedValue([SLOT] as never);
    const res = await GET(makeReq("sp_001"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("slot_001");
    expect(body.data[0].isBooked).toBe(false);
  });

  it("salespersonIdが欠けていると400を返す", async () => {
    const req = new NextRequest("http://localhost/api/booking/slots");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("from/toで期間絞り込みができる", async () => {
    vi.mocked(prisma.availableSlot.findMany).mockResolvedValue([SLOT] as never);
    const res = await GET(makeReq("sp_001", "2026-06-20T00:00:00Z", "2026-06-21T00:00:00Z"));
    expect(res.status).toBe(200);
    expect(prisma.availableSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  it("予約済みスロットは含まない", async () => {
    vi.mocked(prisma.availableSlot.findMany).mockResolvedValue([] as never);
    const res = await GET(makeReq("sp_001"));
    expect(prisma.availableSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isBooked: false }),
      })
    );
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});
