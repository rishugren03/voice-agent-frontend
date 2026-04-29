"use client";

import type { SessionSummaryResponse } from "@/types";

interface Props {
  data: SessionSummaryResponse;
  duration: number;
}

export function CallDetails({ data, duration }: Props) {
  const { summary, cost_breakdown } = data;

  return (
    <div className="w-full space-y-3 animate-slide-up-fade">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Call Summary
          </p>
        </div>
        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>

      {/* ── Overview ── */}
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Overview</p>
        <p className="text-sm text-slate-300 leading-relaxed">{summary.overview}</p>
      </div>

      {/* ── Extracted Info ── */}
      <div className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Patient</p>
        </div>
        <div className="divide-y divide-white/5">
          <InfoRow label="Name"   value={summary.extracted.name  ?? "—"} />
          <InfoRow label="Phone"  value={summary.extracted.phone ?? "—"} />
          <InfoRow label="Intent" value={summary.extracted.intent ?? "—"} />
          {summary.preferences && (
            <InfoRow label="Notes" value={summary.preferences} />
          )}
        </div>
      </div>

      {/* ── Appointments ── */}
      {summary.appointments.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Appointments ({summary.appointments.length})
            </p>
          </div>
          <div className="px-3 pb-3 space-y-2">
            {summary.appointments.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white/[0.04] rounded-lg px-3 py-2.5 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {a.date} · {a.time}
                  </p>
                  {a.doctor && (
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{a.doctor}</p>
                  )}
                </div>
                <ActionChip action={a.action} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cost Breakdown ── */}
      <div className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Session Cost</p>
        </div>
        {cost_breakdown ? (
          <div className="divide-y divide-white/5">
            <CostRow label="STT · Deepgram" value={cost_breakdown.stt_usd} />
            <CostRow label="TTS · Cartesia" value={cost_breakdown.tts_usd} />
            <CostRow label="LLM · GPT-4o"   value={cost_breakdown.llm_usd} />
            <div className="flex justify-between items-center px-4 py-2.5 bg-white/[0.04]">
              <span className="text-xs font-semibold text-white">Total</span>
              <span className="text-xs font-semibold text-emerald-400 font-mono">
                ${cost_breakdown.total_usd.toFixed(5)}
              </span>
            </div>
          </div>
        ) : (
          <p className="px-4 pb-3 text-xs text-slate-500">Cost data unavailable</p>
        )}
      </div>

      {/* ── Timestamp ── */}
      <p className="text-[10px] text-slate-600 text-right px-1">
        {new Date(summary.timestamp).toLocaleString()}
      </p>

    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start px-4 py-2 gap-3">
      <span className="text-[11px] text-slate-500 w-14 flex-shrink-0 pt-px">{label}</span>
      <span className="text-xs text-slate-300 flex-1 leading-relaxed">{value}</span>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center px-4 py-2">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[11px] text-slate-400 font-mono">${value.toFixed(5)}</span>
    </div>
  );
}

function ActionChip({ action }: { action: string }) {
  const map: Record<string, string> = {
    booked:    "bg-emerald-950/70 border-emerald-800/50 text-emerald-300",
    cancelled: "bg-red-950/70 border-red-800/50 text-red-300",
    modified:  "bg-amber-950/70 border-amber-800/50 text-amber-300",
  };
  const label: Record<string, string> = {
    booked: "✅ Booked", cancelled: "🚫 Cancelled", modified: "✏️ Modified",
  };
  const cls = map[action] ?? "bg-white/5 border-white/10 text-slate-400";
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${cls}`}>
      {label[action] ?? action}
    </span>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
