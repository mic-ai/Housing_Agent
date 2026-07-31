import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/reception/check-in/route";

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/reception/check-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reception/check-in", () => {
  const visitorCreate = vi.fn();
  const houseMakerInterestCreateMany = vi.fn();
  const hashtagInterestCreateMany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    visitorCreate.mockResolvedValue({ id: "visitor_1" });
    houseMakerInterestCreateMany.mockResolvedValue({ count: 0 });
    hashtagInterestCreateMany.mockResolvedValue({ count: 0 });
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const tx = {
        visitor: { create: visitorCreate },
        visitorHouseMakerInterest: { createMany: houseMakerInterestCreateMany },
        visitorHashtagInterest: { createMany: hashtagInterestCreateMany },
      };
      return (cb as (tx: unknown) => unknown)(tx);
    });
  });

  it("consentGivenがfalseの場合は400を返す", async () => {
    const res = await POST(makePostReq({ consentGiven: false, houseMakerIds: ["hm1"] }));
    expect(res.status).toBe(400);
    expect(visitorCreate).not.toHaveBeenCalled();
  });

  it("consentGivenが未指定の場合は400を返す", async () => {
    const res = await POST(makePostReq({ houseMakerIds: ["hm1"] }));
    expect(res.status).toBe(400);
  });

  it("houseMakerIdsが不正な型の場合は400を返す", async () => {
    const res = await POST(makePostReq({ consentGiven: true, houseMakerIds: "hm1" }));
    expect(res.status).toBe(400);
  });

  it("同意ありでVisitorと興味メーカーを作成し201でvisitorIdを返す", async () => {
    const res = await POST(
      makePostReq({ consentGiven: true, houseMakerIds: ["hm1", "hm2"], venueId: "venue1" })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.visitorId).toBe("visitor_1");
    expect(visitorCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ consentGiven: true, venueId: "venue1" }),
      })
    );
    expect(houseMakerInterestCreateMany).toHaveBeenCalledWith({
      data: [
        { visitorId: "visitor_1", houseMakerId: "hm1" },
        { visitorId: "visitor_1", houseMakerId: "hm2" },
      ],
    });
  });

  it("hashtagIdsが未指定の場合はvisitorHashtagInterestを作成しない", async () => {
    const res = await POST(makePostReq({ consentGiven: true, houseMakerIds: ["hm1"] }));
    expect(res.status).toBe(201);
    expect(hashtagInterestCreateMany).not.toHaveBeenCalled();
  });

  it("hashtagIdsがある場合はvisitorHashtagInterestも作成する", async () => {
    const res = await POST(
      makePostReq({ consentGiven: true, houseMakerIds: ["hm1"], hashtagIds: ["tag1"] })
    );
    expect(res.status).toBe(201);
    expect(hashtagInterestCreateMany).toHaveBeenCalledWith({
      data: [{ visitorId: "visitor_1", hashtagId: "tag1" }],
    });
  });
});
