"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface VisitorLinkQrProps {
  url: string;
}

// 受付チェックイン完了後に一度だけ表示するscan-to-link用QR。
// 来場者自身のスマホでこれをスキャンしてもらうことで、以降のQRスキャン(ブース・設備前・出口)を
// 今回のVisitorレコードに紐付けられるようにする。
export function VisitorLinkQr({ url }: VisitorLinkQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 200 })
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) {
    return (
      <div
        className="w-[200px] h-[200px] rounded-lg bg-stone-100 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URLをそのまま表示するためnext/imageは不要
    <img
      src={dataUrl}
      alt="このQRコードをご自身のスマートフォンでスキャンしてください"
      width={200}
      height={200}
      className="rounded-lg border border-stone-200"
    />
  );
}
