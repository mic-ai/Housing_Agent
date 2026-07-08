import Link from "next/link";
import Image from "next/image";

interface ViewedSalespersonItem {
  id: string;
  videoId: string | null;
  viewCount: number;
  salesperson: {
    id: string;
    name: string;
    profileImage: string | null;
    toneQuote: string | null;
    company: { id: string; name: string } | null;
  };
}

function PersonIcon() {
  return (
    <svg className="w-8 h-8 text-stone-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

export function ViewedSalespersonList({ items }: { items: ViewedSalespersonItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-amber-100 p-5 text-center">
        <p className="text-stone-500 text-sm mb-3">まだ見た営業担当がいません</p>
        <Link href="/" className="text-amber-600 text-sm font-medium hover:text-amber-700">
          動画を見てみる →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center flex-shrink-0">
            {item.salesperson.profileImage ? (
              <Image
                src={item.salesperson.profileImage}
                alt={item.salesperson.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              <PersonIcon />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate">{item.salesperson.name}</p>
            {item.salesperson.company && (
              <p className="text-xs text-stone-500 truncate">{item.salesperson.company.name}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Link
              href={`/salesperson/${item.salesperson.id}`}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              プロフィールを見る
            </Link>
            {item.videoId && (
              <Link href={`/watch/${item.videoId}`} className="text-xs text-stone-500 hover:text-stone-700">
                もう一度見る
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
