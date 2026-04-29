"use client";

import { Sidebar } from "@/components/Sidebar";
import { Search, Bell } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-indigo-500/30">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <header className="flex h-20 items-center justify-between px-8 bg-background/5 border-b border-white/[0.03] backdrop-blur-xl z-20">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-lg w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search leads, recordings, or intelligence reports..." 
                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white/[0.04] transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="relative p-2.5 rounded-xl hover:bg-white/[0.05] transition-all text-muted-foreground hover:text-foreground group">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-background animate-pulse" />
              </button>
            </div>
            
            <div className="h-8 w-px bg-white/[0.05]" />
            
            <div className="flex items-center gap-4 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold tracking-tight">Rishu</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Admin Level</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 p-[1px] shadow-lg shadow-indigo-500/10 active:scale-95 transition-transform cursor-pointer">
                <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center font-bold text-xs ring-1 ring-white/10">
                  RI
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
