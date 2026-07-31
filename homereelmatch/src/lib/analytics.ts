import { prisma } from "@/lib/prisma";

export type AnalyticsPeriod = "7d" | "30d" | "all";

const PRE_VISIT_SOURCES = new Set(["pre_booking", "pre_ad", "pre_reminder"]);

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_SAMPLE_THRESHOLD = 30;

export function getPeriodBounds(
  period: AnalyticsPeriod,
  now: Date = new Date()
): { from: Date | null; to: Date; label: string } {
  if (period === "7d") {
    return { from: new Date(now.getTime() - 7 * DAY_MS), to: now, label: "直近7日間" };
  }
  if (period === "30d") {
    return { from: new Date(now.getTime() - 30 * DAY_MS), to: now, label: "直近30日間" };
  }
  return { from: null, to: now, label: "全期間" };
}

export interface KpiValue {
  numerator: number;
  denominator: number;
  rate: number | null;
  isLowSample: boolean;
}

export function calcKpi(numerator: number, denominator: number): KpiValue {
  return {
    numerator,
    denominator,
    rate: denominator === 0 ? null : numerator / denominator,
    isLowSample: denominator < LOW_SAMPLE_THRESHOLD,
  };
}

export function groupByWeek(dates: Date[]): { weekLabel: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const jst = new Date(date.getTime() + JST_OFFSET_MS);
    const dayOfWeek = jst.getUTCDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(jst);
    monday.setUTCDate(monday.getUTCDate() - diffToMonday);
    const weekLabel = monday.toISOString().slice(0, 10);
    counts.set(weekLabel, (counts.get(weekLabel) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([weekLabel, count]) => ({ weekLabel, count }))
    .sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));
}

export interface VisitorAnalyticsData {
  periodLabel: string;
  videoViewRate: KpiValue;
  contactConversionRate: KpiValue;
  preVisitEngagementRate: KpiValue;
  byChannel: { source: string; viewCount: number; visitorCount: number }[];
  byMaker: { houseMakerId: string; houseMakerName: string; interestedVisitorCount: number }[];
  byWeek: { weekLabel: string; visitorCount: number; viewCount: number }[];
}

export async function computeVisitorAnalytics(period: AnalyticsPeriod): Promise<VisitorAnalyticsData> {
  const { from, label } = getPeriodBounds(period);
  const dateFilter = from ? { gte: from } : undefined;

  const [visitors, videoViews, interests, houseMakers, visitorContacts, appointmentCount] = await Promise.all([
    prisma.visitor.findMany({
      where: dateFilter ? { visitDate: dateFilter } : {},
      select: { id: true, visitDate: true },
    }),
    prisma.visitorVideoView.findMany({
      where: dateFilter ? { viewedAt: dateFilter } : {},
      select: { visitorId: true, viewerId: true, source: true, viewedAt: true },
    }),
    prisma.visitorHouseMakerInterest.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      select: { houseMakerId: true, visitorId: true },
    }),
    prisma.houseMaker.findMany({ select: { id: true, name: true } }),
    prisma.visitorContact.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      select: { visitorId: true },
    }),
    prisma.appointment.count({
      where: dateFilter ? { createdAt: dateFilter } : {},
    }),
  ]);

  const visitorCount = visitors.length;

  const viewedVisitorIds = new Set(
    videoViews.filter((v) => v.visitorId).map((v) => v.visitorId as string)
  );
  const videoViewRate = calcKpi(viewedVisitorIds.size, visitorCount);

  const contactVisitorIds = new Set(visitorContacts.map((c) => c.visitorId));
  const contactConversionRate = calcKpi(contactVisitorIds.size, viewedVisitorIds.size);

  const preVisitViewerIds = new Set(
    videoViews.filter((v) => PRE_VISIT_SOURCES.has(v.source)).map((v) => v.viewerId)
  );
  const preVisitEngagementRate = calcKpi(preVisitViewerIds.size, appointmentCount);

  const channelMap = new Map<string, { viewers: Set<string>; count: number }>();
  for (const v of videoViews) {
    const entry = channelMap.get(v.source) ?? { viewers: new Set<string>(), count: 0 };
    entry.count += 1;
    entry.viewers.add(v.viewerId);
    channelMap.set(v.source, entry);
  }
  const byChannel = Array.from(channelMap.entries())
    .map(([source, { viewers, count }]) => ({ source, viewCount: count, visitorCount: viewers.size }))
    .sort((a, b) => b.viewCount - a.viewCount);

  const makerNameById = new Map(houseMakers.map((hm) => [hm.id, hm.name]));
  const makerMap = new Map<string, Set<string>>();
  for (const interest of interests) {
    const set = makerMap.get(interest.houseMakerId) ?? new Set<string>();
    set.add(interest.visitorId);
    makerMap.set(interest.houseMakerId, set);
  }
  const byMaker = Array.from(makerMap.entries())
    .map(([houseMakerId, visitorSet]) => ({
      houseMakerId,
      houseMakerName: makerNameById.get(houseMakerId) ?? "不明",
      interestedVisitorCount: visitorSet.size,
    }))
    .sort((a, b) => b.interestedVisitorCount - a.interestedVisitorCount);

  const visitWeeks = groupByWeek(visitors.map((v) => v.visitDate));
  const viewWeeks = groupByWeek(videoViews.map((v) => v.viewedAt));
  const weekLabels = Array.from(
    new Set([...visitWeeks.map((w) => w.weekLabel), ...viewWeeks.map((w) => w.weekLabel)])
  ).sort();
  const visitWeekMap = new Map(visitWeeks.map((w) => [w.weekLabel, w.count]));
  const viewWeekMap = new Map(viewWeeks.map((w) => [w.weekLabel, w.count]));
  const byWeek = weekLabels.map((weekLabel) => ({
    weekLabel,
    visitorCount: visitWeekMap.get(weekLabel) ?? 0,
    viewCount: viewWeekMap.get(weekLabel) ?? 0,
  }));

  return {
    periodLabel: label,
    videoViewRate,
    contactConversionRate,
    preVisitEngagementRate,
    byChannel,
    byMaker,
    byWeek,
  };
}
