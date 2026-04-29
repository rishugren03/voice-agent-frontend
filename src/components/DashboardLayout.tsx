"use client";

import { Sidebar } from "@/components/Sidebar";
import { Search, Bell } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between px-6 bg-white border-b border-slate-200 z-20">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search sessions or patients..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all placeholder:text-slate-400 text-slate-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
              <Bell className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-200" />

            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800 leading-none">Rishu</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Administrator</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-semibold text-xs text-white cursor-pointer hover:bg-teal-500 transition-colors">
                RI
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
