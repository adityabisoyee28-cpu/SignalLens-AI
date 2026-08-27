import { Link, useLocation } from "react-router-dom";
import { Radio, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/upload", label: "Upload" },
  { to: "/dashboard", label: "Dashboard" },
];

export function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-600 text-white shadow-md group-hover:bg-signal-700 transition-colors">
            <Radio className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-surface-900 tracking-tight">
              SignalLens
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-signal-600">
              AI
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === link.to
                  ? "bg-signal-50 text-signal-700"
                  : "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/upload">
            <Button size="sm">New Analysis</Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-surface-700" />
          ) : (
            <Menu className="h-5 w-5 text-surface-700" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-surface-200 bg-white px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === link.to
                  ? "bg-signal-50 text-signal-700"
                  : "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/upload" onClick={() => setMobileOpen(false)}>
            <Button size="sm" className="w-full mt-2">
              New Analysis
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}
