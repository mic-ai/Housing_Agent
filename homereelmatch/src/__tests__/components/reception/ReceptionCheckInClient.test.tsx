import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake") },
}));

import { ReceptionCheckInClient } from "@/components/reception/ReceptionCheckInClient";

const HOUSE_MAKERS = [
  { id: "hm1", name: "アイフルホーム" },
  { id: "hm2", name: "セキスイハイム" },
];

const VIDEO = {
  id: "vid1",
  platform: "YOUTUBE" as const,
  url: "https://www.youtube.com/watch?v=abc",
  thumbnailUrl: null,
  title: "テスト動画",
  description: null,
  houseMaker: { id: "hm1", name: "アイフルホーム" },
  venue: null,
  viewCount: 0,
  hashtags: [],
  salespersonVideos: [],
  createdAt: "2026-07-01T00:00:00.000Z",
};

describe("ReceptionCheckInClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((url: string) => {
      if (url === "/api/reception/check-in") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { visitorId: "visitor_1" } }),
        } as unknown as Response);
      }
      if (typeof url === "string" && url.startsWith("/api/videos")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [VIDEO] }) } as unknown as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as unknown as Response);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("同意→メーカー選択→送信→結果表示の一連の流れが動作する", async () => {
    const user = userEvent.setup();
    render(<ReceptionCheckInClient houseMakers={HOUSE_MAKERS} hashtags={[]} />);

    // 同意ステップ
    expect(screen.getByRole("button", { name: "同意する" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "同意する" }));

    // 興味選択ステップ
    await user.click(screen.getByRole("button", { name: "アイフルホーム" }));
    const submitButton = screen.getByRole("button", { name: "この内容で見る" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/reception/check-in",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ consentGiven: true, houseMakerIds: ["hm1"], hashtagIds: [] }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("テスト動画")).toBeInTheDocument();
    });
  });

  it("メーカー未選択では送信ボタンが無効", async () => {
    const user = userEvent.setup();
    render(<ReceptionCheckInClient houseMakers={HOUSE_MAKERS} hashtags={[]} />);
    await user.click(screen.getByRole("button", { name: "同意する" }));

    expect(screen.getByRole("button", { name: "この内容で見る" })).toBeDisabled();
  });

  it("次の来場者へボタンで同意ステップに戻る", async () => {
    const user = userEvent.setup();
    render(<ReceptionCheckInClient houseMakers={HOUSE_MAKERS} hashtags={[]} />);
    await user.click(screen.getByRole("button", { name: "同意する" }));
    await user.click(screen.getByRole("button", { name: "アイフルホーム" }));
    await user.click(screen.getByRole("button", { name: "この内容で見る" }));

    await waitFor(() => screen.getByRole("button", { name: "次の来場者へ" }));
    await user.click(screen.getByRole("button", { name: "次の来場者へ" }));

    expect(screen.getByRole("button", { name: "同意する" })).toBeInTheDocument();
  });
});
