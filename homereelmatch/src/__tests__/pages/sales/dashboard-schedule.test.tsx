import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Component under test (does not exist yet — Red phase)
import { ScheduleClient } from "@/components/sales/ScheduleClient";

const SLOTS = [
  {
    id: "slot_001",
    salespersonId: "sp_001",
    startAt: "2026-06-20T10:00:00.000Z",
    endAt: "2026-06-20T11:00:00.000Z",
    isBooked: false,
  },
  {
    id: "slot_002",
    salespersonId: "sp_001",
    startAt: "2026-06-21T14:00:00.000Z",
    endAt: "2026-06-21T15:00:00.000Z",
    isBooked: true,
  },
];

describe("ScheduleClient (空き時間管理)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: SLOTS }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("空き時間スロット一覧が表示される（削除ボタンでロード確認）", async () => {
    render(<ScheduleClient salespersonId="sp_001" />);
    // slot_001（未予約）の削除ボタンが出現 = スロット一覧がロードされた証拠
    await expect(screen.findByRole("button", { name: /削除|delete/i })).resolves.toBeInTheDocument();
    // fetchが/api/booking/slotsに対して呼ばれたことを確認
    expect(fetchMock.mock.calls[0][0]).toContain("salespersonId=sp_001");
  });

  it("予約済みスロットはバッジで区別される", async () => {
    render(<ScheduleClient salespersonId="sp_001" />);
    await waitFor(() => {
      expect(screen.getByText(/予約済|booked/i)).toBeInTheDocument();
    });
  });

  it("スロット追加フォームが表示される", () => {
    render(<ScheduleClient salespersonId="sp_001" />);
    expect(screen.getByRole("button", { name: /スロット追加|add slot/i })).toBeInTheDocument();
  });

  it("スロット追加後にPOSTが発行される", async () => {
    render(<ScheduleClient salespersonId="sp_001" />);
    await userEvent.click(screen.getByRole("button", { name: /スロット追加|add slot/i }));

    const form = screen.getByRole("form", { name: /slot/i });
    fireEvent.submit(form);

    // 呼び出し回数ではなく POST が発行されたことを確認
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/booking/slots",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("未予約スロットは削除できる", async () => {
    render(<ScheduleClient salespersonId="sp_001" />);

    // 削除ボタンが現れるまで待機（＝スロット一覧がロードされた証拠）
    const deleteButton = await screen.findByRole("button", { name: /削除|delete/i });

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("slot_001"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
