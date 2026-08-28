import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview" },
      { to: "/upload", label: "Analyze" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/", label: "Home" },
    ],
  },
];

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface-950)" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-48 lg:flex-col lg:fixed lg:inset-y-0 z-40"
        style={{ backgroundColor: "var(--color-surface-900)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-xs font-bold tracking-wider" style={{ color: "#e2e8f0" }}>SIGNALENS</span>
        </div>
        <nav className="flex-1 px-2 py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-2 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-surface-500)" }}>
                  {section.label}
                </span>
              </div>
              {section.items.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to}
                    className={cn("block px-2 py-1.5 text-xs rounded transition-colors", active ? "" : "hover:text-white")}
                    style={active ? { color: "#e2e8f0", backgroundColor: "rgba(255,255,255,0.06)" } : { color: "var(--color-surface-400)" }}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-48 transform transition-transform duration-150 lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full")}
        style={{ backgroundColor: "var(--color-surface-900)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-xs font-bold tracking-wider" style={{ color: "#e2e8f0" }}>SIGNALENS</span>
          <button onClick={() => setSidebarOpen(false)} style={{ color: "var(--color-surface-400)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="px-2 py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-2 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-surface-500)" }}>
                  {section.label}
                </span>
              </div>
              {section.items.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                  className={cn("block px-2 py-2 text-xs rounded transition-colors", location.pathname === item.to ? "" : "hover:text-white")}
                  style={location.pathname === item.to ? { color: "#e2e8f0", backgroundColor: "rgba(255,255,255,0.06)" } : { color: "var(--color-surface-400)" }}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:pl-48 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-10 flex items-center px-4 lg:hidden"
          style={{ backgroundColor: "var(--color-surface-950)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: "var(--color-surface-400)" }}>
            <Menu className="h-4 w-4" />
          </button>
          <span className="ml-3 text-xs font-bold tracking-wider" style={{ color: "#e2e8f0" }}>SIGNALENS</span>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
