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
  Settings,
  CircleDashed,
  AlertCircle
} from "lucide-react";

const TOOL_META: Record<string, { icon: React.ElementType; label: string; activeColor: string }> = {
  identify_user:         { icon: Search, label: "Scanning Records", activeColor: "text-indigo-400" },
  set_user_name:         { icon: UserPlus, label: "Updating Identity", activeColor: "text-indigo-400" },
  fetch_slots:           { icon: Calendar, label: "Syncing Calendar", activeColor: "text-violet-400" },
  book_appointment:      { icon: CheckCircle, label: "Confirming Slot", activeColor: "text-emerald-400" },
  retrieve_appointments: { icon: FileSearch, label: "Fetching Ledger", activeColor: "text-indigo-400" },
  cancel_appointment:    { icon: Trash2, label: "Revoking Entry", activeColor: "text-rose-400" },
  modify_appointment:    { icon: Edit3,  label: "Rescheduling", activeColor: "text-amber-400" },
  end_conversation:      { icon: LogOut, label: "Finalizing Session", activeColor: "text-slate-400" },
};

interface Props {
  events: ToolEvent[];
  isInCall: boolean;
}

export function ToolStatus({ events, isInCall }: Props) {
  return (
    <div className="w-full animate-slide-up-fade">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
            {isInCall && (
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Activity Log
            </p>
        </div>
        <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-[32px] border border-white/[0.05] bg-white/[0.02] p-10 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mx-auto mb-6 group">
            <Settings className="w-8 h-8 text-muted-foreground/20 group-hover:rotate-90 transition-transform duration-700" />
          </div>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            {isInCall ? "Monitoring activity" : "No active session"}
          </p>
          <p className="text-[11px] text-muted-foreground/50 mt-2 max-w-[180px] mx-auto leading-relaxed">
            Maya is monitoring for conversational triggers and tool activations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...events].reverse().map((e, idx) => {
            const meta = TOOL_META[e.tool] ?? { icon: Settings, label: e.tool, activeColor: "text-primary" };
            const Icon = meta.icon;
            
            return (
              <div
                key={e.id}
                className={cn(
                  "relative flex items-start gap-4 rounded-2xl border p-5 transition-all duration-500 animate-slide-up-fade overflow-hidden group",
                  e.status === "done" 
                    ? "bg-white/[0.03] border-white/[0.06]" 
                    : e.status === "error"
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-indigo-500/5 border-indigo-500/20 shadow-lg shadow-indigo-500/5"
                )}
                style={{ opacity: 1 - (idx * 0.15) }}
              >
                {/* Visual Status Indicator */}
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                    e.status === "done" ? "bg-white/[0.04] text-white" : e.status === "error" ? "bg-red-500/10 text-red-400" : "bg-indigo-500/10 text-indigo-400"
                )}>
                    {e.status === "pending" ? <CircleDashed className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between flex-wrap overflow-hidden mb-1">
                    <span className={cn(
                        e.status === "done" ? "text-muted-foreground" : e.status === "error" ? "text-red-400" : meta.activeColor
                    )}>
                      {e.status === "pending" ? meta.label : meta.label.replace("ing", "ed")}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className={cn(
                    "text-[11px] leading-relaxed font-medium transition-colors",
                    e.status === "done" ? "text-muted-foreground/70" : "text-white"
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
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
        <CheckCircle className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <div className="flex gap-1">
        <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
        <div className="w-1 h-1 rounded-full bg-indigo-500/50 animate-pulse delay-75" />
        <div className="w-1 h-1 rounded-full bg-indigo-500/20 animate-pulse delay-150" />
    </div>
  );
}
