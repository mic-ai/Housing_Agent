import Link from "next/link";
import Image from "next/image";
import type { AgentCandidateHouseMakerDTO } from "@/types";

export function AgentCandidateCard({ candidate }: { candidate: AgentCandidateHouseMakerDTO }) {
  return (
    <Link
      href={`/?houseMakerId=${candidate.id}`}
      className="flex items-center gap-3 bg-white border border-amber-100 rounded-xl p-3 hover:border-amber-300 transition-colors"
    >
      {candidate.logoUrl ? (
        <Image
          src={candidate.logoUrl}
          alt={candidate.name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex-shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-800 truncate">{candidate.name}</p>
        <p className="text-xs text-amber-600">この会社の動画を見る →</p>
      </div>
    </Link>
  );
}
