import Link from "next/link";
import Image from "next/image";

interface CandidateSalesperson {
  id: string;
  name: string;
  profileImage: string | null;
  toneQuote: string | null;
  houseMaker: { id: string; name: string } | null;
}

function PersonIcon() {
  return (
    <svg className="w-8 h-8 text-stone-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

export function CandidateSalespersonRow({ salesperson }: { salesperson: CandidateSalesperson }) {
  return (
    <Link
      href={`/salesperson/${salesperson.id}`}
      className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center gap-3 hover:border-amber-300 transition-colors"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center flex-shrink-0">
        {salesperson.profileImage ? (
          <Image
            src={salesperson.profileImage}
            alt={salesperson.name}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        ) : (
          <PersonIcon />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-800 truncate">{salesperson.name}</p>
        {salesperson.houseMaker && (
          <p className="text-xs text-stone-500 truncate">{salesperson.houseMaker.name}</p>
        )}
        {salesperson.toneQuote && (
          <p className="text-xs text-stone-400 truncate mt-0.5">「{salesperson.toneQuote}」</p>
        )}
      </div>
    </Link>
  );
}
