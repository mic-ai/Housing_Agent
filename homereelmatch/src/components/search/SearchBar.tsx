"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  defaultValue?: string;
}

export function SearchBar({ defaultValue = "" }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="動画・ハッシュタグ・営業マンで検索"
        className="flex-1 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
      >
        検索
      </button>
    </form>
  );
}
