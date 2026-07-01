import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { WatchClientShell } from "@/components/video/WatchClientShell";
import type { SalespersonVideoDTO } from "@/types";

// CompositePlayer は onShowContact を即時呼び出せるスタブに差し替え
vi.mock("@/components/video/CompositePlayer", () => ({
  CompositePlayer: ({ onShowContact }: { onShowContact?: () => void }) => (
    <button data-testid="trigger-contact" onClick={onShowContact}>
      再生終了
    </button>
  ),
}));

// MainVideoPlayer / FaceRollPlayer は不要
vi.mock("@/components/video/MainVideoPlayer", () => ({ MainVideoPlayer: () => null }));
vi.mock("@/components/video/FaceRollPlayer", () => ({ FaceRollPlayer: () => null }));

const SALESPERSON_VIDEO: SalespersonVideoDTO = {
  id: "sv_001",
  salespersonId: "sp_001",
  preRollPublicUrl: null,
  preRollDurationSec: null,
  postRollPublicUrl: null,
  postRollDurationSec: null,
  isPrimary: true,
  salesperson: {
    id: "sp_001",
    name: "田中太郎",
    profileImage: null,
    bio: null,
    profileDetail: null,
    company: { id: "co_001", name: "テスト住宅", modelHouseName: null, modelHouseAddress: null },
  },
};

const DEFAULT_PROPS = {
  platform: "YOUTUBE" as const,
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  videoId: "vid_001",
  title: "テスト動画タイトル",
  hashtags: [],
  salespersonVideo: SALESPERSON_VIDEO,
};

describe("WatchClientShell", () => {
  it("初期状態では営業マンの連絡ボタンが非表示（opacity-0）", () => {
    render(<WatchClientShell {...DEFAULT_PROPS} />);
    // 連絡ボタンを含む div が opacity-0 クラスを持つ
    const contactArea = screen.getByText("LINEで連絡").closest("div[class*='opacity']");
    expect(contactArea?.className).toContain("opacity-0");
  });

  it("onShowContact が呼ばれると連絡ボタンが表示される", async () => {
    render(<WatchClientShell {...DEFAULT_PROPS} />);
    const trigger = screen.getByTestId("trigger-contact");
    await act(async () => { trigger.click(); });
    const contactArea = screen.getByText("LINEで連絡").closest("div[class*='opacity']");
    expect(contactArea?.className).toContain("opacity-100");
  });

  it("salespersonVideo が null のとき連絡エリアを描画しない", () => {
    render(<WatchClientShell {...DEFAULT_PROPS} salespersonVideo={null} />);
    expect(screen.queryByText("LINEで連絡")).toBeNull();
  });
});

describe("VideoFooter — showContact prop", () => {
  it("showContact=false のとき連絡ボタンエリアが opacity-0", () => {
    render(<WatchClientShell {...DEFAULT_PROPS} />);
    const contactArea = screen.getByText("LINEで連絡").closest("div[class*='opacity']");
    expect(contactArea?.className).toContain("opacity-0");
    expect(contactArea?.className).toContain("pointer-events-none");
  });

  it("動画タイトルは常に表示される", () => {
    render(<WatchClientShell {...DEFAULT_PROPS} />);
    expect(screen.getByText("テスト動画タイトル")).toBeDefined();
  });

  it("ハッシュタグが存在するとリンクとして表示される", () => {
    const hashtags = [
      { id: "h1", tagName: "注文住宅", usageCount: 5 },
      { id: "h2", tagName: "平屋", usageCount: 3 },
    ];
    render(<WatchClientShell {...DEFAULT_PROPS} hashtags={hashtags} />);
    expect(screen.getByText("#注文住宅")).toBeDefined();
    expect(screen.getByText("#平屋")).toBeDefined();
  });
});
