"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Phone,
  History,
  LayoutDashboard,
  Activity,
  UserCircle,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Active Call", href: "/call", icon: Phone },
  { name: "Call History", href: "/call-sessions", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-60 flex-col bg-white border-r border-slate-200 z-30">
      <div className="flex h-14 items-center px-5 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center group-hover:bg-teal-500 transition-colors">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-slate-900 leading-none">Mykare AI</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Voice Assistant</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Navigation</p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all",
                isActive
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 leading-none">Admin</p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Mykare Health</p>
          </div>
        </div>
      </div>
    </div>
  );
}
