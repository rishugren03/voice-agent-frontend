"use client";

import type { SessionSummaryResponse } from "@/types";

interface Props {
  data: SessionSummaryResponse;
  onClose: () => void;
}

export function CallSummary({ data, onClose }: Props) {
  const { summary, cost_breakdown } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-y-auto max-h-[92vh] animate-slide-up-modal">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-gradient-to-r from-indigo-950/60 to-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
              <span className="text-base">📋</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Call Summary</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {new Date(summary.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close summary"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Conversation Overview */}
          <div>
            <SectionLabel icon="💬">Conversation Overview</SectionLabel>
            <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/30 p-4">
              <p className="text-sm text-slate-300 leading-relaxed">{summary.overview}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div>
            <SectionLabel icon="👤">Patient Info</SectionLabel>
            <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5 bg-white/[0.03]">
              <InfoRow label="Name"   value={summary.extracted.name  ?? "—"} />
              <InfoRow label="Phone"  value={summary.extracted.phone ?? "—"} />
              <InfoRow label="Intent" value={summary.extracted.intent} />
              {summary.preferences && (
                <InfoRow label="Preferences" value={summary.preferences} />
              )}
            </div>
          </div>

          {/* Appointments */}
          {summary.appointments.length > 0 && (
            <div>
              <SectionLabel icon="📅">Appointments ({summary.appointments.length})</SectionLabel>
              <div className="space-y-2">
                {summary.appointments.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">
                        {a.date} &middot; {a.time}
                      </p>
                      {a.doctor && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{a.doctor}</p>
                      )}
                    </div>
                    <ActionBadge action={a.action} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          {cost_breakdown && (
            <div>
              <SectionLabel icon="💰">Session Cost</SectionLabel>
              <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5 bg-white/[0.03]">
                <CostRow label="STT (Deepgram)" value={cost_breakdown.stt_usd} />
                <CostRow label="TTS (Cartesia)" value={cost_breakdown.tts_usd} />
                <CostRow label="LLM"            value={cost_breakdown.llm_usd} />
                <div className="flex justify-between items-center px-4 py-2.5 bg-white/5">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-sm font-semibold text-emerald-400 font-mono">
                    ${cost_breakdown.total_usd.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 px-0.5">
      <span className="text-sm">{icon}</span>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {children}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start px-4 py-2.5 gap-3">
      <span className="text-xs text-slate-500 w-20 flex-shrink-0 pt-px">{label}</span>
      <span className="text-sm text-slate-200 flex-1">{value}</span>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs text-slate-300 font-mono">${value.toFixed(4)}</span>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    booked:    { cls: "bg-emerald-950/60 border-emerald-700/40 text-emerald-300", label: "✅ Booked" },
    cancelled: { cls: "bg-red-950/60 border-red-700/40 text-red-300",            label: "🚫 Cancelled" },
    modified:  { cls: "bg-amber-950/60 border-amber-700/40 text-amber-300",       label: "✏️ Modified" },
  };
  const style = map[action] ?? { cls: "bg-white/5 border-white/10 text-slate-300", label: action };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${style.cls}`}>
      {style.label}
    </span>
  );
}
