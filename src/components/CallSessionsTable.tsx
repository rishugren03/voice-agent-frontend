"use client";

import type { CallSessionRow } from "@/types";

interface Props {
  sessions: CallSessionRow[];
  loading: boolean;
  onRefresh: () => void;
}

export function CallSessionsTable({ sessions, loading, onRefresh }: Props) {
  return (
    <section className="w-full max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Call Sessions
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Latest rows from the backend call_sessions table
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Loading" : "Refresh"}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/50">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-56 px-4 py-3 font-semibold">Session</th>
                <th className="w-28 px-4 py-3 font-semibold">Status</th>
                <th className="w-28 px-4 py-3 font-semibold">User</th>
                <th className="w-36 px-4 py-3 font-semibold">Transcript</th>
                <th className="w-64 px-4 py-3 font-semibold">Summary</th>
                <th className="w-32 px-4 py-3 font-semibold">Cost</th>
                <th className="w-40 px-4 py-3 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sessions.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    {loading ? "Loading sessions..." : "No call sessions in the backend yet"}
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <p className="truncate font-mono text-[11px] text-slate-200">
                        {session.session_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Status ended={Boolean(session.ended_at)} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {session.user_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {session.transcript?.length ?? 0} messages
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 text-slate-400">
                        {session.summary?.overview ?? "Summary pending"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {session.cost_breakdown
                        ? `$${session.cost_breakdown.total_usd.toFixed(5)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(session.started_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Status({ ended }: { ended: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        ended
          ? "border-emerald-800/50 bg-emerald-950/50 text-emerald-300"
          : "border-amber-800/50 bg-amber-950/50 text-amber-300"
      }`}
    >
      {ended ? "Ended" : "Open"}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
