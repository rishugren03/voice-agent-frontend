"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Phone, 
  History, 
  LayoutDashboard,
  ShieldCheck,
  Zap
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Active Call", href: "/call", icon: Phone },
  { name: "Call History", href: "/call-sessions", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-72 flex-col bg-background/20 backdrop-blur-2xl border-r border-white/[0.03] z-30">
      <div className="flex h-20 items-center px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-none text-foreground">Mykare AI</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Sales Pro</span>
          </div>
        </Link>
      </div>
      
      <div className="flex-1 px-4 py-8 space-y-1">
        <p className="px-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">Core Console</p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 overflow-hidden",
                isActive 
                  ? "bg-indigo-500/10 text-white border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]" 
                  : "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              )}
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-all duration-300",
                isActive ? "text-indigo-400 scale-110" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className={cn(
                 "transition-colors",
                 isActive ? "font-bold" : "font-medium"
              )}>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-6">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center p-0.5">
               <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                 <ShieldCheck className="w-5 h-5 text-white" />
               </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">Verified Agent</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Level 4 Security</p>
            </div>
          </div>
          <button className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-[10px] font-bold tracking-widest text-indigo-400 uppercase transition-all">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
