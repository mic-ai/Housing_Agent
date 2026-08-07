import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { extractJsonBlock, extractSources, extractText, type WebScreeningSource } from "./anthropic-web-search";

const SYSTEM_PROMPT = `あなたは中立的な住宅購入AIエージェントが参照する「一般知識ナレッジベース」の下書きを作成するアシスタントです。
このナレッジベースは、特定の住宅メーカー・工務店を推薦するAIチャットの回答文に直接引用されます。

情報収集の方針:
- web_search ツールを使い、国土交通省・消費者庁・地方公共団体・独立行政法人などの公的機関のサイトを優先的に検索・参照してください。
- 公的機関の情報だけで十分な内容にならない場合に限り、業界団体や大手メディアなど信頼性の高い情報源を補助的に採用してください。
- 特定の住宅メーカー・工務店の宣伝サイトやアフィリエイト目的のサイトは情報源として採用しないでください。

厳守事項(最重要):
- 本文中に実在する特定の住宅メーカー・工務店・ハウスメーカーの固有名詞を一切含めないでください(肯定的・否定的な言及を問わず、事実列挙であっても不可)。
- 工法・価格帯・検討ポイント等は、あくまで一般的・抽象的な知識として説明してください(例:「木造軸組工法は…」は可、「〇〇ハウスの木造軸組工法は…」は不可)。
- 出展の有無や特定企業の商品を比較・優劣づけする記述は行わないでください。

出力形式:
- 必ず最終回答の末尾に、次の形式のJSONコードブロックを1つだけ出力してください(前置きの文章があっても構いませんが、JSONコードブロックはこの1つのみとしてください)。
\`\`\`json
{
  "title": "ナレッジ見出し(30文字程度)",
  "bodyMarkdown": "本文のMarkdown文字列。400〜900文字程度。##見出しや箇条書きを使い、専門知識のないユーザーにも分かりやすく"
}
\`\`\`
`;

const GeneratedKnowledgeSchema = z.object({
  title: z.string().min(1).max(200),
  bodyMarkdown: z.string().min(1),
});

export interface GeneratedKnowledgeDraft {
  title: string;
  bodyMarkdown: string;
  sources: WebScreeningSource[];
}

export interface GenerateKnowledgeDraftInput {
  topic: string;
  category: string;
}

export async function generateKnowledgeDraft(
  input: GenerateKnowledgeDraftInput
): Promise<GeneratedKnowledgeDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 6000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    messages: [
      {
        role: "user",
        content: `カテゴリ「${input.category}」向けのナレッジ下書きを作成してください。トピック: ${input.topic}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("リクエストが拒否されました。トピックを見直してください");
  }

  const text = extractText(response.content);
  const parsed = GeneratedKnowledgeSchema.parse(extractJsonBlock(text));
  const sources = extractSources(response.content);

  return { ...parsed, sources };
}
