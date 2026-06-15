"use client";

import { useState } from "react";

interface Filters {
  area: string;
  houseType: string;
  priceRange: string;
}

interface Props {
  areas: string[];
  houseTypes: string[];
  priceRanges: string[];
  initialFilters?: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function FilterPanel({ areas, houseTypes, priceRanges, initialFilters, onFilterChange }: Props) {
  const [filters, setFilters] = useState<Filters>(
    initialFilters ?? { area: "", houseType: "", priceRange: "" }
  );

  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange(next);
  }

  function reset() {
    const cleared: Filters = { area: "", houseType: "", priceRange: "" };
    setFilters(cleared);
    onFilterChange(cleared);
  }

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <label htmlFor="filter-area" className="block text-sm font-medium text-gray-700 mb-1">
          エリア
        </label>
        <select
          id="filter-area"
          aria-label="エリア"
          value={filters.area}
          onChange={(e) => update("area", e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="">すべて</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-house-type" className="block text-sm font-medium text-gray-700 mb-1">
          建物タイプ
        </label>
        <select
          id="filter-house-type"
          aria-label="建物タイプ"
          value={filters.houseType}
          onChange={(e) => update("houseType", e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="">すべて</option>
          {houseTypes.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-price" className="block text-sm font-medium text-gray-700 mb-1">
          価格帯
        </label>
        <select
          id="filter-price"
          aria-label="価格帯"
          value={filters.priceRange}
          onChange={(e) => update("priceRange", e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="">すべて</option>
          {priceRanges.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
      >
        リセット
      </button>
    </div>
  );
}
