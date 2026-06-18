import type { Metadata } from "next";
import Link from "next/link";
import { EmbedDemoClient } from "@/components/embed/EmbedDemoClient";

export const metadata: Metadata = {
  title: "埋め込みウィジェット — HomeReelMatch",
  description: "住宅展示場ポータルサイトに動画ウィジェットを埋め込む方法",
};

export default function EmbedDemoPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white">
            <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-xs font-bold">
              H
            </div>
            <span className="font-semibold text-sm">HomeReelMatch</span>
          </Link>
          <span className="text-stone-400 text-sm">Embed Widget</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-amber-300 text-xs font-medium">パートナー向け</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            埋め込みウィジェット
          </h1>
          <p className="text-stone-400 leading-relaxed max-w-2xl">
            住宅展示場ポータルサイトに HomeReelMatch の動画フィードを埋め込めます。
            スクリプトタグ1行で設置でき、Shadow DOM で隔離されているため既存デザインに影響しません。
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              ),
              title: "2行で設置",
              desc: "script タグと div タグのみ。ライブラリ依存ゼロ。",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: "スタイル隔離",
              desc: "Shadow DOM でホストサイトの CSS と完全分離。",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
              ),
              title: "タグ絞り込み",
              desc: "data-tag でハッシュタグ別に表示する動画を絞り込めます。",
            },
          ].map((f) => (
            <div key={f.title} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <p className="text-white text-sm font-semibold mb-1">{f.title}</p>
              <p className="text-stone-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Client section: live demo + code snippets */}
        <EmbedDemoClient appUrl={appUrl} />
      </div>
    </main>
  );
}
