"use client";

import type { SessionSummaryResponse, CallSummary } from "@/types";
import {
  User,
  Calendar,
  FileText,
  Heart,
  CheckCircle2,
  Activity,
  Phone,
} from "lucide-react";

interface Props {
  summary: CallSummary;
  cost_breakdown?: SessionSummaryResponse["cost_breakdown"];
}

export function CallDetails({ summary, cost_breakdown }: Props) {
  return (
    <div className="w-full space-y-4 animate-slide-up-fade">
      {/* Patient details */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Patient</p>
            <p className="text-sm font-medium text-slate-900 truncate">{summary.extracted.name || "Unknown"}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{summary.extracted.phone || "—"}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Intent</p>
            <p className="text-xs font-medium text-slate-800 leading-tight line-clamp-3">{summary.extracted.intent || "General inquiry"}</p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="w-3.5 h-3.5 text-teal-600" />
          <h4 className="text-[10px] font-medium uppercase tracking-wider text-teal-700">Session Overview</h4>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{summary.overview}</p>
      </div>

      {/* Appointments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Appointments</h4>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">{summary.appointments.length} booked</span>
        </div>

        {summary.appointments.length > 0 ? (
          <div className="space-y-1.5">
            {summary.appointments.map((apt, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
                <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800">{apt.action}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{apt.doctor} · {apt.date} at {apt.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
            <Phone className="w-4 h-4 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">No appointments booked</p>
          </div>
        )}
      </div>

      {/* Preferences */}
      {summary.preferences && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Patient Preferences</h4>
          </div>
          <p className="text-xs text-slate-600 italic">&quot;{summary.preferences}&quot;</p>
        </div>
      )}

      {/* Cost breakdown */}
      {cost_breakdown && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Session Cost</p>
            {cost_breakdown.estimated && (
              <span className="text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">estimated</span>
            )}
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-slate-400">STT</p>
              <p className="font-mono text-xs font-medium text-slate-800 mt-0.5">{cost_breakdown.estimated ? "~" : ""}${cost_breakdown.stt_usd.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">TTS</p>
              <p className="font-mono text-xs font-medium text-slate-800 mt-0.5">{cost_breakdown.estimated ? "~" : ""}${cost_breakdown.tts_usd.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">LLM</p>
              <p className="font-mono text-xs font-medium text-slate-800 mt-0.5">{cost_breakdown.estimated ? "~" : ""}${cost_breakdown.llm_usd.toFixed(4)}</p>
            </div>
            <div className="bg-teal-50 rounded-lg p-2 border border-teal-100">
              <p className="text-[10px] text-teal-600">Total</p>
              <p className="font-mono text-sm font-semibold text-teal-700 mt-0.5">{cost_breakdown.estimated ? "~" : ""}${cost_breakdown.total_usd.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
