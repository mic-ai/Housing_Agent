import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateAgentChatTurn } from "@/lib/agent-chat";
import { findCandidateHouseMakers } from "@/lib/agent-candidates";
import { GET, POST } from "@/app/api/agent/messages/route";

vi.mock("@/lib/agent-chat", () => ({
  generateAgentChatTurn: vi.fn(),
}));

vi.mock("@/lib/agent-candidates", () => ({
  findCandidateHouseMakers: vi.fn().mockResolvedValue([]),
}));

function mockCookie(value: string | undefined) {
  vi.mocked(cookies).mockReturnValue({
    get: vi.fn(() => (value ? { value } : undefined)),
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

function makePostReq(body: object) {
  return new NextRequest("http://localhost/api/agent/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetReq(qs: string) {
  return new NextRequest(`http://localhost/api/agent/messages${qs}`);
}

const baseAssistantResult = {
  replyText: "ご相談ありがとうございます。",
  updatedConditions: { priorityFactors: [], desiredTags: [] },
  candidateHouseMakerIds: [],
  referencedKnowledgeIds: [],
};

describe("POST /api/agent/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findCandidateHouseMakers).mockResolvedValue([]);
    vi.mocked(prisma.agentKnowledgeEntry.findMany).mockResolvedValue([]);
    vi.mocked(prisma.agentMessage.findMany).mockResolvedValue([]);
    vi.mocked(prisma.agentMessage.create).mockResolvedValue({
      id: "msg1",
      role: "ASSISTANT",
      content: "reply",
      candidateHouseMakerIds: [],
      referencedKnowledgeIds: [],
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.agentConversation.update).mockResolvedValue({} as never);
  });

  it("viewerToken Cookieが無い場合は400を返す", async () => {
    mockCookie(undefined);
    const res = await POST(makePostReq({ message: "こんにちは" }));
    expect(res.status).toBe(400);
  });

  it("空メッセージは400を返す", async () => {
    mockCookie("token-abc");
    const res = await POST(makePostReq({ message: "" }));
    expect(res.status).toBe(400);
  });

  it("conversationId未指定の場合は新規会話を作成する", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "viewer1" } as never);
    vi.mocked(prisma.agentConversation.create).mockResolvedValue({
      id: "conv-new",
      viewerId: "viewer1",
      conditionsJson: null,
    } as never);
    vi.mocked(generateAgentChatTurn).mockResolvedValue(baseAssistantResult);
    vi.mocked(prisma.houseMaker.findMany).mockResolvedValue([]);

    const res = await POST(makePostReq({ message: "こんにちは" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.conversationId).toBe("conv-new");
    expect(prisma.agentConversation.create).toHaveBeenCalledWith({ data: { viewerId: "viewer1" } });
  });

  it("他のviewerが所有するconversationIdを指定すると403を返す(IDOR対策)", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "viewer1" } as never);
    vi.mocked(prisma.agentConversation.findUnique).mockResolvedValue({
      id: "conv-other",
      viewerId: "someone-else",
      conditionsJson: null,
    } as never);

    const res = await POST(makePostReq({ conversationId: "conv-other", message: "こんにちは" }));
    expect(res.status).toBe(403);
  });

  it("存在しないconversationIdは404を返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "viewer1" } as never);
    vi.mocked(prisma.agentConversation.findUnique).mockResolvedValue(null);

    const res = await POST(makePostReq({ conversationId: "conv-missing", message: "こんにちは" }));
    expect(res.status).toBe(404);
  });

  it("LLMが返したcandidateHouseMakerIdsのうちDBに実在しないIDは除外される(安全検証の核心)", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "viewer1" } as never);
    vi.mocked(prisma.agentConversation.create).mockResolvedValue({
      id: "conv-new",
      viewerId: "viewer1",
      conditionsJson: null,
    } as never);
    vi.mocked(generateAgentChatTurn).mockResolvedValue({
      ...baseAssistantResult,
      candidateHouseMakerIds: ["hm-real", "hm-hallucinated"],
    });
    // DBには hm-real のみ実在(hm-hallucinatedは存在しない/非アクティブという想定)
    vi.mocked(prisma.houseMaker.findMany).mockResolvedValue([
      { id: "hm-real", name: "実在企業", logoUrl: null },
    ] as never);
    vi.mocked(prisma.agentMessage.create).mockResolvedValue({
      id: "msg1",
      role: "ASSISTANT",
      content: "reply",
      candidateHouseMakerIds: ["hm-real"],
      referencedKnowledgeIds: [],
      createdAt: new Date(),
    } as never);

    const res = await POST(makePostReq({ message: "サンプルハウスについて教えて" }));
    expect(res.status).toBe(200);

    // calls[0] はユーザーメッセージ保存、calls[1] がアシスタントメッセージ保存
    const createCall = vi.mocked(prisma.agentMessage.create).mock.calls[1][0] as unknown as {
      data: { candidateHouseMakerIds: string[] };
    };
    expect(createCall.data.candidateHouseMakerIds).toEqual(["hm-real"]);

    const body = await res.json();
    expect(body.data.message.candidates.map((c: { id: string }) => c.id)).toEqual(["hm-real"]);
  });

  it("LLMが返したreferencedKnowledgeIdsのうちPUBLISHEDでないIDは除外される", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "viewer1" } as never);
    vi.mocked(prisma.agentConversation.create).mockResolvedValue({
      id: "conv-new",
      viewerId: "viewer1",
      conditionsJson: null,
    } as never);
    vi.mocked(prisma.agentKnowledgeEntry.findMany).mockResolvedValue([
      { id: "kn-real", title: "実在ナレッジ", bodyMarkdown: "本文", category: "工法" },
    ] as never);
    vi.mocked(generateAgentChatTurn).mockResolvedValue({
      ...baseAssistantResult,
      referencedKnowledgeIds: ["kn-real", "kn-hallucinated"],
    });
    vi.mocked(prisma.houseMaker.findMany).mockResolvedValue([]);
    vi.mocked(prisma.agentMessage.create).mockResolvedValue({
      id: "msg1",
      role: "ASSISTANT",
      content: "reply",
      candidateHouseMakerIds: [],
      referencedKnowledgeIds: ["kn-real"],
      createdAt: new Date(),
    } as never);

    await POST(makePostReq({ message: "工法について教えて" }));

    const createCall = vi.mocked(prisma.agentMessage.create).mock.calls[1][0] as unknown as {
      data: { referencedKnowledgeIds: string[] };
    };
    expect(createCall.data.referencedKnowledgeIds).toEqual(["kn-real"]);
  });

  it("生成処理が失敗した場合500を返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.upsert).mockResolvedValue({ id: "viewer1" } as never);
    vi.mocked(prisma.agentConversation.create).mockResolvedValue({
      id: "conv-new",
      viewerId: "viewer1",
      conditionsJson: null,
    } as never);
    vi.mocked(generateAgentChatTurn).mockRejectedValue(new Error("リクエストが拒否されました"));

    const res = await POST(makePostReq({ message: "こんにちは" }));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/agent/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("viewerToken Cookieが無い場合は400を返す", async () => {
    mockCookie(undefined);
    const res = await GET(makeGetReq("?conversationId=conv1"));
    expect(res.status).toBe(400);
  });

  it("ViewerProfileが存在しない場合は404を返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.findUnique).mockResolvedValue(null);
    const res = await GET(makeGetReq("?conversationId=conv1"));
    expect(res.status).toBe(404);
  });

  it("他のviewerが所有するconversationIdは403を返す", async () => {
    mockCookie("token-abc");
    vi.mocked(prisma.viewerProfile.findUnique).mockResolvedValue({ id: "viewer1" } as never);
    vi.mocked(prisma.agentConversation.findUnique).mockResolvedValue({
      id: "conv1",
      viewerId: "someone-else",
      conditionsJson: null,
    } as never);
    const res = await GET(makeGetReq("?conversationId=conv1"));
    expect(res.status).toBe(403);
  });
});
