import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Component under test (does not exist yet — Red phase)
import { InquiriesClient } from "@/components/sales/InquiriesClient";

const INQUIRIES = [
  {
    id: "cr_001",
    salespersonId: "sp_001",
    videoId: "vid_001",
    contactMethod: "LINE" as const,
    status: "PENDING" as const,
    questionnaireJson: null,
    createdAt: "2026-06-15T10:00:00.000Z",
    user: { id: "user_001", name: "田中太郎", email: null, phone: null, lineId: "line_abc", createdAt: "2026-06-15T10:00:00.000Z" },
  },
  {
    id: "cr_002",
    salespersonId: "sp_001",
    videoId: null,
    contactMethod: "EMAIL" as const,
    status: "RESPONDED" as const,
    questionnaireJson: null,
    createdAt: "2026-06-14T09:00:00.000Z",
    user: { id: "user_002", name: "鈴木花子", email: "suzuki@example.com", phone: null, lineId: null, createdAt: "2026-06-14T09:00:00.000Z" },
  },
];

describe("InquiriesClient (問い合わせ管理)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: INQUIRIES }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("問い合わせ一覧が表示される", async () => {
    render(<InquiriesClient salespersonId="sp_001" />);
    expect(await screen.findByText("田中太郎")).toBeInTheDocument();
    expect(screen.getByText("鈴木花子")).toBeInTheDocument();
  });

  it("ステータスバッジが表示される", async () => {
    render(<InquiriesClient salespersonId="sp_001" />);
    await screen.findByText("田中太郎");
    // <span> のバッジを特定（<option> と区別するため role 指定）
    const badges = screen.getAllByText(/未対応/);
    expect(badges.some((el) => el.tagName === "SPAN")).toBe(true);
    const respondedBadges = screen.getAllByText(/対応済/);
    expect(respondedBadges.some((el) => el.tagName === "SPAN")).toBe(true);
  });

  it("連絡方法（LINE/メール）が表示される", async () => {
    render(<InquiriesClient salespersonId="sp_001" />);
    await screen.findByText("田中太郎");
    expect(screen.getByText(/LINE/)).toBeInTheDocument();
    expect(screen.getByText(/メール|EMAIL/i)).toBeInTheDocument();
  });

  it("ステータス変更ボタンで対応済みにできる", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: INQUIRIES }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { ...INQUIRIES[0], status: "RESPONDED" } }),
    });

    render(<InquiriesClient salespersonId="sp_001" />);
    const updateBtn = await screen.findByRole("button", { name: /対応済みにする|respond/i });
    await userEvent.click(updateBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("cr_001"),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("問い合わせがない場合は空状態メッセージを表示", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) } as unknown as Response);
    render(<InquiriesClient salespersonId="sp_001" />);
    expect(await screen.findByText(/問い合わせがありません|no inquiries/i)).toBeInTheDocument();
  });

  it("ステータスフィルターで絞り込める", async () => {
    render(<InquiriesClient salespersonId="sp_001" />);
    await screen.findByText("田中太郎");

    const filterSelect = screen.getByRole("combobox", { name: /ステータス|status/i });
    await userEvent.selectOptions(filterSelect, "PENDING");

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain("status=PENDING");
    });
  });
});
