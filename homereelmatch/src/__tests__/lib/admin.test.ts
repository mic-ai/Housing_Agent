import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { requireAdmin, requireSalesperson } from "@/lib/admin";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証（session=null）は 401 NextResponse を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const result = await requireAdmin();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("SALESPERSON ロールは 403 NextResponse を返す", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "sp1", role: "SALESPERSON", companyId: "co1" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    const result = await requireAdmin();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toBe("Forbidden");
  });

  it("ADMIN ロールは null を返す（通過）", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const result = await requireAdmin();
    expect(result).toBeNull();
  });
});

describe("requireSalesperson", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証（session=null）は 401 NextResponse を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const result = await requireSalesperson();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("SALESPERSON ロールは null を返す（通過）", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "sp1", role: "SALESPERSON", companyId: "co1" },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
    const result = await requireSalesperson();
    expect(result).toBeNull();
  });

  it("ADMIN ロールも null を返す（通過）", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    const result = await requireSalesperson();
    expect(result).toBeNull();
  });
});
