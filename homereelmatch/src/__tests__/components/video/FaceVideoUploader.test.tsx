import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Import component under test (does not exist yet — Red phase)
import { FaceVideoUploader } from "@/components/video/FaceVideoUploader";

const defaultProps = {
  salespersonId: "sp_001",
  videoId: "vid_001",
  type: "pre" as const,
  onUploadComplete: vi.fn(),
};

describe("FaceVideoUploader", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        salespersonVideoId: "sv_001",
        publicUrl: "https://storage.example.com/pre.mp4",
        durationSec: 3,
        type: "pre",
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("アップロードエリアとファイル選択ボタンが表示される", () => {
    render(<FaceVideoUploader {...defaultProps} />);
    expect(screen.getByText(/ドラッグ|drag/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ファイルを選択|browse/i })).toBeInTheDocument();
  });

  it("mp4ファイルを選択するとアップロードが開始される", async () => {
    render(<FaceVideoUploader {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["video"], "test.mp4", { type: "video/mp4" });
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/face-videos/upload",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("アップロード成功後にonUploadCompleteが呼ばれる", async () => {
    render(<FaceVideoUploader {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["video"], "test.mp4", { type: "video/mp4" });
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith({
        salespersonVideoId: "sv_001",
        publicUrl: "https://storage.example.com/pre.mp4",
        durationSec: 3,
        type: "pre",
      });
    });
  });

  it("アップロード中は進捗インジケーターが表示される", async () => {
    let resolve: (v: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((r) => { resolve = r; }) as Promise<Response>
    );
    render(<FaceVideoUploader {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["video"], "test.mp4", { type: "video/mp4" });
    await userEvent.upload(input, file);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // Resolve the upload
    resolve!({
      ok: true,
      json: async () => ({ salespersonVideoId: "sv_001", publicUrl: "https://x", durationSec: 3, type: "pre" }),
    } as Response);
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
  });

  it("動画以外のファイルはクライアント側でエラー表示する", async () => {
    render(<FaceVideoUploader {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "photo.png", { type: "image/png" });
    // happy-dom の accept フィルタを回避するため fireEvent.change を使用
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);

    expect(await screen.findByText(/動画ファイル|video file/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("サーバーエラー時にエラーメッセージを表示する", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Duration exceeds 10 seconds" }),
    });
    render(<FaceVideoUploader {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["video"], "test.mp4", { type: "video/mp4" });
    await userEvent.upload(input, file);

    expect(await screen.findByText(/Duration exceeds 10 seconds/i)).toBeInTheDocument();
  });

  it("既存のpublicUrlがある場合はプレビューを表示する", () => {
    render(
      <FaceVideoUploader
        {...defaultProps}
        currentPublicUrl="https://storage.example.com/existing.mp4"
      />
    );
    const video = screen.getByRole("video") as HTMLVideoElement;
    expect(video.src).toContain("https://storage.example.com/existing.mp4");
  });

  it("ドラッグ&ドロップでファイルをアップロードできる", async () => {
    render(<FaceVideoUploader {...defaultProps} />);
    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["video"], "drag.mp4", { type: "video/mp4" });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
