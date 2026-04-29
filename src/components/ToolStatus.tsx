"use client";

import * as React from "react";
import type { ToolEvent } from "@/types";
import { cn } from "@/lib/utils";
import {
  Search,
  UserPlus,
  Calendar,
  CheckCircle,
  FileSearch,
  Trash2,
  Edit3,
  LogOut,
  Activity,
  CircleDashed,
  AlertCircle,
} from "lucide-react";

const TOOL_META: Record<string, { icon: React.ElementType; label: string; activeColor: string; iconClass: string }> = {
  identify_user:         { icon: Search,      label: "Looking up patient",    activeColor: "text-teal-700",    iconClass: "bg-teal-50 text-teal-600" },
  set_user_name:         { icon: UserPlus,    label: "Updating patient name", activeColor: "text-teal-700",    iconClass: "bg-teal-50 text-teal-600" },
  fetch_slots:           { icon: Calendar,    label: "Fetching availability", activeColor: "text-sky-700",     iconClass: "bg-sky-50 text-sky-600" },
  book_appointment:      { icon: CheckCircle, label: "Booking appointment",   activeColor: "text-emerald-700", iconClass: "bg-emerald-50 text-emerald-600" },
  retrieve_appointments: { icon: FileSearch,  label: "Loading appointments",  activeColor: "text-teal-700",    iconClass: "bg-teal-50 text-teal-600" },
  cancel_appointment:    { icon: Trash2,      label: "Cancelling appointment",activeColor: "text-rose-700",    iconClass: "bg-rose-50 text-rose-600" },
  modify_appointment:    { icon: Edit3,       label: "Rescheduling",          activeColor: "text-amber-700",   iconClass: "bg-amber-50 text-amber-600" },
  end_conversation:      { icon: LogOut,      label: "Ending session",        activeColor: "text-slate-600",   iconClass: "bg-slate-100 text-slate-500" },
};

interface Props {
  events: ToolEvent[];
  isInCall: boolean;
}

export function ToolStatus({ events, isInCall }: Props) {
  return (
    <div className="w-full animate-slide-up-fade">
      <div className="flex items-center gap-2 mb-3 px-1">
        {isInCall && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
          </span>
        )}
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Activity Log
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-xs font-medium text-slate-500">
            {isInCall ? "Monitoring session..." : "No active session"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[170px] mx-auto leading-relaxed">
            Tool actions will appear here during the call.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...events].reverse().map((e, idx) => {
            const meta = TOOL_META[e.tool] ?? { icon: Activity, label: e.tool, activeColor: "text-teal-700", iconClass: "bg-teal-50 text-teal-600" };
            const Icon = meta.icon;

            return (
              <div
                key={e.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-300 animate-slide-up-fade shadow-sm",
                  e.status === "done"
                    ? "bg-white border-slate-200"
                    : e.status === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-teal-50 border-teal-200"
                )}
                style={{ opacity: 1 - (idx * 0.1) }}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  e.status === "done" ? "bg-slate-100 text-slate-500" :
                  e.status === "error" ? "bg-red-100 text-red-600" :
                  meta.iconClass
                )}>
                  {e.status === "pending"
                    ? <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                    : <Icon className="w-3.5 h-3.5" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={cn(
                      "text-xs font-medium",
                      e.status === "done" ? "text-slate-500" :
                      e.status === "error" ? "text-red-700" :
                      meta.activeColor
                    )}>
                      {meta.label}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className={cn(
                    "text-[11px] leading-relaxed",
                    e.status === "done" ? "text-slate-400" : "text-slate-600"
                  )}>
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
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle className="w-3 h-3" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600">
        <AlertCircle className="w-3 h-3" />
      </span>
    );
  }
  return (
    <div className="flex gap-0.5 items-center">
      <div className="w-1 h-1 rounded-full bg-teal-500 animate-pulse" />
      <div className="w-1 h-1 rounded-full bg-teal-400 animate-pulse delay-75" />
      <div className="w-1 h-1 rounded-full bg-teal-300 animate-pulse delay-150" />
    </div>
  );
}
