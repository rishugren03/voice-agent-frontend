"use client";

import { useState } from "react";
import type { CallSessionRow, TranscriptItem } from "@/types";
import { fetchCallSessions } from "@/lib/api";
import { 
  ChevronRight, 
  RefreshCcw, 
  Calendar, 
  Clock, 
  MessageSquare,
  DollarSign,
  History,
  ArrowUpRight,
  Search,
  Activity
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
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
    <div className="space-y-6">
      {/* Table Header / Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <History className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Intelligence Archive</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explore {sessions.length} recorded AI interactions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Filter sessions..." 
              className="bg-slate-900/50 border border-white/5 rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 w-48 transition-all"
            />
          </div>
          <button 
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 active:scale-95"
          >
            <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/[0.05] bg-slate-900/40 backdrop-blur-sm shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 border-b border-white/[0.05]">
                <th className="px-8 py-5">Session & Timeline</th>
                <th className="px-8 py-5">Status Code</th>
                <th className="px-8 py-5">Performance</th>
                <th className="px-8 py-5">Sentiment Preview</th>
                <th className="px-8 py-5 text-right">Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {sessions.map((session) => (
                <tr 
                  key={session.id} 
                  onClick={() => setSelectedSession(session)}
                  className="group hover:bg-white/[0.02] transition-all cursor-pointer relative"
                >
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                        {session.user_id || "GUEST_SESSION"}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground/60 px-2 py-0.5 rounded bg-white/[0.03] border border-white/5 tracking-tighter">
                          {session.session_id.slice(0, 16)}...
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                          <Calendar className="w-3 h-3 text-indigo-400/50" /> {formatDate(session.started_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border transition-all",
                      session.ended_at 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20 animate-pulse"
                    )}>
                      {session.ended_at ? "COMPLETE" : "LIVE_STREAM"}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-white/90">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> 
                        {(session.transcript?.length || 0) * 12}s <span className="font-normal text-muted-foreground/50 ml-1">vocal</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-400">
                        <DollarSign className="w-3 h-3" /> 
                        {session.cost_breakdown ? session.cost_breakdown.total_usd.toFixed(4) : "0.0000"} 
                        <span className="text-[9px] text-muted-foreground/40 ml-1 uppercase">Compute</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 max-w-xs">
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic font-medium">
                      {session.summary?.overview || "Raw session data — pending analysis."}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-300">
                       <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-slate-950 border-l border-white/[0.08] p-0 overflow-hidden flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
          {/* Detailed Header Section */}
          <div className="relative p-10 bg-gradient-to-br from-indigo-500/10 via-background to-background border-b border-white/[0.05]">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
            
            <button 
               onClick={() => setSelectedSession(null)}
               className="absolute top-6 right-6 p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
            >
                <RefreshCcw className="w-4 h-4 rotate-45" /> 
            </button>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded bg-indigo-500 text-[9px] font-black text-white tracking-widest uppercase">Report</div>
                    <span className="text-[10px] font-mono text-muted-foreground">REF_{selectedSession?.session_id.slice(0, 8)}</span>
                </div>
                <SheetTitle className="text-3xl font-extrabold tracking-tight text-white leading-none">Intelligence Report</SheetTitle>
                <SheetDescription className="text-muted-foreground text-sm font-medium">
                  Detailed analysis of interaction flows, extracted leads, and agent performance metrics.
                </SheetDescription>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 pb-20">
            {selectedSession && (
              <>
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-sm relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Lead Identification</p>
                      <p className="font-bold text-white text-lg pr-2">{selectedSession.user_id || "GUEST_LEAD"}</p>
                   </div>
                   <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-sm relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Session Compute</p>
                      <p className="font-bold text-emerald-400 text-lg">${selectedSession.cost_breakdown?.total_usd.toFixed(4) || "0.0000"}</p>
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    <h4 className="font-bold text-white tracking-tight uppercase text-xs tracking-[0.2em]">Summary & Extraction</h4>
                  </div>
                  {selectedSession.summary ? (
                    <div className="animate-slide-up-fade">
                        <CallDetails 
                          summary={selectedSession.summary} 
                          cost_breakdown={selectedSession.cost_breakdown}
                        />
                    </div>
                  ) : (
                    <div className="p-10 rounded-3xl bg-white/[0.02] border border-dashed border-white/[0.1] text-center space-y-3">
                      <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground font-medium">Detailed intelligence summary is currently being synthesized for this record.</p>
                    </div>
                  )}
                </div>

                {selectedSession.transcript && selectedSession.transcript.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-t border-white/[0.05] pt-10">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                      <h4 className="font-bold text-white tracking-tight uppercase text-xs tracking-[0.2em]">Verbatim Transcript</h4>
                    </div>
                    <div className="space-y-4">
                      {selectedSession.transcript.map((msg: TranscriptItem, i: number) => (
                        <div key={i} className={cn(
                          "p-5 rounded-2xl text-[13px] leading-relaxed relative overflow-hidden transition-all hover:ring-1 hover:ring-white/5",
                          msg.role === "assistant" 
                            ? "bg-slate-900 border border-white/[0.03] mr-10 shadow-sm" 
                            : "bg-indigo-500/5 border border-indigo-500/10 ml-10 shadow-sm"
                        )}>
                          <div className={cn(
                              "text-[8px] font-black uppercase tracking-[0.2em] mb-2 flex items-center justify-between",
                              msg.role === "assistant" ? "text-indigo-400" : "text-white"
                          )}>
                            <span>{msg.role}</span>
                            <span className="opacity-30 font-mono tracking-tighter">REF_T{i}</span>
                          </div>
                          <p className={cn(
                              "font-medium",
                              msg.role === "assistant" ? "text-slate-200" : "text-indigo-100"
                          )}>{msg.content}</p>
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
