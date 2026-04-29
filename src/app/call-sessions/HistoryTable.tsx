"use client";

import { useState } from "react";
import type { CallSessionRow, TranscriptItem } from "@/types";
import { fetchCallSessions } from "@/lib/api";
import {
  RefreshCcw,
  Calendar,
  Clock,
  DollarSign,
  History,
  ArrowUpRight,
  Activity,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CallDetails } from "@/components/CallDetails";
import { cn } from "@/lib/utils";

export function HistoryTable({ initialSessions }: { initialSessions: CallSessionRow[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CallSessionRow | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await fetchCallSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
            <History className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Session History</h2>
            <p className="text-xs text-slate-400 mt-0.5">{sessions.length} sessions recorded</p>
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Mobile card list – visible below md */}
      <div className="md:hidden space-y-2">
        {sessions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400 shadow-sm">
            No sessions found.
          </div>
        ) : sessions.map((session) => {
          const cost = session.cost_breakdown?.total_usd !== undefined
            ? session.cost_breakdown.total_usd.toFixed(4)
            : ((session.cost_breakdown?.stt_usd || 0) + (session.cost_breakdown?.tts_usd || 0) + (session.cost_breakdown?.llm_usd || 0)).toFixed(4);
          const duration = session.ended_at
            ? `${Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)}s`
            : "—";

          return (
            <div
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-teal-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {session.user_name || session.user_phone || "Unknown caller"}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{session.session_id.slice(0, 14)}...</p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0",
                  session.ended_at
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    session.ended_at ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                  )} />
                  {session.ended_at ? "Complete" : "Live"}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(session.started_at)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {duration}
                </div>
                <div className="flex items-center gap-1 text-emerald-600">
                  <DollarSign className="w-3 h-3" />
                  {cost}
                </div>
              </div>

              {session.summary?.overview && (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {session.summary.overview}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table – hidden below md */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-medium uppercase tracking-widest text-slate-500">
                <th className="px-5 py-3.5">Patient / Session</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Duration & Cost</th>
                <th className="px-5 py-3.5">Summary</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    No sessions found.
                  </td>
                </tr>
              ) : sessions.map((session) => (
                <tr
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="group hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-slate-900 group-hover:text-teal-700 transition-colors">
                        {session.user_name || session.user_phone || "Unknown caller"}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {session.session_id.slice(0, 14)}...
                        </span>
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.started_at)}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border",
                      session.ended_at
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        session.ended_at ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                      )} />
                      {session.ended_at ? "Complete" : "Live"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {session.ended_at
                          ? `${Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)}s`
                          : "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <DollarSign className="w-3.5 h-3.5" />
                        {session.cost_breakdown?.total_usd !== undefined
                          ? session.cost_breakdown.total_usd.toFixed(4)
                          : ((session.cost_breakdown?.stt_usd || 0) + (session.cost_breakdown?.tts_usd || 0) + (session.cost_breakdown?.llm_usd || 0)).toFixed(4)
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {session.summary?.overview || "No summary available."}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-teal-600 transition-colors">
                      <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-xl bg-white border-l border-slate-200 p-0 overflow-hidden flex flex-col shadow-xl">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-teal-600 text-[10px] font-semibold text-white tracking-wider">Session</span>
                  <span className="text-[10px] font-mono text-slate-400">{selectedSession?.session_id.slice(0, 12)}...</span>
                </div>
                <SheetTitle className="text-lg font-semibold text-slate-900">Session Details</SheetTitle>
                <SheetDescription className="text-sm text-slate-500 mt-0.5">
                  Patient details, outcomes, and session transcript.
                </SheetDescription>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6 pb-8">
            {selectedSession && (
              <>
                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Patient ID</p>
                    <p className="font-medium text-slate-800 text-sm truncate">{selectedSession.user_id || "Guest"}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Session Cost</p>
                    <p className="font-semibold text-emerald-600 text-sm font-mono">
                      ${selectedSession.cost_breakdown?.total_usd !== undefined
                        ? selectedSession.cost_breakdown.total_usd.toFixed(4)
                        : ((selectedSession.cost_breakdown?.stt_usd || 0) + (selectedSession.cost_breakdown?.tts_usd || 0) + (selectedSession.cost_breakdown?.llm_usd || 0)).toFixed(4)
                      }
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3">Summary</h4>
                  {selectedSession.summary ? (
                    <div className="animate-slide-up-fade">
                      <CallDetails summary={selectedSession.summary} cost_breakdown={selectedSession.cost_breakdown} />
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center">
                      <Activity className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No summary available for this session.</p>
                    </div>
                  )}
                </div>

                {/* Transcript */}
                {selectedSession.transcript && selectedSession.transcript.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 pt-2 border-t border-slate-100">Transcript</h4>
                    <div className="space-y-2">
                      {selectedSession.transcript.map((msg: TranscriptItem, i: number) => (
                        <div key={i} className={cn(
                          "p-3.5 rounded-xl text-sm leading-relaxed",
                          msg.role === "assistant"
                            ? "bg-slate-100 border border-slate-200 mr-8"
                            : "bg-teal-50 border border-teal-100 ml-8"
                        )}>
                          <div className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider mb-1.5",
                            msg.role === "assistant" ? "text-teal-600" : "text-slate-500"
                          )}>
                            {msg.role === "assistant" ? "Maya" : "Patient"}
                          </div>
                          <p className="text-slate-700">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
