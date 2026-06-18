export function VideoCardSkeleton() {
  return (
    <div className="block">
      <div className="relative aspect-[9/16] bg-stone-900 rounded-xl overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900" />
        <div className="absolute top-2 left-2">
          <div className="h-5 w-20 bg-white/10 rounded-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          <div className="h-4 bg-white/20 rounded w-full" />
          <div className="h-4 bg-white/20 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-1/2 mt-1" />
          <div className="flex gap-1 mt-1">
            <div className="h-3 bg-amber-300/20 rounded w-12" />
            <div className="h-3 bg-amber-300/20 rounded w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
