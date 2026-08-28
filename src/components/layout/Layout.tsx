import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Radio,
  LayoutDashboard,
  Upload,
  Menu,
  X,
  Activity,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/upload", label: "Analyze Signal", icon: Upload },
];

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-950">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-surface-900 border-r border-white/[0.06] z-40">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-600/20 border border-signal-500/30">
            <Radio className="h-5 w-5 text-signal-400" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">
              SignalLens
            </span>
            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-widest text-signal-400">
              AI
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-signal-600/15 text-signal-400 border border-signal-500/20"
                    : "text-surface-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-surface-500/60">
              System
            </span>
          </div>
          {[
            { to: "/", label: "Home", icon: Radio },
          ].map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-signal-600/15 text-signal-400 border border-signal-500/20"
                    : "text-surface-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Status bar */}
        <div className="px-4 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <div className="h-2 w-2 rounded-full bg-neon-500 animate-pulse" />
            <span>System Online</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-surface-500/60">
            <Activity className="h-3 w-3" />
            <span>DSP Engine Active</span>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 border-r border-white/[0.06] transform transition-transform duration-200 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-600/20 border border-signal-500/30">
              <Radio className="h-5 w-5 text-signal-400" />
            </div>
            <span className="text-base font-bold text-white">SignalLens</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-surface-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-signal-600/15 text-signal-400"
                    : "text-surface-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-400 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <Radio className="h-4 w-4" />
            Home
          </Link>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 bg-surface-950/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] text-surface-400 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-surface-400">
              <Wifi className="h-3.5 w-3.5 text-neon-500" />
              <span className="hidden sm:inline">Connected</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 border border-white/[0.06] text-xs text-surface-400">
              <div className="h-1.5 w-1.5 rounded-full bg-signal-500" />
              DSP Engine
            </div>
            <div className="h-8 w-8 rounded-lg bg-signal-600/20 border border-signal-500/30 flex items-center justify-center text-signal-400 text-xs font-bold">
              SL
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] bg-surface-900/50">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2 text-surface-500">
                <Radio className="h-3.5 w-3.5 text-signal-500/60" />
                <span className="text-xs">SignalLens AI — SIH26147</span>
              </div>
              <p className="text-[11px] text-surface-500/50">
                Automated WAV &amp; IQ Signal Intelligence Platform
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
