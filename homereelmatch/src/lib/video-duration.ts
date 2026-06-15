import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

export async function getVideoDurationSec(buffer: Buffer, ext: string): Promise<number> {
  const tmpPath = join(tmpdir(), `hrm-${randomUUID()}.${ext}`);
  try {
    await writeFile(tmpPath, buffer);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      tmpPath,
    ]);
    const info = JSON.parse(stdout) as { streams: { duration?: string }[] };
    const durationStr = info.streams.find((s) => s.duration)?.duration;
    if (!durationStr) throw new Error("Could not determine video duration");
    return parseFloat(durationStr);
  } finally {
    await unlink(tmpPath).catch(() => void 0);
  }
}
