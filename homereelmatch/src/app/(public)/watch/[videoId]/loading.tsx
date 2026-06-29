export default function WatchLoading() {
  return (
    <main className="min-h-screen bg-black">
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative w-full max-w-sm mx-auto aspect-[9/16] bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-stone-700 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-stone-400 text-sm tracking-wide">再生準備中...</p>
          </div>
        </div>
      </div>
    </main>
  );
}
