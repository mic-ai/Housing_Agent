"use client";

import { useRouter } from "next/navigation";
import type { ArticleComparisonRowDTO } from "@/types";

interface ComparisonTableProps {
  rows: ArticleComparisonRowDTO[];
  interactive?: boolean;
}

function groupByPriceRange(rows: ArticleComparisonRowDTO[]) {
  const groups: { priceRangeTag: string | null; rows: ArticleComparisonRowDTO[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.priceRangeTag === row.priceRangeTag) {
      last.rows.push(row);
    } else {
      groups.push({ priceRangeTag: row.priceRangeTag, rows: [row] });
    }
  }
  return groups;
}

export function ComparisonTable({ rows, interactive = true }: ComparisonTableProps) {
  const router = useRouter();

  if (rows.length === 0) return null;

  function handleRowClick(row: ArticleComparisonRowDTO) {
    if (!interactive) return;
    if (!row.houseMaker && !row.featureTag) return;

    const params = new URLSearchParams();
    if (row.houseMaker) params.set("houseMakerId", row.houseMaker.id);
    if (row.featureTag) params.set("tag", row.featureTag);
    router.push(`/?${params.toString()}`);
  }

  const groups = groupByPriceRange(rows);

  return (
    <div className="rounded-lg border border-stone-200 divide-y divide-stone-200">
      {groups.map((group, gi) => (
        <div key={gi} className="p-3">
          {group.priceRangeTag && (
            <p className="text-xs font-semibold text-amber-700 mb-1.5">【{group.priceRangeTag}】</p>
          )}
          <ul className="space-y-1">
            {group.rows.map((row) => {
              const clickable = interactive && (row.houseMaker !== null || row.featureTag !== null);
              return (
                <li
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                    clickable ? "cursor-pointer hover:bg-amber-50 transition-colors" : ""
                  }`}
                >
                  <span className="font-medium text-stone-800 shrink-0">{row.houseMaker?.name ?? "-"}</span>
                  {row.featureTag && <span className="text-stone-500 truncate">{row.featureTag}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
