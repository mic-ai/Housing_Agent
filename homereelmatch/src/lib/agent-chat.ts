import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { extractJsonBlock, extractText } from "./anthropic-web-search";
import { AgentConditionsSchema, type AgentConditions } from "./agent-conditions";

export interface AgentChatHistoryTurn {
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface AgentKnowledgeContextItem {
  id: string;
  title: string;
  bodyMarkdown: string;
  category: string;
}

export interface AgentCandidateHouseMakerItem {
  id: string;
  name: string;
}

export interface AgentChatTurnInput {
  history: AgentChatHistoryTurn[];
  userMessage: string;
  knowledgeContext: AgentKnowledgeContextItem[];
  candidateHouseMakers: AgentCandidateHouseMakerItem[];
  priorConditions: AgentConditions | null;
}

const AgentChatTurnResponseSchema = z.object({
  replyText: z.string().min(1),
  updatedConditions: AgentConditionsSchema,
  candidateHouseMakerIds: z.array(z.string()).max(10).default([]),
  referencedKnowledgeIds: z.array(z.string()).max(10).default([]),
});

export interface AgentChatTurnResult {
  replyText: string;
  updatedConditions: AgentConditions;
  candidateHouseMakerIds: string[];
  referencedKnowledgeIds: string[];
}

function buildSystemPrompt(
  candidateHouseMakers: AgentCandidateHouseMakerItem[],
  knowledgeContext: AgentKnowledgeContextItem[]
): string {
  const candidateList =
    candidateHouseMakers.map((c) => `- id: ${c.id}, 企業名: ${c.name}`).join("\n") ||
    "(現時点で該当する候補はありません)";
  const knowledgeList =
    knowledgeContext
      .map((k) => `- id: ${k.id}, タイトル: ${k.title}\n${k.bodyMarkdown}`)
      .join("\n\n") || "(参考ナレッジは未登録です)";

  return `あなたは「中立的住宅購入AIエージェント」です。住宅購入を検討しているユーザーの相談に、中立的な立場でチャット形式で応答します。

厳守事項(最重要・絶対に違反しないこと):
1. 住宅メーカー・工務店の具体名を推薦・提示してよいのは、以下の「候補企業リスト」に列挙された企業のみです。リストに無い企業名を一切出力してはいけません(ユーザーが実在の他社名を挙げて尋ねてきた場合も、その会社を評価・比較・推薦する発言をしてはいけません。「このサービスでは確認できる情報がない」旨を伝え、一般的な検討観点の説明に留めてください)。
2. 候補企業リストの並び順・出展の有無は一切の判断材料にしないでください。推薦順位・言及順は、ユーザーの発言から読み取れる条件との適合度のみで決定してください。
3. 「工法」「価格帯」「検討ポイント」等の一般知識を説明する際は、以下の「参考ナレッジ」の内容のみを根拠にしてください。ナレッジに無い一般知識を独自に生成しないでください。
4. あなたはAIによる一般的な参考情報の提供者であり、宅地建物取引業法上の媒介(仲介)行為は行いません。契約・購入の最終判断はユーザー自身と有資格の専門家に委ねる旨を、初回の応答および具体的な企業を提示する応答では必ず一言添えてください。
5. 特定の企業を強く推す・煽るような表現は避け、条件と根拠を淡々と提示してください。

候補企業リスト(この中からのみ推薦可):
${candidateList}

参考ナレッジ(この中の情報のみを一般知識の根拠として使用可):
${knowledgeList}

出力形式:
必ず最終回答の末尾に、次の形式のJSONコードブロックを1つだけ出力してください。replyTextはユーザーに表示する自然な日本語の返信文(Markdown不可、プレーンテキスト)です。
\`\`\`json
{
  "replyText": "ユーザーへの返信文",
  "updatedConditions": {
    "budgetRangeTag": "string または null",
    "areaPreference": "string または null",
    "familyComposition": "string または null",
    "timing": "string または null",
    "constructionMethodTag": "string または null",
    "priorityFactors": ["string", "..."],
    "desiredTags": ["string", "..."]
  },
  "candidateHouseMakerIds": ["候補企業リストのidのみ"],
  "referencedKnowledgeIds": ["参考ナレッジのidのみ"]
}
\`\`\`
`;
}

export async function generateAgentChatTurn(
  input: AgentChatTurnInput
): Promise<AgentChatTurnResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const client = new Anthropic({ apiKey });

  const priorConditionsNote = input.priorConditions
    ? `直近までに把握している条件: ${JSON.stringify(input.priorConditions)}\n\n`
    : "";

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    ...input.history.map((turn) => ({
      role: turn.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: turn.content,
    })),
    {
      role: "user",
      content: `${priorConditionsNote}${input.userMessage}`,
    },
  ];

  const response = await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // 対話のレイテンシを抑えるため、思考の深さをmediumに抑える(モデルの切り替え・思考の無効化はしない)
    output_config: { effort: "medium" },
    system: buildSystemPrompt(input.candidateHouseMakers, input.knowledgeContext),
    messages,
  });

  if (response.stop_reason === "refusal") {
    throw new Error("リクエストが拒否されました");
  }

  const text = extractText(response.content);
  const parsed = AgentChatTurnResponseSchema.parse(extractJsonBlock(text));

  return parsed;
}
