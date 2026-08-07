import { prisma } from "@/lib/prisma";
import type { AgentConditions } from "@/lib/agent-conditions";

export interface AgentCandidateHouseMaker {
  id: string;
  name: string;
  logoUrl: string | null;
}

async function findActiveHouseMakers(limit: number): Promise<AgentCandidateHouseMaker[]> {
  return prisma.houseMaker.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    take: limit,
    select: { id: true, name: true, logoUrl: true },
  });
}

export async function findCandidateHouseMakers(
  conditions: AgentConditions,
  limit = 5
): Promise<AgentCandidateHouseMaker[]> {
  const tags = conditions.desiredTags.filter(Boolean);

  if (tags.length === 0) {
    return findActiveHouseMakers(limit);
  }

  const makers = await prisma.houseMaker.findMany({
    where: {
      isActive: true,
      videos: {
        some: {
          isActive: true,
          videoHashtags: { some: { hashtag: { tagName: { in: tags } } } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      videos: {
        where: {
          isActive: true,
          videoHashtags: { some: { hashtag: { tagName: { in: tags } } } },
        },
        select: {
          videoHashtags: { select: { hashtag: { select: { tagName: true } } } },
        },
      },
    },
  });

  const scored = makers.map((maker) => {
    const matchedTags = new Set<string>();
    for (const video of maker.videos) {
      for (const vh of video.videoHashtags) {
        if (tags.includes(vh.hashtag.tagName)) {
          matchedTags.add(vh.hashtag.tagName);
        }
      }
    }
    return {
      id: maker.id,
      name: maker.name,
      logoUrl: maker.logoUrl,
      score: matchedTags.size,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.slice(0, limit).map(({ id, name, logoUrl }) => ({ id, name, logoUrl }));

  // タグに一致する動画がまだ無い(登録初期でコンテンツが少ない等)場合、
  // 「登録済み企業が0件」という誤った印象をAIに与えないよう、既存のisActive企業一覧にフォールバックする
  if (ranked.length === 0) {
    return findActiveHouseMakers(limit);
  }

  return ranked;
}
