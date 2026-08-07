import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { downloadKnowledgeSourceFile } from "@/lib/storage";

vi.mock("@/lib/agent-knowledge", () => ({
  generateKnowledgeDraftFromSources: vi.fn(),
}));

import { generateKnowledgeDraftFromSources } from "@/lib/agent-knowledge";
import { crawlAndRegenerateKnowledgeGroup, KnowledgeCrawlValidationError } from "@/lib/agent-knowledge-crawl";

const DRAFT = { title: "見積書の見方", bodyMarkdown: "## 概要\n見積書には..." };

describe("crawlAndRegenerateKnowledgeGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateKnowledgeDraftFromSources).mockResolvedValue(DRAFT);
    vi.mocked(prisma.agentKnowledgeSourceGroup.update).mockResolvedValue({} as never);
  });

  it("グループが存在しない場合はKnowledgeCrawlValidationErrorを投げる", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue(null);
    await expect(crawlAndRegenerateKnowledgeGroup("missing")).rejects.toThrow(KnowledgeCrawlValidationError);
  });

  it("ソースが0件の場合はKnowledgeCrawlValidationErrorを投げる", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({
      id: "g1",
      topic: "t",
      category: "工法",
      entryId: null,
      sources: [],
    } as never);
    await expect(crawlAndRegenerateKnowledgeGroup("g1")).rejects.toThrow(KnowledgeCrawlValidationError);
  });

  it("entry未リンク時は新規のAgentKnowledgeEntryをDRAFTで作成し、グループのentryIdを更新する", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({
      id: "g1",
      topic: "見積書の見方",
      category: "検討ポイント",
      entryId: null,
      sources: [
        { id: "s1", sourceType: "URL", url: "https://www.mlit.go.jp/x", storagePath: null, publicUrl: null, fileName: null, title: "国交省" },
      ],
    } as never);
    vi.mocked(prisma.agentKnowledgeEntry.create).mockResolvedValue({ id: "kn_new" } as never);

    const result = await crawlAndRegenerateKnowledgeGroup("g1");

    expect(result).toEqual({ entryId: "kn_new", status: "DRAFT" });
    expect(prisma.agentKnowledgeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "見積書の見方",
          category: "検討ポイント",
          title: DRAFT.title,
          bodyMarkdown: DRAFT.bodyMarkdown,
          status: "DRAFT",
          sources: { create: [{ url: "https://www.mlit.go.jp/x", title: "国交省" }] },
        }),
      })
    );
    expect(prisma.agentKnowledgeSourceGroup.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { entryId: "kn_new" },
    });
    expect(prisma.agentKnowledgeSourceGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "g1" }, data: { lastCrawledAt: expect.any(Date) } })
    );
  });

  it("PUBLISHED済みentryへの再生成でも旧引用を削除し必ずstatus:DRAFTで上書きする", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({
      id: "g1",
      topic: "見積書の見方",
      category: "検討ポイント",
      entryId: "kn_existing",
      sources: [
        { id: "s1", sourceType: "URL", url: "https://www.mlit.go.jp/x", storagePath: null, publicUrl: null, fileName: null, title: null },
      ],
    } as never);
    vi.mocked(prisma.agentKnowledgeSource.deleteMany).mockResolvedValue({ count: 3 } as never);
    vi.mocked(prisma.agentKnowledgeEntry.update).mockResolvedValue({ id: "kn_existing", status: "DRAFT" } as never);

    const result = await crawlAndRegenerateKnowledgeGroup("g1");

    expect(result).toEqual({ entryId: "kn_existing", status: "DRAFT" });
    expect(prisma.agentKnowledgeSource.deleteMany).toHaveBeenCalledWith({ where: { entryId: "kn_existing" } });
    expect(prisma.agentKnowledgeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "kn_existing" },
        data: expect.objectContaining({ status: "DRAFT" }),
      })
    );
    // 新規AgentKnowledgeEntryは作成しない(既存を上書き)
    expect(prisma.agentKnowledgeEntry.create).not.toHaveBeenCalled();
  });

  it("PDFソースはdownloadKnowledgeSourceFileでbase64化してgenerateKnowledgeDraftFromSourcesに渡す", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({
      id: "g1",
      topic: "t",
      category: "工法",
      entryId: null,
      sources: [
        { id: "s1", sourceType: "PDF", url: null, storagePath: "knowledge-sources/g1/1.pdf", publicUrl: "https://x/1.pdf", fileName: "doc.pdf", title: null },
      ],
    } as never);
    vi.mocked(downloadKnowledgeSourceFile).mockResolvedValue(Buffer.from("%PDF-1.4"));
    vi.mocked(prisma.agentKnowledgeEntry.create).mockResolvedValue({ id: "kn_new" } as never);

    await crawlAndRegenerateKnowledgeGroup("g1");

    expect(downloadKnowledgeSourceFile).toHaveBeenCalledWith("knowledge-sources/g1/1.pdf");
    expect(generateKnowledgeDraftFromSources).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [{ type: "pdf", base64: Buffer.from("%PDF-1.4").toString("base64"), filename: "doc.pdf" }],
      })
    );
  });
});
