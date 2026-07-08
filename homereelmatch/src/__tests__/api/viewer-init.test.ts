import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/viewer/init/route";

describe("POST /api/viewer/init", () => {
  beforeEach(() => vi.clearAllMocks());

  it("viewerToken Cookieが無い場合は400を返す", async () => {
    vi.mocked(cookies).mockReturnValue({
      get: vi.fn(() => undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("viewerToken Cookieがある場合はViewerProfileをupsertして返す", async () => {
    vi.mocked(cookies).mockReturnValue({
      get: vi.fn(() => ({ value: "token-abc" })),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({
      id: "vp1",
      viewerToken: "token-abc",
    } as never);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.viewerToken).toBe("token-abc");
    expect(prisma.viewerProfile.upsert).toHaveBeenCalledWith({
      where: { viewerToken: "token-abc" },
      update: {},
      create: { viewerToken: "token-abc" },
    });
  });
});
