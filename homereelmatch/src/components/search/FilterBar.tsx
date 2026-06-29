"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: string; name: string };

type Props = {
  houseMakers: Option[];
  venues: Option[];
  activeHouseMakerId?: string;
  activeVenueId?: string;
};

export function FilterBar({ houseMakers, venues, activeHouseMakerId, activeVenueId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // フィルター変更時はcursorをリセット
    params.delete("cursor");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      {houseMakers.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => navigate("houseMakerId", null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border shadow-sm ${!activeHouseMakerId ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200 hover:bg-amber-50"}`}
          >
            全HM
          </button>
          {houseMakers.map((hm) => (
            <button
              key={hm.id}
              onClick={() => navigate("houseMakerId", activeHouseMakerId === hm.id ? null : hm.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border shadow-sm ${activeHouseMakerId === hm.id ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200 hover:bg-amber-50"}`}
            >
              {hm.name}
            </button>
          ))}
        </div>
      )}

      {venues.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => navigate("venueId", null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border shadow-sm ${!activeVenueId ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200 hover:bg-amber-50"}`}
          >
            全会場
          </button>
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => navigate("venueId", activeVenueId === v.id ? null : v.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border shadow-sm ${activeVenueId === v.id ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200 hover:bg-amber-50"}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
