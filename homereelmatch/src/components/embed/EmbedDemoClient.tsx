"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";

interface EmbedDemoClientProps {
  appUrl: string;
}

const SNIPPET_TAG = (appUrl: string) =>
  `<!-- 1. ウィジェットスクリプトを読み込む -->
<script src="${appUrl}/embed.js" defer></script>

<!-- 2. 表示したい場所にタグを置く -->
<div
  data-homereelmatch
  data-api-url="${appUrl}"
  data-count="5"
></div>`;

const SNIPPET_TAG_FILTERED = (appUrl: string) =>
  `<div
  data-homereelmatch
  data-api-url="${appUrl}"
  data-count="6"
  data-tag="新築"
></div>`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-3 right-3 flex items-center gap-1.5 bg-stone-700 hover:bg-stone-600 active:bg-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded-md transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          コピー済み
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          コピー
        </>
      )}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-stone-900 border border-stone-700 rounded-xl p-4 pr-24 overflow-x-auto text-sm text-stone-200 leading-relaxed">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

export function EmbedDemoClient({ appUrl }: EmbedDemoClientProps) {
  const demoContainerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // After script loads, manually init the demo container (auto-init already ran before our ref mounted)
  useEffect(() => {
    if (!scriptLoaded || !demoContainerRef.current) return;
    const win = window as Window & {
      HomeReelMatchWidget?: new (opts: {
        container: HTMLElement;
        apiUrl: string;
        count?: number;
      }) => { render(): Promise<void> };
    };
    if (!win.HomeReelMatchWidget) return;
    const widget = new win.HomeReelMatchWidget({
      container: demoContainerRef.current,
      apiUrl: appUrl,
      count: 5,
    });
    widget.render();
  }, [scriptLoaded, appUrl]);

  return (
    <>
      <Script
        src="/embed.js"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />

      {/* ── Live Demo ── */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-white mb-2">ライブデモ</h2>
        <p className="text-stone-400 text-sm mb-6">
          以下は外部ポータルサイトへの埋め込みイメージです。Shadow DOM で隔離されているため、ホストサイトのスタイルに干渉しません。
        </p>

        {/* Simulated external site */}
        <div className="rounded-2xl border border-stone-700 overflow-hidden">
          {/* Fake browser chrome */}
          <div className="bg-stone-800 px-4 py-3 flex items-center gap-2 border-b border-stone-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 mx-4 bg-stone-700 rounded-md px-3 py-1 text-stone-400 text-xs">
              https://portal.example.com/housing
            </div>
          </div>

          {/* Fake portal page content */}
          <div className="bg-white p-6">
            <p className="text-gray-800 font-bold text-lg mb-1">住宅展示場ポータル</p>
            <p className="text-gray-500 text-sm mb-5">
              最新の住宅動画をご覧ください。各動画をクリックすると担当者に直接お問い合わせできます。
            </p>
            {/* Widget mount point */}
            <div ref={demoContainerRef} className="min-h-[280px]">
              {!scriptLoaded && (
                <div className="flex items-center justify-center h-64 gap-2 text-gray-400 text-sm">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  ウィジェットを読み込み中...
                </div>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-4 text-right">Powered by HomeReelMatch</p>
          </div>
        </div>
      </section>

      {/* ── Installation ── */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-white mb-2">インストール方法</h2>
        <p className="text-stone-400 text-sm mb-6">
          HTMLに2行追加するだけで動画ウィジェットを設置できます。
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-stone-300 text-sm font-medium mb-2">基本設置</h3>
            <CodeBlock code={SNIPPET_TAG(appUrl)} />
          </div>

          <div>
            <h3 className="text-stone-300 text-sm font-medium mb-2">タグで絞り込み</h3>
            <CodeBlock code={SNIPPET_TAG_FILTERED(appUrl)} />
          </div>
        </div>
      </section>

      {/* ── Options ── */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">オプション一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left py-2 pr-6 text-stone-400 font-medium">属性</th>
                <th className="text-left py-2 pr-6 text-stone-400 font-medium">必須</th>
                <th className="text-left py-2 pr-6 text-stone-400 font-medium">デフォルト</th>
                <th className="text-left py-2 text-stone-400 font-medium">説明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {[
                { attr: "data-api-url", required: "必須", def: "—", desc: "HomeReelMatch のホスト URL" },
                { attr: "data-count", required: "任意", def: "5", desc: "表示する動画数（1〜10）" },
                { attr: "data-tag", required: "任意", def: "—", desc: "絞り込むハッシュタグ名" },
              ].map((row) => (
                <tr key={row.attr}>
                  <td className="py-3 pr-6">
                    <code className="bg-stone-800 text-amber-300 px-1.5 py-0.5 rounded text-xs">{row.attr}</code>
                  </td>
                  <td className="py-3 pr-6 text-stone-400">{row.required}</td>
                  <td className="py-3 pr-6 text-stone-400">{row.def}</td>
                  <td className="py-3 text-stone-300">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
