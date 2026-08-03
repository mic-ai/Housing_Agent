import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const SYSTEM_PROMPT = `あなたは住宅購入を検討しているユーザー向けに、中立的な立場で学習コンテンツ記事を作成するアシスタントです。

情報収集の方針:
- web_search ツールを使い、まず国土交通省・消費者庁・地方公共団体・独立行政法人などの公的機関のサイトを優先的に検索・参照してください。
- 公的機関の情報だけで十分な内容にならない場合に限り、業界団体や大手メディアなど信頼性の高い情報源も補助的に採用してください。
- 特定の住宅メーカー・工務店の宣伝サイトやアフィリエイト目的のサイトは情報源として採用しないでください。
- 特定の企業やメーカーを推奨・批判するような記述は避け、あくまで一般的な知識として中立的に説明してください。

出力形式:
- 必ず最終回答の末尾に、次の形式のJSONコードブロックを1つだけ出力してください（前置きの文章があっても構いませんが、JSONコードブロックはこの1つのみとしてください）。
\`\`\`json
{
  "title": "記事タイトル（30文字程度）",
  "bodyMarkdown": "本文のMarkdown文字列。600〜1200文字程度。##見出しや箇条書きを使い、専門知識のないユーザーにも分かりやすく",
  "estimatedMinutes": 3,
  "difficulty": "BEGINNER または BASIC のいずれか"
}
\`\`\`
`;

const GeneratedArticleSchema = z.object({
  title: z.string().min(1).max(200),
  bodyMarkdown: z.string().min(1),
  estimatedMinutes: z.number().int().min(1).max(120),
  difficulty: z.enum(["BEGINNER", "BASIC"]),
});

export interface WebScreeningSource {
  url: string;
  title: string | null;
}

export interface GeneratedArticleDraft {
  title: string;
  bodyMarkdown: string;
  estimatedMinutes: number;
  difficulty: "BEGINNER" | "BASIC";
  sources: WebScreeningSource[];
}

export interface GenerateArticleDraftInput {
  phaseTitle: string;
  topic: string;
}

function extractJsonBlock(text: string): unknown {
  const matches = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  const last = matches.at(-1);
  if (!last) {
    throw new Error("応答からJSONブロックを抽出できませんでした");
  }
  return JSON.parse(last[1]);
}

function extractSources(content: Anthropic.Messages.ContentBlock[]): WebScreeningSource[] {
  const sources: WebScreeningSource[] = [];
  const seen = new Set<string>();
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const result = block.content;
    if (!Array.isArray(result)) continue;
    for (const item of result) {
      if (item.type !== "web_search_result") continue;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      sources.push({ url: item.url, title: item.title ?? null });
    }
  }
  return sources;
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function generateArticleDraft(
  input: GenerateArticleDraftInput
): Promise<GeneratedArticleDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    messages: [
      {
        role: "user",
        content: `学習フェーズ「${input.phaseTitle}」向けの記事を作成してください。トピック: ${input.topic}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("リクエストが拒否されました。トピックを見直してください");
  }

  const text = extractText(response.content);
  const parsed = GeneratedArticleSchema.parse(extractJsonBlock(text));
  const sources = extractSources(response.content);

  return { ...parsed, sources };
}
