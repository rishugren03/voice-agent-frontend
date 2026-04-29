"use client";

import type { SessionSummaryResponse, CallSummary } from "@/types";
import { 
  User, 
  Calendar, 
  Target, 
  Heart, 
  FileText, 
  PieChart,
  Zap,
  CheckCircle2
} from "lucide-react";

interface Props {
  summary: CallSummary;
  cost_breakdown?: SessionSummaryResponse["cost_breakdown"];
}

export function CallDetails({ summary, cost_breakdown }: Props) {
  return (
    <div className="w-full space-y-8 animate-slide-up-fade">
      {/* Patient Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
             <User className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Lead Details</p>
             <p className="font-bold text-white text-base truncate">{summary.extracted.name || "Unknown Patient"}</p>
             <p className="text-xs text-muted-foreground mt-1 font-mono tracking-tight">{summary.extracted.phone || "No phone capture"}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
             <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Inquiry Intent</p>
             <p className="font-bold text-white text-sm leading-tight line-clamp-2">{summary.extracted.intent || "General inquiry"}</p>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="p-6 rounded-3xl bg-indigo-500/[0.03] border border-indigo-500/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <FileText className="w-12 h-12 text-indigo-400" />
        </div>
        <div className="flex items-center gap-2 mb-4">
           <Zap className="w-4 h-4 text-indigo-400" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Session Overview</h4>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-medium">
          {summary.overview}
        </p>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
               <Calendar className="w-4 h-4 text-indigo-400" />
               <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Captured Outcomes</h4>
            </div>
           <span className="text-[10px] font-bold text-emerald-400">{summary.appointments.length} Captured</span>
        </div>
        
        {summary.appointments.length > 0 ? (
          <div className="space-y-2">
            {summary.appointments.map((apt, i) => (
              <div key={i} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                   <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{apt.action}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {apt.doctor} • {apt.date} at {apt.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 px-6 rounded-2xl border border-dashed border-white/5 text-center">
            <p className="text-xs text-muted-foreground">No specific appointments synchronized during this session.</p>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      {summary.preferences && (
        <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.03] space-y-3">
          <div className="flex items-center gap-2">
             <Heart className="w-3.5 h-3.5 text-rose-400" />
             <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Patient Preferences</h4>
          </div>
          <p className="text-xs text-slate-400 italic font-medium">&quot;{summary.preferences}&quot;</p>
        </div>
      )}

      {/* Cost Analytics */}
      {cost_breakdown && (
        <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 px-1">
               <PieChart className="w-4 h-4 text-indigo-400" />
               <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Performance</h4>
            </div>
           
           <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/[0.05] grid grid-cols-2 lg:grid-cols-4 gap-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
             <div>
               <p className="text-[9px] font-bold text-muted-foreground lowercase tracking-tighter opacity-60">stt_compute</p>
               <p className="mt-1 font-mono text-xs font-bold text-white">${cost_breakdown.stt_usd.toFixed(4)}</p>
             </div>
             <div>
               <p className="text-[9px] font-bold text-muted-foreground lowercase tracking-tighter opacity-60">tts_synthesis</p>
               <p className="mt-1 font-mono text-xs font-bold text-white">${cost_breakdown.tts_usd.toFixed(4)}</p>
             </div>
             <div>
               <p className="text-[9px] font-bold text-muted-foreground lowercase tracking-tighter opacity-60">llm_intelligence</p>
               <p className="mt-1 font-mono text-xs font-bold text-white">${cost_breakdown.llm_usd.toFixed(4)}</p>
             </div>
             <div className="bg-indigo-500/10 rounded-xl p-2 border border-indigo-500/20">
               <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Total cost</p>
               <p className="mt-0.5 font-mono text-sm font-black text-indigo-400">${cost_breakdown.total_usd.toFixed(4)}</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
