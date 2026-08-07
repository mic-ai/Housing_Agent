export interface WebScreeningSource {
  url: string;
  title: string | null;
}

// beta/非betaいずれのレスポンス content 配列とも構造的に互換な最小限の型
// (Anthropic.Messages.ContentBlock[] と Anthropic.Beta.Messages.BetaContentBlock[] の両方を受け付ける)
export interface ContentBlockLike {
  type: string;
  text?: string;
  content?: unknown;
}

export function extractJsonBlock(text: string): unknown {
  const matches = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  const last = matches.at(-1);
  if (!last) {
    throw new Error("応答からJSONブロックを抽出できませんでした");
  }
  return JSON.parse(last[1]);
}

export function extractSources(content: ContentBlockLike[]): WebScreeningSource[] {
  const sources: WebScreeningSource[] = [];
  const seen = new Set<string>();
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const result = block.content;
    if (!Array.isArray(result)) continue;
    for (const item of result) {
      if (item?.type !== "web_search_result") continue;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      sources.push({ url: item.url, title: item.title ?? null });
    }
  }
  return sources;
}

export function extractText(content: ContentBlockLike[]): string {
  return content
    .filter((block): block is ContentBlockLike & { text: string } => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}
