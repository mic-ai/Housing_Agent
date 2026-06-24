import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

async function getFfprobePath(): Promise<string> {
  const { path } = await import("@ffprobe-installer/ffprobe");
  return path;
}

// ffprobe が使えない環境（Vercel 等）では null を返す
export async function getVideoDurationSec(buffer: Buffer, ext: string): Promise<number | null> {
  let ffprobePath: string;
  try {
    ffprobePath = await getFfprobePath();
  } catch {
    console.error("[video-duration] ffprobe path resolution failed — skipping duration check");
    return null;
  }

  const tmpPath = join(tmpdir(), `hrm-${randomUUID()}.${ext}`);
  try {
    await writeFile(tmpPath, buffer);
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      tmpPath,
    ]);
    const info = JSON.parse(stdout) as { streams: { duration?: string }[] };
    const durationStr = info.streams.find((s) => s.duration)?.duration;
    if (!durationStr) {
      console.error("[video-duration] ffprobe returned no duration");
      return null;
    }
    return parseFloat(durationStr);
  } catch (err) {
    console.error("[video-duration] ffprobe execution failed:", err);
    return null;
  } finally {
    await unlink(tmpPath).catch(() => void 0);
  }
}
