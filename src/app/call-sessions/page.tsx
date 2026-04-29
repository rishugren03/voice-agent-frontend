import { fetchCallSessions } from "@/lib/api";

export default async function CallSessionsPage() {
  const sessions = await fetchCallSessions().catch(() => []);

  return (
    <div className="space-y-5 animate-slide-up-fade">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Call History</h1>
        <p className="text-sm text-slate-500 mt-0.5">Browse and review past consultation sessions.</p>
      </div>

      <HistoryTableInitial sessions={sessions} />
    </div>
  );
}

import type { CallSessionRow } from "@/types";
import { HistoryTable } from "@/app/call-sessions/HistoryTable";

function HistoryTableInitial({ sessions }: { sessions: CallSessionRow[] }) {
  return <HistoryTable initialSessions={sessions} />;
}
