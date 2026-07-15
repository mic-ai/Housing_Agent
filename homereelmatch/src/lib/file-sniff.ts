// クライアントが送信する File.type は偽装可能なため、保存前にファイル先頭のマジックバイトで
// 実体を検証する（defense-in-depth）。MIME許可リストの補完であり、代替ではない。

export function looksLikeAllowedVideo(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // WebM/Matroska (EBML header)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return true;
  }

  // ISO base media container (mp4 / mov / quicktime): [size(4)][box type(4)]...
  const boxType = buffer.subarray(4, 8).toString("ascii");
  return ["ftyp", "moov", "free", "mdat", "wide", "skip"].includes(boxType);
}

export function looksLikeAllowedImage(buffer: Buffer, mime: string): boolean {
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mime === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}
