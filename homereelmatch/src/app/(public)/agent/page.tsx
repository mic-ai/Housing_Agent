import Link from "next/link";
import { AgentDisclaimerBanner } from "@/components/agent/AgentDisclaimerBanner";
import { AgentChatClient } from "@/components/agent/AgentChatClient";

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <header className="sticky top-0 z-10 bg-white border-b border-amber-100 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            aria-label="戻る"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-stone-800">AIに相談する</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <AgentDisclaimerBanner />
        <AgentChatClient />
      </main>
    </div>
  );
}
