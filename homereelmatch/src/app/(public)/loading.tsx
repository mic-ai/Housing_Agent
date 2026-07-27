export default function PublicLoading() {
  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-stone-500 text-sm">読み込み中...</p>
      </div>
    </main>
  );
}
