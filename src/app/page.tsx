"use client";

import {
  Users,
  PhoneCall,
  Activity,
  ChevronRight,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { fetchCallSessions, fetchDashboardStats } from "@/lib/api";
import { CallSessionRow, DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  const statCards = [
    {
      label: "Total Calls",
      value: stats ? stats.total_interactions.toLocaleString() : "—",
      sub: stats ? `${stats.last_24h_interactions} today` : "Loading...",
      icon: PhoneCall,
      iconClass: "bg-teal-50 text-teal-600",
    },
    {
      label: "Completion Rate",
      value: stats ? `${stats.completion_rate.toFixed(1)}%` : "—",
      sub: "All time",
      icon: TrendingUp,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Patients Served",
      value: stats ? stats.total_leads.toLocaleString() : "—",
      sub: "Unique contacts",
      icon: Users,
      iconClass: "bg-sky-50 text-sky-600",
    },
    {
      label: "Avg Duration",
      value: stats ? `${Math.round(stats.avg_duration_seconds)}s` : "—",
      sub: "Per session",
      icon: Clock,
      iconClass: "bg-slate-100 text-slate-500",
    },
  ];

  return (
    <div className="space-y-6 animate-slide-up-fade">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-1.5 text-teal-600 mb-1">
          <Activity className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-widest">Overview</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {stats
            ? `${stats.last_24h_interactions} sessions in the last 24 hours`
            : "Loading activity..."}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-lg", stat.iconClass)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-[11px] text-slate-400">{stat.sub}</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Recent sessions */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-medium text-slate-800">Recent Sessions</h3>
            <Link href="/call-sessions" className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors">
              View all
            </Link>
          </div>
          <RecentSessionsList />
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Start session CTA */}
          <div className="p-5 rounded-xl bg-teal-600 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <PhoneCall className="w-4 h-4 text-teal-100" />
              <h3 className="text-sm font-semibold">Start a Session</h3>
            </div>
            <p className="text-xs text-teal-100 mb-4 leading-relaxed">
              Connect with Maya to handle patient inquiries and schedule appointments.
            </p>
            <Link
              href="/call"
              className="flex items-center justify-between bg-white text-teal-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-teal-50 transition-colors"
            >
              Open Console
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* System status */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3">System Status</p>
            <div className="space-y-2.5">
              {[
                { label: "Voice Agent", status: "Operational" },
                { label: "Appointment API", status: "Operational" },
                { label: "Transcription", status: "Operational" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-medium">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentSessionsList() {
  const [sessions, setSessions] = useState<CallSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallSessions(8)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  const getTimeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-100 rounded w-2/5" />
              <div className="h-2 bg-slate-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <PhoneCall className="w-7 h-7 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No sessions yet</p>
        <p className="text-xs text-slate-400 mt-0.5">Start a call to see activity here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {sessions.map((session) => {
        const isComplete = !!session.ended_at;
        const intent = session.summary?.extracted?.intent;
        const title = intent ?? (isComplete ? "Call completed" : "Live session");
        const meta = session.user_name || session.user_phone || "Unknown caller";

        return (
          <div key={session.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              isComplete ? "bg-emerald-50 text-emerald-600" : "bg-teal-50 text-teal-600"
            )}>
              {isComplete
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <Activity className="w-3.5 h-3.5" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 font-medium truncate">{title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{meta}</p>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{getTimeAgo(session.started_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
