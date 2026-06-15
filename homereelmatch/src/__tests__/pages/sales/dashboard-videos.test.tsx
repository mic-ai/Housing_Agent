import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// These components/pages do not exist yet — Red phase
import { VideoListClient } from "@/components/sales/VideoListClient";

const VIDEOS = [
  {
    id: "vid_001",
    title: "モデルハウス紹介①",
    platform: "YOUTUBE" as const,
    thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    viewCount: 120,
    isActive: true,
    hashtags: [{ id: "h1", tagName: "新築", usageCount: 5 }],
    salespersonVideoCount: 2,
  },
  {
    id: "vid_002",
    title: "土地情報案内",
    platform: "INSTAGRAM" as const,
    thumbnailUrl: null,
    viewCount: 45,
    isActive: false,
    hashtags: [],
    salespersonVideoCount: 0,
  },
];

describe("VideoListClient (営業マン動画管理)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("動画一覧が表示される", () => {
    render(<VideoListClient videos={VIDEOS} salespersonId="sp_001" />);
    expect(screen.getByText("モデルハウス紹介①")).toBeInTheDocument();
    expect(screen.getByText("土地情報案内")).toBeInTheDocument();
  });

  it("各動画に顔出し動画設定リンクが表示される", () => {
    render(<VideoListClient videos={VIDEOS} salespersonId="sp_001" />);
    const editLinks = screen.getAllByRole("link", { name: /顔出し設定|編集/i });
    expect(editLinks.length).toBe(2);
  });

  it("視聴数が表示される", () => {
    render(<VideoListClient videos={VIDEOS} salespersonId="sp_001" />);
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it("非公開動画はバッジで区別される", () => {
    render(<VideoListClient videos={VIDEOS} salespersonId="sp_001" />);
    expect(screen.getByText(/非公開|inactive/i)).toBeInTheDocument();
  });

  it("動画がない場合は空状態メッセージを表示する", () => {
    render(<VideoListClient videos={[]} salespersonId="sp_001" />);
    expect(screen.getByText(/動画がありません|no videos/i)).toBeInTheDocument();
  });
});
