"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Clock3, LayoutDashboard, ListChecks, Palette, Settings, ShieldCheck, Sparkles, Users, X, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import brandLogo from "@/app/assets/BRANDCOM LOGO.png";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Ticket Monitoring", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: Clock3 },
  { href: "/designers", label: "Designers", icon: Users },
  { href: "/departments", label: "Departments", icon: ShieldCheck },
  { href: "/materials", label: "Materials & SLA", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: Zap },
  { href: "/activity-log", label: "Activity Log", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const navigation = (
    <nav className="flex flex-nowrap items-center gap-0.5 overflow-x-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive ? "page" : undefined}
            className={`dashboard-nav-link group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-xs font-medium transition ${
              isActive ? "dashboard-nav-link-active" : ""
            }`}
          >
            <Icon className="h-3.5 w-3.5 transition group-hover:text-emerald-700" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <aside className="dashboard-sidebar relative z-30 flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 sm:px-5">
      <Link href="/" aria-label="BrandCom Ticket Monitoring home" className="flex w-36 shrink-0 items-center sm:w-40">
        <Image src={brandLogo} alt="BrandCom Ticket Monitoring" priority className="h-auto w-full object-contain" />
      </Link>

      <div className="hidden min-w-0 flex-1 justify-center lg:flex">
        {navigation}
      </div>

      <button
        type="button"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((current) => !current)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(31,41,55,0.12)] lg:hidden">
          <nav className="grid grid-cols-2 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`dashboard-nav-link flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? "dashboard-nav-link-active" : ""
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </aside>
  );
}
