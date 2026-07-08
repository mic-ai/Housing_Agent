import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WatchClientShell } from "@/components/video/WatchClientShell";
import type { SalespersonVideoDTO } from "@/types";

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
    toneQuote: null,
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

describe("VideoFooter — プロフィール導線", () => {
  it("営業マンプロフィールへのリンクが常時クリック可能な状態で表示される", () => {
    render(<WatchClientShell {...DEFAULT_PROPS} />);
    const profileLink = screen.getByRole("link", { name: "プロフィールを見て連絡する" });
    expect(profileLink).toHaveAttribute("href", "/salesperson/sp_001?videoId=vid_001");
    expect(profileLink.className).not.toContain("pointer-events-none");
  });

  it("アイコン部分も /salesperson/[id] への常時クリック可能なリンクになっている", () => {
    render(<WatchClientShell {...DEFAULT_PROPS} />);
    const iconLink = screen.getByRole("link", { name: "田中太郎のプロフィールを見る" });
    expect(iconLink).toHaveAttribute("href", "/salesperson/sp_001?videoId=vid_001");
  });

  it("salespersonVideo が null のときプロフィール導線を描画しない", () => {
    render(<WatchClientShell {...DEFAULT_PROPS} salespersonVideo={null} />);
    expect(screen.queryByText("プロフィールを見て連絡する")).toBeNull();
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
