import { fetchCallSessions } from "@/lib/api";

export default async function CallSessionsPage() {
  const sessions = await fetchCallSessions();

  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
        <p className="text-muted-foreground">View and analyze your past AI agent conversations.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <HistoryTableInitial sessions={sessions} />
      </div>
    </div>
  );
}

// Client wrapper for the table
import type { CallSessionRow } from "@/types";
import { HistoryTable } from "@/app/call-sessions/HistoryTable";

function HistoryTableInitial({ sessions }: { sessions: CallSessionRow[] }) {
  return <HistoryTable initialSessions={sessions} />;
}
