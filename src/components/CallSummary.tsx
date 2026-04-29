"use client";

import type { SessionSummaryResponse } from "@/types";

interface Props {
  data: SessionSummaryResponse;
  onClose: () => void;
}

export function CallSummary({ data, onClose }: Props) {
  const { summary, cost_breakdown } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 text-sm">✓</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">Call Summary</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Overview */}
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{summary.overview}</p>
          </div>

          {/* Patient Info */}
          <div>
            <SectionLabel>Patient Info</SectionLabel>
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              <InfoRow label="Name" value={summary.extracted.name ?? "—"} />
              <InfoRow label="Phone" value={summary.extracted.phone ?? "—"} />
              <InfoRow label="Intent" value={summary.extracted.intent} />
              {summary.preferences && (
                <InfoRow label="Preferences" value={summary.preferences} />
              )}
            </div>
          </div>

          {/* Appointments */}
          {summary.appointments.length > 0 && (
            <div>
              <SectionLabel>Appointments</SectionLabel>
              <div className="space-y-2">
                {summary.appointments.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {a.date} &middot; {a.time}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{a.doctor}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        a.action === "booked"
                          ? "bg-emerald-100 text-emerald-700"
                          : a.action === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {a.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          {cost_breakdown && (
            <div>
              <SectionLabel>Session Cost</SectionLabel>
              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                <CostRow label="STT (Deepgram)" value={cost_breakdown.stt_usd} />
                <CostRow label="TTS (Cartesia)" value={cost_breakdown.tts_usd} />
                <CostRow label="LLM (GPT-4o)" value={cost_breakdown.llm_usd} />
                <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50">
                  <span className="text-sm font-semibold text-slate-800">Total</span>
                  <span className="text-sm font-semibold text-slate-800">
                    ${cost_breakdown.total_usd.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400 text-right pt-1">
            {new Date(summary.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 px-0.5">
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-4 py-2.5">
      <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-700 font-mono">${value.toFixed(4)}</span>
    </div>
  );
}
