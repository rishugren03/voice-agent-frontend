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
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Active Call", href: "/call", icon: Phone },
  { name: "Call History", href: "/call-sessions", icon: History },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-white border-r border-slate-200",
          "transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0 lg:z-30"
        )}
      >
        <div className="flex h-14 items-center justify-between px-5 border-b border-slate-200">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={onClose}>
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center group-hover:bg-teal-500 transition-colors">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-slate-900 leading-none">Mykare AI</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Voice Assistant</span>
            </div>
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Navigation</p>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
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
    </>
  );
}
