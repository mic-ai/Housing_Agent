import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Handlers under test (POST does not exist yet — Red phase)
import { POST } from "@/app/api/booking/slots/route";
import { DELETE } from "@/app/api/booking/slots/[slotId]/route";

const SALESPERSON_ID = "sp_001";

const SLOT = {
  id: "slot_001",
  salespersonId: SALESPERSON_ID,
  startAt: new Date("2026-07-01T10:00:00Z"),
  endAt: new Date("2026-07-01T11:00:00Z"),
  isBooked: false,
  createdAt: new Date(),
};

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/booking/slots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq() {
  return new NextRequest("http://localhost/api/booking/slots/slot_001", { method: "DELETE" });
}

const deleteParams = Promise.resolve({ slotId: "slot_001" });

describe("POST /api/booking/slots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("有効なスロットを作成して201を返す", async () => {
    vi.mocked(prisma.availableSlot.create).mockResolvedValue(SLOT as never);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue({ id: SALESPERSON_ID } as never);

    const res = await POST(makePostReq({
      salespersonId: SALESPERSON_ID,
      startAt: "2026-07-01T10:00:00Z",
      endAt: "2026-07-01T11:00:00Z",
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("slot_001");
  });

  it("salespersonIdが欠けていると400を返す", async () => {
    const res = await POST(makePostReq({ startAt: "2026-07-01T10:00:00Z", endAt: "2026-07-01T11:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("startAtがendAtより後だと400を返す", async () => {
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue({ id: SALESPERSON_ID } as never);
    const res = await POST(makePostReq({
      salespersonId: SALESPERSON_ID,
      startAt: "2026-07-01T12:00:00Z",
      endAt: "2026-07-01T11:00:00Z",
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/startAt|endAt|時間/i);
  });

  it("存在しない営業マンIDで404を返す", async () => {
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue(null);
    const res = await POST(makePostReq({
      salespersonId: "nonexistent",
      startAt: "2026-07-01T10:00:00Z",
      endAt: "2026-07-01T11:00:00Z",
    }));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/booking/slots/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未予約スロットを削除して200を返す", async () => {
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue(SLOT as never);
    vi.mocked(prisma.availableSlot.delete).mockResolvedValue(SLOT as never);

    const res = await DELETE(makeDeleteReq(), { params: deleteParams });
    expect(res.status).toBe(200);
    expect(prisma.availableSlot.delete).toHaveBeenCalledWith({ where: { id: "slot_001" } });
  });

  it("予約済みスロットの削除は409を返す", async () => {
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue({ ...SLOT, isBooked: true } as never);
    const res = await DELETE(makeDeleteReq(), { params: deleteParams });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/予約済|booked/i);
  });

  it("存在しないIDで404を返す", async () => {
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(), { params: deleteParams });
    expect(res.status).toBe(404);
  });
});
