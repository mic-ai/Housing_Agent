import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { SourceViewTracker } from "@/components/tracking/SourceViewTracker";

describe("SourceViewTracker", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("sourceがある場合、mount時にPOST /api/visitor-video-viewsを送信する", () => {
    render(<SourceViewTracker source="entrance" />);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/visitor-video-views",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "entrance", videoId: undefined }),
      })
    );
  });

  it("videoIdも渡された場合はbodyに含める", () => {
    render(<SourceViewTracker source="spot_bath" videoId="vid1" />);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/visitor-video-views",
      expect.objectContaining({
        body: JSON.stringify({ source: "spot_bath", videoId: "vid1" }),
      })
    );
  });

  it("sourceが無い場合は何も送信しない", () => {
    render(<SourceViewTracker videoId="vid1" />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("何も描画しない", () => {
    const { container } = render(<SourceViewTracker source="exit" />);
    expect(container).toBeEmptyDOMElement();
  });
});
