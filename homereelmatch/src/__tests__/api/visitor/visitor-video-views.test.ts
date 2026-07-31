import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/visitor-video-views/route";

function mockCookies(values: Record<string, string | undefined>) {
  vi.mocked(cookies).mockReturnValue({
    get: vi.fn((name: string) => (values[name] ? { value: values[name] } : undefined)),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/visitor-video-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/visitor-video-views", () => {
  beforeEach(() => vi.clearAllMocks());

  it("viewerToken Cookieが無い場合は400を返す", async () => {
    mockCookies({});
    const res = await POST(makePostReq({ source: "entrance" }));
    expect(res.status).toBe(400);
  });

  it("sourceが無い不正なリクエストは400を返す", async () => {
    mockCookies({ hrm_viewer_token: "token-abc" });
    const res = await POST(makePostReq({ videoId: "vid1" }));
    expect(res.status).toBe(400);
  });

  it("visitor cookieが無い場合はvisitorId無しでVisitorVideoViewを作成する", async () => {
    mockCookies({ hrm_viewer_token: "token-abc" });
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "vp1" } as never);
    vi.mocked(prisma.visitorVideoView.create).mockResolvedValue({
      id: "vv1",
      viewerId: "vp1",
      visitorId: null,
      videoId: "vid1",
      source: "entrance",
    } as never);

    const res = await POST(makePostReq({ source: "entrance", videoId: "vid1" }));

    expect(res.status).toBe(201);
    expect(prisma.visitorVideoView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          viewerId: "vp1",
          visitorId: undefined,
          videoId: "vid1",
          source: "entrance",
        }),
      })
    );
  });

  it("visitor cookieがある場合はvisitorIdを紐付けて作成する", async () => {
    mockCookies({ hrm_viewer_token: "token-abc", hrm_visitor_id: "visitor-1" });
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "vp1" } as never);
    vi.mocked(prisma.visitorVideoView.create).mockResolvedValue({
      id: "vv1",
      viewerId: "vp1",
      visitorId: "visitor-1",
      videoId: null,
      source: "booth_hm1",
    } as never);

    const res = await POST(makePostReq({ source: "booth_hm1" }));

    expect(res.status).toBe(201);
    expect(prisma.visitorVideoView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          viewerId: "vp1",
          visitorId: "visitor-1",
          source: "booth_hm1",
        }),
      })
    );
  });
});
