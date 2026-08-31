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

  const sidebarBg = "#fffdf8";
  const borderColor = "#e8ddd0";
  const activeBg = "rgba(233, 123, 44, 0.08)";
  const activeText = "#b85812";
  const textMuted = "#6b7280";
  const textLabel = "#9ca3af";

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#faf8f5" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-48 lg:flex-col lg:fixed lg:inset-y-0 z-40"
        style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}>
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <span className="text-xs font-bold tracking-wider" style={{ color: "#b85812" }}>SIGNALENS</span>
        </div>
        <nav className="flex-1 px-2 py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-2 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: textLabel }}>
                  {section.label}
                </span>
              </div>
              {section.items.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to}
                    className={cn("block px-2 py-1.5 text-xs rounded-md transition-colors hover:bg-[#fef7ed]")}
                    style={active
                      ? { color: activeText, backgroundColor: activeBg, fontWeight: 600 }
                      : { color: textMuted }}>
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
        <div className="fixed inset-0 z-50 lg:hidden" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-48 transform transition-transform duration-150 lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full")}
        style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}>
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <span className="text-xs font-bold tracking-wider" style={{ color: "#b85812" }}>SIGNALENS</span>
          <button onClick={() => setSidebarOpen(false)} style={{ color: textMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="px-2 py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-2 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: textLabel }}>
                  {section.label}
                </span>
              </div>
              {section.items.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                  className={cn("block px-2 py-2 text-xs rounded-md transition-colors")}
                  style={location.pathname === item.to
                    ? { color: activeText, backgroundColor: activeBg, fontWeight: 600 }
                    : { color: textMuted }}>
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
          style={{ backgroundColor: "#faf8f5", borderBottom: `1px solid ${borderColor}` }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: textMuted }}>
            <Menu className="h-4 w-4" />
          </button>
          <span className="ml-3 text-xs font-bold tracking-wider" style={{ color: "#b85812" }}>SIGNALENS</span>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
