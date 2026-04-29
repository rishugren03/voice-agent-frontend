"use client";

import { 
  Users, 
  Zap, 
  Sparkles,
  PhoneCall,
  Activity,
  ChevronRight,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div className="space-y-12 animate-slide-up-fade pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-indigo-400">
           <Activity className="w-4 h-4" />
           <span className="text-[10px] font-bold uppercase tracking-wider">System Status</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white leading-none">Dashboard Overview</h1>
        <p className="text-muted-foreground text-sm font-medium">Maya agents have handled <span className="text-white">124 interactions</span> in the last 24 hours.</p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Interactions", value: "2,842", sub: "+12.5%", icon: PhoneCall, color: "indigo" },
          { label: "Completion Rate", value: "98.2%", sub: "+0.4%", icon: Zap, color: "emerald" },
          { label: "New Leads", value: "156", sub: "+18", icon: Users, color: "violet" },
          { label: "Avg Latency", value: "420ms", sub: "-15ms", icon: Activity, color: "amber" },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl glass-panel hover:border-indigo-500/30 transition-colors relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                  "p-2 rounded-xl",
                  stat.color === "indigo" ? "bg-indigo-500/10 text-indigo-400" : stat.color === "emerald" ? "bg-emerald-500/10 text-emerald-400" : stat.color === "violet" ? "bg-violet-500/10 text-violet-400" : "bg-amber-500/10 text-amber-400"
              )}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                  "text-[10px] font-bold",
                  stat.sub.startsWith("+") ? "text-emerald-400" : "text-amber-400"
              )}>{stat.sub}</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Chart / Activity Panel */}
        <div className="lg:col-span-8 p-8 rounded-3xl glass-panel relative overflow-hidden">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">System Performance</h3>
                    <p className="text-xs text-muted-foreground font-medium">Real-time monitoring of agent clusters and task handling.</p>
                </div>
                <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <button className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white text-[10px] font-bold tracking-wider uppercase">Live</button>
                    <button className="px-4 py-1.5 rounded-lg text-muted-foreground text-[10px] font-bold tracking-wider uppercase hover:text-white transition-colors">History</button>
                </div>
             </div>

             <div className="space-y-6">
                {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground/40">{11 + i}:00</span>
                            <div className="w-1 h-12 rounded-full bg-slate-800 relative">
                                <div className="absolute top-0 left-0 w-full rounded-full bg-indigo-500" style={{ height: `${40 + (i * 20)}%` }} />
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold tracking-wider text-white uppercase">Cluster-Agent-{i+1}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 uppercase">Operational</span>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5, 2, 3, 1, 4, 2, 5, 3, 2, 4, 1].map((lvl, idx) => (
                                    <div key={idx} className="flex-1 h-2.5 rounded bg-white/[0.03] relative overflow-hidden">
                                        <div 
                                            className={cn(
                                                "absolute bottom-0 w-full rounded-sm",
                                                lvl > 3 ? "bg-indigo-500" : "bg-indigo-500/30"
                                            )} 
                                            style={{ height: `${lvl * 20}%` }} 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
             </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-4 space-y-8">
            <div className="p-8 rounded-3xl bg-indigo-600 border border-white/10 shadow-lg text-white overflow-hidden relative">
                <Sparkles className="w-8 h-8 mb-4 text-indigo-200" />
                <h3 className="text-xl font-bold mb-2 tracking-tight">Launch Maya</h3>
                <p className="text-indigo-100 text-sm font-medium mb-8 leading-relaxed">Start an autonomous agent session to handle healthcare operations.</p>
                <Link href="/call" className="flex items-center gap-3 bg-white text-indigo-600 py-3.5 px-6 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all">
                    Open Call Console
                    <ChevronRight className="w-4 h-4 ml-auto" />
                </Link>
            </div>

            <div className="p-8 rounded-3xl glass-panel space-y-6">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h4>
                    <Link href="/call-sessions" className="text-[10px] font-bold text-indigo-400 hover:underline">View All</Link>
                </div>
                
                <div className="space-y-4">
                    {[
                        { title: "Lead Identified", meta: "Sam Davies", time: "2m ago", type: "success" },
                        { title: "Action Performed", meta: "Appointments.SlotFetch", time: "5m ago", type: "info" },
                        { title: "Report Saved", meta: "Session_5028", time: "12m ago", type: "success" }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-2 rounded-xl">
                            <div className={cn(
                                "w-1 h-8 rounded-full",
                                item.type === "success" ? "bg-emerald-500" : "bg-indigo-500"
                            )} />
                            <div>
                                <p className="text-xs font-bold text-white leading-none">{item.title}</p>
                                <p className="text-[10px] text-muted-foreground mt-1.5">{item.meta} • {item.time}</p>
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
