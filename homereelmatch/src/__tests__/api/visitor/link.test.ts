import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/visitor/link/[visitorId]/route";

function mockCookie(value: string | undefined) {
  vi.mocked(cookies).mockReturnValue({
    get: vi.fn(() => (value ? { value } : undefined)),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function makeReq() {
  return new NextRequest("http://localhost/api/visitor/link/visitor_1");
}

function makeParams(visitorId: string) {
  return { params: Promise.resolve({ visitorId }) };
}

describe("GET /api/visitor/link/[visitorId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないvisitorIdの場合は404を返す", async () => {
    mockCookie(undefined);
    vi.mocked(prisma.visitor.findUnique).mockResolvedValue(null);

    const res = await GET(makeReq(), makeParams("missing"));

    expect(res.status).toBe(404);
  });

  it("hrm_viewer_tokenが既にある場合はそのトークンでViewerProfileを解決しVisitor.viewerIdを更新、/へリダイレクトする", async () => {
    mockCookie("existing-token");
    vi.mocked(prisma.visitor.findUnique).mockResolvedValue({ id: "visitor_1" } as never);
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "vp1" } as never);
    vi.mocked(prisma.visitor.update).mockResolvedValue({ id: "visitor_1", viewerId: "vp1" } as never);

    const res = await GET(makeReq(), makeParams("visitor_1"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/");
    expect(prisma.viewerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { viewerToken: "existing-token" } })
    );
    expect(prisma.visitor.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "visitor_1" }, data: { viewerId: "vp1" } })
    );
    expect(res.cookies.get("hrm_viewer_token")?.value).toBe("existing-token");
    expect(res.cookies.get("hrm_visitor_id")?.value).toBe("visitor_1");
  });

  it("hrm_viewer_tokenが無い場合は新規に発行してからVisitorに紐付ける", async () => {
    mockCookie(undefined);
    vi.mocked(prisma.visitor.findUnique).mockResolvedValue({ id: "visitor_1" } as never);
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "vp2" } as never);
    vi.mocked(prisma.visitor.update).mockResolvedValue({ id: "visitor_1", viewerId: "vp2" } as never);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("11111111-1111-1111-1111-111111111111");

    const res = await GET(makeReq(), makeParams("visitor_1"));

    expect(res.status).toBe(307);
    expect(prisma.viewerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { viewerToken: "11111111-1111-1111-1111-111111111111" } })
    );
    expect(res.cookies.get("hrm_viewer_token")?.value).toBe("11111111-1111-1111-1111-111111111111");
  });
});
