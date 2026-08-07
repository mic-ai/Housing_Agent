import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewerToken, ensureViewerProfile } from "@/lib/viewer";
import { AgentConditionsSchema } from "@/lib/agent-conditions";
import { findCandidateHouseMakers } from "@/lib/agent-candidates";
import { generateAgentChatTurn, type AgentChatHistoryTurn } from "@/lib/agent-chat";
import type { AgentMessageDTO } from "@/types";

export const maxDuration = 60;

const BodySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
});

const QuerySchema = z.object({
  conversationId: z.string(),
});

function toMessageDTO(
  message: {
    id: string;
    role: "USER" | "ASSISTANT";
    content: string;
    candidateHouseMakerIds: unknown;
    referencedKnowledgeIds: unknown;
    createdAt: Date;
  },
  houseMakerMap: Map<string, { id: string; name: string; logoUrl: string | null }>,
  knowledgeMap: Map<string, { id: string; title: string }>
): AgentMessageDTO {
  const candidateIds = Array.isArray(message.candidateHouseMakerIds)
    ? (message.candidateHouseMakerIds as string[])
    : [];
  const knowledgeIds = Array.isArray(message.referencedKnowledgeIds)
    ? (message.referencedKnowledgeIds as string[])
    : [];

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    candidates: candidateIds.map((id) => houseMakerMap.get(id)).filter((v) => v !== undefined),
    referencedKnowledge: knowledgeIds
      .map((id) => knowledgeMap.get(id))
      .filter((v) => v !== undefined),
    createdAt: message.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const viewerToken = await getViewerToken();
    if (!viewerToken) {
      return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });
    }

    const viewer = await prisma.viewerProfile.findUnique({ where: { viewerToken } });
    if (!viewer) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const conversation = await prisma.agentConversation.findUnique({
      where: { id: query.conversationId },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (conversation.viewerId !== viewer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.agentMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });

    const houseMakerMap = await buildHouseMakerMap(messages);
    const knowledgeMap = await buildKnowledgeMap(messages);

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        conditions: conversation.conditionsJson,
        messages: messages.map((m) => toMessageDTO(m, houseMakerMap, knowledgeMap)),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = BodySchema.parse(await request.json());
    const viewerToken = await getViewerToken();
    if (!viewerToken) {
      return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });
    }

    const viewer = await ensureViewerProfile(viewerToken);

    let conversation;
    if (body.conversationId) {
      conversation = await prisma.agentConversation.findUnique({
        where: { id: body.conversationId },
      });
      if (!conversation) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }
      if (conversation.viewerId !== viewer.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      conversation = await prisma.agentConversation.create({ data: { viewerId: viewer.id } });
    }

    const historyRows = await prisma.agentMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
    const history: AgentChatHistoryTurn[] = historyRows.map((h) => ({
      role: h.role,
      content: h.content,
    }));

    await prisma.agentMessage.create({
      data: { conversationId: conversation.id, role: "USER", content: body.message },
    });

    const priorConditions = conversation.conditionsJson
      ? AgentConditionsSchema.parse(conversation.conditionsJson)
      : null;

    const knowledgeContext = await prisma.agentKnowledgeEntry.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, bodyMarkdown: true, category: true },
    });

    const candidateHouseMakers = await findCandidateHouseMakers(
      priorConditions ?? { priorityFactors: [], desiredTags: [] }
    );

    const result = await generateAgentChatTurn({
      history,
      userMessage: body.message,
      knowledgeContext,
      candidateHouseMakers,
      priorConditions,
    });

    // 安全検証: LLM出力を無条件に信頼しない。DBに実在・有効なIDのみを採用する。
    const rawMakerIds = [...new Set(result.candidateHouseMakerIds)];
    const verifiedMakers = rawMakerIds.length
      ? await prisma.houseMaker.findMany({
          where: { id: { in: rawMakerIds }, isActive: true },
          select: { id: true, name: true, logoUrl: true },
        })
      : [];
    if (verifiedMakers.length !== rawMakerIds.length) {
      console.error("agent: model returned houseMakerIds not found/inactive", {
        requested: rawMakerIds,
        verified: verifiedMakers.map((m) => m.id),
      });
    }

    const rawKnowledgeIds = [...new Set(result.referencedKnowledgeIds)];
    const verifiedKnowledge = knowledgeContext.filter((k) => rawKnowledgeIds.includes(k.id));

    const assistantMessage = await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: result.replyText,
        candidateHouseMakerIds: verifiedMakers.map((m) => m.id),
        referencedKnowledgeIds: verifiedKnowledge.map((k) => k.id),
      },
    });

    await prisma.agentConversation.update({
      where: { id: conversation.id },
      data: { conditionsJson: result.updatedConditions },
    });

    const houseMakerMap = new Map(verifiedMakers.map((m) => [m.id, m]));
    const knowledgeMap = new Map(verifiedKnowledge.map((k) => [k.id, { id: k.id, title: k.title }]));

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        message: toMessageDTO(assistantMessage, houseMakerMap, knowledgeMap),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function buildHouseMakerMap(
  messages: { candidateHouseMakerIds: unknown }[]
): Promise<Map<string, { id: string; name: string; logoUrl: string | null }>> {
  const ids = new Set<string>();
  for (const m of messages) {
    if (Array.isArray(m.candidateHouseMakerIds)) {
      for (const id of m.candidateHouseMakerIds as string[]) ids.add(id);
    }
  }
  if (ids.size === 0) return new Map();
  const makers = await prisma.houseMaker.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true, logoUrl: true },
  });
  return new Map(makers.map((m) => [m.id, m]));
}

async function buildKnowledgeMap(
  messages: { referencedKnowledgeIds: unknown }[]
): Promise<Map<string, { id: string; title: string }>> {
  const ids = new Set<string>();
  for (const m of messages) {
    if (Array.isArray(m.referencedKnowledgeIds)) {
      for (const id of m.referencedKnowledgeIds as string[]) ids.add(id);
    }
  }
  if (ids.size === 0) return new Map();
  const entries = await prisma.agentKnowledgeEntry.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, title: true },
  });
  return new Map(entries.map((e) => [e.id, e]));
}
