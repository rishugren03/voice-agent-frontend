"use client";

import type { ToolEvent } from "@/types";

const TOOL_META: Record<string, { icon: string; label: string }> = {
  identify_user:         { icon: "🔍", label: "Identify Patient" },
  set_user_name:         { icon: "📝", label: "Save Patient Name" },
  fetch_slots:           { icon: "📅", label: "Fetch Available Slots" },
  book_appointment:      { icon: "✅", label: "Book Appointment" },
  retrieve_appointments: { icon: "📂", label: "Retrieve Appointments" },
  cancel_appointment:    { icon: "🚫", label: "Cancel Appointment" },
  modify_appointment:    { icon: "✏️",  label: "Modify Appointment" },
  end_conversation:      { icon: "👋", label: "End Conversation" },
};

interface Props {
  events: ToolEvent[];
  isInCall: boolean;
}

export function ToolStatus({ events, isInCall }: Props) {
  return (
    <div className="w-full">
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {isInCall && (
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Live Actions
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-8 text-center">
          <p className="text-2xl mb-2">⚙️</p>
          <p className="text-slate-500 text-xs">
            {isInCall ? "Waiting for agent actions…" : "No actions recorded"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => {
            const meta = TOOL_META[e.tool] ?? { icon: "⚙️", label: e.tool };
            return (
              <div
                key={e.id}
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-all duration-300 animate-slide-up-fade ${
                  e.status === "done"
                    ? "bg-emerald-950/40 border-emerald-800/40"
                    : e.status === "error"
                    ? "bg-red-950/40 border-red-800/40"
                    : "bg-indigo-950/50 border-indigo-700/40"
                }`}
              >
                {/* Tool icon */}
                <span className="text-base flex-shrink-0 mt-0.5 leading-none">{meta.icon}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between flex-wrap">
                    <span className={`text-xs font-semibold leading-tight ${
                      e.status === "done"   ? "text-emerald-300"
                      : e.status === "error" ? "text-red-300"
                      : "text-indigo-200"
                    }`}>
                      {meta.label}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${
                    e.status === "done"   ? "text-slate-400"
                    : e.status === "error" ? "text-red-400"
                    : "text-slate-400"
                  }`}>
                    {e.display}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ToolEvent["status"] }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded-full flex-shrink-0">
        ✓ Done
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-950/70 border border-red-800/50 px-2 py-0.5 rounded-full flex-shrink-0">
        ✗ Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-indigo-300 bg-indigo-950/70 border border-indigo-700/50 px-2 py-0.5 rounded-full flex-shrink-0">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
      Running
    </span>
  );
}
