"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { ArticleDetailDTO } from "@/types";
import { ComparisonTable } from "./ComparisonTable";

const markdownComponents: Components = {
  h1: (props) => <h2 className="text-xl font-bold text-stone-900 mt-6 mb-2" {...props} />,
  h2: (props) => <h2 className="text-xl font-bold text-stone-900 mt-6 mb-2" {...props} />,
  h3: (props) => <h3 className="text-lg font-semibold text-stone-900 mt-5 mb-2" {...props} />,
  p: (props) => <p className="text-sm leading-relaxed text-stone-700 mb-3" {...props} />,
  ul: (props) => <ul className="list-disc list-inside text-sm text-stone-700 space-y-1 mb-3" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside text-sm text-stone-700 space-y-1 mb-3" {...props} />,
  strong: (props) => <strong className="font-semibold text-stone-900" {...props} />,
  a: (props) => <a className="text-amber-700 underline" {...props} />,
};

interface ArticleViewerProps {
  article: ArticleDetailDTO;
  prevHref: string | null;
  nextHref: string | null;
  previewMode?: boolean;
}

export function ArticleViewer({ article, prevHref, nextHref, previewMode = false }: ArticleViewerProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleComplete() {
    if (previewMode || submitting) return;
    setSubmitting(true);
    await fetch("/api/viewer/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId: article.id }),
    });
    setSubmitting(false);
    router.push(nextHref ?? "/journey");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {previewMode && (
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1 rounded-full">
          プレビュー表示
        </span>
      )}

      <div>
        <p className="text-xs text-stone-500">{article.estimatedMinutes}分で読めます</p>
        <h1 className="text-2xl font-bold text-stone-900 mt-1">{article.title}</h1>
      </div>

      <div>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={markdownComponents}>
          {article.bodyMarkdown}
        </ReactMarkdown>
      </div>

      {article.translateBoxLabel && article.translateBoxValue && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-700">{article.translateBoxLabel}</p>
          <p className="text-sm text-stone-800 mt-1">{article.translateBoxValue}</p>
        </div>
      )}

      {article.comparisonRows.length > 0 && <ComparisonTable rows={article.comparisonRows} />}

      <div className="flex items-center justify-between pt-4 border-t border-stone-200">
        {prevHref ? (
          <a href={prevHref} className="text-sm text-stone-500 hover:text-stone-700">
            ← 前の記事へ
          </a>
        ) : (
          <span />
        )}
        {!previewMode && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-full transition-colors"
          >
            {submitting ? "送信中..." : "読み終えた（次へ）"}
          </button>
        )}
      </div>
    </div>
  );
}
