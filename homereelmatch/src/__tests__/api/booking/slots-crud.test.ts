import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

import { POST } from "@/app/api/booking/slots/route";
import { DELETE } from "@/app/api/booking/slots/[slotId]/route";

const SALESPERSON_ID = "sp_001";

const SP_SESSION = {
  user: { id: SALESPERSON_ID, name: "営業太郎", email: "sp@example.com", role: "SALESPERSON" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
  });

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
      salespersonId: SALESPERSON_ID,
      startAt: "2026-07-01T10:00:00Z",
      endAt: "2026-07-01T11:00:00Z",
    }));
    expect(res.status).toBe(404);
  });

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostReq({
      salespersonId: SALESPERSON_ID,
      startAt: "2026-07-01T10:00:00Z",
      endAt: "2026-07-01T11:00:00Z",
    }));
    expect(res.status).toBe(401);
  });

  it("他の営業マンのスロット作成は403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...SP_SESSION,
      user: { ...SP_SESSION.user, id: "other_sp" },
    } as never);
    const res = await POST(makePostReq({
      salespersonId: SALESPERSON_ID,
      startAt: "2026-07-01T10:00:00Z",
      endAt: "2026-07-01T11:00:00Z",
    }));
    expect(res.status).toBe(403);
  });

  it("ADMINは他の営業マンのスロットを作成できる", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin1", role: "ADMIN", companyId: "co1" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    vi.mocked(prisma.salesperson.findUnique).mockResolvedValue({ id: SALESPERSON_ID } as never);
    vi.mocked(prisma.availableSlot.create).mockResolvedValue(SLOT as never);
    const res = await POST(makePostReq({
      salespersonId: SALESPERSON_ID,
      startAt: "2026-07-01T10:00:00Z",
      endAt: "2026-07-01T11:00:00Z",
    }));
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/booking/slots/[slotId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SP_SESSION as never);
  });

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

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue(SLOT as never);
    const res = await DELETE(makeDeleteReq(), { params: deleteParams });
    expect(res.status).toBe(401);
  });

  it("他の営業マンのスロット削除は403を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      ...SP_SESSION,
      user: { ...SP_SESSION.user, id: "other_sp" },
    } as never);
    vi.mocked(prisma.availableSlot.findUnique).mockResolvedValue(SLOT as never);
    const res = await DELETE(makeDeleteReq(), { params: deleteParams });
    expect(res.status).toBe(403);
  });
});
