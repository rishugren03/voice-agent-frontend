"use client";

import type { ToolEvent } from "@/types";

interface Props {
  events: ToolEvent[];
}

export function ToolStatus({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="w-full max-w-sm space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 px-1">
        Live Actions
      </p>
      {events.map((e) => (
        <div
          key={e.id}
          className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-300 ${
            e.status === "done"
              ? "bg-white border-slate-200 shadow-sm"
              : e.status === "error"
              ? "bg-red-50 border-red-200"
              : "bg-indigo-50 border-indigo-200"
          }`}
        >
          <span
            className={`text-base flex-shrink-0 ${
              e.status === "done"
                ? "text-emerald-500"
                : e.status === "error"
                ? "text-red-500"
                : "text-indigo-500 animate-spin"
            }`}
            style={{ fontSize: "14px" }}
          >
            {e.status === "done" ? "✓" : e.status === "error" ? "✗" : "◌"}
          </span>
          <span
            className={
              e.status === "done"
                ? "text-slate-700"
                : e.status === "error"
                ? "text-red-700"
                : "text-indigo-700"
            }
          >
            {e.display}
          </span>
        </div>
      ))}
    </div>
  );
}
