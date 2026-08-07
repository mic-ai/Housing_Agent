import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crawlAndRegenerateKnowledgeGroup } from "@/lib/agent-knowledge-crawl";

export const maxDuration = 300;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Vercel Cron(週次): 登録済み参考ソースを持つグループのうち、直近7日以内に再生成していないものを再クロールする
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const dueGroups = await prisma.agentKnowledgeSourceGroup.findMany({
    where: {
      sources: { some: {} },
      OR: [{ lastCrawledAt: null }, { lastCrawledAt: { lt: sevenDaysAgo } }],
    },
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;

  for (const group of dueGroups) {
    try {
      await crawlAndRegenerateKnowledgeGroup(group.id);
      succeeded++;
    } catch (error) {
      console.error("週次ナレッジ再生成に失敗しました", group.id, error);
      failed++;
    }
  }

  return NextResponse.json({ data: { processed: dueGroups.length, succeeded, failed } });
}
