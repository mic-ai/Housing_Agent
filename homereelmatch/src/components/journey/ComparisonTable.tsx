import type { ArticleComparisonRowDTO } from "@/types";

interface ComparisonTableProps {
  rows: ArticleComparisonRowDTO[];
}

export function ComparisonTable({ rows }: ComparisonTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="w-full text-sm">
        <thead className="bg-stone-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-stone-600">メーカー</th>
            <th className="text-left px-3 py-2 font-medium text-stone-600">価格帯</th>
            <th className="text-left px-3 py-2 font-medium text-stone-600">特徴</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-2 text-stone-800 font-medium">{row.houseMaker?.name ?? "-"}</td>
              <td className="px-3 py-2 text-stone-600">{row.priceRangeTag ?? "-"}</td>
              <td className="px-3 py-2 text-stone-600">{row.featureTag ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
